import { Env, getCorsHeaders } from './index';

const TABLE_NAME = 'echo_dlq_records_1783829654384';

/**
 * Extracts valid JSON from a string that might be wrapped in Markdown code blocks.
 * Handles ```json ... ``` and plain ``` ... ``` blocks.
 */
function extractJsonFromMarkdown(llmResponse: string): any {
  try {
    // If it's already a valid JSON string, parse it directly
    return JSON.parse(llmResponse);
  } catch {
    // Match everything inside markdown code blocks, non-greedy
    const match = llmResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (innerError) {
        throw new Error(`Failed to parse extracted JSON block: ${(innerError as Error).message}`);
      }
    }

    // If no markdown blocks, try to find the first '{' and last '}'
    const startIdx = llmResponse.indexOf('{');
    const endIdx = llmResponse.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonCandidate = llmResponse.slice(startIdx, endIdx + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (innerError) {
        throw new Error(`Failed to parse JSON substring: ${(innerError as Error).message}`);
      }
    }

    throw new Error('No valid JSON could be extracted from the AI response.');
  }
}

export async function handleTriage(request: Request, env: Env): Promise<Response> {
  // Validate Authorization header
  const authHeader = request.headers.get('x-axim-internal-key') || request.headers.get('Authorization');

  let isValid = false;
  if (authHeader === env.AXIM_INTERNAL_KEY) {
    isValid = true;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === env.AXIM_INTERNAL_KEY) {
       isValid = true;
    }
  }

  if (!isValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Bad Request: Invalid JSON', details: (error as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
    });
  }

  const recordId = (payload as any).recordId;

  if (!recordId) {
    return new Response(JSON.stringify({ error: 'Bad Request: recordId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
    });
  }

  try {
    // 1. Fetch the raw JSON payload from the Supabase echo_dlq_records table
    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(recordId)}&select=*`;
    const getResponse = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY || 'dummy',
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY || 'dummy'}`,
      }
    });

    if (!getResponse.ok) {
      const err = await getResponse.text();
      throw new Error(`Failed to fetch record: ${err}`);
    }

    const records = await getResponse.json() as any[];

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
      });
    }

    const record = records[0];
    const originalPayload = record.original_payload;
    const errorReason = record.error_reason || 'Unknown error';

    // 2. Query the AXiM LLM Proxy
    let proposedPatch;
    try {
      const proxyPayload = {
        model: 'deepseek-coder',
        messages: [
          {
            role: 'system',
            content: 'You are an autonomous data recovery system. Analyze the provided original JSON payload and the error reason. Return ONLY the corrected JSON object that fixes the error. Do not include any explanations, markdown formatting, or preamble. Return raw valid JSON.'
          },
          {
            role: 'user',
            content: `Error Reason: ${errorReason}\n\nOriginal Payload: ${JSON.stringify(originalPayload)}`
          }
        ]
      };

      // Fallback proxy URL for development/production
      const proxyUrl = 'https://api.axim.us.com/v1/proxy/llm';

      const aiResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.AXIM_INTERNAL_KEY}` // Using internal key for proxy auth
        },
        body: JSON.stringify(proxyPayload)
      });

      if (!aiResponse.ok) {
         const aiErr = await aiResponse.text();
         throw new Error(`AI Proxy responded with ${aiResponse.status}: ${aiErr}`);
      }

      const aiData = await aiResponse.json() as any;

      // Extract the text response (assuming OpenAI-like standard response format)
      const llmText = aiData.choices?.[0]?.message?.content || aiData.response || '';

      proposedPatch = extractJsonFromMarkdown(llmText);

    } catch (aiError) {
      console.error("AI Patch Generation Failed:", aiError);
      // Fallback for development if the proxy is unreachable
      proposedPatch = {
        ...originalPayload,
        __onyx_patch_failed: true,
        _triage_timestamp: new Date().toISOString(),
        fallback_reason: `AI Proxy Failure: ${(aiError as Error).message}`
      };
    }

    // 3. Update the Supabase record to 'patched' status
    const updateUrl = `${env.SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(recordId)}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_ANON_KEY || 'dummy',
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY || 'dummy'}`,
      },
      body: JSON.stringify({
        status: 'patched',
        proposed_patch: proposedPatch
      })
    });

    if (!updateResponse.ok) {
      const updateErr = await updateResponse.text();
      return new Response(JSON.stringify({ error: 'Failed to update record with patch', details: updateErr }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
      });
    }

    // 4. Return the response
    return new Response(JSON.stringify({ success: true, patched: true, patch: proposedPatch }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
    });
  }
}
