// @ts-ignore
import jwt from '@tsndr/cloudflare-worker-jwt';
export interface Env {
  AXIM_INTERNAL_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_JWT_SECRET: string;
  ECHO_STATE_KV: KVNamespace;
  AXIM_ALERT_WEBHOOK_URL?: string;
}

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://axim-internal.com', // Example internal domain
];

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '';

  // Allow if it matches allowed origins, or if no origin (e.g. server-to-server)
  // For strictness, if origin is provided, it must be in the allowed list
  // Here we'll default to the first allowed origin if not provided to make things easier,
  // or allow if development.
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.axim.local') || origin.includes('localhost');

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-axim-internal-key',
  };
}

import { handleIngress } from './ingress';
import { handleReplay } from './egress_replay';
import { handleTriage } from './cognitive_triage';
import { pruneRecords } from './prune_records';


async function verifyJwt(request: Request, env: Env): Promise<{ isValid: boolean, payload: any }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isValid: false, payload: null };
  }
  const token = authHeader.split(' ')[1];
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/ingest-failure') {
      return handleIngress(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/replay') {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const operator_id = payload?.email || payload?.sub || "unknown";
      return handleReplay(request, env, ctx, operator_id);
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/triage') {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const operator_id = payload?.email || payload?.sub || 'unknown';
      return handleTriage(request, env, operator_id);
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/force-prune') {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const operator_id = payload?.email || payload?.sub || 'unknown';
      const result = await pruneRecords(env, ctx, operator_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }


    if (request.method === 'GET' && url.pathname === '/api/v1/audit-logs') {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      try {
        const logsStr = await env.ECHO_STATE_KV.get('recent_audit_logs');
        const logs = logsStr ? JSON.parse(logsStr) : [];
        return new Response(JSON.stringify(logs), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/v1/system-status') {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      try {
        const lastPruneRunStr = await env.ECHO_STATE_KV.get('last_prune_run');
        const lastPruneRun = lastPruneRunStr ? JSON.parse(lastPruneRunStr) : null;

        return new Response(JSON.stringify({ last_prune_run: lastPruneRun }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await pruneRecords(env, ctx, 'system_cron');
  }
};
