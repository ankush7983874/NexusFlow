import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sliders, Settings, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ThresholdNode = ({ id, data, selected }) => {
  const { activeNodeEvents } = useApp();
  const liveEvent = activeNodeEvents[id];
  const isTriggered = liveEvent && liveEvent.triggered;

  return (
    <div className={`custom-flow-node ${selected ? 'selected' : ''} ${isTriggered ? 'node-pulse' : ''}`} style={{ width: 220 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#d97706' }}
      />

      <div className="node-header" style={{ background: isTriggered ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #d97706, #b45309)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isTriggered ? <AlertTriangle size={16} /> : <Sliders size={16} />}
          <span>{data.label || 'Threshold'}</span>
        </div>
        <Settings size={14} style={{ opacity: 0.8, cursor: 'pointer' }} />
      </div>

      <div className="node-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#64748b' }}>Condition:</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            {data.operator || '>'} {data.threshold !== undefined ? data.threshold : 80}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Filter Mode:</span>
          <span style={{ fontWeight: 600, color: '#d97706' }}>Pass on TRUE</span>
        </div>

        <div className="node-metric-display">
          <span style={{ fontSize: 11, color: '#64748b' }}>Eval State:</span>
          <span className="node-metric-val" style={{ color: isTriggered ? '#dc2626' : '#64748b', fontSize: 13 }}>
            {isTriggered ? `TRIGGERED (${liveEvent.value})` : liveEvent ? `PASSIVE (${liveEvent.value})` : 'Waiting'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#d97706' }}
      />
    </div>
  );
};
