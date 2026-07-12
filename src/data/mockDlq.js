export const initialDlqRecords = [
  {
    id: 'req-7f8a9b2',
    source_node: 'CRM Enrichment Bridge',
    target_destination: 'api.axim.internal/crm/v2/leads',
    error_reason: 'SchemaValidationError: Missing mandatory field "company_size". Type mismatch on "phone_number".',
    original_payload: { name: "Acme Corp", phone_number: 1234567890 },
    proposed_patch: { name: "Acme Corp", phone_number: "+1-123-456-7890", company_size: "UNKNOWN" },
    status: 'patched',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  },
  {
    id: 'req-3b1c4d5',
    source_node: 'Asguard WAF',
    target_destination: 'api.axim.internal/sec/telemetry',
    error_reason: 'MalformedJSON: Unexpected token in JSON at position 42',
    original_payload: { ip: "192.168.1.1", threat_level: "HIGH", meta: "{ 'malformed': true " },
    proposed_patch: { ip: "192.168.1.1", threat_level: "HIGH", meta: { malformed: true } },
    status: 'patched',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    id: 'req-9x8y7z6',
    source_node: 'Green Machine',
    target_destination: 'api.axim.internal/fin/ledger/sync',
    error_reason: 'CryptoMismatch: Invalid signature on payload hash.',
    original_payload: { tx_id: "tx_9921", amount: 5000, currency: "USD", sig: "invalid_sig_string" },
    proposed_patch: null,
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'req-1a2b3c4',
    source_node: 'CRM Enrichment Bridge',
    target_destination: 'api.axim.internal/crm/v2/leads',
    error_reason: 'NetworkFault: ETIMEDOUT downstream',
    original_payload: { name: "Globex", phone_number: "+1-555-0192", company_size: "ENTERPRISE" },
    proposed_patch: { name: "Globex", phone_number: "+1-555-0192", company_size: "ENTERPRISE" },
    status: 'resolved',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  }
];