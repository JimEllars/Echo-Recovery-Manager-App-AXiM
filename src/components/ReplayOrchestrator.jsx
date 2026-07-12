import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiPlay, FiLoader } = FiIcons;

export default function ReplayOrchestrator({ selectedCount, isReplaying, progress, onReplay }) {
  if (selectedCount === 0 && !isReplaying) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 ml-32 bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-2xl shadow-cyan-900/20 flex items-center gap-6 z-40 min-w-[400px]"
    >
      <div className="flex-1">
        <h3 className="text-sm font-medium text-slate-200">
          {isReplaying ? 'Replaying Payloads...' : `${selectedCount} Payloads Selected`}
        </h3>
        {isReplaying ? (
          <div className="mt-2 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-1">Ready for mass re-ingestion to ecosystem.</p>
        )}
      </div>

      <button
        onClick={onReplay}
        disabled={isReplaying}
        className={`px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
          isReplaying 
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
        }`}
      >
        <SafeIcon icon={isReplaying ? FiLoader : FiPlay} className={isReplaying ? 'animate-spin' : ''} />
        {isReplaying ? `${Math.round(progress)}%` : 'Execute Replay'}
      </button>
    </motion.div>
  );
}