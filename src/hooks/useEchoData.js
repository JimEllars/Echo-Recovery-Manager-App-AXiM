import { useState, useEffect, useCallback } from 'react';
import { echoService } from '../services/echoService';
import { supabase } from '../supabase/supabase';
import { toast } from 'react-toastify';

export function useEchoData() {
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let channel;

    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await echoService.fetchRecords();

        if (fetchError) {
          throw fetchError;
        }

        setRecords(data || []);
        setIsOnline(true);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError(err.message || "Failed to connect to database");
        setIsOnline(false);
      } finally {
        setIsLoading(false);
      }
    };

    const setupSubscription = () => {
      // Return early if no supabase url is configured
      if (!import.meta.env.VITE_SUPABASE_URL) {
         setIsOnline(false);
         setError("Supabase URL not configured.");
         setIsLoading(false);
         return;
      }

      channel = supabase
        .channel('public:echo_dlq_records')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: echoService.getTableName() },
          (payload) => {
            console.log('Real-time update received:', payload);

            if (payload.eventType === 'INSERT') {
              setRecords((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
               setRecords((prev) => prev.map(rec => rec.id === payload.new.id ? payload.new : rec));
            } else if (payload.eventType === 'DELETE') {
               setRecords((prev) => prev.filter(rec => rec.id !== payload.old.id));
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            setIsOnline(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
             console.error("Supabase realtime connection lost.", err);
             setIsOnline(false);
          }
        });
    };

    loadInitialData();
    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleReplay = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setIsReplaying(true);
    setReplayProgress(50);

    try {
      toast.info(`Initiating batch replay for ${selectedIds.length} records...`);

      const response = await echoService.triggerReplay(selectedIds);

      if (response && response.success) {
        let successes = 0;
        let failures = 0;
        for (const res of response.results) {
          if (res.success) successes++;
          else failures++;
        }

        toast.success(`Replay complete: ${successes} injected, ${failures} failed.`);
      } else {
        toast.error(`Replay failed: ${response?.error || 'Unknown error'}`);
      }

      setReplayProgress(100);
      setTimeout(() => {
        setSelectedIds([]);
        setIsReplaying(false);
      }, 500);
    } catch (err) {
      console.error("Failed to trigger replay:", err);
      toast.error(`Failed to trigger replay: ${err.message}`);
      setIsReplaying(false);
      setReplayProgress(0);
    }
  }, [selectedIds]);

  return {
    records,
    selectedIds,
    setSelectedIds,
    isReplaying,
    replayProgress,
    handleReplay,
    setRecords,
    isLoading,
    error,
    isOnline
  };
}
