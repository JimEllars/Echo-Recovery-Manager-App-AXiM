// This service abstracts the interaction with Supabase and the Edge Workers
import { supabase } from '../supabase/supabase';

const TABLE_NAME = 'echo_dlq_records_1783829654384';

export const echoService = {
  async fetchRecords(filters = {}) {
    // Fallback if Supabase not connected
    if (!import.meta.env.VITE_SUPABASE_URL) {
      return { data: [], error: 'Storage not connected' };
    }

    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.node) query = query.eq('source_node', filters.node);

    return await query;
  },

  async approvePatch(recordId, patch) {
    if (!import.meta.env.VITE_SUPABASE_URL) {
      return { error: 'Storage not connected' };
    }

    return await supabase
      .from(TABLE_NAME)
      .update({ proposed_patch: patch, status: 'patched' })
      .eq('id', recordId);
  },

  async triggerReplay(recordIds) {
    // In production, this calls the Cloudflare Worker endpoint
    console.log(`Triggering replay for ${recordIds.length} records...`);
    
    const workerUrl = import.meta.env.VITE_WORKER_URL;
    if (!workerUrl) {
      console.warn("VITE_WORKER_URL is not set. Simulating replay locally.");
      return new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const apiUrl = `${workerUrl}/api/v1/replay`;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers = {
            'Content-Type': 'application/json',
            'x-axim-internal-key': import.meta.env.VITE_AXIM_INTERNAL_KEY || 'your-secret-key'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ recordIds })
        });

        if (!response.ok) {
             if (response.status === 401) {
                 console.error("Token expired or unauthorized. Signing out.");
                 await supabase.auth.signOut();
                 return { error: 'Unauthorized. Session expired.' };
             }
             const errorText = await response.text();
             console.error("Worker replay failed", errorText);
             return { error: 'Failed to trigger replay in worker' };
        }

        const data = await response.json();
        return data;

    } catch(err) {
        console.error("Worker replay request failed:", err);
        return { error: 'Failed to trigger replay request' };
    }
  },

  // Expose table name for subscriptions


  async triggerTriage(recordId) {
    const workerUrl = import.meta.env.VITE_WORKER_URL;
    if (!workerUrl) {
      console.warn("VITE_WORKER_URL is not set.");
      return { error: 'Worker URL not configured' };
    }

    const apiUrl = `${workerUrl}/api/v1/triage`;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers = {
            'Content-Type': 'application/json',
            'x-axim-internal-key': import.meta.env.VITE_AXIM_INTERNAL_KEY || 'your-secret-key'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({ recordId })
        });

        if (!response.ok) {
             if (response.status === 401) {
                 console.error("Token expired or unauthorized. Signing out.");
                 await supabase.auth.signOut();
                 return { error: 'Unauthorized. Session expired.' };
             }
             const errorText = await response.text();
             console.error("Worker triage failed", errorText);
             return { error: 'Failed to trigger triage in worker' };
        }

        const data = await response.json();
        return data;

    } catch(err) {
        console.error("Worker triage request failed:", err);
        return { error: 'Failed to trigger triage request' };
    }
  },

  async fetchSystemStatus() {
    const workerUrl = import.meta.env.VITE_WORKER_URL;
    if (!workerUrl) {
      console.warn("VITE_WORKER_URL is not set.");
      return { error: 'Worker URL not configured' };
    }

    const apiUrl = `${workerUrl}/api/v1/system-status`;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const headers = {
            'Content-Type': 'application/json',
            'x-axim-internal-key': import.meta.env.VITE_AXIM_INTERNAL_KEY || 'your-secret-key'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
             if (response.status === 401) {
                 console.error("Token expired or unauthorized. Signing out.");
                 await supabase.auth.signOut();
                 return { error: 'Unauthorized. Session expired.' };
             }
             const errorText = await response.text();
             console.error("Worker system-status fetch failed", errorText);
             return { error: 'Failed to fetch system status from worker' };
        }

        const data = await response.json();
        return data;

    } catch(err) {
        console.error("Worker system-status request failed:", err);
        return { error: 'Failed to fetch system status' };
    }
  },

  getTableName() {

    return TABLE_NAME;
  }
};
