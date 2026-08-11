import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { echoService } from '../services/echoService';
import { toast } from 'react-toastify';

const { FiKey, FiGlobe, FiRefreshCw, FiAlertTriangle, FiTrash2 } = FiIcons;

export default function SystemConfig() {
  const [isPruning, setIsPruning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const configs = [
    { label: 'AXIM_INTERNAL_KEY', value: '••••••••••••••••', lastRotated: '2 days ago', icon: FiKey },
    { label: 'EDGE_WORKER_URL', value: 'https://echo-edge.axim.workers.dev', lastRotated: 'Never', icon: FiGlobe },
    { label: 'AUTO_TRIAGE_THRESHOLD', value: '0.85 Confidence', lastRotated: '14 days ago', icon: FiRefreshCw },
  ];


  const handleForcePruneClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmPrune = async () => {
    setShowConfirmModal(false);
    setIsPruning(true);
    try {
      const response = await echoService.forcePruneDatabase();
      if (response && response.success) {
        toast.success(`Manual Prune Executed: ${response.count} records cleared`);
      } else {
        toast.error(`Force prune failed: ${response?.error || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error(`Force prune failed: ${err.message}`);
    } finally {
      setIsPruning(false);
    }
  };


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-4 items-start">
        <SafeIcon icon={FiAlertTriangle} className="text-amber-400 text-xl mt-0.5" />
        <div>
          <h4 className="text-amber-200 font-semibold text-sm">Privileged Access Required</h4>
          <p className="text-xs text-amber-200/60 mt-1">Changes to system configuration require multi-sig approval from the AXiM Infrastructure Council.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {configs.map((config, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <SafeIcon icon={config.icon} className="text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase">{config.label}</p>
                <p className="text-sm font-mono text-slate-200 mt-0.5">{config.value}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase">Last Rotated</p>
              <p className="text-xs text-slate-400">{config.lastRotated}</p>
            </div>
            <button className="px-3 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 border border-slate-700 transition-colors">
              Manage
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 uppercase tracking-wider">Ecosystem Node Ingress</h3>
        <div className="space-y-3">
          {['Asguard WAF', 'Green Machine', 'Enrichment Bridge'].map((node, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
              <span className="text-sm text-slate-300 font-medium">{node}</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Polling Active</span>
                <span className="text-xs text-slate-500 font-mono">cron: 0 * * * *</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-center justify-between mt-8">
        <div>
          <h3 className="text-sm font-semibold text-red-400 mb-1 uppercase tracking-wider">Emergency Protocol</h3>
          <p className="text-xs text-red-400/70">Manually trigger a database prune operation immediately.</p>
        </div>
        <button
          onClick={handleForcePruneClick}
          disabled={isPruning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            isPruning
              ? 'bg-transparent text-red-400 border-red-500/50 cursor-not-allowed'
              : 'bg-transparent text-red-400 hover:bg-red-500/20 border-red-500/50 hover:border-red-500'
          }`}
        >
          {isPruning ? (
             <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
          ) : (
            <SafeIcon icon={FiTrash2} />
          )}
          {isPruning ? 'Pruning...' : 'Force Database Prune'}
        </button>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <SafeIcon icon={FiAlertTriangle} className="text-red-400 text-xl" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100">Confirm Database Prune</h3>
            </div>

            <p className="text-slate-400 text-sm mb-6">
              You are about to force a manual pruning of the database. This action will permanently remove all resolved DLQ records older than 7 days immediately. This action cannot be undone. Are you sure you want to proceed?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrune}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 transition-colors border border-red-500 flex items-center gap-2"
              >
                <SafeIcon icon={FiTrash2} />
                Confirm Prune
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
}
