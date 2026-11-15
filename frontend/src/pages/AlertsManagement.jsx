import React, { useState, useEffect } from 'react';
import { 
  BellRing, 
  Trash2, 
  CheckCircle, 
  Filter, 
  MessageSquare, 
  Globe, 
  Clock 
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const AlertsManagement = () => {
  const { showToast, refreshStats } = useApp();
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [stats, setStats] = useState({ critical: 0, warning: 0, info: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const [alertsRes, statsRes] = await Promise.all([
        api.getAlerts({ severity: severityFilter, limit: 100 }),
        api.getAlertStats()
      ]);
      if (alertsRes.success) setAlerts(alertsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      showToast(`Failed to load alerts: ${err.message}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter]);

  const handleAcknowledge = async (id) => {
    try {
      await api.acknowledgeAlert(id);
      showToast('Alert acknowledged', 'success');
      fetchAlerts();
      refreshStats();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'danger');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all alert records from the database?')) return;
    try {
      await api.clearAlerts();
      showToast('All alerts cleared', 'info');
      fetchAlerts();
      refreshStats();
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'danger');
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Alerts & Notifications Log</h1>
          <p className="page-subtitle">Historical records of rule condition breaches, mock SMS dispatches and webhooks</p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleClearAll}>
          <Trash2 size={14} />
          Clear All History
        </button>
      </div>

      {/* Stats Cards */}
      <div className="metrics-grid" style={{ marginBottom: 20 }}>
        <div className="metric-card">
          <div>
            <div className="metric-label">Total Triggered Alerts</div>
            <div className="metric-value">{stats.total}</div>
          </div>
          <div className="metric-icon-box" style={{ background: '#eff6ff', color: '#1e40af' }}>
            <BellRing size={20} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Critical Alerts</div>
            <div className="metric-value" style={{ color: '#dc2626' }}>{stats.critical}</div>
          </div>
          <div className="metric-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <BellRing size={20} />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-label">Warning Thresholds</div>
            <div className="metric-value" style={{ color: '#d97706' }}>{stats.warning}</div>
          </div>
          <div className="metric-icon-box" style={{ background: '#fef3c7', color: '#b45309' }}>
            <BellRing size={20} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Filter size={16} color="#64748b" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Filter Severity:</span>
        <select
          className="form-select"
          style={{ width: 160, padding: '4px 8px', fontSize: 12 }}
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical Only</option>
          <option value="warning">Warning Only</option>
          <option value="info">Info Only</option>
        </select>
      </div>

      {/* Alerts Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Rule Name</th>
              <th>Device Identifier</th>
              <th>Severity</th>
              <th>Trigger Message</th>
              <th>Breached Value</th>
              <th>Mock SMS Dispatch</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map(alert => (
              <tr key={alert._id} style={{ background: alert.acknowledged ? '#f8fafc' : undefined }}>
                <td style={{ color: '#64748b', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} />
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </td>
                <td>
                  <strong>{alert.ruleName}</strong>
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#4f46e5' }}>
                    {alert.deviceId}
                  </span>
                </td>
                <td>
                  <span className={`badge ${alert.severity === 'critical' ? 'badge-danger' : 'badge-warning'}`}>
                    {alert.severity}
                  </span>
                </td>
                <td style={{ maxWidth: 280, color: '#334155' }}>
                  {alert.message}
                </td>
                <td>
                  {alert.payload?.value ? (
                    <strong style={{ color: '#ea580c' }}>{alert.payload.value}°C</strong>
                  ) : '--'}
                </td>
                <td>
                  {alert.deliveryStatus?.sms?.sent ? (
                    <span className="badge badge-success" style={{ fontSize: 11 }}>
                      <MessageSquare size={12} /> Mock Sent ({alert.deliveryStatus.sms.recipient})
                    </span>
                  ) : alert.deliveryStatus?.webhook?.sent ? (
                    <span className="badge badge-info" style={{ fontSize: 11 }}>
                      <Globe size={12} /> Webhook {alert.deliveryStatus.webhook.statusCode}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>None</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${alert.acknowledged ? 'badge-info' : 'badge-warning'}`}>
                    {alert.acknowledged ? 'Acknowledged' : 'Pending'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {!alert.acknowledged && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAcknowledge(alert._id)}
                    >
                      <CheckCircle size={12} />
                      Acknowledge
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
