import { Env, getCorsHeaders } from './index';

export async function handleIngress(request: Request, env: Env): Promise<Response> {
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
      headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
    });
  }

  let payload;
  try {
    payload = await request.json();

    // Validate basic payload structure
    if (!payload || typeof payload !== 'object') {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
          });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Bad Request: Invalid JSON', details: (error as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
    });
  }

  try {
    // Prepare the record for insertion into Supabase
    const record = {
      source_node: (payload as any).source_node || 'Unknown Source',
      target_destination: (payload as any).target_destination || 'Unknown Target',
      error_reason: (payload as any).error_reason || 'Unknown Error',
      original_payload: (payload as any).original_payload || payload,
      status: 'pending',
      // Supabase will automatically handle id and created_at if set up properly.
      // If we need to pass a specific timestamp, we can.
    };

    // Insert into Supabase via REST API
    const supabaseRestUrl = `${env.SUPABASE_URL}/rest/v1/echo_dlq_records_1783829654384`;

    const response = await fetch(supabaseRestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_ANON_KEY || 'dummy',
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY || 'dummy'}`,
        'Prefer': 'return=minimal' // We don't need the inserted record back
      },
      body: JSON.stringify(record)
    });

    if (!response.ok) {
       const errorText = await response.text();
       console.error("Supabase insert failed", errorText);
       return new Response(JSON.stringify({ error: 'Failed to insert record into database', details: errorText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Record ingested successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
    });

  } catch (error) {
    console.error("Fetch failed", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
    });
  }
}
