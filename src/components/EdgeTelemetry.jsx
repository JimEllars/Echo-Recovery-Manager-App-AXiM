import React from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';

export default function EdgeTelemetry() {
  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    series: [
      {
        name: 'Asguard DLQ',
        type: 'line',
        smooth: true,
        data: [120, 132, 101, 134, 90, 230, 210],
        itemStyle: { color: '#22d3ee' },
        areaStyle: { color: 'rgba(34, 211, 238, 0.1)' }
      },
      {
        name: 'Green Machine',
        type: 'line',
        smooth: true,
        data: [220, 182, 191, 234, 290, 330, 310],
        itemStyle: { color: '#10b981' },
        areaStyle: { color: 'rgba(16, 185, 129, 0.1)' }
      }
    ]
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-6 uppercase tracking-wider">Ecosystem Failure Rate (24h)</h3>
        <ReactECharts option={option} style={{ height: '300px' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Ingress Latency', 'Triage Success', 'Replay Velocity'].map((metric, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-xs text-slate-500 uppercase font-medium">{metric}</p>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-2xl font-bold text-slate-100">{[42, 94, 1200][i]}{['ms', '%', '/min'][i]}</span>
              <span className="text-xs text-emerald-400 mb-1">↑ 12%</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}