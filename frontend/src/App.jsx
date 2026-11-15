import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ToastContainer } from './components/common/ToastContainer';

import { OverviewDashboard } from './pages/OverviewDashboard';
import { VisualRuleBuilder } from './pages/VisualRuleBuilder';
import { DevicesManagement } from './pages/DevicesManagement';
import { LiveTelemetry } from './pages/LiveTelemetry';
import { RulesManagement } from './pages/RulesManagement';
import { AlertsManagement } from './pages/AlertsManagement';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

import './styles/index.css';

const MainView = () => {
  const { activeTab } = useApp();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        {activeTab === 'overview' && <OverviewDashboard />}
        {activeTab === 'builder' && <VisualRuleBuilder />}
        {activeTab === 'devices' && <DevicesManagement />}
        {activeTab === 'telemetry' && <LiveTelemetry />}
        {activeTab === 'rules' && <RulesManagement />}
        {activeTab === 'alerts' && <AlertsManagement />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'settings' && <Settings />}
      </div>
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainView />
    </AppProvider>
  );
}
