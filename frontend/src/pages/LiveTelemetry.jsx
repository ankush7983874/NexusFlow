import React, { useState } from 'react';
import { 
  Activity, 
  Send, 
  Filter, 
  Flame, 
  Clock, 
  Wifi, 
  Database 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const LiveTelemetry = () => {
  const { liveTelemetryFeed, showToast, refreshStats, triggerOverheatSpike } = useApp();
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [customTemp, setCustomTemp] = useState(85);
  const [customDeviceId, setCustomDeviceId] = useState('TURBINE-001');

  const filteredFeed = selectedDevice === 'all'
    ? liveTelemetryFeed
    : liveTelemetryFeed.filter(t => (t.metadata?.deviceId || t.deviceId) === selectedDevice);

  const handleManualIngest = async (e) => {
    e.preventDefault();
    try {
      await api.ingestSingle({
        deviceId: customDeviceId,
        sensorType: 'turbine',
        location: 'Factory Floor 1',
        temperature: Number(customTemp),
        humidity: 45,
        vibration: 3.2,
        status: Number(customTemp) > 80 ? 'warning' : 'nominal'
      });
      showToast(`Ingested manual telemetry: ${customTemp}°C from ${customDeviceId}`, 'success');
      refreshStats();
    } catch (err) {
      showToast(`Ingestion failed: ${err.message}`, 'danger');
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Live Telemetry Ingestion Feed</h1>
          <p className="page-subtitle">Real-time hardware packet stream delivered via WebSockets and stored in MongoDB Time-Series</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            className="btn btn-danger btn-sm"
            onClick={() => triggerOverheatSpike('TURBINE-001', 92.5)}
          >
            <Flame size={14} />
            Test Spike (92.5°C)
          </button>
        </div>
      </div>

      {/* Manual Ingestion Simulator Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title" style={{ marginBottom: 12 }}>Manual Telemetry Injection</h3>
        <form onSubmit={handleManualIngest} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Target Device ID</label>
            <select 
              className="form-select"
              value={customDeviceId}
              onChange={e => setCustomDeviceId(e.target.value)}
            >
              <option value="TURBINE-001">TURBINE-001</option>
              <option value="TURBINE-002">TURBINE-002</option>
              <option value="TEMP-SENSOR-01">TEMP-SENSOR-01</option>
              <option value="HVAC-UNIT-04">HVAC-UNIT-04</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Temperature (°C)</label>
            <input
              type="number"
              step="0.5"
              className="form-input"
              value={customTemp}
              onChange={e => setCustomTemp(e.target.value)}
              placeholder="e.g. 85.0"
            />
          </div>
          <div style={{ paddingTop: 20 }}>
            <button type="submit" className="btn btn-primary btn-sm">
              <Send size={14} />
              Inject Telemetry
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Table */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Filter by Hardware:</span>
          <select 
            className="form-select" 
            style={{ width: 180, padding: '4px 8px', fontSize: 12 }}
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
          >
            <option value="all">All Devices ({liveTelemetryFeed.length} buffered)</option>
            <option value="TURBINE-001">TURBINE-001</option>
            <option value="TURBINE-002">TURBINE-002</option>
            <option value="TEMP-SENSOR-01">TEMP-SENSOR-01</option>
            <option value="HVAC-UNIT-04">HVAC-UNIT-04</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#64748b' }}>
          <span>Buffer: <strong>{filteredFeed.length} packets</strong></span>
          <span className="badge badge-success">● Socket.IO Active</span>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device Identifier</th>
              <th>Temperature</th>
              <th>Humidity</th>
              <th>Vibration</th>
              <th>Pressure</th>
              <th>Voltage</th>
              <th>Health Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeed.map((item, idx) => {
              const devId = item.metadata?.deviceId || item.deviceId || 'UNKNOWN';
              const temp = item.temperature;
              const isOverheat = temp !== undefined && temp > 80;

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
                  <td style={{ fontWeight: 700, color: isOverheat ? '#dc2626' : '#ea580c' }}>
                    {temp !== undefined ? `${temp}°C` : '--'}
                    {isOverheat && ' 🚨'}
                  </td>
                  <td style={{ color: '#0284c7' }}>
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
