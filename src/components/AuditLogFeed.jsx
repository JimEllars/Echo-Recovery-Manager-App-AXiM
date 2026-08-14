import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { echoService } from '../services/echoService';

const { FiCpu, FiUser, FiServer, FiLoader, FiCheckCircle, FiXCircle } = FiIcons;

export default function AuditLogFeed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const getActionIcon = (action) => {
    switch (action) {
      case 'BATCH_REPLAY':
        return FiServer;
      case 'DATABASE_PRUNE':
        return FiCpu;
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
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-base font-semibold text-slate-200">Decentralized Audit Log</h2>
          <div className="flex gap-2 items-center text-xs text-slate-500">
             <span>Live Edge Telemetry</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <SafeIcon icon={FiLoader} className="animate-spin text-2xl mb-4 text-cyan-500" />
               <p>Fetching immutable logs from edge...</p>
             </div>
          ) : error ? (
             <div className="flex items-center justify-center h-full text-red-400">
               <p>{error}</p>
             </div>
          ) : logs.length === 0 ? (
             <div className="flex items-center justify-center h-full text-slate-500">
               <p>No audit events recorded yet.</p>
             </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, i) => (
                <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center gap-6">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <SafeIcon icon={getActionIcon(log.action)} className="text-slate-400 text-lg" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                       <span className="text-sm font-semibold text-slate-200 tracking-wide">{log.action.replace('_', ' ')}</span>
                       {getOperatorBadge(log.triggered_by)}
                    </div>
                    <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
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
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
