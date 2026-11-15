import React, { useState } from 'react';
import { X, Save, Trash2 } from 'lucide-react';

export const NodeConfigModal = ({ node, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({ ...(node.data || {}) });

  if (!node) return null;

  const handleChange = (key, val) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    onSave(node.id, formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Configure: {formData.label || node.type}</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: 4, borderRadius: 999 }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Node Title</label>
            <input
              className="form-input"
              value={formData.label || ''}
              onChange={e => handleChange('label', e.target.value)}
              placeholder="Custom node label"
            />
          </div>

          {/* Type-Specific Configurations */}
          {(node.type === 'tempSensor' || node.type === 'humiditySensor') && (
            <div className="form-group">
              <label className="form-label">Target Hardware Device</label>
              <select
                className="form-select"
                value={formData.deviceId || '*'}
                onChange={e => handleChange('deviceId', e.target.value)}
              >
                <option value="*">All Connected Devices (*)</option>
                <option value="TEMP-SENSOR-01">TEMP-SENSOR-01 (Boiler Room)</option>
                <option value="TURBINE-001">TURBINE-001 (Turbine Hall)</option>
                <option value="HVAC-UNIT-04">HVAC-UNIT-04 (Cleanroom)</option>
              </select>
            </div>
          )}

          {node.type === 'turbineSensor' && (
            <>
              <div className="form-group">
                <label className="form-label">Turbine Unit</label>
                <select
                  className="form-select"
                  value={formData.deviceId || 'TURBINE-001'}
                  onChange={e => handleChange('deviceId', e.target.value)}
                >
                  <option value="TURBINE-001">TURBINE-001 (Main Generator)</option>
                  <option value="TURBINE-002">TURBINE-002 (Auxiliary)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monitored Metric</label>
                <select
                  className="form-select"
                  value={formData.metric || 'temperature'}
                  onChange={e => handleChange('metric', e.target.value)}
                >
                  <option value="temperature">Temperature (°C)</option>
                  <option value="vibration">Vibration (mm/s)</option>
                  <option value="pressure">Pressure (kPa)</option>
                  <option value="voltage">Voltage (V)</option>
                </select>
              </div>
            </>
          )}

          {node.type === 'movingAverage' && (
            <div className="form-group">
              <label className="form-label">Window Buffer Size (samples)</label>
              <input
                type="number"
                min="1"
                max="50"
                className="form-input"
                value={formData.windowSize || 5}
                onChange={e => handleChange('windowSize', Number(e.target.value))}
              />
              <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>
                Computes average over the last N telemetry readings.
              </span>
            </div>
          )}

          {node.type === 'threshold' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Operator</label>
                <select
                  className="form-select"
                  value={formData.operator || '>'}
                  onChange={e => handleChange('operator', e.target.value)}
                >
                  <option value=">">&gt; (Greater than)</option>
                  <option value="<">&lt; (Less than)</option>
                  <option value=">=">&gt;= (Greater or equal)</option>
                  <option value="<=">&lt;= (Less or equal)</option>
                  <option value="==">== (Equals)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Threshold Value</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={formData.threshold !== undefined ? formData.threshold : 80}
                  onChange={e => handleChange('threshold', Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {node.type === 'mathOp' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Operation</label>
                <select
                  className="form-select"
                  value={formData.operation || 'multiply'}
                  onChange={e => handleChange('operation', e.target.value)}
                >
                  <option value="add">Add (+)</option>
                  <option value="subtract">Subtract (-)</option>
                  <option value="multiply">Multiply (×)</option>
                  <option value="divide">Divide (÷)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Operand Value</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={formData.operand !== undefined ? formData.operand : 1}
                  onChange={e => handleChange('operand', Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {node.type === 'smsAlert' && (
            <>
              <div className="form-group">
                <label className="form-label">SMS Recipient Number</label>
                <input
                  className="form-input"
                  value={formData.recipient || ''}
                  onChange={e => handleChange('recipient', e.target.value)}
                  placeholder="+1 (555) 019-2834"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notification Message Template</label>
                <textarea
                  rows="3"
                  className="form-input"
                  value={formData.message || ''}
                  onChange={e => handleChange('message', e.target.value)}
                  placeholder="ALERT: {{metric}} on {{deviceId}} crossed threshold! Current: {{value}}"
                />
                <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Variables: &#123;&#123;metric&#125;&#125;, &#123;&#123;deviceId&#125;&#125;, &#123;&#123;value&#125;&#125;
                </span>
              </div>
            </>
          )}

          {node.type === 'webhook' && (
            <>
              <div className="form-group">
                <label className="form-label">Webhook Endpoint URL</label>
                <input
                  className="form-input"
                  value={formData.url || ''}
                  onChange={e => handleChange('url', e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">HTTP Method</label>
                <select
                  className="form-select"
                  value={formData.method || 'POST'}
                  onChange={e => handleChange('method', e.target.value)}
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              onDelete(node.id);
              onClose();
            }}
          >
            <Trash2 size={14} />
            Delete Node
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>
            <Save size={14} />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
