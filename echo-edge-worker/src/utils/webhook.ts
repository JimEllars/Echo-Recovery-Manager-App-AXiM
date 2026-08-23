export async function dispatchAlert(url: string | undefined, payload: {
  action: string;
  operator_id: string;
  success_count?: number;
  fail_count?: number;
  records_purged?: number;
  error?: string;
}) {
  if (!url) return;

  try {
    const textFields = [
      `**Action:** ${payload.action}`,
      `**Operator ID:** ${payload.operator_id}`
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
    if (payload.error) {
      textFields.push(`**Error:** ${payload.error}`);
    }

    const message = {
      content: `🚨 **AXiM Echo Recovery Alert** 🚨\n\n${textFields.join('\n')}`
    };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });
  } catch (err) {
    // Silently fail to avoid crashing the edge worker if the webhook is down
    console.error('Failed to dispatch alert webhook:', err);
  }
}
