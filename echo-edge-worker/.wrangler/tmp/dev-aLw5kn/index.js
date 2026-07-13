var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-KW1OS3/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/ingress.ts
async function handleIngress(request, env) {
  const authHeader = request.headers.get("x-axim-internal-key") || request.headers.get("Authorization");
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
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  let payload;
  try {
    payload = await request.json();
    if (!payload || typeof payload !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Bad Request: Invalid JSON", details: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  try {
    const record = {
      source_node: payload.source_node || "Unknown Source",
      target_destination: payload.target_destination || "Unknown Target",
      error_reason: payload.error_reason || "Unknown Error",
      original_payload: payload.original_payload || payload,
      status: "pending"
      // Supabase will automatically handle id and created_at if set up properly.
      // If we need to pass a specific timestamp, we can.
    };
    const supabaseRestUrl = `${env.SUPABASE_URL}/rest/v1/echo_dlq_records_1783829654384`;
    const response = await fetch(supabaseRestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_ANON_KEY || "dummy",
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`,
        "Prefer": "return=minimal"
        // We don't need the inserted record back
      },
      body: JSON.stringify(record)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Supabase insert failed", errorText);
      return new Response(JSON.stringify({ error: "Failed to insert record into database", details: errorText }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
      });
    }
    return new Response(JSON.stringify({ success: true, message: "Record ingested successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  } catch (error) {
    console.error("Fetch failed", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
}
__name(handleIngress, "handleIngress");

// src/egress_replay.ts
var TABLE_NAME = "echo_dlq_records_1783829654384";
async function handleReplay(request, env) {
  const authHeader = request.headers.get("x-axim-internal-key") || request.headers.get("Authorization");
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
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Bad Request: Invalid JSON", details: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  const recordIds = payload.recordIds;
  if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
    return new Response(JSON.stringify({ error: "Bad Request: recordIds must be a non-empty array" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  try {
    const cleanIds = recordIds.map((id) => encodeURIComponent(String(id))).join(",");
    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=in.(${cleanIds})&select=*`;
    const getResponse = await fetch(supabaseUrl, {
      method: "GET",
      headers: {
        "apikey": env.SUPABASE_ANON_KEY || "dummy",
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`
      }
    });
    if (!getResponse.ok) {
      const err = await getResponse.text();
      throw new Error(`Failed to fetch records: ${err}`);
    }
    const records = await getResponse.json();
    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ error: "No matching records found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
      });
    }
    const results = [];
    const chunkSize = 5;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (record) => {
        try {
          const targetUrl = record.target_destination;
          const bodyPayload = record.original_payload;
          if (!targetUrl) {
            return { id: record.id, success: false, error: "No target_destination" };
          }
          const postResponse = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: typeof bodyPayload === "string" ? bodyPayload : JSON.stringify(bodyPayload)
          });
          if (!postResponse.ok) {
            return { id: record.id, success: false, error: `Destination returned ${postResponse.status}` };
          }
          const updateUrl = `${env.SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(record.id)}`;
          const updateResponse = await fetch(updateUrl, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": env.SUPABASE_ANON_KEY || "dummy",
              "Authorization": `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`
            },
            body: JSON.stringify({ status: "resolved" })
          });
          if (!updateResponse.ok) {
            return { id: record.id, success: true, updatedStatus: false, error: "Failed to update status in DB" };
          }
          return { id: record.id, success: true, updatedStatus: true };
        } catch (err) {
          return { id: record.id, success: false, error: err.message };
        }
      });
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
}
__name(handleReplay, "handleReplay");

// src/cognitive_triage.ts
var TABLE_NAME2 = "echo_dlq_records_1783829654384";
async function handleTriage(request, env) {
  const authHeader = request.headers.get("x-axim-internal-key") || request.headers.get("Authorization");
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
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Bad Request: Invalid JSON", details: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  const recordId = payload.recordId;
  if (!recordId) {
    return new Response(JSON.stringify({ error: "Bad Request: recordId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  try {
    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/${TABLE_NAME2}?id=eq.${encodeURIComponent(recordId)}&select=*`;
    const getResponse = await fetch(supabaseUrl, {
      method: "GET",
      headers: {
        "apikey": env.SUPABASE_ANON_KEY || "dummy",
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`
      }
    });
    if (!getResponse.ok) {
      const err = await getResponse.text();
      throw new Error(`Failed to fetch record: ${err}`);
    }
    const records = await getResponse.json();
    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ error: "Record not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
      });
    }
    const record = records[0];
    const originalPayload = record.original_payload;
    const stubbedPatch = {
      ...originalPayload,
      __onyx_patched: true,
      _triage_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      resolved_reason: "Stubbed AI Patch Applied"
    };
    const updateUrl = `${env.SUPABASE_URL}/rest/v1/${TABLE_NAME2}?id=eq.${encodeURIComponent(recordId)}`;
    const updateResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_ANON_KEY || "dummy",
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`
      },
      body: JSON.stringify({
        status: "patched",
        proposed_patch: stubbedPatch
      })
    });
    if (!updateResponse.ok) {
      const updateErr = await updateResponse.text();
      return new Response(JSON.stringify({ error: "Failed to update record with patch", details: updateErr }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
      });
    }
    return new Response(JSON.stringify({ success: true, patched: true, patch: stubbedPatch }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
}
__name(handleTriage, "handleTriage");

// src/index.ts
var ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://axim-internal.com"
  // Example internal domain
];
function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".axim.local") || origin.includes("localhost");
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-axim-internal-key"
  };
}
__name(getCorsHeaders, "getCorsHeaders");
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    if (request.method === "POST" && url.pathname === "/api/v1/ingest-failure") {
      return handleIngress(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/v1/replay") {
      return handleReplay(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/v1/triage") {
      return handleTriage(request, env);
    }
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-KW1OS3/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-KW1OS3/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
  getCorsHeaders
};
//# sourceMappingURL=index.js.map
