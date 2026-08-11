import { Env } from './index';

export async function pruneRecords(env: Env): Promise<void> {
  // Calculate timestamp for 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffTimestamp = sevenDaysAgo.toISOString();

  const queryParams = new URLSearchParams({
    status: 'eq.resolved',
    updated_at: `lte.${cutoffTimestamp}`
  });

  const url = `${env.SUPABASE_URL}/rest/v1/echo_dlq_records?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_JWT_SECRET}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation' // To get the deleted records and count them
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to prune records: ${response.status} - ${errorText}`);

      await env.ECHO_STATE_KV.put('last_prune_run', JSON.stringify({
        timestamp: new Date().toISOString(),
        records_purged: 0,
        status: 'error',
        error: errorText
      }));

      return;
    }

    const deletedRecords = await response.json() as any[];
    console.log(`Successfully pruned ${deletedRecords.length} resolved records older than 7 days.`);

    await env.ECHO_STATE_KV.put('last_prune_run', JSON.stringify({
      timestamp: new Date().toISOString(),
      records_purged: deletedRecords.length,
      status: 'success'
    }));
  } catch (error) {
    console.error('Error executing prune records logic:', error);
    await env.ECHO_STATE_KV.put('last_prune_run', JSON.stringify({
      timestamp: new Date().toISOString(),
      records_purged: 0,
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    }));
  }
}
