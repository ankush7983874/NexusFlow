import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  AlertCircle,
  ArrowLeft,
  Thermometer,
  Droplets,
  Gauge,
  Clock,
  ChevronRight,
  TrendingUp,
  Calendar,
  BarChart2,
  Sliders,
  Zap,
  Layers,
  Database
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

const METRIC_CONFIGS = {
  temperature: {
    label: 'Temperature',
    unit: '°C',
    color: '#ea580c',
    gradientId: 'tempGrad',
    icon: Thermometer,
    decimals: 1,
    desc: 'Thermal reading across sensor array'
  },
  humidity: {
    label: 'Humidity',
    unit: '%RH',
    color: '#0284c7',
    gradientId: 'humGrad',
    icon: Droplets,
    decimals: 1,
    desc: 'Relative atmospheric humidity'
  },
  vibration: {
    label: 'Vibration',
    unit: 'mm/s',
    color: '#7c3aed',
    gradientId: 'vibGrad',
    icon: Activity,
    decimals: 2,
    desc: 'Mechanical velocity & rotor oscillation'
  },
  pressure: {
    label: 'Pressure',
    unit: 'kPa',
    color: '#059669',
    gradientId: 'presGrad',
    icon: Gauge,
    decimals: 1,
    desc: 'Atmospheric chamber pressure'
  },
  voltage: {
    label: 'Voltage',
    unit: 'V',
    color: '#eab308',
    gradientId: 'voltGrad',
    icon: Zap,
    decimals: 1,
    desc: 'Power bus operating potential'
  }
};

const fallbackDemoDevices = [
  { deviceId: 'TURBINE-001', name: 'Main Generator Turbine 1', type: 'turbine', location: 'Power Station - Turbine Hall', status: 'online', samplingRate: 1000, lastSeen: new Date() },
  { deviceId: 'TURBINE-002', name: 'Auxiliary Turbine 2', type: 'turbine', location: 'Power Station - Sector 2', status: 'online', samplingRate: 1000, lastSeen: new Date() },
  { deviceId: 'TEMP-SENSOR-01', name: 'Boiler Chamber Temp Monitor', type: 'temperature', location: 'Boiler Room - Zone B', status: 'online', samplingRate: 1000, lastSeen: new Date() },
  { deviceId: 'HVAC-UNIT-04', name: 'Cleanroom HVAC System', type: 'hvac', location: 'Cleanroom 302', status: 'offline', samplingRate: 2000, lastSeen: new Date(Date.now() - 3600000 * 4) },
  { deviceId: 'PRESSURE-PUMP-01', name: 'Hydraulic Pressure Unit', type: 'multisensor', location: 'Sub-level Basement', status: 'offline', samplingRate: 1500, lastSeen: new Date(Date.now() - 86400000) }
];

