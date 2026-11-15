import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Activity, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MovingAverageNode = ({ id, data, selected }) => {
  const { activeNodeEvents } = useApp();
  const liveEvent = activeNodeEvents[id];

  return (
    <div className={`custom-flow-node ${selected ? 'selected' : ''} ${liveEvent ? 'node-pulse' : ''}`} style={{ width: 220 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#059669' }}
      />

      <div className="node-header" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} />
          <span>{data.label || 'Moving Average'}</span>
        </div>
        <Settings size={14} style={{ opacity: 0.8, cursor: 'pointer' }} />
      </div>

      <div className="node-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#64748b' }}>Window Size:</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.windowSize || 5} samples</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Smoothing:</span>
          <span style={{ fontWeight: 600, color: '#059669' }}>Sliding Buffer</span>
        </div>

        <div className="node-metric-display">
          <span style={{ fontSize: 11, color: '#64748b' }}>Smoothed Value:</span>
          <span className="node-metric-val" style={{ color: '#059669' }}>
            {liveEvent ? liveEvent.value : '--'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#059669' }}
      />
    </div>
  );
};
