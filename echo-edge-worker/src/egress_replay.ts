import { Env, getCorsHeaders } from './index';

const TABLE_NAME = 'echo_dlq_records_1783829654384';

export async function handleReplay(request: Request, env: Env): Promise<Response> {
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
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Bad Request: Invalid JSON', details: (error as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
    });
  }

  const recordIds = (payload as any).recordIds;

  if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Bad Request: recordIds must be a non-empty array' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
    });
  }

  try {
    // 1. Fetch records from Supabase
    // Depending on Supabase setup, if ID is UUID it shouldn't need quotes in `in.()`,
    // but the API usually expects `in.(id1,id2)`. Let's just join them safely.
    // Assuming IDs are numeric or safe strings without commas.
    const cleanIds = recordIds.map(id => encodeURIComponent(String(id))).join(',');

    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=in.(${cleanIds})&select=*`;

    const getResponse = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY || 'dummy',
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY || 'dummy'}`,
      }
    });

    if (!getResponse.ok) {
      const err = await getResponse.text();
      throw new Error(`Failed to fetch records: ${err}`);
    }

    const records = await getResponse.json() as any[];

    if (!records || records.length === 0) {
      return new Response(JSON.stringify({ error: 'No matching records found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
      });
    }

    const results = [];
    const chunkSize = 5;

    // 2. Concurrency Queue - Chunks of 5
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);

      const chunkPromises = chunk.map(async (record) => {
        const updateStatus = async (status: string, errorReason: string | null = null) => {
          const updateUrl = `${env.SUPABASE_URL}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(record.id)}`;
          const body: any = { status };
          if (errorReason) {
            body.error_reason = errorReason;
          }
          await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': env.SUPABASE_ANON_KEY || 'dummy',
              'Authorization': `Bearer ${env.SUPABASE_ANON_KEY || 'dummy'}`,
            },
            body: JSON.stringify(body)
          });
        };

        try {
          const targetUrl = record.target_destination;
          const bodyPayload = record.original_payload;

          if (!targetUrl) {
             const errorMsg = 'No target_destination';
             await updateStatus('failed', errorMsg);
             return { id: record.id, success: false, error: errorMsg };
          }

          // POST to target destination
          const postResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: typeof bodyPayload === 'string' ? bodyPayload : JSON.stringify(bodyPayload)
          });

          if (!postResponse.ok) {
            const errorMsg = `Replay Failed: ${postResponse.status}`;
            await updateStatus('failed', errorMsg);
            return { id: record.id, success: false, error: errorMsg };
          }

          // 3. Update Supabase record status to resolved
          await updateStatus('resolved', null);

          return { id: record.id, success: true, updatedStatus: true };

        } catch (err) {
          const errorMsg = `Replay Exception: ${(err as Error).message}`;
          await updateStatus('failed', errorMsg);
          return { id: record.id, success: false, error: errorMsg };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...(getCorsHeaders(request)) },
    });
  }
}
