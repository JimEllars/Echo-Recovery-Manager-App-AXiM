// This service abstracts the interaction with Supabase and the Edge Workers
import { supabase } from '../supabase/supabase';
import { toast } from 'react-toastify';

const TABLE_NAME = 'echo_dlq_records_1783829654384';
const BASE_URL = import.meta.env.VITE_EDGE_WORKER_URL || 'http://localhost:8787';

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

  async triggerReplay(recordIds, onProgress) {
    // In production, this calls the Cloudflare Worker endpoint
    console.log(`Triggering replay for ${recordIds.length} records...`);
    
    const apiUrl = `${BASE_URL}/api/v1/replay`;

    const CHUNK_SIZE = 50;
    const chunks = [];
    for (let i = 0; i < recordIds.length; i += CHUNK_SIZE) {
      chunks.push(recordIds.slice(i, i + CHUNK_SIZE));
    }

    let masterResults = [];
    let totalChunks = chunks.length;

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

        let currentChunkIndex = 0;
        for (const chunk of chunks) {
            currentChunkIndex++;
            if (onProgress) {
                onProgress(currentChunkIndex, totalChunks);
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({ recordIds: chunk })
            });

            if (!response.ok) {
                 if (response.status === 401) {
                     console.error("Token expired or unauthorized. Signing out.");
                     await supabase.auth.signOut();
                     toast.error("Session expired. Please log in again.");
                     return { error: 'Unauthorized. Session expired.' };
                 }
                 const errorText = await response.text();
                 console.error("Worker replay failed", errorText);
                 toast.error(`Replay Failed on batch ${currentChunkIndex}: ${response.status} - Edge Node Unreachable. Please try again.`);
                 return { error: `Failed to trigger replay in worker on batch ${currentChunkIndex}` };
            }

            const data = await response.json();
            if (data.results) {
                masterResults = masterResults.concat(data.results);
            }
        }

        return { success: true, results: masterResults };

    } catch(err) {
        console.error("Worker replay request failed:", err);
        toast.error(`Network Error: ${err.message || 'Edge Node Unreachable. Please try again.'}`);
        return { error: 'Failed to trigger replay request' };
    }
  },

  // Expose table name for subscriptions


  async triggerTriage(recordId) {
    const apiUrl = `${BASE_URL}/api/v1/triage`;

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
                 toast.error("Session expired. Please log in again.");
                 return { error: 'Unauthorized. Session expired.' };
             }
             const errorText = await response.text();
             console.error("Worker triage failed", errorText);
             toast.error(`Triage Failed: ${response.status} - Edge Node Unreachable. Please try again.`);
             return { error: 'Failed to trigger triage in worker' };
        }

        const data = await response.json();
        return data;

    } catch(err) {
        console.error("Worker triage request failed:", err);
        return { error: 'Failed to trigger triage request' };
    }
  },

  async forcePruneDatabase() {
    const apiUrl = `${BASE_URL}/api/v1/force-prune`;

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
            headers
        });

        if (!response.ok) {
             if (response.status === 401) {
                 console.error("Token expired or unauthorized. Signing out.");
                 await supabase.auth.signOut();
                 toast.error("Session expired. Please log in again.");
                 return { error: 'Unauthorized. Session expired.' };
             }
             const errorText = await response.text();
             console.error("Worker force prune failed", errorText);
             return { error: 'Failed to trigger force prune in worker' };
        }

        const data = await response.json();
        return data;

    } catch(err) {
        console.error("Worker force prune request failed:", err);
        return { error: 'Failed to trigger force prune request' };
    }
  },

  async fetchSystemStatus() {
    const apiUrl = `${BASE_URL}/api/v1/system-status`;

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
                 toast.error("Session expired. Please log in again.");
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


  async fetchAuditLogs() {
    const apiUrl = `${BASE_URL}/api/v1/audit-logs`;

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
                 toast.error("Session expired. Please log in again.");
                 return { error: 'Unauthorized. Session expired.' };
             }
             const errorText = await response.text();
             console.error("Worker audit-logs fetch failed", errorText);
             return { error: 'Failed to fetch audit logs from worker' };
        }

        const data = await response.json();
        return { data };

    } catch(err) {
        console.error("Worker audit-logs request failed:", err);
        return { error: 'Failed to fetch audit logs' };
    }
  },

  getTableName() {

    return TABLE_NAME;
  }
};
