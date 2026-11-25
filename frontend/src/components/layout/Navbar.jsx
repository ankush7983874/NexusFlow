import React from 'react';
import { 
  Play, 
  Pause, 
  Flame, 
  Wifi, 
  WifiOff, 
  RefreshCw 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { socket } from '../../services/socket';

export const Navbar = () => {
  const { 
    activeTab, 
    simulatorRunning, 
    toggleSimulator, 
    triggerOverheatSpike,
    refreshStats,
    liveTelemetryFeed,
    socketStatus
  } = useApp();

  const isConnected = socketStatus === 'connected';
  const latestItem = liveTelemetryFeed[0];

  const titles = {
    overview: 'Telemetry & Rules Overview',
    builder: 'Visual Rule Builder',
    devices: 'IoT Devices Management',
    telemetry: 'Real-Time Telemetry Stream',
    rules: 'Compiled Rules Management',
    alerts: 'Alerts & Notifications History',
    analytics: 'Time-Series Analytics',
    settings: 'System Status & Configuration'
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div 
          className="brand-icon" 
          style={{ 
            width: 36, 
            height: 36, 
            borderRadius: 8, 
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)' 
          }}
          title="NexusFlow IoT Engine"
        >
          <img 
            src="/images/nexusflow-logo.png" 
            alt="NexusFlow Logo" 
            className="brand-logo-img" 
          />
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
            {titles[activeTab] || 'NexusFlow'}
          </h2>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Infotact Solutions • Industrial IoT Telemetry
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Latest Stream Pill */}
        {latestItem && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', padding: '6px 12px', borderRadius: 8, fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>Live:</span>
            <span style={{ fontWeight: 600, color: '#4f46e5' }}>{latestItem.metadata?.deviceId || latestItem.deviceId}</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{latestItem.temperature}°C</span>
          </div>
        )}

        {/* Simulator Toggle */}
        <button
          className={`btn btn-sm ${simulatorRunning ? 'btn-secondary' : 'btn-primary'}`}
          onClick={toggleSimulator}
          title="Controls automated sensor generation loop"
        >
          {simulatorRunning ? <Pause size={14} /> : <Play size={14} />}
          {simulatorRunning ? 'Pause Stream' : 'Start Stream'}
        </button>

        {/* Inject Overheat Spike */}
        <button
          className="btn btn-danger btn-sm"
          onClick={() => triggerOverheatSpike('TURBINE-001', 93.8)}
          title="Triggers immediate >80°C threshold alert"
        >
          <Flame size={14} />
          Spike (93°C)
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={refreshStats}
          title="Refresh stats"
          style={{ padding: '6px 10px' }}
        >
          <RefreshCw size={14} />
        </button>

        {/* WebSocket Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isConnected ? '#059669' : '#dc2626' }}>
          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span style={{ fontWeight: 600 }}>{isConnected ? 'Connected' : 'Reconnecting'}</span>
        </div>
      </div>
    </header>
  );
};
