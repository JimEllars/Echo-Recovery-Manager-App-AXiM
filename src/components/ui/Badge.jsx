import React from 'react';

const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  patched: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  replaying: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

export default function Badge({ status, label }) {
  const style = statusStyles[status] || statusStyles.pending;
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} uppercase tracking-wider`}>
      {label || status}
    </span>
  );
}