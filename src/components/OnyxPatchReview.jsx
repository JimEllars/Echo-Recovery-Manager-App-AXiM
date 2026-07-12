import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Badge from './ui/Badge';

const { FiX, FiCheck, FiTerminal } = FiIcons;

export default function OnyxPatchReview({ record, onClose, onApprove }) {
  if (!record) return null;

  const originalStr = JSON.stringify(record.original_payload, null, 2);
  const patchStr = record.proposed_patch ? JSON.stringify(record.proposed_patch, null, 2) : 'No patch proposed by Onyx.';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <SafeIcon icon={FiTerminal} className="text-cyan-400 text-xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-3">
                  Onyx Cognitive Triage 
                  <Badge status={record.status} />
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-mono">{record.id} • {record.source_node}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
              <SafeIcon icon={FiX} className="text-xl" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
              <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-1">Detected Fault</p>
              <p className="text-sm text-rose-200 font-mono">{record.error_reason}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Original Payload */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Original Payload</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 overflow-x-auto">
                  <pre className="text-sm font-mono text-rose-300/80">{originalStr}</pre>
                </div>
              </div>

              {/* Proposed Patch */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Onyx Mk3 Patch
                  </span>
                </div>
                <div className="bg-slate-950 border border-cyan-500/20 rounded-xl p-4 flex-1 overflow-x-auto relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0"></div>
                  <pre className="text-sm font-mono text-emerald-300">{patchStr}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => onApprove(record.id)}
              disabled={record.status !== 'patched'}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
            >
              <SafeIcon icon={FiCheck} />
              Approve Patch
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}