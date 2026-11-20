import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Cpu, 
  Trash2, 
  Search, 
  Activity, 
  MapPin, 
  Edit3, 
  X, 
  Save, 
  Filter, 
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

const fallbackDemoDevices = [
  { deviceId: 'TURBINE-001', name: 'Main Generator Turbine 1', type: 'turbine', location: 'Power Station - Turbine Hall', status: 'online', samplingRate: 1000, lastSeen: new Date() },
  { deviceId: 'TURBINE-002', name: 'Auxiliary Turbine 2', type: 'turbine', location: 'Power Station - Sector 2', status: 'online', samplingRate: 1000, lastSeen: new Date() },
  { deviceId: 'TEMP-SENSOR-01', name: 'Boiler Chamber Temp Monitor', type: 'temperature', location: 'Boiler Room - Zone B', status: 'online', samplingRate: 1000, lastSeen: new Date() },
  { deviceId: 'HVAC-UNIT-04', name: 'Cleanroom HVAC System', type: 'hvac', location: 'Cleanroom 302', status: 'offline', samplingRate: 2000, lastSeen: new Date(Date.now() - 3600000 * 4) },
  { deviceId: 'PRESSURE-PUMP-01', name: 'Hydraulic Pressure Unit', type: 'multisensor', location: 'Sub-level Basement', status: 'offline', samplingRate: 1500, lastSeen: new Date(Date.now() - 86400000) }
];

