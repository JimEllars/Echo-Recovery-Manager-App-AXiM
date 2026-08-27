import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { echoService } from '../services/echoService';

const { FiCpu, FiUser, FiServer, FiLoader, FiCheckCircle, FiXCircle, FiRefreshCw, FiZap } = FiIcons;

export default function AuditLogFeed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      setError(null);
      const res = await echoService.fetchAuditLogs();
      if (res.error) {
        setError(res.error);
      } else {
        setLogs(res.data || []);
      }
      setLoading(false);
    }
    loadLogs();
  }, []);

  const handleRefresh = async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    const res = await echoService.fetchAuditLogs();
    if (!res.error) {
      setLogs(res.data || []);
    }
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(dateString));
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'BATCH_REPLAY':
        return FiServer;
      case 'DATABASE_PRUNE':
        return FiCpu;
      case 'COGNITIVE_TRIAGE':
        return FiZap;
      default:
        return FiServer;
    }
  };

  const getOperatorBadge = (triggeredBy) => {
    const isSystem = triggeredBy === 'system_cron';
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${isSystem ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
        <SafeIcon icon={isSystem ? FiCpu : FiUser} />
        {isSystem ? 'System Cron' : triggeredBy}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-wrap gap-4">
          <h2 className="text-base font-semibold text-slate-200">Decentralized Audit Log</h2>
          <div className="flex gap-2 items-center text-xs text-slate-500">
             <span>Live Edge Telemetry</span>
             <button
               aria-label="Refresh Logs"
               onClick={handleRefresh}
               disabled={refreshing || loading}
               className="ml-2 px-3 py-1.5 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <SafeIcon icon={FiRefreshCw} className={refreshing ? "animate-spin" : ""} />
               Refresh Logs
             </button>
          </div>
        </div>

        <div className="flex-1 w-full overflow-x-auto overflow-y-hidden p-4">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <SafeIcon icon={FiLoader} className="animate-spin text-2xl mb-4 text-cyan-500" />
               <p>Fetching immutable logs from edge...</p>
             </div>
          ) : error ? (
             <div className="flex items-center justify-center h-full text-red-400 whitespace-nowrap">
               <p>{error}</p>
             </div>
          ) : logs.length === 0 ? (
             <div className="flex items-center justify-center h-full text-slate-500 whitespace-nowrap">
               <p>No audit events recorded yet.</p>
             </div>
          ) : (
            <div className="space-y-4 min-w-[600px]">
              {logs.map((log, i) => (
                <div key={i} className="flex flex-col gap-2">
                <div
                  className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center gap-6 whitespace-nowrap cursor-pointer hover:bg-slate-900 transition-colors"
                  onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <SafeIcon icon={getActionIcon(log.action)} className="text-slate-400 text-lg" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                       <span className="text-sm font-semibold text-slate-200 tracking-wide">{log.action.replace('_', ' ')}</span>
                       {getOperatorBadge(log.triggered_by)}
                    </div>
                    <span className="text-xs text-slate-500">{log.timestamp ? formatDate(log.timestamp) : 'Unknown Date'}</span>
                    {log.target_record && (
                      <span className="ml-3 text-[11px] text-slate-600 font-mono bg-slate-900 px-2 py-0.5 rounded">Target: {log.target_record}</span>
                    )}
                  </div>

                  <div className="flex gap-4">
                     <div className="flex flex-col items-end">
                       <span className="text-[10px] text-slate-500 uppercase tracking-wider">Success</span>
                       <div className="flex items-center gap-1.5 text-emerald-400">
                          <SafeIcon icon={FiCheckCircle} className="text-xs" />
                          <span className="font-mono text-sm">{log.success_count || 0}</span>
                       </div>
                     </div>
                     <div className="flex flex-col items-end">
                       <span className="text-[10px] text-slate-500 uppercase tracking-wider">Failed</span>
                       <div className="flex items-center gap-1.5 text-red-400">
                          <SafeIcon icon={FiXCircle} className="text-xs" />
                          <span className="font-mono text-sm">{log.fail_count || 0}</span>
                       </div>
                     </div>
                  </div>
                </div>
                  {expandedRow === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-400 overflow-x-auto border border-slate-800"
                    >
                      <pre>
{JSON.stringify({
  action: log.action,
  operator: log.triggered_by,
  timestamp: log.timestamp,
  target_record: log.target_record || null,
  success_count: log.success_count || 0,
  fail_count: log.fail_count || 0,
}, null, 2)}
                      </pre>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
