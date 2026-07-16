import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import '@questlabs/react-sdk/dist/style.css';
import { useEchoData } from "./hooks/useEchoData";
import { echoService } from "./services/echoService";
import Sidebar from './components/layout/Sidebar';
import StatsOverview from './components/StatsOverview';
import DlqAggregationFeed from './components/DlqAggregationFeed';
import OnyxPatchReview from './components/OnyxPatchReview';
import ReplayOrchestrator from './components/ReplayOrchestrator';
import EdgeTelemetry from './components/EdgeTelemetry';
import OnyxProxies from './components/OnyxProxies';
import SystemConfig from './components/SystemConfig';
import DlqRecords from './components/DlqRecords';

export default function App() {
  const [activeTab, setActiveTab] = useState('Cockpit Overview');
  const [viewingRecord, setViewingRecord] = useState(null);
  
  const { 
    records, 
    selectedIds, 
    setSelectedIds, 
    isReplaying, 
    replayProgress, 
    handleReplay,
    isLoading,
    isOnline,
    error
  } = useEchoData();

  const handleApprovePatch = async (id) => {
    const record = records.find(r => r.id === id);
    if (!record) return;

    try {
      await echoService.approvePatch(id, record.proposed_patch);
    } catch (err) {
      console.error("Failed to approve patch:", err);
    }

    setViewingRecord(null);
    setSelectedIds(prev => !prev.includes(id) ? [...prev, id] : prev);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
         <div className="flex flex-col items-center justify-center h-64 text-slate-400">
           <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p>Connecting to Edge Ingress...</p>
         </div>
      );
    }

    switch (activeTab) {
      case 'Cockpit Overview':
        return (
          <>
            <StatsOverview records={records} />

            {!isOnline && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 <p className="text-sm">Connection to Live Telemetry Lost. Displaying cached data.</p>
              </div>
            )}

            <DlqAggregationFeed 
              records={records.slice(0, 5)} // Only recent 5 for overview
              selectedIds={selectedIds}
              onSelect={setSelectedIds}
              onRowClick={setViewingRecord}
            />
          </>
        );
      case 'DLQ Records':
        return (
          <>
            {!isOnline && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 <p className="text-sm">Connection to Live Telemetry Lost. Displaying cached data.</p>
              </div>
            )}
            <DlqRecords
              records={records}
              selectedIds={selectedIds}
              onSelect={setSelectedIds}
              onRowClick={setViewingRecord}
            />
          </>
        );
      case 'Edge Telemetry':
        return <EdgeTelemetry records={records} />;
      case 'Onyx Proxies':
        return <OnyxProxies />;
      case 'System Config':
        return <SystemConfig />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} isOnline={isOnline} />
      
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center px-8 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
            <h1 className="text-lg font-semibold text-slate-100">{activeTab}</h1>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm text-slate-400">
            <span>Environment: <strong className="text-cyan-400 font-mono">PRODUCTION</strong></span>
            <span className="w-px h-4 bg-slate-700"></span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span>{isOnline ? 'Edge Workers: Active' : 'Edge Workers: Offline'}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>

        <ReplayOrchestrator 
          selectedCount={selectedIds.length}
          isReplaying={isReplaying}
          progress={replayProgress}
          onReplay={handleReplay}
        />
      </main>

      <ToastContainer theme="dark" position="bottom-right" />
      {viewingRecord && (
        <OnyxPatchReview 
          record={viewingRecord} 
          onClose={() => setViewingRecord(null)}
          onApprove={handleApprovePatch}
        />
      )}
    </div>
  );
}
