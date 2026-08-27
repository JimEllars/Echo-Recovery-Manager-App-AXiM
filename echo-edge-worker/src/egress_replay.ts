import { Env, getCorsHeaders } from "./index";
import { dispatchAlert } from "./utils/webhook";

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export async function handleReplay(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  operator_id: string,
): Promise<Response> {
  const requiredVars = [
    "AXIM_INTERNAL_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
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
      JSON.stringify({ success: false, error: "CONFIGURATION_ERROR", details }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request),
        },
      },
    );
  }
  // Validate Authorization header
  const authHeader =
    request.headers.get("x-axim-internal-key") ||
    request.headers.get("Authorization");

  let isValid = false;
  if (authHeader === env.AXIM_INTERNAL_KEY) {
    isValid = true;
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token === env.AXIM_INTERNAL_KEY) {
      isValid = true;
    }
  }

  if (!isValid) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(request),
      },
    });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (idempotencyKey) {
    try {
      const existing = await env.ECHO_STATE_KV.get(
        `replay_ik_${idempotencyKey}`,
      );
      if (existing) {
        return new Response(
          JSON.stringify({
            success: true,
            message: "Replay request ignored due to idempotency match",
            cached: true,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              ...getCorsHeaders(request),
            },
          },
        );
      }
    } catch (e) {
      console.error("Idempotency check failed", e);
    }
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Bad Request: Invalid JSON",
        details: (error as Error).message,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request),
        },
      },
    );
  }

  const recordIds = (payload as any).recordIds;

  if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Bad Request: recordIds must be a non-empty array",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request),
        },
      },
    );
  }

  if (recordIds.length > 50) {
    return new Response(
      JSON.stringify({
        error:
          "Batch limit exceeded. Please send a maximum of 50 records per request to prevent execution timeouts.",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request),
        },
      },
    );
  }

  try {
    // 1. Fetch records from Supabase
    // Depending on Supabase setup, if ID is UUID it shouldn't need quotes in `in.()`,
    // but the API usually expects `in.(id1,id2)`. Let's just join them safely.
    // Assuming IDs are numeric or safe strings without commas.
    const cleanIds = recordIds
      .map((id) => encodeURIComponent(String(id)))
      .join(",");

    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?id=in.(${cleanIds})&select=*`;

    const getResponse = await fetch(supabaseUrl, {
      method: "GET",
      headers: {
        apikey: env.SUPABASE_ANON_KEY || "dummy",
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`,
      },
    });

    if (!getResponse.ok) {
      const err = await getResponse.text();
      throw new Error(`Failed to fetch records: ${err}`);
    }

    const records = (await getResponse.json()) as any[];

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ error: "No matching records found" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(request),
          },
        },
      );
    }

    const results = [];
    const chunkSize = 5;

    // 2. Concurrency Queue - Chunks of 5
    for (let i = 0; i < records.length; i += chunkSize) {
      if (i > 0) {
        await delay(500);
      }

      const chunk = records.slice(i, i + chunkSize);

      const chunkPromises = chunk.map(async (record) => {
        const updateStatus = async (
          status: string,
          errorReason: string | null = null,
        ) => {
          const updateUrl = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?id=eq.${encodeURIComponent(record.id)}`;
          const body: any = { status };
          if (errorReason) {
            body.error_reason = errorReason;
          }
          await fetch(updateUrl, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: env.SUPABASE_ANON_KEY || "dummy",
              Authorization: `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`,
            },
            body: JSON.stringify(body),
          });
        };

        try {
          const targetUrl = record.target_destination;
          const bodyPayload =
            record.status === "patched" && record.proposed_patch
              ? record.proposed_patch
              : record.proposed_patch || record.original_payload;

          if (!targetUrl) {
            const errorMsg = "No target_destination";
            await updateStatus("failed", errorMsg);
            return { id: record.id, success: false, error: errorMsg };
          }

          let isValidUrl = true;
          try {
            const urlObj = new URL(targetUrl);
            if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
              isValidUrl = false;
            }
          } catch (e) {
            isValidUrl = false;
          }

          if (!isValidUrl) {
            const errorMsg = "Invalid target_destination URL format";
            await updateStatus("failed", errorMsg);
            return { id: record.id, success: false, error: errorMsg };
          }

          // POST to target destination with retry loop
          let postResponse: Response | null = null;
          let retryCount = 0;
          const maxRetries = 2;
          let errorMsg = "";

          while (retryCount <= maxRetries) {
            try {
              postResponse = await fetch(targetUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-AXiM-Recovery-Trace": `echo-${record.id}`,
                },
                body:
                  typeof bodyPayload === "string"
                    ? bodyPayload
                    : JSON.stringify(bodyPayload),
              });

              if (postResponse.ok) {
                break;
              }

              const status = postResponse.status;
              if (
                [429, 502, 503, 504].includes(status) &&
                retryCount < maxRetries
              ) {
                retryCount++;
                const pauseTime = retryCount === 1 ? 300 : 600;
                await delay(pauseTime);
                continue;
              } else {
                let responseText = "";
                try {
                  responseText = await postResponse.text();
                } catch (e) {
                  responseText = "Could not read response text";
                }
                errorMsg = `Replay Failed: ${status} - ${responseText}`;
                break;
              }
            } catch (e) {
              if (retryCount < maxRetries) {
                retryCount++;
                const pauseTime = retryCount === 1 ? 300 : 600;
                await delay(pauseTime);
                continue;
              }
              errorMsg = `Replay Failed: Network Error - ${(e as Error).message}`;
              break;
            }
          }

          if (!postResponse || !postResponse.ok) {
            await updateStatus("failed", errorMsg);
            return { id: record.id, success: false, error: errorMsg };
          }

          // 3. Update Supabase record status to resolved
          await updateStatus("resolved", null);

          return { id: record.id, success: true, updatedStatus: true };
        } catch (err) {
          const errorMsg = `Replay Exception: ${(err as Error).message}`;
          await updateStatus("failed", errorMsg);
          return { id: record.id, success: false, error: errorMsg };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // Write audit log to KV
    let recentLogs = [];
    try {
      const logsStr = await env.ECHO_STATE_KV.get("recent_audit_logs");
      if (logsStr) {
        recentLogs = JSON.parse(logsStr);
        if (!Array.isArray(recentLogs)) recentLogs = [];
      }
    } catch (e) {
      console.error("Failed to parse recent audit logs", e);
    }

    const newLog = {
      timestamp: new Date().toISOString(),
      action: "BATCH_REPLAY",
      triggered_by: operator_id,
      success_count: successCount,
      fail_count: failCount,
    };

    recentLogs.unshift(newLog);
    recentLogs = recentLogs.slice(0, 20);

    await env.ECHO_STATE_KV.put(
      "recent_audit_logs",
      JSON.stringify(recentLogs),
    );

    ctx.waitUntil(
      dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
        action: "BATCH_REPLAY",
        operator_id: operator_id,
        success_count: successCount,
        fail_count: failCount,
      }),
    );

    if (idempotencyKey) {
      try {
        await env.ECHO_STATE_KV.put(
          `replay_ik_${idempotencyKey}`,
          JSON.stringify({ timestamp: Date.now(), results }),
          { expirationTtl: 86400 },
        );
      } catch (e) {
        console.error("Failed to save idempotency key", e);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getCorsHeaders(request),
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(request),
        },
      },
    );
  }
}
