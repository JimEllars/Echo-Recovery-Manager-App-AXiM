import { useState, useEffect, useCallback } from 'react';
import { echoService } from '../services/echoService';
import { supabase } from '../supabase/supabase';

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

  const handleReplay = useCallback(() => {
    if (selectedIds.length === 0) return;
    setIsReplaying(true);
    setReplayProgress(0);

    // Keep replay logic as simulated for now as per instructions (backend ingress focus)
    const interval = setInterval(() => {
      setReplayProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Replay orchestrated, mark as resolved locally or wait for real update
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
    setRecords,
    isLoading,
    error,
    isOnline
  };
}
