import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Sliders, 
  BellRing, 
  ArrowRight, 
  Flame, 
  TrendingUp, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

const defaultDeviceList = [
  { deviceId: 'TURBINE-001', name: 'Main Generator Turbine 1', status: 'online' },
  { deviceId: 'TURBINE-002', name: 'Auxiliary Turbine 2', status: 'online' },
  { deviceId: 'TEMP-SENSOR-01', name: 'Boiler Chamber Temp Monitor', status: 'online' },
  { deviceId: 'HVAC-UNIT-04', name: 'Cleanroom HVAC System', status: 'offline' },
  { deviceId: 'PRESSURE-PUMP-02', name: 'Hydraulic Pressure Unit', status: 'offline' }
];

export const OverviewDashboard = () => {
  const { stats, liveTelemetryFeed, liveAlerts, setActiveTab, openRuleInBuilder, showToast, refreshStats } = useApp();
  const [deviceList, setDeviceList] = useState(defaultDeviceList);

  useEffect(() => {
    let isMounted = true;
    api.getDevices()
      .then(res => {
        if (isMounted && res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setDeviceList(res.data);
        }
      })
      .catch(() => {
        // Fall back gracefully to realistic demo device data
      });
    return () => { isMounted = false; };
  }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      showToast('Alert marked as acknowledged', 'success');
      refreshStats();
    } catch (err) {
      showToast(`Error: ${err.message}`, 'danger');
    }
  };

  // Prepare chart data from live telemetry feed (in chronological order)
  const chartData = [...liveTelemetryFeed].reverse().map((item, idx) => ({
    time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : `${idx}s`,
    temperature: item.temperature,
    humidity: item.humidity,
    vibration: item.vibration ? Number((item.vibration * 10).toFixed(1)) : 25,
    deviceId: item.metadata?.deviceId || item.deviceId
  }));

  const displayAlerts = liveAlerts.length > 0 ? liveAlerts : stats.recentAlerts || [];

  return (
    <div className="page-wrapper">
      {/* Quick Launch Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)',
          borderRadius: 16,
          padding: '24px 32px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          boxShadow: '0 8px 24px rgba(49, 46, 129, 0.2)'
        }}
      >
        <div>
          <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Flagship Capability
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginTop: 8 }}>
            Visual IoT Rule Engine & Data Stream Compiler
          </h2>
          <p style={{ color: '#c7d2fe', fontSize: 14, maxWidth: 650, marginTop: 4 }}>
            Build responsive IoT processing workflows with drag-and-drop nodes. Compiles visually into high-performance RxJS streams with real-time alerting.
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setActiveTab('builder')}
          style={{ background: 'white', color: '#312e81', fontWeight: 700, padding: '10px 20px', border: 'none' }}
        >
          Open Visual Builder
          <ArrowRight size={16} />
        </button>
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div>
            <div className="metric-label">Total Time-Series Telemetry</div>
            <div className="metric-value">{(stats.totalTelemetry || 0).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: '#059669', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <TrendingUp size={14} /> Append-only storage active
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <Activity size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Hardware Devices Online</div>
            <div className="metric-value">
              {stats.onlineDevices || 0} <span style={{ fontSize: 16, color: '#64748b' }}>/ {stats.totalDevices || 0}</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              All zones nominal
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#dcfce7', color: '#15803d' }}>
            <Cpu size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Active RxJS Stream Rules</div>
            <div className="metric-value">{stats.activeRules || 0}</div>
            <div style={{ fontSize: 12, color: '#4338ca', marginTop: 4 }}>
              Dynamic reactive pipelines
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
            <Sliders size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Alerts Dispatched</div>
            <div className="metric-value">{displayAlerts.length}</div>
            <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
              Mock SMS & Webhooks
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <BellRing size={24} />
          </div>
        </div>
      </div>

      {/* Main Realtime Chart Card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Live Sensor Telemetry Stream</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              Real-time temperature and humidity streaming via WebSockets without page reload
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-success">Live WebSocket Stream</span>
          </div>
        </div>

        <div style={{ height: 320, width: '100%' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: 8, 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area 
                  type="monotone" 
                  dataKey="temperature" 
                  name="Temperature (°C)" 
                  stroke="#4f46e5" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#tempGradient)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="humidity" 
                  name="Humidity (%RH)" 
                  stroke="#06b6d4" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#humidityGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              Awaiting telemetry socket packets...
            </div>
          )}
        </div>
      </div>

      {/* Split Row: Hardware Devices & Recent Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Device Status Section */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Device Status</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Real-time operational status of hardware endpoints
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('devices')}>
              View All ({deviceList.length})
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 330, overflowY: 'auto' }}>
            {deviceList.map(dev => {
              const isOnline = dev.status === 'online';
              return (
                <div 
                  key={dev.deviceId || dev.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    gap: 12
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dev.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {dev.deviceId || dev.id}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {isOnline ? (
                      <span className="device-status-badge online">
                        <span className="status-dot-green"></span>
                        Online
                      </span>
                    ) : (
                      <span className="device-status-badge offline">
                        <span className="status-dot-red"></span>
                        Offline
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Triggered Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Rule Engine Alerts</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('alerts')}>
              View History
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 330, overflowY: 'auto' }}>
            {displayAlerts.length > 0 ? (
              displayAlerts.slice(0, 5).map((alert, idx) => (
                <div
                  key={alert._id || idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #fed7aa',
                    background: '#fffaf5',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge badge-warning" style={{ fontSize: 10 }}>
                        {alert.severity || 'warning'}
                      </span>
                      <strong style={{ fontSize: 12, color: '#0f172a' }}>{alert.ruleName}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                      {alert.message}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : 'Just now'}
                      {alert.deliveryStatus?.sms?.sent && ' • 📱 Mock SMS Dispatched'}
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAcknowledge(alert._id)}
                      style={{ fontSize: 11, padding: '4px 8px' }}
                    >
                      <CheckCircle2 size={12} />
                      Ack
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b', fontSize: 13 }}>
                No active alerts. All hardware within nominal parameters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
