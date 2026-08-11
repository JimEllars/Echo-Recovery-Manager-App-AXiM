import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { echoService } from '../services/echoService';

const { FiAlertOctagon, FiCheckCircle, FiCpu, FiLayers, FiClock } = FiIcons;

export default function StatsOverview({ records }) {
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const result = await echoService.fetchSystemStatus();
      if (result && !result.error && result.last_prune_run) {
        setSystemStatus(result.last_prune_run);
      } else {
        setSystemStatus({ timestamp: null, records_purged: 0, status: 'awaiting' });
      }
    };
    fetchStatus();
  }, []);

  const stats = [
    { label: 'Pending Triage', value: records.filter(r => r.status === 'pending').length, icon: FiAlertOctagon, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Onyx Patched', value: records.filter(r => r.status === 'patched').length, icon: FiCpu, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Replayed Success', value: records.filter(r => r.status === 'resolved').length, icon: FiCheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Total DLQ Volume', value: records.length, icon: FiLayers, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  ];

  const formatTime = (isoString) => {
    if (!isoString) return 'Awaiting Initial Sweep';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bg}`}>
              <SafeIcon icon={stat.icon} className={`text-xl ${stat.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{stat.label}</p>
              <p className="text-2xl font-semibold text-slate-100 mt-1">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {systemStatus && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-500/10">
              <SafeIcon icon={FiClock} className="text-xl text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Last Automated Prune</p>
              <p className="text-lg font-semibold text-slate-100 mt-1">{formatTime(systemStatus.timestamp)}</p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Records Purged</p>
             <p className="text-2xl font-semibold text-purple-400 mt-1">{systemStatus.timestamp ? systemStatus.records_purged : '-'}</p>
          </div>
        </motion.div>
      )}
    </>
  );
}
