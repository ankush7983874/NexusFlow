import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Send, 
  Filter, 
  Flame, 
  Clock, 
  Wifi, 
  Database,
  Play,
  Pause,
  Layers,
  Sparkles,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const LiveTelemetry = () => {
  const { 
    liveTelemetryFeed, 
    showToast, 
    refreshStats, 
    triggerOverheatSpike,
    simulatorRunning,
    toggleSimulator
  } = useApp();

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('all');
  
  // Manual ingestion state
  const [customDeviceId, setCustomDeviceId] = useState('TURBINE-001');
  const [customTemp, setCustomTemp] = useState(78.5);
  const [customHumidity, setCustomHumidity] = useState(48.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Batch injection state
  const [isBatchIngesting, setIsBatchIngesting] = useState(false);

  useEffect(() => {
    api.getDevices()
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setDevices(res.data);
          setCustomDeviceId(res.data[0].deviceId);
        }
      })
      .catch(() => {});
  }, []);

  const filteredFeed = selectedDevice === 'all'
    ? liveTelemetryFeed
    : liveTelemetryFeed.filter(t => (t.metadata?.deviceId || t.deviceId) === selectedDevice);

  const handleManualIngest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.ingestSingle({
        deviceId: customDeviceId,
        temperature: Number(customTemp),
        humidity: Number(customHumidity),
        vibration: 2.4,
        pressure: 101.3,
        voltage: 220,
        status: Number(customTemp) > 80 ? 'warning' : 'nominal',
        isSimulated: false // Direct manual ingestion
      });

      showToast(`Ingested manual telemetry: ${customTemp}°C, ${customHumidity}% from ${customDeviceId}`, 'success');
      refreshStats();
    } catch (err) {
      showToast(`Ingestion failed: ${err.message}`, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchIngestTest = async () => {
    setIsBatchIngesting(true);
    try {
      const targetDev = customDeviceId || 'TURBINE-001';
      const batchRecords = [];
      const now = Date.now();

      for (let i = 0; i < 5; i++) {
        batchRecords.push({
          deviceId: targetDev,
          temperature: Number((72 + Math.random() * 8).toFixed(1)),
          humidity: Number((45 + Math.random() * 10).toFixed(1)),
          vibration: Number((2.0 + Math.random() * 1.5).toFixed(2)),
          timestamp: new Date(now + i * 1000),
          isSimulated: true
        });
      }

      const res = await api.ingestBatch(batchRecords);
      showToast(`Successfully ingested batch of ${res.data?.insertedCount || 5} readings into Time-Series collection!`, 'success');
      refreshStats();
    } catch (err) {
      showToast(`Batch ingestion failed: ${err.message}`, 'danger');
    } finally {
      setIsBatchIngesting(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Top Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Live Telemetry Ingestion Feed</h1>
          <p className="page-subtitle">Real-time WebSocket streaming directly into native MongoDB Time-Series collection</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            className={`btn btn-sm ${simulatorRunning ? 'btn-secondary' : 'btn-primary'}`}
            onClick={toggleSimulator}
          >
            {simulatorRunning ? <Pause size={14} /> : <Play size={14} />}
            {simulatorRunning ? 'Pause Demo Generator' : 'Start Demo Generator'}
          </button>

          <button 
            className="btn btn-danger btn-sm"
            onClick={() => triggerOverheatSpike(customDeviceId || 'TURBINE-001', 93.5, 41.0)}
            title="Inject simulated overheat spike (93.5°C)"
          >
            <Flame size={14} />
            Test Spike (93.5°C)
          </button>
        </div>
      </div>

      {/* Control Panels Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Manual Telemetry Injection */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div>
              <h3 className="card-title">Individual Telemetry Ingestion</h3>
              <p style={{ fontSize: 12, color: '#64748b' }}>Send individual hardware telemetry reading with Zod validation</p>
            </div>
            <span className="badge badge-info" style={{ fontSize: 11 }}>
              POST /api/telemetry
            </span>
          </div>

          <form onSubmit={handleManualIngest}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Target Device</label>
                <select 
                  className="form-select"
                  value={customDeviceId}
                  onChange={e => setCustomDeviceId(e.target.value)}
                  style={{ fontSize: 13 }}
                >
                  {devices.length > 0 ? (
                    devices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.deviceId} ({d.name})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="TURBINE-001">TURBINE-001</option>
                      <option value="TURBINE-002">TURBINE-002</option>
                      <option value="TEMP-SENSOR-01">TEMP-SENSOR-01</option>
                      <option value="HVAC-UNIT-04">HVAC-UNIT-04</option>
                      <option value="PRESSURE-PUMP-01">PRESSURE-PUMP-01</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={customTemp}
                  onChange={e => setCustomTemp(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Humidity (%RH)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="form-input"
                  value={customHumidity}
                  onChange={e => setCustomHumidity(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleBatchIngestTest}
                disabled={isBatchIngesting}
              >
                <Layers size={14} />
                {isBatchIngesting ? 'Ingesting Batch...' : 'Test Batch (5 Packets)'}
              </button>

              <button 
                type="submit" 
                className="btn btn-primary btn-sm"
                disabled={isSubmitting}
              >
                <Send size={14} />
                {isSubmitting ? 'Ingesting...' : 'Ingest Reading'}
              </button>
            </div>
          </form>
        </div>

        {/* Demo Sensor Generator Control Card */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div>
              <h3 className="card-title">Demo Sensor Generator</h3>
              <p style={{ fontSize: 12, color: '#64748b' }}>Automated continuous temperature & humidity simulation</p>
            </div>
            <span className={`badge ${simulatorRunning ? 'badge-success' : 'badge-warning'}`}>
              ● {simulatorRunning ? 'Active Generator' : 'Paused'}
            </span>
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 14, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Simulator Status:</span>
              <strong style={{ color: simulatorRunning ? '#059669' : '#d97706' }}>
                {simulatorRunning ? 'Streaming live packets (every 2.5s)' : 'Generator Paused'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Identification:</span>
              <span className="badge badge-info" style={{ fontSize: 10 }}>isSimulated: true</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Target Devices:</span>
              <span>Turbine-001, Turbine-002, Boiler, HVAC</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className={`btn btn-sm ${simulatorRunning ? 'btn-secondary' : 'btn-primary'}`}
              style={{ flex: 1 }}
              onClick={toggleSimulator}
            >
              {simulatorRunning ? <Pause size={14} /> : <Play size={14} />}
              {simulatorRunning ? 'Pause Generator' : 'Resume Generator'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Live Status Bar */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Filter Hardware Stream:</span>
          <select 
            className="form-select" 
            style={{ width: 220, padding: '5px 10px', fontSize: 12 }}
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
          >
            <option value="all">All Devices ({liveTelemetryFeed.length} buffered)</option>
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.deviceId} ({d.name})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#64748b' }}>
          <span>Buffer: <strong>{filteredFeed.length} packets</strong></span>
          <span className="badge badge-success">● Socket.IO Active</span>
        </div>
      </div>

      {/* Telemetry Stream Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device Identifier</th>
              <th>Data Source</th>
              <th>Temperature</th>
              <th>Humidity</th>
              <th>Vibration</th>
              <th>Pressure</th>
              <th>Voltage</th>
              <th>Health Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeed.length > 0 ? (
              filteredFeed.map((item, idx) => {
                const devId = item.metadata?.deviceId || item.deviceId || 'UNKNOWN';
                const temp = item.temperature;
                const isOverheat = temp !== undefined && temp > 80;
                const isSimulated = Boolean(item.metadata?.isSimulated || item.isSimulated);

                return (
                  <tr key={item._id || idx} style={{ background: isOverheat ? '#fff1f2' : undefined }}>
                    <td style={{ color: '#64748b', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} />
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Live'}
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                        {devId}
                      </strong>
                    </td>
                    <td>
                      {isSimulated ? (
                        <span className="badge badge-info" style={{ fontSize: 10 }}>
                          <Sparkles size={10} /> Simulated
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: 10 }}>
                          <Cpu size={10} /> Direct Hardware
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: isOverheat ? '#dc2626' : '#ea580c' }}>
                      {temp !== undefined ? `${temp}°C` : '--'}
                      {isOverheat && ' 🚨'}
                    </td>
                    <td style={{ color: '#0284c7', fontWeight: 600 }}>
                      {item.humidity !== undefined ? `${item.humidity}%` : '--'}
                    </td>
                    <td>{item.vibration !== undefined ? `${item.vibration} mm/s` : '--'}</td>
                    <td>{item.pressure !== undefined ? `${item.pressure} kPa` : '--'}</td>
                    <td>{item.voltage !== undefined ? `${item.voltage} V` : '--'}</td>
                    <td>
                      <span className={`badge ${isOverheat ? 'badge-danger' : 'badge-success'}`}>
                        {isOverheat ? 'OVERHEAT' : item.status || 'nominal'}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                  Awaiting real-time telemetry packets from edge devices...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
