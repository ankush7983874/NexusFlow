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
  Clock,
  WifiOff,
  Search,
  X,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  ExternalLink,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { RealtimeTelemetryMonitor } from '../components/telemetry/RealtimeTelemetryMonitor';

const defaultDeviceList = [
  { deviceId: 'TURBINE-001', name: 'Main Generator Turbine 1', status: 'online' },
  { deviceId: 'TURBINE-002', name: 'Auxiliary Turbine 2', status: 'online' },
  { deviceId: 'TEMP-SENSOR-01', name: 'Boiler Chamber Temp Monitor', status: 'online' },
  { deviceId: 'HVAC-UNIT-04', name: 'Cleanroom HVAC System', status: 'offline' },
  { deviceId: 'PRESSURE-PUMP-02', name: 'Hydraulic Pressure Unit', status: 'offline' }
];

export const OverviewDashboard = () => {
  const { stats, liveTelemetryFeed, liveAlerts, setActiveTab, openRuleInBuilder, openDeviceDetails, showToast, refreshStats } = useApp();
  const [deviceList, setDeviceList] = useState(defaultDeviceList);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [alertStats, setAlertStats] = useState({
    active: 0,
    critical: 0,
    warning: 0,
    resolved: 0,
    acknowledged: 0,
    total: 0
  });

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
  }, [stats]);

  // Fetch alert stats for dynamic alert counts
  useEffect(() => {
    let isMounted = true;
    const fetchAlertStats = () => {
      api.getAlertStats()
        .then(res => {
          if (isMounted && res && res.success && res.data) {
            setAlertStats(res.data);
          }
        })
        .catch(() => {
          // Fallback gracefully
        });
    };
    fetchAlertStats();
    return () => { isMounted = false; };
  }, [liveAlerts, stats]);

  // Calculate dynamic device metrics directly from actual existing device data
  const totalDevices = deviceList.length;
  const onlineDevices = deviceList.filter(d => d.status === 'online').length;
  const offlineDevices = deviceList.filter(d => d.status !== 'online').length;

  const displayAlerts = liveAlerts.length > 0 ? liveAlerts : stats.recentAlerts || [];

  // Filter dashboard devices by name or deviceId
  const filteredDashboardDevices = deviceList.filter(d => {
    const query = deviceSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      (d.name && d.name.toLowerCase().includes(query)) ||
      (d.deviceId && d.deviceId.toLowerCase().includes(query))
    );
  });

  const handleAcknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      showToast('Alert marked as acknowledged', 'success');
      refreshStats();
      api.getAlertStats().then(res => res?.data && setAlertStats(res.data)).catch(() => {});
    } catch (err) {
      showToast(`Error: ${err.message}`, 'danger');
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await api.resolveAlert(alertId);
      showToast('Alert marked as resolved', 'success');
      refreshStats();
      api.getAlertStats().then(res => res?.data && setAlertStats(res.data)).catch(() => {});
    } catch (err) {
      showToast(`Error: ${err.message}`, 'danger');
    }
  };

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

      {/* Fleet Overview Summary Cards */}
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        <div className="metric-card">
          <div>
            <div className="metric-label">Total Devices</div>
            <div className="metric-value">{totalDevices}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Active hardware fleet
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#e0e7ff', color: '#4338ca' }}>
            <Cpu size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Online Devices</div>
            <div className="metric-value" style={{ color: '#15803d' }}>{onlineDevices}</div>
            <div style={{ fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className="status-dot-green"></span> Transmitting telemetry
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#dcfce7', color: '#15803d' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Offline Devices</div>
            <div className="metric-value" style={{ color: offlineDevices > 0 ? '#b91c1c' : '#0f172a' }}>{offlineDevices}</div>
            <div style={{ fontSize: 12, color: offlineDevices > 0 ? '#b91c1c' : '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {offlineDevices > 0 && <span className="status-dot-red"></span>}
              {offlineDevices > 0 ? 'Requires attention' : 'All devices online'}
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <WifiOff size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Active Alerts</div>
            <div className="metric-value" style={{ color: alertStats.active > 0 ? '#dc2626' : '#0f172a' }}>
              {alertStats.active}
            </div>
            <div style={{ fontSize: 12, color: alertStats.active > 0 ? '#dc2626' : '#64748b', marginTop: 4 }}>
              {alertStats.active > 0 ? `${alertStats.critical} critical, ${alertStats.warning} warning` : 'All nominal'}
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <BellRing size={24} />
          </div>
        </div>
      </div>

      {/* Module 5: Alert Summary Cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color="#4f46e5" />
            Alert & Threshold Insights
          </div>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => setActiveTab('alerts')}
            style={{ fontSize: 12, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            Manage Alerts
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="metrics-grid">
          <div className="metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
            <div>
              <div className="metric-label">Total Active Alerts</div>
              <div className="metric-value" style={{ color: alertStats.active > 0 ? '#ef4444' : '#0f172a' }}>
                {alertStats.active}
              </div>
              <div style={{ fontSize: 12, color: alertStats.active > 0 ? '#ef4444' : '#64748b', marginTop: 4 }}>
                {alertStats.active > 0 ? 'Requires acknowledgment or fix' : 'Nominal operation'}
              </div>
            </div>
            <div className="metric-icon-box" style={{ background: '#fee2e2', color: '#ef4444' }}>
              <BellRing size={22} />
            </div>
          </div>

          <div className="metric-card" style={{ borderLeft: '4px solid #dc2626' }}>
            <div>
              <div className="metric-label">Critical Alerts</div>
              <div className="metric-value" style={{ color: alertStats.critical > 0 ? '#dc2626' : '#0f172a' }}>
                {alertStats.critical}
              </div>
              <div style={{ fontSize: 12, color: alertStats.critical > 0 ? '#dc2626' : '#64748b', marginTop: 4 }}>
                Critical threshold breaches
              </div>
            </div>
            <div className="metric-icon-box" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AlertTriangle size={22} />
            </div>
          </div>

          <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div>
              <div className="metric-label">Warning Alerts</div>
              <div className="metric-value" style={{ color: alertStats.warning > 0 ? '#d97706' : '#0f172a' }}>
                {alertStats.warning}
              </div>
              <div style={{ fontSize: 12, color: alertStats.warning > 0 ? '#d97706' : '#64748b', marginTop: 4 }}>
                Elevated sensor warnings
              </div>
            </div>
            <div className="metric-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
              <ShieldAlert size={22} />
            </div>
          </div>

          <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
            <div>
              <div className="metric-label">Resolved Alerts</div>
              <div className="metric-value" style={{ color: '#059669' }}>
                {alertStats.resolved}
              </div>
              <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>
                Mitigated & normalized
              </div>
            </div>
            <div className="metric-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
              <CheckCircle size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry Monitoring Section */}
      <RealtimeTelemetryMonitor defaultBufferLimit={30} showDeviceSelector={true} />

      {/* Split Row: Hardware Devices & Recent Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
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
              View Fleet ({deviceList.length})
            </button>
          </div>

          {/* Clean Device Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '7px 12px',
            marginBottom: 14,
            boxSizing: 'border-box'
          }}>
            <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
            <input
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: 13,
                background: 'transparent',
                color: '#1e293b'
              }}
              placeholder="Search devices by name or device ID..."
              value={deviceSearch}
              onChange={e => setDeviceSearch(e.target.value)}
            />
            {deviceSearch && (
              <button
                type="button"
                onClick={() => setDeviceSearch('')}
                title="Clear search"
                style={{
                  background: '#e2e8f0',
                  border: 'none',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#64748b',
                  flexShrink: 0
                }}
              >
                <X size={10} />
              </button>
            )}
          </div>

          {/* Device Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
            {filteredDashboardDevices.length > 0 ? (
              filteredDashboardDevices.map(dev => {
                const isOnline = dev.status === 'online';
                return (
                  <div 
                    key={dev.deviceId || dev.id} 
                    onClick={() => openDeviceDetails(dev.deviceId || dev.id)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#c7d2fe';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    title={`Click to view details for ${dev.name}`}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dev.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        {dev.deviceId || dev.id}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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
                      <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                        Details <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '28px 16px',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: 10,
                border: '1px dashed #cbd5e1'
              }}>
                <Search size={22} color="#94a3b8" style={{ marginBottom: 6 }} />
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>No devices found</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  No device matches "{deviceSearch}"
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDeviceSearch('')}
                  style={{ marginTop: 10, fontSize: 11, padding: '4px 10px' }}
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Triggered Alerts */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Alerts</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Real-time active and recent threshold violations
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('alerts')}>
              View All Alerts
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
            {displayAlerts.length > 0 ? (
              displayAlerts.slice(0, 6).map((alert, idx) => {
                const isCritical = alert.severity === 'critical';
                const status = alert.status || (alert.acknowledged ? 'acknowledged' : 'active');
                const isResolved = status === 'resolved';
                const isAcknowledged = status === 'acknowledged';

                return (
                  <div
                    key={alert._id || idx}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: `1px solid ${isCritical ? '#fecaca' : isResolved ? '#bbf7d0' : '#fed7aa'}`,
                      background: isCritical ? '#fff8f8' : isResolved ? '#f0fdf4' : '#fffaf5',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span 
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 7px',
                            borderRadius: 4,
                            background: isCritical ? '#dc2626' : '#d97706',
                            color: '#ffffff'
                          }}
                        >
                          {alert.severity || 'warning'}
                        </span>
                        
                        <span 
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: 4,
                            background: isResolved ? '#dcfce7' : isAcknowledged ? '#e0e7ff' : '#fee2e2',
                            color: isResolved ? '#15803d' : isAcknowledged ? '#4338ca' : '#b91c1c'
                          }}
                        >
                          {status}
                        </span>

                        <strong style={{ fontSize: 13, color: '#0f172a' }}>
                          {alert.title || alert.ruleName || 'Threshold Alert'}
                        </strong>
                      </div>

                      {/* Device identifier & Metric info */}
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        {alert.deviceId && (
                          <span 
                            onClick={() => openDeviceDetails(alert.deviceId)}
                            style={{ 
                              cursor: 'pointer', 
                              color: '#4f46e5', 
                              fontWeight: 600,
                              textDecoration: 'underline'
                            }}
                            title="View device details"
                          >
                            {alert.deviceName || alert.deviceId}
                          </span>
                        )}
                        {alert.metric && alert.reading !== undefined && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                            {alert.metric}: <strong>{alert.reading}</strong>
                            {alert.threshold !== undefined && ` (limit: ${alert.threshold})`}
                          </span>
                        )}
                      </div>

                      {alert.message && (
                        <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                          {alert.message}
                        </div>
                      )}

                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      {!isResolved && !isAcknowledged && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAcknowledge(alert._id)}
                          style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Acknowledge alert"
                        >
                          <CheckCircle2 size={12} />
                          Ack
                        </button>
                      )}
                      {!isResolved && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleResolve(alert._id)}
                          style={{ fontSize: 11, padding: '4px 8px', color: '#15803d', borderColor: '#bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title="Resolve alert"
                        >
                          <Check size={12} />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: 13 }}>
                <CheckCircle size={28} color="#10b981" style={{ marginBottom: 8 }} />
                <div style={{ fontWeight: 600, color: '#0f172a' }}>All Parameters Nominal</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  No active alerts. Hardware sensors are operating within defined safety thresholds.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
