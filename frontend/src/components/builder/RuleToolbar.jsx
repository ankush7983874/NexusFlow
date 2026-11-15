import React from 'react';
import { 
  Play, 
  CheckCircle, 
  Save, 
  Zap, 
  RotateCcw, 
  Trash2, 
  Flame 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const RuleToolbar = ({ 
  ruleName, 
  setRuleName, 
  onSave, 
  onValidate, 
  onResetTemplate, 
  onClear, 
  isValidating, 
  isSaving,
  active,
  onToggleActive
}) => {
  const { triggerOverheatSpike } = useApp();

  return (
    <div
      style={{
        height: 56,
        background: 'white',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        gap: 16
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          style={{
            fontSize: 16,
            fontWeight: 700,
            border: '1px solid transparent',
            padding: '6px 10px',
            borderRadius: 6,
            outline: 'none',
            color: '#0f172a',
            width: 320
          }}
          className="form-input"
          value={ruleName}
          onChange={e => setRuleName(e.target.value)}
          placeholder="Rule Name..."
        />
        <button
          className={`badge ${active ? 'badge-success' : 'badge-warning'}`}
          onClick={onToggleActive}
          style={{ cursor: 'pointer', border: 'none' }}
        >
          {active ? '● Active Engine' : '○ Disabled'}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => triggerOverheatSpike('TURBINE-001', 94.5)}
          title="Injects 94.5°C telemetry from Turbine-001 to test live rule execution and alert"
          style={{ borderColor: '#fca5a5', color: '#b91c1c' }}
        >
          <Flame size={14} color="#dc2626" />
          Test Spike (94°C)
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onResetTemplate}
          title="Loads the official Problem Statement workflow"
        >
          <RotateCcw size={14} />
          Load Template
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onValidate}
          disabled={isValidating}
        >
          <CheckCircle size={14} color="#059669" />
          Validate Graph
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onClear}
          title="Clear all nodes and connections"
        >
          <Trash2 size={14} color="#64748b" />
          Clear
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={isSaving}
          style={{ minWidth: 130 }}
        >
          <Save size={14} />
          {isSaving ? 'Compiling...' : 'Save & Compile'}
        </button>
      </div>
    </div>
  );
};
