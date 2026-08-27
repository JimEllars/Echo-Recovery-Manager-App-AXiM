const fs = require('fs');
let code = fs.readFileSync('src/components/EdgeTelemetry.jsx', 'utf8');

const search = `import React from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';`;

const replace = `import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';`;

code = code.replace(search, replace);

const searchFunc = `export default function EdgeTelemetry({ records = [] }) {`;

const replaceFunc = `export default function EdgeTelemetry({ records = [] }) {
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const url = import.meta.env.VITE_EDGE_WORKER_URL || 'http://localhost:8787';
        const res = await fetch(\`\${url}/api/telemetry/health\`);
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
  }, []);`;

code = code.replace(searchFunc, replaceFunc);

const searchGrid = `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">`;
const replaceGrid = `{telemetry && (
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
              <span className={\`text-sm font-bold \${telemetry.kv_connected ? 'text-emerald-400' : 'text-rose-400'}\`}>{telemetry.kv_connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">`;

code = code.replace(searchGrid, replaceGrid);

fs.writeFileSync('src/components/EdgeTelemetry.jsx', code);
