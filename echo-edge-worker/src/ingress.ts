export interface Env {
  AXIM_INTERNAL_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Axim-Internal-Key',
        },
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/ingest-failure') {
      // Validate Authorization header
      const authHeader = request.headers.get('X-Axim-Internal-Key') || request.headers.get('Authorization');

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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      try {
        const payload = await request.json();

        // Validate basic payload structure
        if (!payload || typeof payload !== 'object') {
            return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              });
        }

        // Prepare the record for insertion into Supabase
        const record = {
          source_node: payload.source_node || 'Unknown Source',
          target_destination: payload.target_destination || 'Unknown Target',
          error_reason: payload.error_reason || 'Unknown Error',
          original_payload: payload.original_payload || payload,
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
            'apikey': env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal' // We don't need the inserted record back
          },
          body: JSON.stringify(record)
        });

        if (!response.ok) {
           const errorText = await response.text();
           console.error("Supabase insert failed", errorText);
           return new Response(JSON.stringify({ error: 'Failed to insert record into database' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        return new Response(JSON.stringify({ success: true, message: 'Record ingested successfully' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: 'Bad Request: Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },
};
