export async function dispatchAlert(
  url: string | undefined,
  payload: {
    action: string;
    operator_id: string;
    success_count?: number;
    fail_count?: number;
    records_purged?: number;
    error?: string;
    total_volume?: number;
    pending_count?: number;
    patched_count?: number;
    resolved_count?: number;
    failed_count?: number;
    pruned_today?: number;
  },
) {
  try {
    const textFields = [
      `**Action:** ${payload.action}`,
      `**Operator ID:** ${payload.operator_id}`,
    ];

    if (payload.success_count !== undefined) {
      textFields.push(`**Success Count:** ${payload.success_count}`);
    }
    if (payload.fail_count !== undefined) {
      textFields.push(`**Fail Count:** ${payload.fail_count}`);
    }
    if (payload.records_purged !== undefined) {
      textFields.push(`**Records Purged:** ${payload.records_purged}`);
    }
    if (payload.total_volume !== undefined) {
      textFields.push(`**Total Volume:** ${payload.total_volume}`);
    }
    if (payload.pending_count !== undefined) {
      textFields.push(`**Pending:** ${payload.pending_count}`);
    }
    if (payload.patched_count !== undefined) {
      textFields.push(`**Patched:** ${payload.patched_count}`);
    }
    if (payload.resolved_count !== undefined) {
      textFields.push(`**Resolved:** ${payload.resolved_count}`);
    }
    if (payload.failed_count !== undefined) {
      textFields.push(`**Failed:** ${payload.failed_count}`);
    }
    if (payload.pruned_today !== undefined) {
      textFields.push(`**Pruned Today:** ${payload.pruned_today}`);
    }
    if (payload.error) {
      textFields.push(`**Error:** ${payload.error}`);
    }

    const message = {
      content: `🚨 **AXiM Echo Recovery Alert** 🚨\n\n${textFields.join("\n")}`,
    };

    if (!url || url.trim() === "") {
      console.log(`[DEV_MODE_WEBHOOK_BYPASS] ${JSON.stringify(message)}`);
      return;
    }

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  } catch (err) {
    // Silently fail to avoid crashing the edge worker if the webhook is down
    console.error("Failed to dispatch alert webhook:", err);
  }
}
