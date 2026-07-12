import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Badge from './ui/Badge';

const { FiSearch, FiFilter, FiMoreHorizontal } = FiIcons;

export default function DlqAggregationFeed({ records, selectedIds, onSelect, onRowClick }) {
  
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
        <h2 className="text-base font-semibold text-slate-200">Unified Error Aggregation</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search payloads..." 
              className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 w-64"
            />
          </div>
          <button className="p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <SafeIcon icon={FiFilter} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500 sticky top-0 backdrop-blur-md">
              <th className="p-4 w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-slate-700 bg-slate-900 checked:bg-cyan-500"
                  onChange={handleSelectAll}
                  checked={records.length > 0 && selectedIds.length === records.filter(r => r.status === 'patched').length}
                />
              </th>
              <th className="p-4 font-medium">Record ID</th>
              <th className="p-4 font-medium">Source Node</th>
              <th className="p-4 font-medium">Destination</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-800">
            {records.map((record) => (
              <tr 
                key={record.id} 
                onClick={() => onRowClick(record)}
                className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-700 bg-slate-900 checked:bg-cyan-500"
                    checked={selectedIds.includes(record.id)}
                    onChange={(e) => toggleSelect(e, record.id)}
                    disabled={record.status !== 'patched'}
                  />
                </td>
                <td className="p-4 font-mono text-slate-300">{record.id}</td>
                <td className="p-4 text-slate-300">{record.source_node}</td>
                <td className="p-4 text-slate-400 truncate max-w-[200px]">{record.target_destination}</td>
                <td className="p-4">
                  <Badge status={record.status} />
                </td>
                <td className="p-4 text-right text-slate-500">
                  <button className="p-1 hover:text-slate-200 transition-colors">
                    <SafeIcon icon={FiMoreHorizontal} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}