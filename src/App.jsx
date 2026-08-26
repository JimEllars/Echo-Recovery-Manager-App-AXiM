import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NotFound from './components/layout/NotFound';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import '@questlabs/react-sdk/dist/style.css';
import { useEchoData } from "./hooks/useEchoData";
import { echoService } from "./services/echoService";
import { supabase } from './supabase/supabase';
import Sidebar from './components/layout/Sidebar';
import StatsOverview from './components/StatsOverview';
import DlqAggregationFeed from './components/DlqAggregationFeed';
import OnyxPatchReview from './components/OnyxPatchReview';
import ReplayOrchestrator from './components/ReplayOrchestrator';
import EdgeTelemetry from './components/EdgeTelemetry';
import OnyxProxies from './components/OnyxProxies';
import SystemConfig from './components/SystemConfig';
import AuditLogFeed from './components/AuditLogFeed';
import DlqRecords from './components/DlqRecords';
import Login from './components/auth/Login';

import ErrorBoundary from './components/layout/ErrorBoundary';
export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {

    // Intercept SSO token if present
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      // In a real scenario, this might be a custom token exchange or setting session
      // Assuming 'token' is a valid Supabase JWT or access token.
      supabase.auth.setSession({
        access_token: token,
        refresh_token: token,
      }).then(({ data, error }) => {
        if (!error && data.session) {
          setSession(data.session);
        }
        // Cleanly strip token from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setAuthLoading(false);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setAuthLoading(false);
      });
    }


    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center justify-center text-slate-400">
           <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p>Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState('Cockpit Overview');
  const [viewingRecord, setViewingRecord] = useState(null);
  const [edgeOnline, setEdgeOnline] = useState(false);
  const [dlqFilter, setDlqFilter] = useState('all');
  
  const { 
    records, 
    selectedIds, 
    setSelectedIds, 
    isReplaying, 
    replayProgress, 
    handleReplay,
    isLoading,
    isOnline,
    error,
    isFeedPaused,
    setIsFeedPaused,
    queuedRecords
  } = useEchoData();


  useEffect(() => {
    let intervalId;
    const checkHealth = async () => {
      const isOnline = await echoService.checkEdgeHealth();
      setEdgeOnline(isOnline);
    };

    // Initial check
    checkHealth();

    // Polling every 30 seconds
    intervalId = setInterval(checkHealth, 30000);

    return () => clearInterval(intervalId);
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDrilldown = (statusFilter) => {
    setDlqFilter(statusFilter);
    setActiveTab('DLQ Records');
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
            <StatsOverview records={records} onDrilldown={handleDrilldown} />

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
              isFeedPaused={isFeedPaused}
              setIsFeedPaused={setIsFeedPaused}
              queuedRecords={queuedRecords}
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
              filter={dlqFilter}
              onFilterChange={setDlqFilter}
            />
          </>
        );
      case 'Edge Telemetry':
        return <EdgeTelemetry records={records} />;
      case 'Onyx Proxies':
        return <OnyxProxies />;
      case 'System Config':
        return <SystemConfig />;
      case 'Audit Logs':
        return <AuditLogFeed />;
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
              <div className={`w-2 h-2 rounded-full ${edgeOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span>{edgeOnline ? 'Edge Workers: Active' : 'Edge Workers: Offline'}</span>
            </div>
            <span className="w-px h-4 bg-slate-700"></span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors text-xs font-medium px-3 py-1.5 border border-slate-700 hover:border-slate-500 rounded-md">
              Log Out
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 relative">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary>
              {renderContent()}
            </ErrorBoundary>
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
