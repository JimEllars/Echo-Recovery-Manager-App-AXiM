import { Env, getCorsHeaders } from './index';

const TABLE_NAME = 'echo_dlq_records_1783829654384';

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

    // 2. Generate a stubbed JSON patch response (Structural piping)
    // We are NOT integrating DeepSeek/Anthropic yet. Just stubbing a patch.
    const stubbedPatch = {
      ...originalPayload,
      __onyx_patched: true,
      _triage_timestamp: new Date().toISOString(),
      resolved_reason: "Stubbed AI Patch Applied"
    };

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
        proposed_patch: stubbedPatch
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
    return new Response(JSON.stringify({ success: true, patched: true, patch: stubbedPatch }), {
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
