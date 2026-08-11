export async function pruneRecords(env, operator_id = 'system_cron') {
    // Calculate timestamp for 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTimestamp = sevenDaysAgo.toISOString();
    const queryParams = new URLSearchParams({
        status: 'eq.resolved',
        updated_at: `lte.${cutoffTimestamp}`
    });
    const url = `${env.SUPABASE_URL}/rest/v1/echo_dlq_records?${queryParams.toString()}`;
    const updateKV = async (newLog) => {
        let logs = [];
        try {
            const existingLogsStr = await env.ECHO_STATE_KV.get('last_prune_run');
            if (existingLogsStr) {
                const existingLogs = JSON.parse(existingLogsStr);
                if (Array.isArray(existingLogs)) {
                    logs = existingLogs;
                }
                else {
                    logs = [existingLogs];
                }
            }
        }
        catch (e) {
            console.error("Failed to parse existing logs", e);
        }
        logs.unshift(newLog);
        logs = logs.slice(0, 5);
        await env.ECHO_STATE_KV.put('last_prune_run', JSON.stringify(logs));
    };
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
            await updateKV({
                triggered_by: operator_id,
                timestamp: new Date().toISOString(),
                records_purged: 0,
                status: 'error',
                error: errorText
            });
            return { success: false, error: errorText };
        }
        const deletedRecords = await response.json();
        console.log(`Successfully pruned ${deletedRecords.length} resolved records older than 7 days.`);
        await updateKV({
            triggered_by: operator_id,
            timestamp: new Date().toISOString(),
            records_purged: deletedRecords.length,
            status: 'success'
        });
        return { success: true, count: deletedRecords.length };
    }
    catch (error) {
        console.error('Error executing prune records logic:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        await updateKV({
            triggered_by: operator_id,
            timestamp: new Date().toISOString(),
            records_purged: 0,
            status: 'error',
            error: errorMsg
        });
        return { success: false, error: errorMsg };
    }
}
