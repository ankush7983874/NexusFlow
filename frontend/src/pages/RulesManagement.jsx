import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Workflow, 
  Play, 
  Square, 
  Trash2, 
  Sliders, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Edit3,
  X,
  Cpu,
  Filter,
  ShieldAlert,
  Flame,
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

const STANDARD_METRICS = [
  { id: 'temperature', label: 'Temperature (°C)', unit: '°C' },
  { id: 'humidity', label: 'Humidity (%RH)', unit: '%RH' },
  { id: 'vibration', label: 'Vibration (mm/s)', unit: 'mm/s' },
  { id: 'pressure', label: 'Pressure (kPa)', unit: 'kPa' },
  { id: 'voltage', label: 'Voltage (V)', unit: 'V' }
];

export const RulesManagement = () => {
  const { openRuleInBuilder, showToast, refreshStats, setActiveTab } = useApp();
  const [rules, setRules] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal State for Threshold Rule
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deviceId: 'ALL',
    metric: 'temperature',
    operator: '>',
    threshold: 80,
    minThreshold: 20,
    maxThreshold: 80,
    severity: 'warning',
    active: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await api.getRules();
      if (res.success) {
        setRules(res.data);
      }
    } catch (err) {
      showToast(`Failed to load rules: ${err.message}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.getDevices();
      if (res.success && Array.isArray(res.data)) {
        setDevices(res.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchRules();
    fetchDevices();
  }, []);

  const openCreateModal = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      deviceId: 'ALL',
      metric: 'temperature',
      operator: '>',
      threshold: 80,
      minThreshold: 20,
      maxThreshold: 80,
      severity: 'warning',
      active: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name || '',
      description: rule.description || '',
      deviceId: rule.deviceId || 'ALL',
      metric: rule.metric || 'temperature',
      operator: rule.operator || '>',
      threshold: rule.threshold !== undefined ? rule.threshold : 80,
      minThreshold: rule.minThreshold !== undefined ? rule.minThreshold : 20,
      maxThreshold: rule.maxThreshold !== undefined ? rule.maxThreshold : 80,
      severity: rule.severity || 'warning',
      active: rule.active !== undefined ? rule.active : true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Rule name must be at least 2 characters';
    }
    if (!formData.metric || !formData.metric.trim()) {
      errors.metric = 'Telemetry metric is required';
    }
    if (formData.operator === 'between') {
      const min = Number(formData.minThreshold);
      const max = Number(formData.maxThreshold);
      if (isNaN(min)) {
        errors.minThreshold = 'Minimum threshold must be a valid number';
      }
      if (isNaN(max)) {
        errors.maxThreshold = 'Maximum threshold must be a valid number';
      }
      if (!isNaN(min) && !isNaN(max) && min > max) {
        errors.minThreshold = 'Minimum threshold must be less than or equal to maximum threshold';
      }
    } else {
      const th = Number(formData.threshold);
      if (isNaN(th)) {
        errors.threshold = 'Threshold value must be a valid number';
      }
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        deviceId: formData.deviceId,
        metric: formData.metric.trim(),
        operator: formData.operator,
        threshold: formData.operator !== 'between' ? Number(formData.threshold) : undefined,
        minThreshold: formData.operator === 'between' ? Number(formData.minThreshold) : undefined,
        maxThreshold: formData.operator === 'between' ? Number(formData.maxThreshold) : undefined,
        severity: formData.severity,
        active: Boolean(formData.active)
      };

      if (editingRule) {
        const res = await api.updateThresholdRule(editingRule._id, payload);
        showToast(res.message || 'Threshold rule updated successfully', 'success');
      } else {
        const res = await api.createThresholdRule(payload);
        showToast(res.message || 'Threshold rule created successfully', 'success');
      }

      setShowModal(false);
      fetchRules();
      refreshStats();
    } catch (err) {
      showToast(`Operation failed: ${err.message}`, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (ruleId) => {
    try {
      const res = await api.toggleRule(ruleId);
      if (res.success) {
        showToast(res.message, 'success');
        fetchRules();
        refreshStats();
      }
    } catch (err) {
      showToast(`Toggle failed: ${err.message}`, 'danger');
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Delete this rule? Any active monitoring pipeline for it will be stopped.')) return;
    try {
      await api.deleteRule(ruleId);
      showToast('Rule deleted successfully', 'info');
      fetchRules();
      refreshStats();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'danger');
    }
  };

  const filteredRules = useMemo(() => {
    if (typeFilter === 'all') return rules;
    if (typeFilter === 'threshold') {
      return rules.filter(r => r.ruleType === 'threshold' || (!r.graph?.nodes?.length && r.metric));
    }
    if (typeFilter === 'graph') {
      return rules.filter(r => r.ruleType === 'graph' || (r.graph?.nodes?.length > 0));
    }
    return rules;
  }, [rules, typeFilter]);

  return (
    <div className="page-wrapper">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Rule & Threshold Management</h1>
          <p className="page-subtitle">Configure automated telemetry threshold checks, real-time alert triggers, and visual data pipelines</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setActiveTab('builder')}>
            <Workflow size={16} />
            Visual Workflow Builder
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Create Threshold Rule
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Filter size={16} color="#64748b" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Filter Rules:</span>
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
            {[
              { id: 'all', label: `All Rules (${rules.length})` },
              { id: 'threshold', label: `Threshold Rules (${rules.filter(r => r.ruleType === 'threshold' || (!r.graph?.nodes?.length && r.metric)).length})` },
              { id: 'graph', label: `Canvas Workflows (${rules.filter(r => r.graph?.nodes?.length > 0).length})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                style={{
                  border: 'none',
                  background: typeFilter === tab.id ? '#ffffff' : 'transparent',
                  color: typeFilter === tab.id ? '#4f46e5' : '#64748b',
                  fontWeight: typeFilter === tab.id ? 700 : 500,
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  boxShadow: typeFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#64748b' }}>
          Active Stream Rules: <strong style={{ color: '#059669' }}>{rules.filter(r => r.active).length} Enabled</strong>
        </div>
      </div>

      {/* Rules Grid */}
      {isLoading ? (
        <div className="card" style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
          Loading configured rules...
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="card" style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
          <Sliders size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>No Rules Found</h3>
          <p style={{ fontSize: 13, color: '#64748b', maxWidth: 440, margin: '6px auto 16px' }}>
            No rules match the current filter. Create a new threshold rule to begin automated anomaly detection.
          </p>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={14} />
            Create Threshold Rule
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
          {filteredRules.map(rule => {
            const isThreshold = rule.ruleType === 'threshold' || (!rule.graph?.nodes?.length && rule.metric);
            const isRunning = rule.isRunning || rule.active;
            const isCritical = rule.severity === 'critical';

            const thresholdDesc = rule.operator === 'between'
              ? `Between ${rule.minThreshold} and ${rule.maxThreshold}`
              : `${rule.operator || '>'} ${rule.threshold}`;

            return (
              <div 
                key={rule._id} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  borderLeft: isThreshold ? `4px solid ${isCritical ? '#dc2626' : '#ea580c'}` : '4px solid #4f46e5'
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span className={`badge ${isThreshold ? 'badge-info' : 'badge-primary'}`} style={{ fontSize: 10, textTransform: 'uppercase' }}>
                          {isThreshold ? 'Threshold Rule' : 'Workflow Graph'}
                        </span>
                        {isThreshold && (
                          <span className={`badge ${isCritical ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 10, textTransform: 'capitalize' }}>
                            {rule.severity || 'warning'}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>{rule.name}</h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                        {rule.description || 'Continuous telemetry monitoring rule'}
                      </p>
                    </div>

                    <span className={`badge ${rule.active ? 'badge-success' : 'badge-secondary'}`}>
                      {rule.active ? '● Active' : '○ Disabled'}
                    </span>
                  </div>

                  {/* Threshold Specifications */}
                  {isThreshold ? (
                    <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', margin: '14px 0', fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#64748b' }}>Target Hardware:</span>
                        <strong style={{ color: '#0f172a', fontFamily: 'var(--font-mono)' }}>
                          {rule.deviceId === 'ALL' ? '⚡ Fleet-wide (All Devices)' : rule.deviceId}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#64748b' }}>Monitored Metric:</span>
                        <strong style={{ color: '#4f46e5', textTransform: 'capitalize' }}>{rule.metric}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Threshold Condition:</span>
                        <strong style={{ color: isCritical ? '#dc2626' : '#ea580c' }}>
                          {thresholdDesc}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
                      <div style={{ flex: 1, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Nodes / Edges</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#4f46e5' }}>
                          {rule.graph?.nodes?.length || 0} / {rule.graph?.edges?.length || 0}
                        </div>
                      </div>
                      <div style={{ flex: 1, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 11, color: '#64748b' }}>Triggers</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>
                          {(rule.metrics?.totalTriggers || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trigger Metadata */}
                  <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      Last Triggered: {rule.metrics?.lastTriggeredAt ? new Date(rule.metrics.lastTriggeredAt).toLocaleString() : 'Never'}
                    </span>
                    <span>•</span>
                    <span>Total Triggers: <strong>{(rule.metrics?.totalTriggers || 0).toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 16 }}>
                  {isThreshold ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditModal(rule)}
                    >
                      <Edit3 size={13} />
                      Edit Threshold
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openRuleInBuilder(rule._id)}
                    >
                      <Workflow size={13} />
                      Edit in Canvas
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`btn btn-sm ${rule.active ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggle(rule._id)}
                      title={rule.active ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.active ? <Square size={12} /> : <Play size={12} />}
                      {rule.active ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(rule._id)}
                      style={{ padding: '6px 8px' }}
                      title="Delete rule"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Threshold Rule Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={20} color="#4f46e5" />
                <h3 className="modal-title">
                  {editingRule ? 'Edit Threshold Rule' : 'Create New Threshold Rule'}
                </h3>
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Rule Name */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Rule Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Critical Turbine Overheat Warning"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  {formErrors.name && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{formErrors.name}</div>}
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Triggers warning when main bearing thermal limit is breached"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Target Device & Monitored Metric Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Target Hardware Endpoint</label>
                    <select
                      className="form-select"
                      value={formData.deviceId}
                      onChange={e => setFormData({ ...formData, deviceId: e.target.value })}
                    >
                      <option value="ALL">⚡ All Devices (Fleet-wide)</option>
                      {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.deviceId} ({d.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Telemetry Metric *</label>
                    <select
                      className="form-select"
                      value={formData.metric}
                      onChange={e => setFormData({ ...formData, metric: e.target.value })}
                      required
                    >
                      {STANDARD_METRICS.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.metric && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{formErrors.metric}</div>}
                  </div>
                </div>

                {/* Comparison Operator */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Comparison Operator *</label>
                  <select
                    className="form-select"
                    value={formData.operator}
                    onChange={e => setFormData({ ...formData, operator: e.target.value })}
                  >
                    <option value=">">Greater than (&gt;)</option>
                    <option value="<">Less than (&lt;)</option>
                    <option value="==">Equal to (==)</option>
                    <option value="between">Between range (min &lt;= value &lt;= max)</option>
                  </select>
                </div>

                {/* Threshold Values: Single vs Between Range */}
                {formData.operator === 'between' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Minimum Threshold *</label>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        placeholder="e.g. 20"
                        value={formData.minThreshold}
                        onChange={e => setFormData({ ...formData, minThreshold: e.target.value })}
                        required
                      />
                      {formErrors.minThreshold && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{formErrors.minThreshold}</div>}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Maximum Threshold *</label>
                      <input
                        type="number"
                        step="any"
                        className="form-input"
                        placeholder="e.g. 80"
                        value={formData.maxThreshold}
                        onChange={e => setFormData({ ...formData, maxThreshold: e.target.value })}
                        required
                      />
                      {formErrors.maxThreshold && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{formErrors.maxThreshold}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Threshold Value *</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      placeholder="e.g. 80"
                      value={formData.threshold}
                      onChange={e => setFormData({ ...formData, threshold: e.target.value })}
                      required
                    />
                    {formErrors.threshold && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{formErrors.threshold}</div>}
                  </div>
                )}

                {/* Severity & State Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Alert Severity</label>
                    <select
                      className="form-select"
                      value={formData.severity}
                      onChange={e => setFormData({ ...formData, severity: e.target.value })}
                    >
                      <option value="warning">⚠️ Warning</option>
                      <option value="critical">🚨 Critical</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label className="form-label">Initial State</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 6 }}>
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={e => setFormData({ ...formData, active: e.target.checked })}
                      />
                      <span>Enable rule immediately</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: 18 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving Rule...' : editingRule ? 'Update Rule' : 'Save Threshold Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
