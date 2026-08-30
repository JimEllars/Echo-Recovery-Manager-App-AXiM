import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import { echoService } from '../services/echoService';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiClock, FiCpu, FiUser } = FiIcons;


export default function EdgeTelemetry({ records = [] }) {
  const [systemStatus, setSystemStatus] = useState(null);
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const url = import.meta.env.VITE_EDGE_WORKER_URL || 'http://localhost:8787';
        const res = await fetch(`${url}/api/telemetry/health`);
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
        }
      } catch (e) {
        console.error('Failed to fetch edge telemetry', e);
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const resolvedCount = records.filter(r => r.status === 'resolved').length;
  const failedCount = records.filter(r => r.status === 'failed').length;
  const totalResolvedOrFailed = resolvedCount + failedCount || 1;
  const recoverySuccessRate = ((resolvedCount / totalResolvedOrFailed) * 100).toFixed(1) + '%';

  const patchedCount = records.filter(r => r.status === 'patched').length;
  const totalRecords = records.length || 1;
  const cognitiveTriageCoverage = (((patchedCount + resolvedCount) / totalRecords) * 100).toFixed(1) + '%';

  const pendingIngressQueue = records.filter(r => r.status === 'pending').length;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {systemStatus?.last_prune_run && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase font-medium mb-3">Last Database Prune</p>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1"><SafeIcon icon={FiClock} /> Timestamp</span>
              <span className="text-sm font-bold text-slate-200">
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(systemStatus.last_prune_run.timestamp))}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1"><SafeIcon icon={FiCpu} /> Records Cleared</span>
              <span className="text-sm font-bold text-emerald-400">{systemStatus.last_prune_run.count}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase flex items-center gap-1"><SafeIcon icon={FiUser} /> Operator</span>
              <span className="text-sm font-bold text-slate-200">{systemStatus.last_prune_run.operator_id}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-6 uppercase tracking-wider">Ecosystem Failure Rate (24h)</h3>
        <ReactECharts option={option} style={{ height: '300px' }} />
      </div>

      {telemetry && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase font-medium mb-3">Edge Worker Health</p>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Region</span>
              <span className="text-sm font-bold text-slate-200">{telemetry.region}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">Latency (KV)</span>
              <span className="text-sm font-bold text-slate-200">{telemetry.kv_latency_ms} ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase">KV Status</span>
              <span className={`text-sm font-bold ${telemetry.kv_connected ? 'text-emerald-400' : 'text-rose-400'}`}>{telemetry.kv_connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase font-medium">Recovery Success Rate</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-100">{recoverySuccessRate}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase font-medium">Cognitive Triage Coverage</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-100">{cognitiveTriageCoverage}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase font-medium">Pending Ingress Queue</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-100">{pendingIngressQueue}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