export const DevicesManagement = () => {
  const { showToast, refreshStats } = useApp();
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [inspectingDevice, setInspectingDevice] = useState(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Form state for creation
  const [formData, setFormData] = useState({
    deviceId: '',
    name: '',
    type: 'turbine',
    location: 'Zone A - Turbine Hall',
    status: 'online',
    samplingRate: 1000
  });
  const [formErrors, setFormErrors] = useState({});

  // Form state for editing
  const [editFormData, setEditFormData] = useState({
    name: '',
    type: 'turbine',
    location: '',
    status: 'online',
    samplingRate: 1000
  });

  const formatTypeLabel = (type) => {
    if (!type) return '';
    const map = {
      turbine: 'Turbines',
      temperature: 'Temperature Sensors',
      humidity: 'Humidity Sensors',
      hvac: 'HVAC Systems',
      multisensor: 'Multi-Sensors',
      generator: 'Generators'
    };
    return map[type.toLowerCase()] || (type.charAt(0).toUpperCase() + type.slice(1));
  };

  // Derive unique device types dynamically from existing device records
  const availableTypes = useMemo(() => {
    const typesSet = new Set();
    devices.forEach(d => {
      if (d.type && typeof d.type === 'string' && d.type.trim()) {
        typesSet.add(d.type.trim().toLowerCase());
      }
    });
    // Fallback known types if no devices exist yet
    if (typesSet.size === 0) {
      ['turbine', 'temperature', 'humidity', 'hvac', 'multisensor', 'generator'].forEach(t => typesSet.add(t));
    }
    return Array.from(typesSet).sort();
  }, [devices]);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDevices();
      if (res.success && Array.isArray(res.data)) {
        setDevices(res.data);
      } else {
        setDevices(fallbackDemoDevices);
      }
    } catch (err) {
      setDevices(fallbackDemoDevices);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const validateForm = (data, isEdit = false) => {
    const errors = {};
    if (!isEdit) {
      if (!data.deviceId || data.deviceId.trim().length < 2) {
        errors.deviceId = 'Device ID must be at least 2 characters';
      } else if (!/^[A-Za-z0-9_-]+$/.test(data.deviceId.trim())) {
        errors.deviceId = 'Device ID must contain only alphanumeric characters, underscores, or hyphens';
      }
    }
    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'Device name must be at least 2 characters';
    }
    if (!data.samplingRate || Number(data.samplingRate) <= 0) {
      errors.samplingRate = 'Sampling rate must be a positive number';
    }
    return errors;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      await api.createDevice({
        ...formData,
        deviceId: formData.deviceId.trim().toUpperCase(),
        samplingRate: Number(formData.samplingRate)
      });
      showToast(`Device ${formData.deviceId.toUpperCase()} registered successfully!`, 'success');
      setShowAddModal(false);
      setFormData({
        deviceId: '',
        name: '',
        type: 'turbine',
        location: 'Zone A - Turbine Hall',
        status: 'online',
        samplingRate: 1000
      });
      fetchDevices();
      refreshStats();
    } catch (err) {
      showToast(`Registration failed: ${err.message}`, 'danger');
    }
  };

  const openEditModal = (device) => {
    setEditingDevice(device);
    setEditFormData({
      name: device.name || '',
      type: device.type || 'multisensor',
      location: device.location || '',
      status: device.status || 'online',
      samplingRate: device.samplingRate || 1000
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingDevice) return;

    const errors = validateForm(editFormData, true);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    try {
      await api.updateDevice(editingDevice.deviceId, {
        ...editFormData,
        samplingRate: Number(editFormData.samplingRate)
      });
      showToast(`Device ${editingDevice.deviceId} updated successfully!`, 'success');
      setEditingDevice(null);
      fetchDevices();
      refreshStats();
    } catch (err) {
      showToast(`Update failed: ${err.message}`, 'danger');
    }
  };

  const handleDelete = async (deviceId) => {
    if (!window.confirm(`Are you sure you want to permanently delete device ${deviceId}?`)) return;
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
        setInspectingDevice(res.data);
      }
    } catch (err) {
      showToast(`Failed to inspect device: ${err.message}`, 'danger');
    }
  };

  const filtered = devices.filter(d => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || (
      (d.name && d.name.toLowerCase().includes(query)) ||
      (d.deviceId && d.deviceId.toLowerCase().includes(query))
    );
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesType = typeFilter === 'all' || (d.type && d.type.toLowerCase() === typeFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">IoT Hardware Fleet</h1>
          <p className="page-subtitle">Register edge controllers, configure sampling rates, and manage telemetry devices</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchDevices} title="Refresh device list">
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Register New Device
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 2,
          minWidth: 260,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '7px 12px',
          boxSizing: 'border-box'
        }}>
          <Search size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
          <input
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent', color: '#1e293b' }}
            placeholder="Search by Device Name or Device ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              title="Clear search"
              style={{
                background: '#e2e8f0',
                border: 'none',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                color: '#64748b',
                flexShrink: 0,
                transition: 'background 0.15s ease, color 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#cbd5e1'; e.currentTarget.style.color = '#1e293b'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Status:</span>
          <select
            className="form-select"
            style={{ fontSize: 13, padding: '6px 10px' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
            <option value="warning">Warning Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Type:</span>
          <select
            className="form-select"
            style={{ fontSize: 13, padding: '6px 10px', flex: 1 }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            title="Filter devices by hardware type"
          >
            <option value="all">All Devices / Reset</option>
            {availableTypes.map(type => (
              <option key={type} value={type}>
                {formatTypeLabel(type)}
              </option>
            ))}
          </select>
          {typeFilter !== 'all' && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setTypeFilter('all')}
              title="Reset type filter to All Devices"
              style={{
                padding: '5px 8px',
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0
              }}
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>

        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
          Showing {filtered.length} of {devices.length}
        </div>
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
              <th>Sampling Interval</th>
              <th>Last Contact</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map(device => (
                <tr key={device.deviceId}>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                      {device.deviceId}
                    </strong>
                  </td>
                  <td style={{ fontWeight: 600 }}>{device.name}</td>
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
                    {device.status === 'online' ? (
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
                  </td>
                  <td>{device.samplingRate || 1000} ms</td>
                  <td style={{ color: '#64748b', fontSize: 12 }}>
                    {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'N/A'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleInspect(device.deviceId)}
                        title="View device telemetry records"
                      >
                        <Activity size={12} />
                        Inspect
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(device)}
                        title="Edit device configuration"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(device.deviceId)}
                        style={{ padding: 6 }}
                        title="Delete device"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px' }}>
                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', maxWidth: 400, margin: '0 auto' }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 16,
                      color: '#64748b'
                    }}>
                      <Search size={24} />
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 6px 0' }}>
                      No devices found
                    </h4>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                      {search.trim() && typeFilter !== 'all'
                        ? <>No devices of type <strong style={{ color: '#0f172a' }}>"{formatTypeLabel(typeFilter)}"</strong> match <strong style={{ color: '#0f172a' }}>"{search}"</strong>.</>
                        : search.trim()
                        ? <>No devices match <strong style={{ color: '#0f172a' }}>"{search}"</strong>. Try checking for typos or searching by a different name or device ID.</>
                        : typeFilter !== 'all'
                        ? <>No devices found of type <strong style={{ color: '#0f172a' }}>"{formatTypeLabel(typeFilter)}"</strong>.</>
                        : 'No devices found matching your current filter criteria.'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {search.trim() && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSearch('')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <X size={14} />
                          Clear Search
                        </button>
                      )}
                      {typeFilter !== 'all' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setTypeFilter('all')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <RotateCcw size={14} />
                          Reset Type Filter
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Register New Hardware Device</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Device Identifier (Unique ID) *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. TURBINE-003, SENSOR-TEMP-02"
                    value={formData.deviceId}
                    onChange={e => setFormData({ ...formData, deviceId: e.target.value.toUpperCase() })}
                    required
                  />
                  {formErrors.deviceId && (
                    <span style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'block' }}>
                      {formErrors.deviceId}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Friendly Device Name *</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Auxiliary Condenser Unit 3"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  {formErrors.name && (
                    <span style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'block' }}>
                      {formErrors.name}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Category / Type</label>
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
                    <label className="form-label">Initial Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="warning">Warning</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deployment Location</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Power Station - Sector 3"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Telemetry Sampling Rate (ms)</label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    className="form-input"
                    value={formData.samplingRate}
                    onChange={e => setFormData({ ...formData, samplingRate: e.target.value })}
                  />
                  {formErrors.samplingRate && (
                    <span style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'block' }}>
                      {formErrors.samplingRate}
                    </span>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Plus size={14} />
                  Register Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {editingDevice && (
        <div className="modal-overlay" onClick={() => setEditingDevice(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Edit Device: {editingDevice.deviceId}</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>Modify hardware parameters and operational status</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditingDevice(null)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Friendly Device Name *</label>
                  <input
                    className="form-input"
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                  {formErrors.name && (
                    <span style={{ color: '#dc2626', fontSize: 12, marginTop: 4, display: 'block' }}>
                      {formErrors.name}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Category / Type</label>
                    <select
                      className="form-select"
                      value={editFormData.type}
                      onChange={e => setEditFormData({ ...editFormData, type: e.target.value })}
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
                    <label className="form-label">Operational Status</label>
                    <select
                      className="form-select"
                      value={editFormData.status}
                      onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                    >
                      <option value="online">Online (Active)</option>
                      <option value="offline">Offline (Standby)</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Deployment Location</label>
                  <input
                    className="form-input"
                    value={editFormData.location}
                    onChange={e => setEditFormData({ ...editFormData, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Sampling Interval (ms)</label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    className="form-input"
                    value={editFormData.samplingRate}
                    onChange={e => setEditFormData({ ...editFormData, samplingRate: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingDevice(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Telemetry Modal */}
      {inspectingDevice && (
        <div className="modal-overlay" onClick={() => setInspectingDevice(null)}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Telemetry Inspector: {inspectingDevice.deviceId}</h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>{inspectingDevice.name} • {inspectingDevice.location}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setInspectingDevice(null)}>
                Close
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: 420, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#475569' }}>
                Latest Ingested Native Time-Series Data Points:
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
                    {(inspectingDevice.recentTelemetry || []).length > 0 ? (
                      inspectingDevice.recentTelemetry.map((t, idx) => (
                        <tr key={t._id || idx}>
                          <td style={{ color: '#64748b' }}>{new Date(t.timestamp).toLocaleTimeString()}</td>
                          <td style={{ fontWeight: 600, color: '#ea580c' }}>
                            {t.temperature !== undefined ? `${t.temperature}°C` : '--'}
                          </td>
                          <td style={{ color: '#0284c7' }}>
                            {t.humidity !== undefined ? `${t.humidity}%` : '--'}
                          </td>
                          <td>{t.vibration !== undefined ? `${t.vibration} mm/s` : '--'}</td>
                          <td>{t.pressure !== undefined ? `${t.pressure} kPa` : '--'}</td>
                          <td>
                            <span className="badge badge-success" style={{ fontSize: 10 }}>
                              {t.status || 'nominal'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                          No recent telemetry records found for this hardware device.
                        </td>
                      </tr>
                    )}
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
