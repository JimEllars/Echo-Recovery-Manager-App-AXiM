import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiKey, FiGlobe, FiRefreshCw, FiAlertTriangle } = FiIcons;

export default function SystemConfig() {
  const configs = [
    { label: 'AXIM_INTERNAL_KEY', value: '••••••••••••••••', lastRotated: '2 days ago', icon: FiKey },
    { label: 'EDGE_WORKER_URL', value: 'https://echo-edge.axim.workers.dev', lastRotated: 'Never', icon: FiGlobe },
    { label: 'AUTO_TRIAGE_THRESHOLD', value: '0.85 Confidence', lastRotated: '14 days ago', icon: FiRefreshCw },
  ];

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
    </motion.div>
  );
}