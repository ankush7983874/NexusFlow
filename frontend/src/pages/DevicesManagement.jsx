import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Cpu, 
  Trash2, 
  Search, 
  Activity, 
  Clock, 
  MapPin, 
  Layers 
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const DevicesManagement = () => {
  const { showToast, refreshStats } = useApp();
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    deviceId: '',
    name: '',
    type: 'turbine',
    location: 'Zone A - Turbine Hall',
    samplingRate: 1000
  });

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDevices();
      if (res.success) {
        setDevices(res.data);
      }
    } catch (err) {
      showToast(`Failed to load devices: ${err.message}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.deviceId || !formData.name) {
      showToast('Please fill in Device ID and Name', 'warning');
      return;
    }

    try {
      await api.createDevice(formData);
      showToast(`Device ${formData.deviceId} registered successfully!`, 'success');
      setShowAddModal(false);
      setFormData({
        deviceId: '',
        name: '',
        type: 'turbine',
        location: 'Zone A - Turbine Hall',
        samplingRate: 1000
      });
      fetchDevices();
      refreshStats();
    } catch (err) {
      showToast(`Registration failed: ${err.message}`, 'danger');
    }
  };

  const handleDelete = async (deviceId) => {
    if (!window.confirm(`Are you sure you want to delete ${deviceId}?`)) return;
    try {
      await api.deleteDevice(deviceId);
      showToast(`Device ${deviceId} removed`, 'info');
      fetchDevices();
      refreshStats();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'danger');
    }
  };

  const handleInspect = async (deviceId) => {
    try {
      const res = await api.getDeviceById(deviceId);
      if (res.success) {
        setSelectedDevice(res.data);
      }
    } catch (err) {
      showToast(`Failed to inspect device: ${err.message}`, 'danger');
    }
  };

  const filtered = devices.filter(d => 
    d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">IoT Hardware Fleet</h1>
          <p className="page-subtitle">Manage deployed edge controllers, industrial sensors and telemetry sources</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Register New Device
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Search size={18} color="#94a3b8" />
        <input
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14 }}
          placeholder="Search by device ID, name, or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Devices Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Device Identifier</th>
              <th>Hardware Name</th>
              <th>Category</th>
              <th>Deployment Location</th>
              <th>Status</th>
              <th>Sampling Rate</th>
              <th>Last Contact</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(device => (
              <tr key={device.deviceId}>
                <td>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                    {device.deviceId}
                  </strong>
                </td>
                <td>{device.name}</td>
                <td>
                  <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                    {device.type}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
                    <MapPin size={12} />
                    {device.location}
                  </div>
                </td>
                <td>
                  <span className={`badge ${device.status === 'online' ? 'badge-success' : 'badge-warning'}`}>
                    ● {device.status}
                  </span>
                </td>
                <td>{device.samplingRate} ms</td>
                <td style={{ color: '#64748b', fontSize: 12 }}>
                  {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'N/A'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleInspect(device.deviceId)}
                    >
                      <Activity size={12} />
                      Inspect
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(device.deviceId)}
                      style={{ padding: 6 }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Register Hardware Device</h3>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Hardware Device ID *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. TURBINE-003, SENSOR-PRESS-01"
                    value={formData.deviceId}
                    onChange={e => setFormData({ ...formData, deviceId: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Friendly Name *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Secondary Condenser Pump"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Device Type</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="turbine">Turbine</option>
                    <option value="temperature">Temperature Sensor</option>
                    <option value="humidity">Humidity Sensor</option>
                    <option value="hvac">HVAC System</option>
                    <option value="multisensor">Multi-Sensor Unit</option>
                    <option value="generator">Generator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Location / Zone</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Building 2 - Cleanroom"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sampling Interval (ms)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.samplingRate}
                    onChange={e => setFormData({ ...formData, samplingRate: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Telemetry Modal */}
      {selectedDevice && (
        <div className="modal-overlay" onClick={() => setSelectedDevice(null)}>
          <div className="modal-content" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Telemetry Inspector: {selectedDevice.deviceId}</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>{selectedDevice.name} • {selectedDevice.location}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDevice(null)}>
                Close
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#475569' }}>
                Latest Ingested Time-Series Records:
              </div>
              <div className="data-table-container">
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Temp (°C)</th>
                      <th>Humidity (%)</th>
                      <th>Vibration (mm/s)</th>
                      <th>Pressure (kPa)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDevice.recentTelemetry || []).map((t, idx) => (
                      <tr key={t._id || idx}>
                        <td style={{ color: '#64748b' }}>{new Date(t.timestamp).toLocaleTimeString()}</td>
                        <td style={{ fontWeight: 600, color: '#ea580c' }}>{t.temperature}°C</td>
                        <td style={{ color: '#0284c7' }}>{t.humidity}%</td>
                        <td>{t.vibration}</td>
                        <td>{t.pressure}</td>
                        <td>
                          <span className="badge badge-success" style={{ fontSize: 10 }}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
