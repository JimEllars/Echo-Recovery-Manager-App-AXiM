import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Badge from './ui/Badge';

const { FiSearch, FiFilter, FiMoreHorizontal, FiLoader, FiPauseCircle, FiPlayCircle } = FiIcons;

export default function DlqAggregationFeed({ records, selectedIds, onSelect, onRowClick, isFeedPaused, setIsFeedPaused, queuedRecords = [] }) {
  
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelect(records.filter(r => r.status === 'patched').map(r => r.id));
    } else {
      onSelect([]);
    }
  };

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    const newSelected = selectedIds.includes(id) 
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    onSelect(newSelected);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-200">Unified Error Aggregation</h2>
          <button
            aria-label={isFeedPaused ? "Resume Feed" : "Pause Feed"}
            onClick={() => setIsFeedPaused && setIsFeedPaused(!isFeedPaused)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${isFeedPaused ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}
          >
            <SafeIcon icon={isFeedPaused ? FiPlayCircle : FiPauseCircle} />
            {isFeedPaused ? 'Resume Feed' : 'Pause Feed'}
          </button>
          {isFeedPaused && queuedRecords && queuedRecords.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {queuedRecords.length} new records awaiting...
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search payloads..." 
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 w-64"
            />
          </div>
          <button aria-label="Filter feeds" className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <SafeIcon icon={FiFilter} />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full overflow-x-auto overflow-y-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500 sticky top-0 z-10 backdrop-blur-md">
              <th className="p-4 w-12 whitespace-nowrap">
                <input 
                  type="checkbox" 
                  aria-label="Select all patched records"
                  className="rounded border-slate-700 bg-slate-900 checked:bg-cyan-500"
                  onChange={handleSelectAll}
                  checked={records.length > 0 && selectedIds.length === records.filter(r => r.status === 'patched').length}
                />
              </th>
              <th className="p-4 font-medium whitespace-nowrap">Record ID</th>
              <th className="p-4 font-medium whitespace-nowrap">Source Node</th>
              <th className="p-4 font-medium whitespace-nowrap">Destination</th>
              <th className="p-4 font-medium whitespace-nowrap">Status</th>
              <th className="p-4 font-medium text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-800">
            {records.map((record) => (
              <tr 
                key={record.id} 
                onClick={() => {
                  if (record.status !== 'replaying') {
                    onRowClick(record);
                  }
                }}
                className={`hover:bg-slate-800/50 cursor-pointer transition-colors group whitespace-nowrap ${record.status === 'replaying' ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    aria-label={`Select record ${record.id}`}
                    className="rounded border-slate-700 bg-slate-900 checked:bg-cyan-500"
                    checked={selectedIds.includes(record.id)}
                    onChange={(e) => toggleSelect(e, record.id)}
                    disabled={record.status !== 'patched' || record.status === 'replaying'}
                  />
                </td>
                <td className="p-4 font-mono text-slate-300">{record.id}</td>
                <td className="p-4 text-slate-300">{record.source_node}</td>
                <td className="p-4 text-slate-400 truncate max-w-[200px]">{record.target_destination}</td>
                <td className="p-4">
                  <Badge status={record.status} />
                </td>
                <td className="p-4 text-right text-slate-500">
                  {record.status === 'replaying' ? (
                    <SafeIcon icon={FiLoader} className="animate-spin text-cyan-500 mx-auto" />
                  ) : (
                    <button aria-label={`View actions for ${record.id}`} className="p-1 hover:text-slate-200 transition-colors" disabled={record.status === 'replaying'}>
                      <SafeIcon icon={FiMoreHorizontal} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
