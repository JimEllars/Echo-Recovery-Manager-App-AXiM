import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiActivity, FiDatabase, FiShield, FiSettings, FiRadio } = FiIcons;

const navItems = [
  { icon: FiActivity, label: 'Cockpit Overview' },
  { icon: FiRadio, label: 'Edge Telemetry' },
  { icon: FiShield, label: 'Onyx Proxies' },
  { icon: FiDatabase, label: 'DLQ Records' },
  { icon: FiSettings, label: 'System Config' },
];

export default function Sidebar({ activeTab, onNavigate }) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
          <SafeIcon icon={FiActivity} className="text-cyan-400 text-lg" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 tracking-wide text-sm">PROJECT ECHO</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Recovery Manager</p>
        </div>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-1">
        {navItems.map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigate(item.label)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
              activeTab === item.label
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
            }`}
          >
            <SafeIcon icon={item.icon} className={activeTab === item.label ? 'text-cyan-400' : 'text-slate-500'} />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs text-slate-400 font-medium">AXiM Core Online</span>
        </div>
      </div>
    </div>
  );
}