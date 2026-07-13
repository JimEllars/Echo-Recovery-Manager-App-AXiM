export interface Env {
  AXIM_INTERNAL_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-axim-internal-key',
  };
}

import { handleIngress } from './ingress';
import { handleReplay } from './egress_replay';
import { handleTriage } from './cognitive_triage';

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
      return handleReplay(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/api/v1/triage') {
      return handleTriage(request, env);
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
