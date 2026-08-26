var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-xp9aOO/checked-fetch.js
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

// ../node_modules/@tsndr/cloudflare-worker-jwt/index.js
function bytesToByteString(bytes) {
  let byteStr = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    byteStr += String.fromCharCode(bytes[i]);
  }
  return byteStr;
}
__name(bytesToByteString, "bytesToByteString");
function byteStringToBytes(byteStr) {
  let bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes;
}
__name(byteStringToBytes, "byteStringToBytes");
function arrayBufferToBase64String(arrayBuffer) {
  return btoa(bytesToByteString(new Uint8Array(arrayBuffer)));
}
__name(arrayBufferToBase64String, "arrayBufferToBase64String");
function base64StringToUint8Array(b64str) {
  return byteStringToBytes(atob(b64str));
}
__name(base64StringToUint8Array, "base64StringToUint8Array");
function textToUint8Array(str) {
  return byteStringToBytes(str);
}
__name(textToUint8Array, "textToUint8Array");
function arrayBufferToBase64Url(arrayBuffer) {
  return arrayBufferToBase64String(arrayBuffer).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
__name(arrayBufferToBase64Url, "arrayBufferToBase64Url");
function base64UrlToUint8Array(b64url) {
  return base64StringToUint8Array(b64url.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, ""));
}
__name(base64UrlToUint8Array, "base64UrlToUint8Array");
function textToBase64Url(str) {
  const encoder = new TextEncoder();
  const charCodes = encoder.encode(str);
  const binaryStr = String.fromCharCode(...charCodes);
  return btoa(binaryStr).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
__name(textToBase64Url, "textToBase64Url");
function pemToBinary(pem) {
  return base64StringToUint8Array(pem.replace(/-+(BEGIN|END).*/g, "").replace(/\s/g, ""));
}
__name(pemToBinary, "pemToBinary");
async function importTextSecret(key, algorithm, keyUsages) {
  return await crypto.subtle.importKey("raw", textToUint8Array(key), algorithm, true, keyUsages);
}
__name(importTextSecret, "importTextSecret");
async function importJwk(key, algorithm, keyUsages) {
  return await crypto.subtle.importKey("jwk", key, algorithm, true, keyUsages);
}
__name(importJwk, "importJwk");
async function importPublicKey(key, algorithm, keyUsages) {
  return await crypto.subtle.importKey("spki", pemToBinary(key), algorithm, true, keyUsages);
}
__name(importPublicKey, "importPublicKey");
async function importPrivateKey(key, algorithm, keyUsages) {
  return await crypto.subtle.importKey("pkcs8", pemToBinary(key), algorithm, true, keyUsages);
}
__name(importPrivateKey, "importPrivateKey");
async function importKey(key, algorithm, keyUsages) {
  if (typeof key === "object")
    return importJwk(key, algorithm, keyUsages);
  if (typeof key !== "string")
    throw new Error("Unsupported key type!");
  if (key.includes("PUBLIC"))
    return importPublicKey(key, algorithm, keyUsages);
  if (key.includes("PRIVATE"))
    return importPrivateKey(key, algorithm, keyUsages);
  return importTextSecret(key, algorithm, keyUsages);
}
__name(importKey, "importKey");
function decodePayload(raw) {
  const bytes = Array.from(atob(raw), (char) => char.charCodeAt(0));
  const decodedString = new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  return JSON.parse(decodedString);
}
__name(decodePayload, "decodePayload");
if (typeof crypto === "undefined" || !crypto.subtle)
  throw new Error("SubtleCrypto not supported!");
var algorithms = {
  none: { name: "none" },
  ES256: { name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } },
  ES384: { name: "ECDSA", namedCurve: "P-384", hash: { name: "SHA-384" } },
  ES512: { name: "ECDSA", namedCurve: "P-521", hash: { name: "SHA-512" } },
  HS256: { name: "HMAC", hash: { name: "SHA-256" } },
  HS384: { name: "HMAC", hash: { name: "SHA-384" } },
  HS512: { name: "HMAC", hash: { name: "SHA-512" } },
  RS256: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
  RS384: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-384" } },
  RS512: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } }
};
async function sign(payload, secret, options = "HS256") {
  if (typeof options === "string")
    options = { algorithm: options };
  options = { algorithm: "HS256", header: { typ: "JWT", ...options.header ?? {} }, ...options };
  if (!payload || typeof payload !== "object")
    throw new Error("payload must be an object");
  if (options.algorithm !== "none" && (!secret || typeof secret !== "string" && typeof secret !== "object"))
    throw new Error("secret must be a string, a JWK object or a CryptoKey object");
  if (typeof options.algorithm !== "string")
    throw new Error("options.algorithm must be a string");
  const algorithm = algorithms[options.algorithm];
  if (!algorithm)
    throw new Error("algorithm not found");
  if (!payload.iat)
    payload.iat = Math.floor(Date.now() / 1e3);
  const partialToken = `${textToBase64Url(JSON.stringify({ ...options.header, alg: options.algorithm }))}.${textToBase64Url(JSON.stringify(payload))}`;
  if (options.algorithm === "none")
    return partialToken;
  const key = secret instanceof CryptoKey ? secret : await importKey(secret, algorithm, ["sign"]);
  const signature = await crypto.subtle.sign(algorithm, key, textToUint8Array(partialToken));
  return `${partialToken}.${arrayBufferToBase64Url(signature)}`;
}
__name(sign, "sign");
async function verify(token, secret, options = "HS256") {
  if (typeof options === "string")
    options = { algorithm: options };
  options = { algorithm: "HS256", clockTolerance: 0, throwError: false, ...options };
  if (typeof token !== "string")
    throw new Error("token must be a string");
  if (options.algorithm !== "none" && typeof secret !== "string" && typeof secret !== "object")
    throw new Error("secret must be a string, a JWK object or a CryptoKey object");
  if (typeof options.algorithm !== "string")
    throw new Error("options.algorithm must be a string");
  const tokenParts = token.split(".", 3);
  if (tokenParts.length < 2)
    throw new Error("token must consist of 2 or more parts");
  const [tokenHeader, tokenPayload, tokenSignature] = tokenParts;
  const algorithm = algorithms[options.algorithm];
  if (!algorithm)
    throw new Error("algorithm not found");
  const decodedToken = decode(token);
  try {
    if (decodedToken.header?.alg !== options.algorithm)
      throw new Error("INVALID_SIGNATURE");
    if (decodedToken.payload) {
      const now = Math.floor(Date.now() / 1e3);
      if (decodedToken.payload.nbf && decodedToken.payload.nbf > now && decodedToken.payload.nbf - now > (options.clockTolerance ?? 0))
        throw new Error("NOT_YET_VALID");
      if (decodedToken.payload.exp && decodedToken.payload.exp <= now && now - decodedToken.payload.exp > (options.clockTolerance ?? 0))
        throw new Error("EXPIRED");
    }
    if (algorithm.name === "none")
      return decodedToken;
    const key = secret instanceof CryptoKey ? secret : await importKey(secret, algorithm, ["verify"]);
    if (!await crypto.subtle.verify(algorithm, key, base64UrlToUint8Array(tokenSignature), textToUint8Array(`${tokenHeader}.${tokenPayload}`)))
      throw new Error("INVALID_SIGNATURE");
    return decodedToken;
  } catch (err) {
    if (options.throwError)
      throw err;
    return;
  }
}
__name(verify, "verify");
function decode(token) {
  return {
    header: decodePayload(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")),
    payload: decodePayload(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
  };
}
__name(decode, "decode");
var index_default = {
  sign,
  verify,
  decode
};

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
  const contentLength = request.headers.get("content-length");
  const MAX_PAYLOAD_SIZE = 262144;
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    return new Response(JSON.stringify({ error: "Payload too large. Maximum supported ingress payload size is 256 KB." }), {
      status: 413,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  let payload;
  try {
    const bodyText = await request.text();
    if (!contentLength) {
      const byteLength = new TextEncoder().encode(bodyText).length;
      if (byteLength > MAX_PAYLOAD_SIZE) {
        return new Response(JSON.stringify({ error: "Payload too large. Maximum supported ingress payload size is 256 KB." }), {
          status: 413,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
        });
      }
    }
    payload = JSON.parse(bodyText);
    if (!payload || typeof payload !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
      });
    }
    const requiredKeys = ["source_node", "target_destination", "error_reason", "payload"];
    for (const key of requiredKeys) {
      if (!(key in payload)) {
        return new Response(JSON.stringify({ error: `Bad Request: Missing required key '${key}'` }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
        });
      }
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
    const supabaseRestUrl = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}`;
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

// src/utils/webhook.ts
async function dispatchAlert(url, payload) {
  try {
    const textFields = [
      `**Action:** ${payload.action}`,
      `**Operator ID:** ${payload.operator_id}`
    ];
    if (payload.success_count !== void 0) {
      textFields.push(`**Success Count:** ${payload.success_count}`);
    }
    if (payload.fail_count !== void 0) {
      textFields.push(`**Fail Count:** ${payload.fail_count}`);
    }
    if (payload.records_purged !== void 0) {
      textFields.push(`**Records Purged:** ${payload.records_purged}`);
    }
    if (payload.total_volume !== void 0) {
      textFields.push(`**Total Volume:** ${payload.total_volume}`);
    }
    if (payload.pending_count !== void 0) {
      textFields.push(`**Pending:** ${payload.pending_count}`);
    }
    if (payload.patched_count !== void 0) {
      textFields.push(`**Patched:** ${payload.patched_count}`);
    }
    if (payload.resolved_count !== void 0) {
      textFields.push(`**Resolved:** ${payload.resolved_count}`);
    }
    if (payload.failed_count !== void 0) {
      textFields.push(`**Failed:** ${payload.failed_count}`);
    }
    if (payload.pruned_today !== void 0) {
      textFields.push(`**Pruned Today:** ${payload.pruned_today}`);
    }
    if (payload.error) {
      textFields.push(`**Error:** ${payload.error}`);
    }
    const message = {
      content: `\u{1F6A8} **AXiM Echo Recovery Alert** \u{1F6A8}

${textFields.join("\n")}`
    };
    if (!url || url.trim() === "") {
      console.log(`[DEV_MODE_WEBHOOK_BYPASS] ${JSON.stringify(message)}`);
      return;
    }
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });
  } catch (err) {
    console.error("Failed to dispatch alert webhook:", err);
  }
}
__name(dispatchAlert, "dispatchAlert");

// src/egress_replay.ts
var delay = /* @__PURE__ */ __name((ms) => new Promise((res) => setTimeout(res, ms)), "delay");
async function handleReplay(request, env, ctx, operator_id) {
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
  if (recordIds.length > 50) {
    return new Response(JSON.stringify({ error: "Batch limit exceeded. Please send a maximum of 50 records per request to prevent execution timeouts." }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
    });
  }
  try {
    const cleanIds = recordIds.map((id) => encodeURIComponent(String(id))).join(",");
    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?id=in.(${cleanIds})&select=*`;
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
      if (i > 0) {
        await delay(500);
      }
      const chunk = records.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async (record) => {
        const updateStatus = /* @__PURE__ */ __name(async (status, errorReason = null) => {
          const updateUrl = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?id=eq.${encodeURIComponent(record.id)}`;
          const body = { status };
          if (errorReason) {
            body.error_reason = errorReason;
          }
          await fetch(updateUrl, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": env.SUPABASE_ANON_KEY || "dummy",
              "Authorization": `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`
            },
            body: JSON.stringify(body)
          });
        }, "updateStatus");
        try {
          const targetUrl = record.target_destination;
          const bodyPayload = record.original_payload;
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
          const postResponse = await fetch(targetUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-AXiM-Recovery-Trace": `echo-${record.id}`
            },
            body: typeof bodyPayload === "string" ? bodyPayload : JSON.stringify(bodyPayload)
          });
          if (!postResponse.ok) {
            let responseText = "";
            try {
              responseText = await postResponse.text();
            } catch (e) {
              responseText = "Could not read response text";
            }
            const errorMsg = `Replay Failed: ${postResponse.status} - ${responseText}`;
            await updateStatus("failed", errorMsg);
            return { id: record.id, success: false, error: errorMsg };
          }
          await updateStatus("resolved", null);
          return { id: record.id, success: true, updatedStatus: true };
        } catch (err) {
          const errorMsg = `Replay Exception: ${err.message}`;
          await updateStatus("failed", errorMsg);
          return { id: record.id, success: false, error: errorMsg };
        }
      });
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      action: "BATCH_REPLAY",
      triggered_by: operator_id,
      success_count: successCount,
      fail_count: failCount
    };
    recentLogs.unshift(newLog);
    recentLogs = recentLogs.slice(0, 20);
    await env.ECHO_STATE_KV.put("recent_audit_logs", JSON.stringify(recentLogs));
    ctx.waitUntil(dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
      action: "BATCH_REPLAY",
      operator_id,
      success_count: successCount,
      fail_count: failCount
    }));
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
function extractJsonFromMarkdown(llmResponse) {
  try {
    return JSON.parse(llmResponse);
  } catch {
    const match = llmResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (innerError) {
        throw new Error(`Failed to parse extracted JSON block: ${innerError.message}`);
      }
    }
    const startIdx = llmResponse.indexOf("{");
    const endIdx = llmResponse.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonCandidate = llmResponse.slice(startIdx, endIdx + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (innerError) {
        throw new Error(`Failed to parse JSON substring: ${innerError.message}`);
      }
    }
    throw new Error("No valid JSON could be extracted from the AI response.");
  }
}
__name(extractJsonFromMarkdown, "extractJsonFromMarkdown");
async function handleTriage(request, env, operator_id) {
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
    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?id=eq.${encodeURIComponent(recordId)}&select=*`;
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
    const errorReason = record.error_reason || "Unknown error";
    let proposedPatch;
    try {
      const proxyPayload = {
        model: "deepseek-coder",
        messages: [
          {
            role: "system",
            content: "You are an autonomous data recovery system. Analyze the provided original JSON payload and the error reason. Return ONLY the corrected JSON object that fixes the error. Do not include any explanations, markdown formatting, or preamble. Return raw valid JSON."
          },
          {
            role: "user",
            content: `Error Reason: ${errorReason}

Original Payload: ${JSON.stringify(originalPayload)}`
          }
        ]
      };
      const proxyUrl = env.AXIM_LLM_PROXY_URL || "https://api.axim.us.com/v1/proxy/llm";
      const aiResponse = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.AXIM_INTERNAL_KEY}`
          // Using internal key for proxy auth
        },
        body: JSON.stringify(proxyPayload)
      });
      if (!aiResponse.ok) {
        const aiErr = await aiResponse.text();
        throw new Error(`AI Proxy responded with ${aiResponse.status}: ${aiErr}`);
      }
      const aiData = await aiResponse.json();
      const llmText = aiData.choices?.[0]?.message?.content || aiData.response || "";
      proposedPatch = extractJsonFromMarkdown(llmText);
    } catch (aiError) {
      console.error("AI Patch Generation Failed:", aiError);
      proposedPatch = {
        ...originalPayload,
        __onyx_patch_failed: true,
        _triage_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        fallback_reason: `AI Proxy Failure: ${aiError.message}`
      };
    }
    const updateUrl = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?id=eq.${encodeURIComponent(recordId)}`;
    const updateResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_ANON_KEY || "dummy",
        "Authorization": `Bearer ${env.SUPABASE_ANON_KEY || "dummy"}`
      },
      body: JSON.stringify({
        status: "patched",
        proposed_patch: proposedPatch
      })
    });
    if (!updateResponse.ok) {
      const updateErr = await updateResponse.text();
      return new Response(JSON.stringify({ error: "Failed to update record with patch", details: updateErr }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(request) }
      });
    }
    try {
      const logsStr = await env.ECHO_STATE_KV.get("recent_audit_logs");
      const logs = logsStr ? JSON.parse(logsStr) : [];
      const newLog = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action: "COGNITIVE_TRIAGE",
        triggered_by: operator_id,
        target_record: recordId
      };
      logs.unshift(newLog);
      const slicedLogs = logs.slice(0, 20);
      await env.ECHO_STATE_KV.put("recent_audit_logs", JSON.stringify(slicedLogs));
    } catch (logErr) {
      console.error("Failed to write to audit log:", logErr);
    }
    return new Response(JSON.stringify({ success: true, patched: true, patch: proposedPatch }), {
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

// src/prune_records.ts
async function pruneRecords(env, ctx, operator_id = "system_cron") {
  const sevenDaysAgo = /* @__PURE__ */ new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffTimestamp = sevenDaysAgo.toISOString();
  const queryParams = new URLSearchParams({
    status: "eq.resolved",
    updated_at: `lte.${cutoffTimestamp}`
  });
  const url = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?${queryParams.toString()}`;
  const updateKV = /* @__PURE__ */ __name(async (newLog) => {
    let logs = [];
    try {
      const existingLogsStr = await env.ECHO_STATE_KV.get("last_prune_run");
      if (existingLogsStr) {
        const existingLogs = JSON.parse(existingLogsStr);
        if (Array.isArray(existingLogs)) {
          logs = existingLogs;
        } else {
          logs = [existingLogs];
        }
      }
    } catch (e) {
      console.error("Failed to parse existing logs", e);
    }
    logs.unshift(newLog);
    logs = logs.slice(0, 5);
    await env.ECHO_STATE_KV.put("last_prune_run", JSON.stringify(logs));
    let auditLogs = [];
    try {
      const auditLogsStr = await env.ECHO_STATE_KV.get("recent_audit_logs");
      if (auditLogsStr) {
        auditLogs = JSON.parse(auditLogsStr);
        if (!Array.isArray(auditLogs)) auditLogs = [];
      }
    } catch (e) {
      console.error("Failed to parse recent audit logs", e);
    }
    const auditLog = {
      timestamp: newLog.timestamp,
      action: "DATABASE_PRUNE",
      triggered_by: newLog.triggered_by,
      success_count: newLog.records_purged,
      fail_count: newLog.status === "error" ? 1 : 0
    };
    auditLogs.unshift(auditLog);
    auditLogs = auditLogs.slice(0, 20);
    await env.ECHO_STATE_KV.put("recent_audit_logs", JSON.stringify(auditLogs));
  }, "updateKV");
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "apikey": env.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${env.SUPABASE_JWT_SECRET}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
        // To get the deleted records and count them
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to prune records: ${response.status} - ${errorText}`);
      await updateKV({
        triggered_by: operator_id,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        records_purged: 0,
        status: "error",
        error: errorText
      });
      ctx.waitUntil(dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
        action: "DATABASE_PRUNE",
        operator_id,
        records_purged: 0,
        error: errorText
      }));
      return { success: false, error: errorText };
    }
    const deletedRecords = await response.json();
    console.log(`Successfully pruned ${deletedRecords.length} resolved records older than 7 days.`);
    await updateKV({
      triggered_by: operator_id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      records_purged: deletedRecords.length,
      status: "success"
    });
    ctx.waitUntil(dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
      action: "DATABASE_PRUNE",
      operator_id,
      records_purged: deletedRecords.length
    }));
    return { success: true, count: deletedRecords.length };
  } catch (error) {
    console.error("Error executing prune records logic:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    await updateKV({
      triggered_by: operator_id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      records_purged: 0,
      status: "error",
      error: errorMsg
    });
    ctx.waitUntil(dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
      action: "DATABASE_PRUNE",
      operator_id,
      records_purged: 0,
      error: errorMsg
    }));
    return { success: false, error: errorMsg };
  }
}
__name(pruneRecords, "pruneRecords");

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-axim-internal-key"
  };
}
__name(getCorsHeaders, "getCorsHeaders");
async function verifyJwt(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { isValid: false, payload: null };
  }
  const token = authHeader.split(" ")[1];
  try {
    const secret = env.SUPABASE_JWT_SECRET;
    if (!secret) return { isValid: false, payload: null };
    const isValid = await index_default.verify(token, secret);
    let payload = null;
    if (isValid) {
      const decoded = index_default.decode(token);
      payload = decoded.payload;
    }
    return { isValid, payload };
  } catch (err) {
    return { isValid: false, payload: null };
  }
}
__name(verifyJwt, "verifyJwt");
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    if (request.method === "GET" && (url.pathname === "/api/v1/health" || url.pathname === "/health")) {
      return new Response(JSON.stringify({ status: "healthy", timestamp: Date.now(), region: request.cf?.colo || "local" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (request.method === "POST" && url.pathname === "/api/v1/ingest-failure") {
      return handleIngress(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/v1/simulate-failure") {
      const authHeader = request.headers.get("x-axim-internal-key");
      if (authHeader !== env.AXIM_INTERNAL_KEY) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      const dummyPayload = {
        source_node: "CRM Enrichment Bridge",
        target_destination: "AXiM Core Pipeline",
        error_reason: "Simulated Environment Failure (E2E Test)",
        payload: { simulated: true, timestamp: Date.now(), bad_data: "<<CORRUPTED>>" }
      };
      const simulatedRequest = new Request("http://localhost/api/v1/ingest-failure", {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(dummyPayload)
      });
      return handleIngress(simulatedRequest, env);
    }
    if (request.method === "POST" && url.pathname === "/api/v1/replay") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
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
          headers: { "Content-Type": "application/json", ...corsHeaders }
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
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      const operator_id = payload?.email || payload?.sub || "unknown";
      const result = await pruneRecords(env, ctx, operator_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (request.method === "GET" && url.pathname === "/api/v1/proxy-status") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      const proxyUrl = env.AXIM_LLM_PROXY_URL || "https://api.axim.us.com/v1/proxy/llm";
      const start = Date.now();
      let status = "Unknown";
      let tier = "deepseek-coder";
      let latency = 0;
      try {
        const pingResponse = await fetch(proxyUrl, {
          method: "OPTIONS",
          // Fast probe
          headers: {
            "Authorization": `Bearer ${env.AXIM_INTERNAL_KEY}`
          }
        });
        latency = Date.now() - start;
        if (pingResponse.ok || pingResponse.status === 405 || pingResponse.status === 404 || pingResponse.status === 200 || pingResponse.status === 204) {
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
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    if (request.method === "GET" && url.pathname === "/api/v1/audit-logs") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      try {
        const logsStr = await env.ECHO_STATE_KV.get("recent_audit_logs");
        const logs = logsStr ? JSON.parse(logsStr) : [];
        return new Response(JSON.stringify(logs), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    if (request.method === "GET" && url.pathname === "/api/v1/system-status") {
      const { isValid, payload } = await verifyJwt(request, env);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      try {
        const lastPruneRunStr = await env.ECHO_STATE_KV.get("last_prune_run");
        const lastPruneRun = lastPruneRunStr ? JSON.parse(lastPruneRunStr) : null;
        return new Response(JSON.stringify({ last_prune_run: lastPruneRun }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
    }
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  },
  async scheduled(event, env, ctx) {
    const pruneResult = await pruneRecords(env, ctx, "system_cron");
    try {
      const url = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?select=status`;
      const response = await fetch(url, {
        headers: {
          "apikey": env.SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${env.SUPABASE_JWT_SECRET}`,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const records = await response.json();
        let pending = 0, patched = 0, resolved = 0, failed = 0;
        for (const record of records) {
          if (record.status === "pending") pending++;
          else if (record.status === "patched") patched++;
          else if (record.status === "resolved") resolved++;
          else if (record.status === "error" || record.status === "failed") failed++;
        }
        ctx.waitUntil(dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
          action: "DAILY_DIGEST",
          operator_id: "system_cron",
          total_volume: records.length,
          pending_count: pending,
          patched_count: patched,
          resolved_count: resolved,
          failed_count: failed,
          pruned_today: pruneResult.count || 0
        }));
      }
    } catch (err) {
      console.error("Failed to dispatch daily digest:", err);
    }
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

// .wrangler/tmp/bundle-xp9aOO/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-xp9aOO/middleware-loader.entry.ts
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
