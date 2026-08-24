import React, { useState, useEffect } from 'react';
import { echoService } from '../services/echoService';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiCpu, FiCheckCircle, FiActivity } = FiIcons;

const defaultProxies = [
  { name: 'Onyx-DeepSeek-R1', type: 'Logic & Code', status: 'Optimal', load: '12%', latency: '850ms' },
  { name: 'Onyx-Claude-3.5', type: 'Schema Analysis', status: 'Optimal', load: '45%', latency: '1200ms' },
  { name: 'Onyx-GPT4o-Mini', type: 'Rapid Triage', status: 'Degraded', load: '89%', latency: '2400ms' },
];

export default function OnyxProxies() {
  const [proxies, setProxies] = useState(defaultProxies);
  const [isPinging, setIsPinging] = useState(false);

  const pingProxy = async () => {
    setIsPinging(true);
    const result = await echoService.checkProxyStatus();
    if (!result.error) {
      setProxies(prev => prev.map(p => {
        if (p.name === 'Onyx-DeepSeek-R1' || p.name === 'Onyx-DeepSeek-Coder') {
          return {
            ...p,
            name: 'Onyx-' + result.tier,
            latency: result.latency + 'ms',
            status: result.status,
            load: (Math.floor(Math.random() * 30) + 10) + '%'
          };
        }
        return p;
      }));
    }
    setIsPinging(false);
  };

  useEffect(() => {
    pingProxy();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Cognitive Recovery Engines</h2>
        <button
          onClick={pingProxy}
          disabled={isPinging}
          className="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium hover:bg-cyan-600/30 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isPinging ? <SafeIcon icon={FiActivity} className="animate-pulse" /> : <SafeIcon icon={FiActivity} />}
          Ping Inference Engine
        </button>
      </div>

      {proxies.map((proxy, i) => (
        <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
              <SafeIcon icon={FiCpu} className="text-cyan-400 text-xl" />
            </div>
            <div>
              <h3 className="font-medium text-slate-200">{proxy.name}</h3>
              <p className="text-xs text-slate-500">{proxy.type}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase">Latency</p>
              <p className="text-sm font-mono text-slate-300">{proxy.latency}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase">Load</p>
              <p className="text-sm font-mono text-slate-300">{proxy.load}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs border ${
              proxy.status === 'Optimal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <SafeIcon icon={proxy.status === 'Optimal' ? FiCheckCircle : FiActivity} />
              {proxy.status}
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}