import React from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';

export default function EdgeTelemetry({ records = [] }) {

  // Aggregate failures by source_node
  const sourceNodeCounts = records.reduce((acc, record) => {
    // Only count records that are in a failed or pending state, or just count all records assuming they represent failures.
    // Assuming 'records' represents the DLQ (Dead Letter Queue) which implies failures.
    const node = record.source_node || 'Unknown Node';
    acc[node] = (acc[node] || 0) + 1;
    return acc;
  }, {});

  const nodeNames = Object.keys(sourceNodeCounts);
  const nodeData = Object.values(sourceNodeCounts);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: nodeNames,
      axisLabel: { color: '#64748b' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    series: [
      {
        name: 'Failures',
        type: 'bar',
        barWidth: '40%',
        data: nodeData,
        itemStyle: {
          color: '#22d3ee',
          borderRadius: [4, 4, 0, 0]
        }
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