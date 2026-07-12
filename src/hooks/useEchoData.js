import { useState, useEffect, useCallback } from 'react';
import { initialDlqRecords } from '../data/mockDlq';

export function useEchoData() {
  const [records, setRecords] = useState(initialDlqRecords);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);

  // Simulated Real-Time Ingress Aggregation
  useEffect(() => {
    const ingressInterval = setInterval(() => {
      const newRecord = {
        id: `req-${Math.random().toString(36).substr(2, 7)}`,
        source_node: ['Asguard WAF', 'Green Machine', 'Enrichment Bridge'][Math.floor(Math.random() * 3)],
        target_destination: 'api.axim.internal/v2/ingest',
        error_reason: 'Potential Schema Collision: Unexpected field "uuid_v5"',
        original_payload: { event: "ping", timestamp: Date.now() },
        proposed_patch: null,
        status: 'pending',
        timestamp: new Date().toISOString()
      };
      
      setRecords(prev => [newRecord, ...prev].slice(0, 50));
    }, 15000); // New failure every 15 seconds

    return () => clearInterval(ingressInterval);
  }, []);

  // Simulated Onyx Auto-Triage
  useEffect(() => {
    const triageInterval = setInterval(() => {
      setRecords(prev => prev.map(rec => {
        if (rec.status === 'pending' && Math.random() > 0.7) {
          return {
            ...rec,
            status: 'patched',
            proposed_patch: { ...rec.original_payload, _onyx_fix: "sanitized" }
          };
        }
        return rec;
      }));
    }, 5000);

    return () => clearInterval(triageInterval);
  }, []);

  const handleReplay = useCallback(() => {
    if (selectedIds.length === 0) return;
    setIsReplaying(true);
    setReplayProgress(0);

    const interval = setInterval(() => {
      setReplayProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setRecords(prevRecs => prevRecs.map(r => 
              selectedIds.includes(r.id) ? { ...r, status: 'resolved' } : r
            ));
            setSelectedIds([]);
            setIsReplaying(false);
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  }, [selectedIds]);

  return {
    records,
    selectedIds,
    setSelectedIds,
    isReplaying,
    replayProgress,
    handleReplay,
    setRecords
  };
}