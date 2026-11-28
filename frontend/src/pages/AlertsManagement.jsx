import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BellRing, 
  Trash2, 
  CheckCircle, 
  CheckCircle2, 
  Filter, 
  MessageSquare, 
  Globe, 
  Clock,
  Search,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Eye,
  X,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { socket } from '../services/socket';

export const AlertsManagement = () => {
  const { showToast, refreshStats, openDeviceDetails } = useApp();
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ 
    active: 0, 
    critical: 0, 
    warning: 0, 
    resolved: 0, 
    acknowledged: 0, 
    total: 0 
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [devices, setDevices] = useState([]);

  // Alert Details Modal
  const [selectedAlert, setSelectedAlert] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const statsRes = await api.getAlertStats();
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (e) {}
  }, []);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: 150 };
      if (severityFilter !== 'all') params.severity = severityFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (deviceFilter !== 'all') params.deviceId = deviceFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [alertsRes, statsRes] = await Promise.all([
        api.getAlerts(params),
        api.getAlertStats()
      ]);

      if (alertsRes.success && Array.isArray(alertsRes.data)) {
        setAlerts(alertsRes.data);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      showToast(`Failed to load alerts: ${err.message}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [severityFilter, statusFilter, deviceFilter, searchQuery, showToast]);

  const fetchDevices = async () => {
    try {
      const res = await api.getDevices();
      if (res.success && Array.isArray(res.data)) {
        setDevices(res.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchAlerts();
    fetchDevices();
  }, [fetchAlerts]);

  // Real-time Socket.IO Listeners for Alerts
  useEffect(() => {
    const handleNewAlert = (newAlert) => {
      setAlerts(prev => {
        // Prevent duplicate addition in local state
        const exists = prev.some(a => a._id === newAlert._id);
        if (exists) {
          return prev.map(a => (a._id === newAlert._id ? newAlert : a));
        }
        return [newAlert, ...prev];
      });
      fetchStats();
      refreshStats();
    };

    const handleUpdatedAlert = (updatedAlert) => {
      setAlerts(prev => prev.map(a => (a._id === updatedAlert._id ? updatedAlert : a)));
      if (selectedAlert && selectedAlert._id === updatedAlert._id) {
        setSelectedAlert(updatedAlert);
      }
      fetchStats();
      refreshStats();
    };

    socket.on('alert:trigger', handleNewAlert);
    socket.on('alert:update', handleUpdatedAlert);

    return () => {
      socket.off('alert:trigger', handleNewAlert);
      socket.off('alert:update', handleUpdatedAlert);
    };
  }, [fetchStats, refreshStats, selectedAlert]);

  const handleAcknowledge = async (id) => {
    try {
      const res = await api.acknowledgeAlert(id);
      showToast('Alert acknowledged', 'success');
      if (res.data) {
        setAlerts(prev => prev.map(a => (a._id === id ? res.data : a)));
        if (selectedAlert && selectedAlert._id === id) setSelectedAlert(res.data);
      }
      fetchStats();
      refreshStats();
    } catch (err) {
      showToast(`Acknowledge failed: ${err.message}`, 'danger');
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await api.resolveAlert(id);
      showToast('Alert condition resolved', 'success');
      if (res.data) {
        setAlerts(prev => prev.map(a => (a._id === id ? res.data : a)));
        if (selectedAlert && selectedAlert._id === id) setSelectedAlert(res.data);
      }
      fetchStats();
      refreshStats();
    } catch (err) {
      showToast(`Resolve failed: ${err.message}`, 'danger');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all alert records from the database?')) return;
    try {
      await api.clearAlerts();
      showToast('All alert records cleared', 'info');
      fetchAlerts();
      fetchStats();
      refreshStats();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'danger');
    }
  };

  // Local filtering in addition to API filtering
  const filteredAlerts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alerts.filter(alert => {
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const currentStatus = alert.status || (alert.acknowledged ? 'acknowledged' : 'active');
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
      const matchesDevice = deviceFilter === 'all' || alert.deviceId?.toUpperCase() === deviceFilter.toUpperCase();
      
      const matchesSearch = !q || (
        (alert.title && alert.title.toLowerCase().includes(q)) ||
        (alert.message && alert.message.toLowerCase().includes(q)) ||
        (alert.ruleName && alert.ruleName.toLowerCase().includes(q)) ||
        (alert.deviceId && alert.deviceId.toLowerCase().includes(q)) ||
        (alert.deviceName && alert.deviceName.toLowerCase().includes(q)) ||
        (alert.metric && alert.metric.toLowerCase().includes(q))
      );

      return matchesSeverity && matchesStatus && matchesDevice && matchesSearch;
    });
  }, [alerts, severityFilter, statusFilter, deviceFilter, searchQuery]);

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Alert & Incident Management</h1>
          <p className="page-subtitle">Real-time incident response, threshold breach audit logs, and lifecycle tracking</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchAlerts} title="Refresh alert records">
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
            <Trash2 size={14} />
            Clear All History
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        {/* Total Active Alerts */}
        <div className="metric-card">
          <div>
            <div className="metric-label">Total Active Alerts</div>
            <div className="metric-value" style={{ color: stats.active > 0 ? '#ea580c' : '#0f172a' }}>
              {stats.active}
            </div>
            <div style={{ fontSize: 12, color: stats.active > 0 ? '#ea580c' : '#64748b', marginTop: 4 }}>
              {stats.active > 0 ? 'Pending operator triage' : 'All systems normal'}
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#ffedd5', color: '#c2410c' }}>
            <BellRing size={22} />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="metric-card">
          <div>
            <div className="metric-label">Critical Alerts</div>
            <div className="metric-value" style={{ color: stats.critical > 0 ? '#dc2626' : '#0f172a' }}>
              {stats.critical}
            </div>
            <div style={{ fontSize: 12, color: stats.critical > 0 ? '#dc2626' : '#64748b', marginTop: 4 }}>
              {stats.critical > 0 ? 'Requires immediate action' : 'Zero critical breaches'}
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <ShieldAlert size={22} />
          </div>
        </div>

        {/* Warning Alerts */}
        <div className="metric-card">
          <div>
            <div className="metric-label">Warning Alerts</div>
            <div className="metric-value" style={{ color: stats.warning > 0 ? '#d97706' : '#0f172a' }}>
              {stats.warning}
            </div>
            <div style={{ fontSize: 12, color: stats.warning > 0 ? '#d97706' : '#64748b', marginTop: 4 }}>
              Operating threshold warnings
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#fef3c7', color: '#b45309' }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Resolved Alerts */}
        <div className="metric-card">
          <div>
            <div className="metric-label">Resolved Alerts</div>
            <div className="metric-value" style={{ color: '#059669' }}>
              {stats.resolved}
            </div>
            <div style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>
              Successfully mitigated incidents
            </div>
          </div>
          <div className="metric-icon-box" style={{ background: '#dcfce7', color: '#15803d' }}>
            <ShieldCheck size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        {/* Search Input */}
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
          <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
          <input
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13, background: 'transparent', color: '#1e293b' }}
            placeholder="Search alerts by title, message, rule, or device..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Status:</span>
          <select
            className="form-select"
            style={{ width: 140, padding: '6px 10px', fontSize: 12 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Severity:</span>
          <select
            className="form-select"
            style={{ width: 130, padding: '6px 10px', fontSize: 12 }}
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
          </select>
        </div>

        {/* Device Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Device:</span>
          <select
            className="form-select"
            style={{ width: 180, padding: '6px 10px', fontSize: 12 }}
            value={deviceFilter}
            onChange={e => setDeviceFilter(e.target.value)}
          >
            <option value="all">All Devices</option>
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.deviceId} ({d.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Incident & Description</th>
              <th>Hardware Endpoint</th>
              <th>Metric Reading</th>
              <th>Threshold Rule</th>
              <th>Severity</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                  Loading alert incident records...
                </td>
              </tr>
            ) : filteredAlerts.length > 0 ? (
              filteredAlerts.map(alert => {
                const currentStatus = alert.status || (alert.acknowledged ? 'acknowledged' : 'active');
                const isCritical = alert.severity === 'critical';
                const readingVal = alert.reading !== undefined 
                  ? alert.reading 
                  : (alert.payload?.value !== undefined ? alert.payload.value : null);
                const metricName = alert.metric || alert.payload?.metric || 'Metric';

                return (
                  <tr 
                    key={alert._id} 
                    style={{ 
                      background: currentStatus === 'resolved' ? '#f8fafc' : currentStatus === 'active' && isCritical ? '#fff5f5' : undefined 
                    }}
                  >
                    {/* Timestamp */}
                    <td style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={13} color="#94a3b8" />
                        <span>{alert.createdAt ? new Date(alert.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</span>
                      </div>
                    </td>

                    {/* Title & Message */}
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                        {alert.title || alert.ruleName || 'Incident Alert'}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={alert.message}>
                        {alert.message}
                      </div>
                      {alert.consecutiveBreaches > 1 && (
                        <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 600 }}>
                          🔥 {alert.consecutiveBreaches} continuous breaches suppressed
                        </span>
                      )}
                    </td>

                    {/* Hardware Device */}
                    <td>
                      <div 
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => openDeviceDetails(alert.deviceId)}
                        title="Click to view device specifications"
                      >
                        <strong style={{ fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                          {alert.deviceId}
                        </strong>
                        <ChevronRight size={12} color="#4f46e5" />
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {alert.deviceName || alert.deviceId}
                      </div>
                    </td>

                    {/* Metric Reading */}
                    <td>
                      {readingVal !== null ? (
                        <div>
                          <strong style={{ color: isCritical ? '#dc2626' : '#ea580c', fontSize: 14 }}>
                            {readingVal}
                          </strong>
                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 3 }}>
                            {metricName === 'temperature' ? '°C' : metricName === 'humidity' ? '%' : ''}
                          </span>
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>

                    {/* Threshold Rule */}
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                        {alert.threshold || (alert.payload?.threshold ? `${alert.payload?.operator || '>'} ${alert.payload.threshold}` : 'Condition met')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        Rule: {alert.ruleName}
                      </div>
                    </td>

                    {/* Severity */}
                    <td>
                      <span className={`badge ${isCritical ? 'badge-danger' : 'badge-warning'}`} style={{ textTransform: 'capitalize' }}>
                        {alert.severity || 'warning'}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      {currentStatus === 'resolved' ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={11} /> Resolved
                        </span>
                      ) : currentStatus === 'acknowledged' ? (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> Acknowledged
                        </span>
                      ) : (
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={11} /> Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedAlert(alert)}
                          title="View incident details"
                          style={{ padding: '4px 8px' }}
                        >
                          <Eye size={13} />
                        </button>

                        {currentStatus === 'active' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAcknowledge(alert._id)}
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            title="Acknowledge active alert"
                          >
                            Ack
                          </button>
                        )}

                        {currentStatus !== 'resolved' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleResolve(alert._id)}
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            title="Mark incident as resolved"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  <ShieldCheck size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>No Matching Incidents Found</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    All hardware endpoints are operating within configured threshold ranges.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={20} color={selectedAlert.severity === 'critical' ? '#dc2626' : '#ea580c'} />
                <h3 className="modal-title">
                  Incident Report: {selectedAlert.title || selectedAlert.ruleName}
                </h3>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setSelectedAlert(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Alert Status Banner */}
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: 8, 
                background: selectedAlert.status === 'resolved' ? '#ecfdf5' : selectedAlert.severity === 'critical' ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${selectedAlert.status === 'resolved' ? '#a7f3d0' : selectedAlert.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: selectedAlert.status === 'resolved' ? '#065f46' : '#991b1b' }}>
                    Incident Status: {selectedAlert.status ? selectedAlert.status.toUpperCase() : (selectedAlert.acknowledged ? 'ACKNOWLEDGED' : 'ACTIVE')}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                    Severity: <span style={{ textTransform: 'capitalize', color: selectedAlert.severity === 'critical' ? '#dc2626' : '#d97706' }}>{selectedAlert.severity}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedAlert.status !== 'acknowledged' && selectedAlert.status !== 'resolved' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAcknowledge(selectedAlert._id)}
                    >
                      Acknowledge
                    </button>
                  )}
                  {selectedAlert.status !== 'resolved' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleResolve(selectedAlert._id)}
                    >
                      Resolve Incident
                    </button>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="form-label" style={{ fontSize: 11, textTransform: 'uppercase', color: '#64748b' }}>
                  Incident Description
                </label>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#1e293b' }}>
                  {selectedAlert.message}
                </div>
              </div>

              {/* Metric & Hardware Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Hardware Device</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                    {selectedAlert.deviceId}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {selectedAlert.deviceName || selectedAlert.deviceId}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Breached Telemetry Reading</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: selectedAlert.severity === 'critical' ? '#dc2626' : '#ea580c', marginTop: 2 }}>
                    {selectedAlert.reading !== undefined ? selectedAlert.reading : selectedAlert.payload?.value}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Threshold: {selectedAlert.threshold || 'Configured limit'}
                  </div>
                </div>
              </div>

              {/* Timeline Info */}
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#64748b' }}>Generated At:</span>
                  <strong>{selectedAlert.createdAt ? new Date(selectedAlert.createdAt).toLocaleString() : 'N/A'}</strong>
                </div>
                {selectedAlert.acknowledgedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#64748b' }}>Acknowledged At:</span>
                    <strong>{new Date(selectedAlert.acknowledgedAt).toLocaleString()}</strong>
                  </div>
                )}
                {selectedAlert.resolvedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ color: '#059669' }}>Resolved At:</span>
                    <strong style={{ color: '#059669' }}>{new Date(selectedAlert.resolvedAt).toLocaleString()}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#64748b' }}>Consecutive Breaches:</span>
                  <strong>{selectedAlert.consecutiveBreaches || 1}</strong>
                </div>
              </div>

              {/* Notification Dispatch */}
              {(selectedAlert.deliveryStatus?.sms?.sent || selectedAlert.deliveryStatus?.webhook?.sent) && (
                <div style={{ background: '#ecfdf5', padding: '10px 14px', borderRadius: 8, border: '1px solid #a7f3d0', fontSize: 12 }}>
                  <span style={{ color: '#065f46', fontWeight: 600 }}>External Notifications Dispatched:</span>
                  <div style={{ marginTop: 4, color: '#047857' }}>
                    {selectedAlert.deliveryStatus?.sms?.sent && `📱 SMS dispatched to ${selectedAlert.deliveryStatus.sms.recipient}`}
                    {selectedAlert.deliveryStatus?.webhook?.sent && ` • 🌐 Webhook responded ${selectedAlert.deliveryStatus.webhook.statusCode}`}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: 14 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedAlert(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
