import { Env } from "./index";
import { dispatchAlert } from "./utils/webhook";

export async function pruneRecords(
  env: Env,
  ctx: ExecutionContext,
  operator_id: string = "system_cron",
): Promise<{ success: boolean; count?: number; error?: string }> {
  const requiredVars = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_JWT_SECRET",
    "DLQ_TABLE_NAME",
  ];
  const missingVars = requiredVars.filter((v) => !(env as any)[v]);
  if (missingVars.length > 0 || !env.ECHO_STATE_KV) {
    return { success: false, error: "CONFIGURATION_ERROR" };
  }
  // Calculate timestamp for 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffTimestamp = sevenDaysAgo.toISOString();

  const queryParams = new URLSearchParams({
    status: "in.(resolved,failed,error)",
    updated_at: `lte.${cutoffTimestamp}`,
  });

  const url = `${env.SUPABASE_URL}/rest/v1/${env.DLQ_TABLE_NAME}?${queryParams.toString()}`;

  const updateKV = async (newLog: any) => {
    // 1. Update last_prune_run
    let logs = [];
    try {
      const existingLogsStr = await env.ECHO_STATE_KV.get("last_prune_run");
      if (existingLogsStr) {
        const existingLogs = JSON.parse(existingLogsStr);
        if (Array.isArray(existingLogs)) {
          logs = existingLogs;
        } else {
          logs = [existingLogs];
        }
      }
    } catch (e) {
      console.error("Failed to parse existing logs", e);
    }

    logs.unshift(newLog);
    logs = logs.slice(0, 5);
    await env.ECHO_STATE_KV.put("last_prune_run", JSON.stringify(logs));

    // 2. Update recent_audit_logs
    let auditLogs = [];
    try {
      const auditLogsStr = await env.ECHO_STATE_KV.get("recent_audit_logs");
      if (auditLogsStr) {
        auditLogs = JSON.parse(auditLogsStr);
        if (!Array.isArray(auditLogs)) auditLogs = [];
      }
    } catch (e) {
      console.error("Failed to parse recent audit logs", e);
    }

    const auditLog = {
      timestamp: newLog.timestamp,
      action: "DATABASE_PRUNE",
      triggered_by: newLog.triggered_by,
      success_count: newLog.records_purged,
      fail_count: newLog.status === "error" ? 1 : 0,
    };

    auditLogs.unshift(auditLog);
    auditLogs = auditLogs.slice(0, 20);
    await env.ECHO_STATE_KV.put("recent_audit_logs", JSON.stringify(auditLogs));
  };

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_JWT_SECRET}`,
        "Content-Type": "application/json",
        Prefer: "return=representation", // To get the deleted records and count them
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to prune records: ${response.status} - ${errorText}`,
      );

      await updateKV({
        triggered_by: operator_id,
        timestamp: new Date().toISOString(),
        records_purged: 0,
        status: "error",
        error: errorText,
      });

      ctx.waitUntil(
        dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
          action: "DATABASE_PRUNE",
          operator_id: operator_id,
          records_purged: 0,
          error: errorText,
        }),
      );
      return { success: false, error: errorText };
    }

    const deletedRecords = (await response.json()) as any[];
    console.log(
      `Successfully pruned ${deletedRecords.length} orphaned records older than 7 days.`,
    );

    await updateKV({
      triggered_by: operator_id,
      timestamp: new Date().toISOString(),
      records_purged: deletedRecords.length,
      status: "success",
    });

    ctx.waitUntil(
      dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
        action: "DATABASE_PRUNE",
        operator_id: operator_id,
        records_purged: deletedRecords.length,
      }),
    );

    return { success: true, count: deletedRecords.length };
  } catch (error) {
    console.error("Error executing prune records logic:", error);

    const errorMsg = error instanceof Error ? error.message : String(error);
    await updateKV({
      triggered_by: operator_id,
      timestamp: new Date().toISOString(),
      records_purged: 0,
      status: "error",
      error: errorMsg,
    });

    ctx.waitUntil(
      dispatchAlert(env.AXIM_ALERT_WEBHOOK_URL, {
        action: "DATABASE_PRUNE",
        operator_id: operator_id,
        records_purged: 0,
        error: errorMsg,
      }),
    );

    return { success: false, error: errorMsg };
  }
}
