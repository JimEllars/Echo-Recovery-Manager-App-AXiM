import React, { useState } from 'react';
import DlqAggregationFeed from './DlqAggregationFeed';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiFilter, FiDownload } = FiIcons;

export default function DlqRecords({ records, selectedIds, onSelect, onRowClick }) {
  const [filter, setFilter] = useState('all');

  const filteredRecords = records.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          {['all', 'pending', 'patched', 'resolved', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === f 
                  ? 'bg-slate-800 text-cyan-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-800">
            <SafeIcon icon={FiDownload} />
            Export CSV
          </button>
        </div>
      </div>

      <DlqAggregationFeed 
        records={filteredRecords}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onRowClick={onRowClick}
      />
    </div>
  );
}