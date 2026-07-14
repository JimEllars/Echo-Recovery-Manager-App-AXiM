import React, { useState } from 'react';
import { echoService } from '../services/echoService';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Badge from './ui/Badge';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

const { FiX, FiCheck, FiTerminal, FiCpu } = FiIcons;

export default function OnyxPatchReview({ record, onClose, onApprove }) {

  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await echoService.triggerTriage(record.id);
    // Let real-time updates change the prop, but we might want to stop the loader after a few seconds if it's mock
    // or just leave it since the component might re-render or close if updated externally.
    // For safety, we stop it after 5 seconds if real-time doesn't catch it quickly.
    setTimeout(() => {
        setIsGenerating(false);
    }, 5000);
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(record.id);
    } finally {
      setIsApproving(false);
    }
  };

  if (!record) return null;

  const originalStr = JSON.stringify(record.original_payload, null, 2);
  const patchStr = record.proposed_patch ? JSON.stringify(record.proposed_patch, null, 2) : (isGenerating ? 'Onyx AI Processing...' : 'No patch proposed by Onyx.');

  const newStyles = {
    variables: {
      dark: {
        diffViewerBackground: 'transparent',
        diffViewerColor: '#cbd5e1', // slate-300
        addedBackground: 'rgba(16, 185, 129, 0.15)', // emerald-500/15
        addedColor: '#6ee7b7', // emerald-300
        removedBackground: 'rgba(244, 63, 94, 0.15)', // rose-500/15
        removedColor: '#fda4af', // rose-300
        wordAddedBackground: 'rgba(16, 185, 129, 0.4)',
        wordRemovedBackground: 'rgba(244, 63, 94, 0.4)',
        addedGutterBackground: 'rgba(16, 185, 129, 0.1)',
        removedGutterBackground: 'rgba(244, 63, 94, 0.1)',
        gutterBackground: 'transparent',
        gutterBackgroundDark: 'transparent',
        highlightBackground: 'rgba(255, 255, 255, 0.05)',
        highlightGutterBackground: 'rgba(255, 255, 255, 0.05)',
        codeFoldGutterBackground: 'transparent',
        codeFoldBackground: 'transparent',
        emptyLineBackground: 'transparent',
        gutterColor: '#475569', // slate-600
      }
    }
  };

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

            {/* Diff Viewer */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-sm">
              <ReactDiffViewer
                oldValue={originalStr}
                newValue={patchStr}
                splitView={true}
                useDarkTheme={true}
                styles={newStyles}
                compareMethod={DiffMethod.WORDS}
                leftTitle={<span className="text-slate-400 uppercase tracking-wider text-xs font-semibold p-2 inline-block">Original Payload</span>}
                rightTitle={<span className="text-cyan-400 uppercase tracking-wider text-xs font-semibold p-2 inline-flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />Onyx Mk3 Patch</span>}
              />
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
            {!record.proposed_patch && record.status !== 'patched' && record.status !== 'resolved' && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
              >
                <SafeIcon icon={FiCpu} className={isGenerating ? "animate-spin" : ""} />
                {isGenerating ? "Onyx Processing..." : "Generate Patch"}
              </button>
            )}
            <button 
              onClick={handleApprove}
              disabled={record.status !== 'patched' || isApproving}
              className="px-6 py-2 rounded-lg text-sm font-medium bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
            >
              <SafeIcon icon={isApproving ? FiCpu : FiCheck} className={isApproving ? "animate-spin" : ""} />
              {isApproving ? "Approving..." : "Approve Patch"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
