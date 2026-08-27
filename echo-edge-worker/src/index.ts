// @ts-ignore
import jwt from "@tsndr/cloudflare-worker-jwt";
export interface Env {
  AXIM_INTERNAL_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_JWT_SECRET: string;
  ECHO_STATE_KV: KVNamespace;
  DLQ_TABLE_NAME: string;
  AXIM_ALERT_WEBHOOK_URL?: string;
  AXIM_LLM_PROXY_URL?: string;
}

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://axim-internal.com", // Example internal domain
];

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";

  // Allow if it matches allowed origins, or if no origin (e.g. server-to-server)
  // For strictness, if origin is provided, it must be in the allowed list
  // Here we'll default to the first allowed origin if not provided to make things easier,
  // or allow if development.
  const isAllowedOrigin =
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith(".axim.local") ||
    origin.includes("localhost");

  return {
    "Access-Control-Allow-Origin": isAllowedOrigin
      ? origin
      : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-axim-internal-key",
  };
}

import { handleIngress } from "./ingress";
import { handleReplay } from "./egress_replay";
import { handleTriage } from "./cognitive_triage";
import { pruneRecords } from "./prune_records";
import { dispatchAlert } from "./utils/webhook";

async function verifyJwt(
  request: Request,
  env: Env,
): Promise<{ isValid: boolean; payload: any }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { isValid: false, payload: null };
  }
  const token = authHeader.split(" ")[1];
  try {
    const secret = env.SUPABASE_JWT_SECRET;
    if (!secret) return { isValid: false, payload: null };

    // We only verify signature and expiration for simplicity.
    const isValid = await jwt.verify(token, secret);
    let payload = null;
    if (isValid) {
      const decoded = jwt.decode(token);
      payload = decoded.payload;
    }
    return { isValid, payload };
  } catch (err) {
    return { isValid: false, payload: null };
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    const requiredVars = [
      "AXIM_INTERNAL_KEY",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_JWT_SECRET",
      "DLQ_TABLE_NAME",
    ];
    const missingVars = requiredVars.filter((v) => !(env as any)[v]);

    if (missingVars.length > 0 || !env.ECHO_STATE_KV) {
      const details = [
        ...missingVars.map((v) => `Missing environment variable: ${v}`),
        ...(env.ECHO_STATE_KV
          ? []
          : ["Missing KV namespace binding: ECHO_STATE_KV"]),
      ].join(", ");

      return new Response(
        JSON.stringify({
          success: false,
          error: "CONFIGURATION_ERROR",
          details,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (request.method === "GET" && url.pathname === "/api/telemetry/health") {
      let kvConnected = false;
      let kvLatency = 0;
      try {
        const start = Date.now();
        await env.ECHO_STATE_KV.get("__ping__");
        kvLatency = Date.now() - start;
        kvConnected = true;
      } catch (e) {
        kvConnected = false;
      }
      return new Response(
        JSON.stringify({
          status: "healthy",
          timestamp: Date.now(),
          region: (request as any).cf?.colo || "local",
          limits: {
            cpu_ms: 50,
            memory_mb: 128,
          },
          kv_connected: kvConnected,
          kv_latency_ms: kvLatency,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", 'Cache-Control': 'no-store, no-cache, must-revalidate', ...corsHeaders },
        },
      );
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/api/v1/health" || url.pathname === "/health")
    ) {
      return new Response(
        JSON.stringify({
          status: "healthy",
          timestamp: Date.now(),
          region: (request as any).cf?.colo || "local",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/v1/ingest-failure"
    ) {
      return handleIngress(request, env);
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/v1/simulate-failure"
    ) {
      const authHeader = request.headers.get("x-axim-internal-key");
      if (authHeader !== env.AXIM_INTERNAL_KEY) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const dummyPayload = {
        source_node: "CRM Enrichment Bridge",
        target_destination: "AXiM Core Pipeline",
        error_reason: "Simulated Environment Failure (E2E Test)",
        payload: {
          simulated: true,
          timestamp: Date.now(),
          bad_data: "<<CORRUPTED>>",
        },
      };

      const simulatedRequest = new Request(
        "http://localhost/api/v1/ingest-failure",
        {
          method: "POST",
          headers: request.headers,
          body: JSON.stringify(dummyPayload),
        },
      );

      return handleIngress(simulatedRequest, env);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/replay") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const operator_id = payload?.email || payload?.sub || "unknown";
      return handleReplay(request, env, ctx, operator_id);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/triage") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const operator_id = payload?.email || payload?.sub || "unknown";
      return handleTriage(request, env, operator_id);
    }

    if (request.method === "POST" && url.pathname === "/api/v1/force-prune") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const operator_id = payload?.email || payload?.sub || "unknown";
      const result = await pruneRecords(env, ctx, operator_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (request.method === "GET" && url.pathname === "/api/v1/proxy-status") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const proxyUrl =
        env.AXIM_LLM_PROXY_URL || "https://api.axim.us.com/v1/proxy/llm";
      const start = Date.now();
      let status = "Unknown";
      let tier = "deepseek-coder";
      let latency = 0;

      try {
        const pingResponse = await fetch(proxyUrl, {
          method: "OPTIONS", // Fast probe
          headers: {
            Authorization: `Bearer ${env.AXIM_INTERNAL_KEY}`,
          },
        });
        latency = Date.now() - start;
        if (
          pingResponse.ok ||
          pingResponse.status === 405 ||
          pingResponse.status === 404 ||
          pingResponse.status === 200 ||
          pingResponse.status === 204
        ) {
          status = "Optimal";
        } else {
          status = "Degraded";
        }
      } catch (err) {
        latency = Date.now() - start;
        status = "Degraded";
      }

      return new Response(JSON.stringify({ status, tier, latency }), {
        status: 200,
        headers: { "Content-Type": "application/json", 'Cache-Control': 'no-store, no-cache, must-revalidate', ...corsHeaders },
      });
    }

    if (request.method === "GET" && url.pathname === "/api/v1/audit-logs") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      try {
        const logsStr = await env.ECHO_STATE_KV.get("recent_audit_logs");
        const logs = logsStr ? JSON.parse(logsStr) : [];
        return new Response(JSON.stringify(logs), {
          status: 200,
          headers: { "Content-Type": "application/json", 'Cache-Control': 'public, max-age=5, s-maxage=5', ...corsHeaders },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Internal Server Error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }
    }

    if (request.method === "GET" && url.pathname === "/api/v1/system-status") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      try {
        const lastPruneRunStr = await env.ECHO_STATE_KV.get("last_prune_run");
        const lastPruneRun = lastPruneRunStr
          ? JSON.parse(lastPruneRunStr)
          : null;

        return new Response(JSON.stringify({ last_prune_run: lastPruneRun }), {
          status: 200,
          headers: { "Content-Type": "application/json", 'Cache-Control': 'public, max-age=5, s-maxage=5', ...corsHeaders },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Internal Server Error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const pruneResult = await pruneRecords(env, ctx, "system_cron");

    try {
      // Fetch current record counts by status from Supabase
      const url = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?select=status`;
      const response = await fetch(url, {
        headers: {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_JWT_SECRET}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const records = (await response.json()) as any[];
        let pending = 0,
          patched = 0,
          resolved = 0,
          failed = 0;

        for (const record of records) {
          if (record.status === "pending") pending++;
          else if (record.status === "patched") patched++;
          else if (record.status === "resolved") resolved++;
          else if (record.status === "error" || record.status === "failed")
            failed++;
        }

        ctx.waitUntil(
          dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
            action: "DAILY_DIGEST",
            operator_id: "system_cron",
            total_volume: records.length,
            pending_count: pending,
            patched_count: patched,
            resolved_count: resolved,
            failed_count: failed,
            pruned_today: pruneResult.count || 0,
          } as any),
        );
      }
    } catch (err) {
      console.error("Failed to dispatch daily digest:", err);
    }
  },
};
