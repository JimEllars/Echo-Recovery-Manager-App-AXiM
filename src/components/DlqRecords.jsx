import React from 'react';
import DlqAggregationFeed from './DlqAggregationFeed';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiDownload } = FiIcons;

export default function DlqRecords({ records, selectedIds, onSelect, onRowClick, filter, onFilterChange, isFeedPaused, setIsFeedPaused, queuedRecords }) {
  const filteredRecords = records.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const exportToCsv = () => {
    if (!filteredRecords.length) return;

    const headers = ['ID', 'Source Node', 'Target Destination', 'Status', 'Error Reason', 'Created At'];
    const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

    const rows = filteredRecords.map(r => [
      escapeCsv(r.id),
      escapeCsv(r.source_node),
      escapeCsv(r.target_destination),
      escapeCsv(r.status),
      escapeCsv(r.error_reason),
      escapeCsv(r.created_at)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `echo-dlq-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          {['all', 'pending', 'patched', 'resolved', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
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
          <button
            onClick={exportToCsv}
            disabled={!filteredRecords.length}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
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
        isFeedPaused={isFeedPaused}
        setIsFeedPaused={setIsFeedPaused}
        queuedRecords={queuedRecords}
      />
    </div>
  );
}
