import React, { useState } from 'react';
import '@questlabs/react-sdk/dist/style.css';
import Sidebar from './components/layout/Sidebar';
import StatsOverview from './components/StatsOverview';
import DlqAggregationFeed from './components/DlqAggregationFeed';
import OnyxPatchReview from './components/OnyxPatchReview';
import ReplayOrchestrator from './components/ReplayOrchestrator';
import EdgeTelemetry from './components/EdgeTelemetry';
import OnyxProxies from './components/OnyxProxies';
import { useEchoData } from './hooks/useEchoData';

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
    setRecords
  } = useEchoData();

  const handleApprovePatch = (id) => {
    setViewingRecord(null);
    setSelectedIds(prev => !prev.includes(id) ? [...prev, id] : prev);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Cockpit Overview':
        return (
          <>
            <StatsOverview records={records} />
            <DlqAggregationFeed 
              records={records}
              selectedIds={selectedIds}
              onSelect={setSelectedIds}
              onRowClick={setViewingRecord}
            />
          </>
        );
      case 'Edge Telemetry':
        return <EdgeTelemetry />;
      case 'Onyx Proxies':
        return <OnyxProxies />;
      default:
        return (
          <div className="h-64 flex items-center justify-center border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-500">Module Provisioning in Progress...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} />
      
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
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Edge Workers: Active</span>
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