export const DevicesManagement = () => {
  const { showToast, refreshStats, selectedDeviceId, setSelectedDeviceId, liveTelemetryFeed } = useApp();
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [inspectingDevice, setInspectingDevice] = useState(null);

  // Device Details View states
  const [deviceDetails, setDeviceDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

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

  const fetchDeviceDetails = async (id) => {
    if (!id) return;
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await api.getDeviceById(id);
      if (res && res.success && res.data) {
        setDeviceDetails(res.data);
      } else {
        const local = devices.find(d => d.deviceId === id) || fallbackDemoDevices.find(d => d.deviceId === id);
        if (local) {
          setDeviceDetails({ ...local, recentTelemetry: [] });
        } else {
          setDetailsError(`Hardware device '${id}' could not be located.`);
        }
      }
    } catch (err) {
      const local = devices.find(d => d.deviceId === id) || fallbackDemoDevices.find(d => d.deviceId === id);
      if (local) {
        setDeviceDetails({ ...local, recentTelemetry: [] });
      } else {
        setDetailsError(err.message || `Failed to fetch telemetry specifications for device '${id}'.`);
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDeviceId) {
      fetchDeviceDetails(selectedDeviceId);
    } else {
      setDeviceDetails(null);
      setDetailsError(null);
    }
  }, [selectedDeviceId]);

  // Compute live or latest telemetry for details view
  const latestLiveTelemetry = (liveTelemetryFeed || []).find(
    t => (t.metadata?.deviceId || t.deviceId)?.toUpperCase() === selectedDeviceId?.toUpperCase()
  );
  const currentTelemetry = latestLiveTelemetry || (deviceDetails?.recentTelemetry && deviceDetails.recentTelemetry[0]) || null;

  // Telemetry History states
  const [historyRange, setHistoryRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('temperature');
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const fetchTelemetryHistory = useCallback(async (devId, range) => {
    if (!devId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.getDeviceTelemetryHistory(devId, {
        timeRange: range,
        sort: 'asc',
        limit: 500
      });
      if (res && res.success && Array.isArray(res.data)) {
        setHistoryData(res.data);
      } else {
        setHistoryData([]);
      }
    } catch (err) {
      setHistoryError(err.message || `Failed to fetch telemetry history for device '${devId}'.`);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDeviceId) {
      fetchTelemetryHistory(selectedDeviceId, historyRange);
    } else {
      setHistoryData([]);
      setHistoryError(null);
    }
  }, [selectedDeviceId, historyRange, fetchTelemetryHistory]);

  // Real-time synchronization: append incoming live reading for selectedDeviceId
  useEffect(() => {
    if (!selectedDeviceId || !latestLiveTelemetry) return;
    setHistoryData(prev => {
      if (!Array.isArray(prev) || prev.length === 0) {
        return [latestLiveTelemetry];
      }
      const last = prev[prev.length - 1];
      const lastId = last._id || last.id;
      const newId = latestLiveTelemetry._id || latestLiveTelemetry.id;
      if (lastId && newId && lastId === newId) return prev;
      
      const lastTime = new Date(last.timestamp).getTime();
      const newTime = new Date(latestLiveTelemetry.timestamp).getTime();
      if (newTime >= lastTime) {
        return [...prev.slice(-499), latestLiveTelemetry];
      }
      return prev;
    });
  }, [latestLiveTelemetry, selectedDeviceId]);

  // Detect available metrics dynamically from actual data
  const detectedMetrics = useMemo(() => {
    const metricsSet = new Set();
    const candidateKeys = ['temperature', 'humidity', 'vibration', 'pressure', 'voltage'];

    if (Array.isArray(historyData)) {
      historyData.forEach(d => {
        candidateKeys.forEach(k => {
          if (typeof d[k] === 'number') metricsSet.add(k);
        });
        Object.keys(d).forEach(k => {
          if (!['_id', '__v', 'samplingRate', 'timestamp', 'metadata', 'createdAt', 'updatedAt', 'status'].includes(k)) {
            if (typeof d[k] === 'number') metricsSet.add(k);
          }
        });
      });
    }

    if (Array.isArray(deviceDetails?.recentTelemetry)) {
      deviceDetails.recentTelemetry.forEach(d => {
        candidateKeys.forEach(k => {
          if (typeof d[k] === 'number') metricsSet.add(k);
        });
      });
    }

    if (currentTelemetry) {
      candidateKeys.forEach(k => {
        if (typeof currentTelemetry[k] === 'number') metricsSet.add(k);
      });
    }

    if (metricsSet.size === 0) {
      candidateKeys.forEach(k => metricsSet.add(k));
    }

    return Array.from(metricsSet);
  }, [historyData, deviceDetails, currentTelemetry]);

  // Ensure selected metric is valid
  useEffect(() => {
    if (detectedMetrics.length > 0 && !detectedMetrics.includes(selectedMetric)) {
      setSelectedMetric(detectedMetrics[0]);
    }
  }, [detectedMetrics, selectedMetric]);

  // Active metric metadata
  const metricMeta = useMemo(() => {
    return METRIC_CONFIGS[selectedMetric] || {
      label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
      unit: '',
      color: '#4f46e5',
      gradientId: `${selectedMetric}Grad`,
      icon: Activity,
      decimals: 1,
      desc: 'Historical sensor telemetry reading'
    };
  }, [selectedMetric]);

  // Summary statistics for selected metric
  const metricStats = useMemo(() => {
    if (!historyData || historyData.length === 0) {
      return { latest: null, latestTimestamp: null, min: null, max: null, avg: null, count: 0 };
    }

    const validPoints = historyData
      .filter(d => typeof d[selectedMetric] === 'number' && !isNaN(d[selectedMetric]))
      .map(d => ({ value: d[selectedMetric], timestamp: d.timestamp }));

    if (validPoints.length === 0) {
      return { latest: null, latestTimestamp: null, min: null, max: null, avg: null, count: 0 };
    }

    const values = validPoints.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const latestPoint = validPoints[validPoints.length - 1];

    return {
      latest: latestPoint.value,
      latestTimestamp: latestPoint.timestamp,
      min,
      max,
      avg,
      count: validPoints.length
    };
  }, [historyData, selectedMetric]);

  // Formatted chart points
  const chartPoints = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    return historyData
      .filter(d => typeof d[selectedMetric] === 'number' && !isNaN(d[selectedMetric]))
      .map(d => {
        const dt = new Date(d.timestamp);
        let timeLabel = '';
        if (historyRange === '1h') {
          timeLabel = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } else if (historyRange === '24h') {
          timeLabel = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          timeLabel = `${dt.getMonth() + 1}/${dt.getDate()} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        return {
          timestamp: d.timestamp,
          time: timeLabel,
          value: Number(d[selectedMetric].toFixed(metricMeta.decimals !== undefined ? metricMeta.decimals : 2)),
          raw: d[selectedMetric]
        };
      });
  }, [historyData, selectedMetric, historyRange, metricMeta]);

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
      if (selectedDeviceId && selectedDeviceId.toUpperCase() === editingDevice.deviceId.toUpperCase()) {
        fetchDeviceDetails(selectedDeviceId);
      }
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
      if (selectedDeviceId && selectedDeviceId.toUpperCase() === deviceId.toUpperCase()) {
        setSelectedDeviceId(null);
      }
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
      {selectedDeviceId ? (
        <div>
          {/* Navigation & Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setSelectedDeviceId(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                <ArrowLeft size={16} />
                Back to Devices
              </button>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Hardware Fleet / <strong style={{ color: '#0f172a' }}>{selectedDeviceId}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => fetchDeviceDetails(selectedDeviceId)}
                disabled={detailsLoading}
                title="Refresh device details"
              >
                <RefreshCw size={14} className={detailsLoading ? 'spin' : ''} />
                Refresh
              </button>
              {deviceDetails && (
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => openEditModal(deviceDetails)}
                >
                  <Edit3 size={14} />
                  Edit Device
                </button>
              )}
            </div>
          </div>

          {detailsLoading ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={32} className="spin" color="#4f46e5" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Loading Device Details</h4>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Fetching hardware specifications and telemetry records for {selectedDeviceId}...
              </p>
            </div>
          ) : detailsError ? (
            <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
              <AlertCircle size={36} color="#dc2626" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Device Details Unavailable</h3>
              <p style={{ fontSize: 13, color: '#dc2626', marginTop: 4, maxWidth: 450, margin: '6px auto 16px' }}>
                {detailsError}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => fetchDeviceDetails(selectedDeviceId)}>
                  <RefreshCw size={14} />
                  Try Again
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setSelectedDeviceId(null)}>
                  <ArrowLeft size={14} />
                  Back to Devices
                </button>
              </div>
            </div>
          ) : deviceDetails ? (
            <>
              {/* Main Device Hero Card */}
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize', fontSize: 12, padding: '4px 10px' }}>
                        {deviceDetails.type || 'multisensor'}
                      </span>
                      <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        ID: <strong style={{ color: '#4f46e5' }}>{deviceDetails.deviceId}</strong>
                      </span>
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                      {deviceDetails.name}
                    </h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, fontSize: 13, color: '#64748b' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={15} color="#94a3b8" />
                        {deviceDetails.location || 'Zone A - Main Floor'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={15} color="#94a3b8" />
                        Last contact: {deviceDetails.lastSeen ? new Date(deviceDetails.lastSeen).toLocaleString() : 'Just now'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Cpu size={15} color="#94a3b8" />
                        Sampling interval: {deviceDetails.samplingRate || 1000} ms
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Connection Status</div>
                    {deviceDetails.status === 'online' ? (
                      <span className="device-status-badge online" style={{ fontSize: 13, padding: '6px 14px' }}>
                        <span className="status-dot-green"></span>
                        Online (Connected)
                      </span>
                    ) : (
                      <span className="device-status-badge offline" style={{ fontSize: 13, padding: '6px 14px' }}>
                        <span className="status-dot-red"></span>
                        Offline (Disconnected)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Telemetry Data Cards */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Current Telemetry Data
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
                      Live and latest sensor readings transmitted by this hardware endpoint
                    </p>
                  </div>
                  {latestLiveTelemetry && (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="status-dot-green"></span> Live Stream Receiving
                    </span>
                  )}
                </div>

                <div className="metrics-grid" style={{ marginBottom: 0 }}>
                  <div className="metric-card">
                    <div>
                      <div className="metric-label">Temperature</div>
                      <div className="metric-value" style={{ color: '#ea580c' }}>
                        {currentTelemetry?.temperature !== undefined ? `${Number(currentTelemetry.temperature).toFixed(1)} °C` : '--'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {currentTelemetry?.temperature > 80 ? 'Threshold warning' : 'Normal operating temperature'}
                      </div>
                    </div>
                    <div className="metric-icon-box" style={{ background: '#ffedd5', color: '#c2410c' }}>
                      <Thermometer size={24} />
                    </div>
                  </div>

                  <div className="metric-card">
                    <div>
                      <div className="metric-label">Humidity</div>
                      <div className="metric-value" style={{ color: '#0284c7' }}>
                        {currentTelemetry?.humidity !== undefined ? `${Number(currentTelemetry.humidity).toFixed(1)} %RH` : '--'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Relative ambient humidity
                      </div>
                    </div>
                    <div className="metric-icon-box" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                      <Droplets size={24} />
                    </div>
                  </div>

                  <div className="metric-card">
                    <div>
                      <div className="metric-label">Vibration</div>
                      <div className="metric-value" style={{ color: '#7c3aed' }}>
                        {currentTelemetry?.vibration !== undefined ? `${Number(currentTelemetry.vibration).toFixed(2)} mm/s` : '--'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Mechanical rotor oscillation
                      </div>
                    </div>
                    <div className="metric-icon-box" style={{ background: '#ede9fe', color: '#6d28d9' }}>
                      <Activity size={24} />
                    </div>
                  </div>

                  <div className="metric-card">
                    <div>
                      <div className="metric-label">Pressure</div>
                      <div className="metric-value" style={{ color: '#059669' }}>
                        {currentTelemetry?.pressure !== undefined ? `${Number(currentTelemetry.pressure).toFixed(1)} kPa` : '--'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Atmospheric chamber pressure
                      </div>
                    </div>
                    <div className="metric-icon-box" style={{ background: '#dcfce7', color: '#15803d' }}>
                      <Gauge size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Historical Telemetry Analytics Section */}
              <div className="card" style={{ marginBottom: 20 }}>
                {/* Header with Title and Range Filters */}
                <div className="card-header" style={{ flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 className="card-title">Device Telemetry History</h3>
                      <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {selectedDeviceId}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Interactive time-series analysis and historical sensor fluctuations from MongoDB
                    </p>
                  </div>

                  {/* Range Filter Buttons & Refresh */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
                      {[
                        { label: 'Last 1 Hour', value: '1h' },
                        { label: 'Last 24 Hours', value: '24h' },
                        { label: 'Last 7 Days', value: '7d' }
                      ].map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setHistoryRange(r.value)}
                          disabled={historyLoading}
                          style={{
                            border: 'none',
                            background: historyRange === r.value ? '#ffffff' : 'transparent',
                            color: historyRange === r.value ? '#4f46e5' : '#64748b',
                            fontWeight: historyRange === r.value ? 700 : 500,
                            fontSize: 12,
                            padding: '6px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            boxShadow: historyRange === r.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fetchTelemetryHistory(selectedDeviceId, historyRange)}
                      disabled={historyLoading}
                      title="Refresh historical readings"
                      style={{ height: 32, padding: '0 10px' }}
                    >
                      <RefreshCw size={13} className={historyLoading ? 'spin' : ''} />
                    </button>
                  </div>
                </div>

                <div style={{ padding: '16px 20px 24px' }}>
                  {/* Metric Selection Pills */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sliders size={13} />
                      <span>Select Telemetry Metric</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {detectedMetrics.map(metricKey => {
                        const cfg = METRIC_CONFIGS[metricKey] || {
                          label: metricKey.charAt(0).toUpperCase() + metricKey.slice(1),
                          unit: '',
                          color: '#4f46e5'
                        };
                        const isSelected = selectedMetric === metricKey;
                        const IconComp = cfg.icon || Activity;
                        return (
                          <button
                            key={metricKey}
                            type="button"
                            onClick={() => setSelectedMetric(metricKey)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 7,
                              padding: '7px 14px',
                              borderRadius: 20,
                              fontSize: 13,
                              fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              border: isSelected ? `2px solid ${cfg.color}` : '1px solid #e2e8f0',
                              background: isSelected ? `${cfg.color}10` : '#ffffff',
                              color: isSelected ? cfg.color : '#475569',
                              boxShadow: isSelected ? `0 2px 6px ${cfg.color}25` : 'none'
                            }}
                          >
                            <IconComp size={15} color={isSelected ? cfg.color : '#94a3b8'} />
                            <span>{cfg.label}</span>
                            {cfg.unit && (
                              <span style={{ fontSize: 11, opacity: 0.75 }}>({cfg.unit})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Metric Highlight Summary Banner */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                    background: '#f8fafc',
                    borderRadius: 10,
                    padding: '14px 18px',
                    border: '1px solid #e2e8f0',
                    marginBottom: 20
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Selected Metric</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: metricMeta.color, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {metricMeta.label} {metricMeta.unit ? `(${metricMeta.unit})` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {metricMeta.desc}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Latest Recorded Value</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
                        {metricStats.latest !== null ? `${metricStats.latest.toFixed(metricMeta.decimals !== undefined ? metricMeta.decimals : 1)} ${metricMeta.unit}` : '--'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {metricStats.latestTimestamp ? new Date(metricStats.latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No timestamp'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Range Statistics ({historyRange})</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, background: '#ffffff', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 6, color: '#475569' }}>
                          Min: <strong style={{ color: '#0f172a' }}>{metricStats.min !== null ? `${metricStats.min.toFixed(1)}${metricMeta.unit}` : '--'}</strong>
                        </span>
                        <span style={{ fontSize: 11, background: '#ffffff', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 6, color: '#475569' }}>
                          Avg: <strong style={{ color: '#0f172a' }}>{metricStats.avg !== null ? `${metricStats.avg.toFixed(1)}${metricMeta.unit}` : '--'}</strong>
                        </span>
                        <span style={{ fontSize: 11, background: '#ffffff', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 6, color: '#475569' }}>
                          Max: <strong style={{ color: '#0f172a' }}>{metricStats.max !== null ? `${metricStats.max.toFixed(1)}${metricMeta.unit}` : '--'}</strong>
                        </span>
                        <span style={{ fontSize: 11, background: '#ffffff', border: '1px solid #e2e8f0', padding: '3px 8px', borderRadius: 6, color: '#475569' }}>
                          Points: <strong style={{ color: '#4f46e5' }}>{metricStats.count}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chart / States Display */}
                  {historyLoading ? (
                    <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                      <RefreshCw size={28} className="spin" color="#4f46e5" style={{ marginBottom: 10 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Loading Historical Telemetry</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        Querying time-series collection for {selectedDeviceId} ({historyRange})...
                      </div>
                    </div>
                  ) : historyError ? (
                    <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                      <AlertCircle size={32} color="#dc2626" style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#991b1b' }}>Failed to Load Telemetry History</div>
                      <div style={{ fontSize: 12, color: '#b91c1c', maxWidth: 460, margin: '6px 0 14px' }}>
                        {historyError}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => fetchTelemetryHistory(selectedDeviceId, historyRange)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <RefreshCw size={13} />
                        Retry Telemetry Query
                      </button>
                    </div>
                  ) : historyData.length === 0 ? (
                    <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                      <Database size={36} color="#94a3b8" style={{ marginBottom: 10 }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>No Telemetry History Found</div>
                      <div style={{ fontSize: 13, color: '#64748b', maxWidth: 420, margin: '4px 0 0' }}>
                        No time-series records have been ingested for device <strong style={{ color: '#0f172a' }}>{selectedDeviceId}</strong> in the selected {historyRange === '1h' ? '1 hour' : historyRange === '24h' ? '24 hours' : '7 days'} window.
                      </div>
                    </div>
                  ) : chartPoints.length === 0 ? (
                    <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                      <BarChart2 size={36} color="#94a3b8" style={{ marginBottom: 10 }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Metric Not Recorded</div>
                      <div style={{ fontSize: 13, color: '#64748b', maxWidth: 420, margin: '4px 0 0' }}>
                        No valid readings for <strong style={{ color: '#0f172a' }}>{metricMeta.label}</strong> exist in the current dataset. Please choose another metric from the available options above.
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 320, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id={metricMeta.gradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={metricMeta.color} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={metricMeta.color} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" minTickGap={25} />
                          <YAxis 
                            tick={{ fontSize: 11, fill: '#64748b' }} 
                            stroke="#cbd5e1" 
                            unit={metricMeta.unit ? ` ${metricMeta.unit}` : ''}
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
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}>
                                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                                    {point.timestamp ? new Date(point.timestamp).toLocaleString() : point.time}
                                  </div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: metricMeta.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>{metricMeta.label}:</span>
                                    <span>{point.value} {metricMeta.unit}</span>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            name={`${metricMeta.label} (${metricMeta.unit})`}
                            stroke={metricMeta.color}
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill={`url(#${metricMeta.gradientId})`}
                            activeDot={{ r: 6, fill: metricMeta.color, stroke: '#ffffff', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Historical Telemetry Ingestions Table */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">Telemetry Ingestion Records</h3>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Historical time-series log records recorded for hardware endpoint {deviceDetails.deviceId}
                    </p>
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    {historyData.length > 0 ? `${historyData.length} History Records (${historyRange})` : `${(deviceDetails.recentTelemetry || []).length} Recorded Points`}
                  </span>
                </div>

                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Temperature (°C)</th>
                        <th>Humidity (%RH)</th>
                        <th>Vibration (mm/s)</th>
                        <th>Pressure (kPa)</th>
                        <th>Operational State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(historyData.length > 0 ? historyData.slice(-50).reverse() : (deviceDetails.recentTelemetry || [])).length > 0 ? (
                        (historyData.length > 0 ? historyData.slice(-50).reverse() : (deviceDetails.recentTelemetry || [])).map((t, idx) => (
                          <tr key={t._id || idx}>
                            <td style={{ color: '#64748b', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                              {t.timestamp ? new Date(t.timestamp).toLocaleString() : 'N/A'}
                            </td>
                            <td style={{ fontWeight: 600, color: '#ea580c' }}>
                              {t.temperature !== undefined ? `${t.temperature}°C` : '--'}
                            </td>
                            <td style={{ color: '#0284c7' }}>
                              {t.humidity !== undefined ? `${t.humidity}%` : '--'}
                            </td>
                            <td style={{ color: '#7c3aed' }}>
                              {t.vibration !== undefined ? `${t.vibration} mm/s` : '--'}
                            </td>
                            <td style={{ color: '#059669' }}>
                              {t.pressure !== undefined ? `${t.pressure} kPa` : '--'}
                            </td>
                            <td>
                              <span className={`badge badge-${t.status === 'critical' ? 'danger' : t.status === 'warning' ? 'warning' : 'success'}`} style={{ textTransform: 'capitalize' }}>
                                {t.status || 'nominal'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                            No time-series telemetry records found for this device yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : (
        <>
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
          <Filter size={15} color="#94a3b8" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Type:</span>
          <select
            className="form-select"
            style={{ fontSize: 13, padding: '6px 10px', flex: 1 }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            title="Filter devices by hardware type"
          >
            <option value="all">All Devices</option>
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
                  <td 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedDeviceId(device.deviceId)}
                    title="Click to view device details"
                  >
                    <strong style={{ fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                      {device.deviceId}
                    </strong>
                  </td>
                  <td 
                    style={{ fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setSelectedDeviceId(device.deviceId)}
                    title="Click to view device details"
                  >
                    {device.name}
                  </td>
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
                        onClick={() => setSelectedDeviceId(device.deviceId)}
                        title="View device specifications & telemetry"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Activity size={12} />
                        View Details
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
      </>
      )}

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
