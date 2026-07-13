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
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-axim-internal-key': import.meta.env.VITE_AXIM_INTERNAL_KEY || 'your-secret-key'
            },
            body: JSON.stringify({ recordIds })
        });

        if (!response.ok) {
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
  getTableName() {
    return TABLE_NAME;
  }
};
