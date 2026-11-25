import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Clock, 
  Radio, 
  Pause, 
  Play, 
  Sliders, 
  ChevronRight, 
  AlertTriangle, 
  Layers, 
  Cpu, 
  Database, 
  RefreshCw,
  Flame,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { socket } from '../../services/socket';

const METRIC_DEFS = {
  temperature: { label: 'Temperature', unit: '°C', color: '#ea580c', gradientId: 'rtTempGrad', decimals: 1 },
  humidity: { label: 'Humidity', unit: '%RH', color: '#0284c7', gradientId: 'rtHumGrad', decimals: 1 },
  vibration: { label: 'Vibration', unit: 'mm/s', color: '#7c3aed', gradientId: 'rtVibGrad', decimals: 2 },
  pressure: { label: 'Pressure', unit: 'kPa', color: '#059669', gradientId: 'rtPresGrad', decimals: 1 },
  voltage: { label: 'Voltage', unit: 'V', color: '#eab308', gradientId: 'rtVoltGrad', decimals: 1 }
};

export const RealtimeTelemetryMonitor = ({
  initialDeviceId = 'all',
  showDeviceSelector = true,
  showControls = true,
  defaultBufferLimit = 30
}) => {
  const { 
    socketStatus, 
    liveTelemetryFeed, 
    openDeviceDetails, 
    triggerOverheatSpike,
    simulatorRunning,
    toggleSimulator
  } = useApp();

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(initialDeviceId);
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [bufferLimit, setBufferLimit] = useState(defaultBufferLimit);
  const [isChartPaused, setIsChartPaused] = useState(false);
  const [chartBuffer, setChartBuffer] = useState([]);
  const [lastPacketTime, setLastPacketTime] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // Interval timer to update "X seconds ago" ticker
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch device list for selector and metadata lookup
  useEffect(() => {
    let mounted = true;
    api.getDevices()
      .then(res => {
        if (mounted && res.success && Array.isArray(res.data)) {
          setDevices(res.data);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Sync with initialDeviceId prop if it changes
  useEffect(() => {
    if (initialDeviceId) {
      setSelectedDevice(initialDeviceId);
    }
  }, [initialDeviceId]);

  // Map of device metadata by deviceId
  const deviceMap = useMemo(() => {
    const map = new Map();
    devices.forEach(d => {
      if (d.deviceId) {
        map.set(d.deviceId.toUpperCase(), d);
      }
    });
    return map;
  }, [devices]);

  // Selected device metadata object
  const currentDeviceInfo = useMemo(() => {
    if (selectedDevice === 'all') return null;
    return deviceMap.get(selectedDevice.toUpperCase()) || { deviceId: selectedDevice, name: selectedDevice };
  }, [selectedDevice, deviceMap]);

  // Socket room subscription and isolated listener handling
  useEffect(() => {
    setSubscriptionError(null);

    // If selecting a specific device, subscribe to its dedicated room
    if (selectedDevice !== 'all') {
      try {
        socket.emit('subscribe:device', selectedDevice);
      } catch (err) {
        setSubscriptionError('Failed to emit device subscription');
      }
    }

    // Packet ingestion handler
    const handleIncomingPacket = (packet) => {
      if (!packet) return;
      const packetDevId = (packet.metadata?.deviceId || packet.deviceId || '').trim().toUpperCase();

      // Check if packet matches current filter
      if (selectedDevice !== 'all' && packetDevId !== selectedDevice.toUpperCase()) {
        return;
      }

      setLastPacketTime(new Date(packet.timestamp || Date.now()));

      // Append to local chart buffer if not paused
      setChartBuffer(prev => {
        if (isChartPaused) return prev;
        const updated = [...prev, packet];
        if (updated.length > bufferLimit) {
          return updated.slice(updated.length - bufferLimit);
        }
        return updated;
      });
    };

    // Listen to device-specific stream and global feed
    socket.on('telemetry:device_data', handleIncomingPacket);
    socket.on('telemetry:data', handleIncomingPacket);

    return () => {
      if (selectedDevice !== 'all') {
        try {
          socket.emit('unsubscribe:device', selectedDevice);
        } catch (e) {}
      }
      socket.off('telemetry:device_data', handleIncomingPacket);
      socket.off('telemetry:data', handleIncomingPacket);
    };
  }, [selectedDevice, isChartPaused, bufferLimit]);

  // Initialize buffer from existing liveTelemetryFeed when device changes or on mount
  useEffect(() => {
    const matchingInitial = liveTelemetryFeed.filter(p => {
      if (selectedDevice === 'all') return true;
      const pId = (p.metadata?.deviceId || p.deviceId || '').trim().toUpperCase();
      return pId === selectedDevice.toUpperCase();
    });

    if (matchingInitial.length > 0) {
      const recent = matchingInitial.slice(0, bufferLimit).reverse();
      setChartBuffer(recent);
      setLastPacketTime(new Date(recent[recent.length - 1].timestamp || Date.now()));
    } else {
      setChartBuffer([]);
      setLastPacketTime(null);
    }
  }, [selectedDevice, bufferLimit]);

  // Dynamically detect available metrics from the actual live data buffer
  const detectedMetrics = useMemo(() => {
    const metricKeys = new Set();
    const candidateKeys = ['temperature', 'humidity', 'vibration', 'pressure', 'voltage'];

    // Scan chart buffer
    chartBuffer.forEach(p => {
      candidateKeys.forEach(k => {
        if (typeof p[k] === 'number') metricKeys.add(k);
      });
      // Scan other custom numeric keys
      Object.keys(p).forEach(k => {
        if (!['_id', '__v', 'samplingRate', 'timestamp', 'metadata', 'createdAt', 'updatedAt', 'status', 'isSimulated'].includes(k)) {
          if (typeof p[k] === 'number') metricKeys.add(k);
        }
      });
    });

    // Scan global feed for this device if buffer is still small
    liveTelemetryFeed.forEach(p => {
      const pDevId = (p.metadata?.deviceId || p.deviceId || '').trim().toUpperCase();
      if (selectedDevice === 'all' || pDevId === selectedDevice.toUpperCase()) {
        candidateKeys.forEach(k => {
          if (typeof p[k] === 'number') metricKeys.add(k);
        });
      }
    });

    // Fallback candidates if no packets arrived yet
    if (metricKeys.size === 0) {
      candidateKeys.forEach(k => metricKeys.add(k));
    }

    return Array.from(metricKeys);
  }, [chartBuffer, liveTelemetryFeed, selectedDevice]);

  // Ensure selected metric is valid
  useEffect(() => {
    if (detectedMetrics.length > 0 && !detectedMetrics.includes(selectedMetric)) {
      setSelectedMetric(detectedMetrics[0]);
    }
  }, [detectedMetrics, selectedMetric]);

  // Compute Connection State
  // Live: socket is connected AND packet received within last 20 seconds
  // Waiting: socket is connected BUT no packet in buffer or last packet > 20s ago
  // Disconnected: socketStatus === 'disconnected' or !socket.connected
  // Error: subscriptionError or error state
  const connectionState = useMemo(() => {
    if (socketStatus === 'disconnected') {
      return {
        status: 'disconnected',
        label: 'Socket Disconnected',
        desc: 'Browser connection to WebSocket gateway is unavailable',
        badgeClass: 'badge-danger',
        dotColor: '#dc2626'
      };
    }
    if (subscriptionError) {
      return {
        status: 'error',
        label: 'Subscription Error',
        desc: subscriptionError,
        badgeClass: 'badge-danger',
        dotColor: '#dc2626'
      };
    }
    if (!lastPacketTime) {
      return {
        status: 'waiting',
        label: 'Waiting for Telemetry',
        desc: `Connected to gateway; awaiting telemetry emissions from ${selectedDevice === 'all' ? 'edge devices' : selectedDevice}`,
        badgeClass: 'badge-warning',
        dotColor: '#d97706'
      };
    }
    const secondsSinceLast = (nowTick - lastPacketTime.getTime()) / 1000;
    if (secondsSinceLast <= 20) {
      return {
        status: 'live',
        label: 'Live Stream Active',
        desc: `Receiving real-time sensor packets (${secondsSinceLast < 2 ? 'just now' : Math.floor(secondsSinceLast) + 's ago'})`,
        badgeClass: 'badge-success',
        dotColor: '#10b981',
        isReceiving: true
      };
    } else {
      return {
        status: 'waiting',
        label: 'Idle / Waiting',
        desc: `Last packet received ${Math.floor(secondsSinceLast)}s ago`,
        badgeClass: 'badge-warning',
        dotColor: '#d97706'
      };
    }
  }, [socketStatus, subscriptionError, lastPacketTime, nowTick, selectedDevice]);

  // Latest sensor readings computed from most recent packet
  const latestPacket = chartBuffer.length > 0 ? chartBuffer[chartBuffer.length - 1] : null;

  // Active metric metadata
  const currentMetricDef = useMemo(() => {
    return METRIC_DEFS[selectedMetric] || {
      label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
      unit: '',
      color: '#4f46e5',
      gradientId: `${selectedMetric}LiveGrad`,
      decimals: 1
    };
  }, [selectedMetric]);

  // Formatted data for Recharts time-series chart
  const formattedChartData = useMemo(() => {
    return chartBuffer
      .filter(p => typeof p[selectedMetric] === 'number' && !isNaN(p[selectedMetric]))
      .map((p, idx) => {
        const timeObj = p.timestamp ? new Date(p.timestamp) : new Date();
        const timeLabel = timeObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const devId = (p.metadata?.deviceId || p.deviceId || 'DEV').toUpperCase();
        return {
          id: p._id || idx,
          rawTimestamp: p.timestamp,
          time: timeLabel,
          value: Number(p[selectedMetric].toFixed(currentMetricDef.decimals !== undefined ? currentMetricDef.decimals : 2)),
          deviceId: devId,
          deviceName: deviceMap.get(devId)?.name || devId,
          status: p.status || 'nominal'
        };
      });
  }, [chartBuffer, selectedMetric, currentMetricDef, deviceMap]);

  return (
    <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
      {/* Top Header & Device / Metric Controls */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: '#ffffff' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Section Title & Subtitle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 8, 
                background: '#030712', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                <Radio size={16} color="#38bdf8" />
              </div>
              <div>
                <h3 className="card-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                  Real-Time Telemetry Monitoring
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
                  Live WebSocket sensor streaming with automatic metric discovery & device isolation
                </p>
              </div>
            </div>
          </div>

          {/* Connection Status & Live Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Live Data / Socket Status Badge */}
            <div 
              className={`badge ${connectionState.badgeClass}`}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 7, 
                padding: '6px 12px', 
                fontSize: 12,
                fontWeight: 600,
                boxShadow: connectionState.isReceiving ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none'
              }}
              title={connectionState.desc}
            >
              <span 
                style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: connectionState.dotColor,
                  display: 'inline-block',
                  animation: connectionState.isReceiving ? 'pulse 1.5s infinite' : 'none'
                }} 
              />
              <span>{connectionState.label}</span>
            </div>

            {/* Buffer Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <span>Buffer:</span>
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: 12, width: 'auto', minWidth: 70 }}
                value={bufferLimit}
                onChange={e => setBufferLimit(Number(e.target.value))}
                title="Number of points kept in memory for smooth chart rendering"
              >
                <option value={15}>15 pts</option>
                <option value={30}>30 pts</option>
                <option value={50}>50 pts</option>
                <option value={100}>100 pts</option>
              </select>
            </div>

            {/* Pause / Resume Chart Button */}
            <button
              type="button"
              className={`btn btn-sm ${isChartPaused ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setIsChartPaused(!isChartPaused)}
              title={isChartPaused ? 'Resume live chart stream updates' : 'Pause chart rendering to inspect values'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12 }}
            >
              {isChartPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isChartPaused ? 'Resume' : 'Freeze'}</span>
            </button>
          </div>
        </div>

        {/* Device & Metric Filters Row */}
        <div style={{ 
          marginTop: 16, 
          paddingTop: 16, 
          borderTop: '1px solid #f1f5f9', 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: 12 
        }}>
          {/* Device Selection Dropdown */}
          {showDeviceSelector && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hardware Target:
              </span>
              <select
                className="form-select"
                style={{ 
                  minWidth: 240, 
                  padding: '6px 12px', 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: '#0f172a',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1'
                }}
                value={selectedDevice}
                onChange={e => setSelectedDevice(e.target.value)}
              >
                <option value="all">⚡ All Fleet Devices (Global Stream)</option>
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.deviceId} – {d.name} ({d.type || 'Sensor'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Metric Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Metric:
            </span>
            {detectedMetrics.map(metricKey => {
              const def = METRIC_DEFS[metricKey] || {
                label: metricKey.charAt(0).toUpperCase() + metricKey.slice(1),
                unit: '',
                color: '#4f46e5'
              };
              const isSelected = selectedMetric === metricKey;
              return (
                <button
                  key={metricKey}
                  type="button"
                  onClick={() => setSelectedMetric(metricKey)}
                  style={{
                    border: isSelected ? `2px solid ${def.color}` : '1px solid #e2e8f0',
                    background: isSelected ? `${def.color}15` : '#ffffff',
                    color: isSelected ? def.color : '#64748b',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: 12,
                    padding: '5px 12px',
                    borderRadius: 20,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 2px 6px ${def.color}25` : 'none'
                  }}
                >
                  {def.label} {def.unit && `(${def.unit})`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sensor Reading Snapshot Strip */}
      <div style={{ 
        background: '#f8fafc', 
        padding: '14px 24px', 
        borderBottom: '1px solid var(--border)', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 16 
      }}>
        {/* Device Information Card */}
        <div style={{ minWidth: 170 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Monitored Target
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{selectedDevice === 'all' ? 'All Fleet Devices' : selectedDevice}</span>
            {selectedDevice !== 'all' && (
              <button 
                type="button" 
                onClick={() => openDeviceDetails(selectedDevice)}
                style={{ background: 'transparent', border: 'none', color: '#4f46e5', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                title="View Device Specifications"
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {selectedDevice === 'all' ? `${devices.length} registered hardware nodes` : (currentDeviceInfo?.name || currentDeviceInfo?.location || 'Hardware Edge Controller')}
          </div>
        </div>

        {/* Latest Metric Value Card */}
        <div style={{ minWidth: 170 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Latest {currentMetricDef.label} Reading
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: currentMetricDef.color, marginTop: 2 }}>
            {latestPacket && latestPacket[selectedMetric] !== undefined ? (
              `${Number(latestPacket[selectedMetric]).toFixed(currentMetricDef.decimals !== undefined ? currentMetricDef.decimals : 1)} ${currentMetricDef.unit}`
            ) : (
              '--'
            )}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            {latestPacket?.status ? `State: ${latestPacket.status.toUpperCase()}` : 'Awaiting sensor packet'}
          </div>
        </div>

        {/* Last Packet Received Timestamp */}
        <div style={{ minWidth: 170 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Last Packet Arrived
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="#64748b" />
            <span>
              {lastPacketTime ? lastPacketTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No packet received yet'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: connectionState.isReceiving ? '#059669' : '#64748b', marginTop: 2, fontWeight: connectionState.isReceiving ? 600 : 400 }}>
            {lastPacketTime ? (
              (() => {
                const diff = (nowTick - lastPacketTime.getTime()) / 1000;
                return diff < 3 ? 'Arrived just now' : `${Math.floor(diff)} seconds ago`;
              })()
            ) : (
              'Awaiting initial emission'
            )}
          </div>
        </div>

        {/* Quick Simulator Controller */}
        <div style={{ minWidth: 170, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>
            Demo Generator
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className={`btn btn-sm ${simulatorRunning ? 'btn-secondary' : 'btn-primary'}`}
              onClick={toggleSimulator}
              style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              {simulatorRunning ? <Pause size={12} /> : <Play size={12} />}
              {simulatorRunning ? 'Pause Stream' : 'Start Stream'}
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => triggerOverheatSpike(selectedDevice !== 'all' ? selectedDevice : 'TURBINE-001', 94.2)}
              title="Inject immediate 94.2°C temperature spike to test live alerts"
              style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Flame size={12} />
              Spike
            </button>
          </div>
        </div>
      </div>

      {/* Main Live Chart Area */}
      <div style={{ padding: '20px 24px 24px', background: '#ffffff' }}>
        {socketStatus === 'disconnected' ? (
          <div style={{ 
            height: 280, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#dc2626', 
            background: '#fef2f2', 
            borderRadius: 8, 
            border: '1px solid #fecaca',
            padding: 24,
            textAlign: 'center'
          }}>
            <WifiOff size={36} color="#dc2626" style={{ marginBottom: 12 }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#991b1b' }}>WebSocket Gateway Disconnected</h4>
            <p style={{ fontSize: 13, color: '#b91c1c', maxWidth: 440, margin: '6px 0 16px' }}>
              The browser client lost real-time connection to the NexusFlow WebSocket engine. Telemetry stream paused until reconnection succeeds.
            </p>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                socket.connect();
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={13} />
              Retry Connection
            </button>
          </div>
        ) : formattedChartData.length === 0 ? (
          <div style={{ 
            height: 280, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#64748b', 
            background: '#f8fafc', 
            borderRadius: 8, 
            border: '1px dashed #cbd5e1',
            padding: 24,
            textAlign: 'center'
          }}>
            <Radio size={36} color="#94a3b8" style={{ marginBottom: 12, animation: 'pulse 2s infinite' }} />
            <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1e293b' }}>
              Waiting for Real-Time Telemetry Stream
            </h4>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 440, margin: '6px 0 14px' }}>
              Connected to WebSocket gateway on channel <code>{selectedDevice === 'all' ? 'telemetry:data' : `device:${selectedDevice}`}</code>. Awaiting sensor transmissions...
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {!simulatorRunning && (
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={toggleSimulator}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Play size={13} />
                  Start Demo Sensor Generator
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => triggerOverheatSpike(selectedDevice !== 'all' ? selectedDevice : 'TURBINE-001', 91.5)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Flame size={13} />
                Send Test Packet
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Chart Subtitle Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Continuous {currentMetricDef.label} Stream</span>
                <span className="badge badge-info" style={{ fontSize: 11, padding: '2px 8px' }}>
                  {formattedChartData.length} live data points
                </span>
                {isChartPaused && (
                  <span className="badge badge-warning" style={{ fontSize: 11 }}>
                    FREEZE PAUSED
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                X-Axis: Real-Time Local Clock (hh:mm:ss) • Auto-scroll window
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div style={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedChartData} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id={currentMetricDef.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentMetricDef.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={currentMetricDef.color} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    stroke="#cbd5e1" 
                    minTickGap={25}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                    stroke="#cbd5e1" 
                    unit={currentMetricDef.unit ? ` ${currentMetricDef.unit}` : ''}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const point = payload[0].payload;
                      return (
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '10px 14px',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                            Device: <strong style={{ color: '#4f46e5' }}>{point.deviceId}</strong>
                            {point.deviceName && point.deviceName !== point.deviceId && (
                              <span> ({point.deviceName})</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 5 }}>
                            Timestamp: {point.rawTimestamp ? new Date(point.rawTimestamp).toLocaleTimeString() : point.time}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: currentMetricDef.color }}>
                            {currentMetricDef.label}: {point.value} {currentMetricDef.unit}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={`${currentMetricDef.label} (${currentMetricDef.unit})`}
                    stroke={currentMetricDef.color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill={`url(#${currentMetricDef.gradientId})`}
                    isAnimationActive={false} // Disable animation to prevent jitter during high-frequency live streaming
                    activeDot={{ r: 5, fill: currentMetricDef.color, stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
