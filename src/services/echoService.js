// This service abstracts the interaction with Supabase and the Edge Workers
import { supabase } from '../supabase/supabase';

export const echoService = {
  async fetchRecords(filters = {}) {
    // Fallback to mock if Supabase not connected
    if (!import.meta.env.VITE_SUPABASE_URL) {
      return { data: [], error: 'Storage not connected' };
    }

    let query = supabase
      .from('echo_dlq_records_1783829654384')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.node) query = query.eq('source_node', filters.node);

    return await query;
  },

  async approvePatch(recordId, patch) {
    return await supabase
      .from('echo_dlq_records_1783829654384')
      .update({ proposed_patch: patch, status: 'patched' })
      .eq('id', recordId);
  },

  async triggerReplay(recordIds) {
    // In production, this calls the Cloudflare Worker endpoint
    console.log(`Triggering replay for ${recordIds.length} records...`);
    
    // Simulate API call to /api/v1/replay
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
};