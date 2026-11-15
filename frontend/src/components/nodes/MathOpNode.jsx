import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Calculator, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MathOpNode = ({ id, data, selected }) => {
  const { activeNodeEvents } = useApp();
  const liveEvent = activeNodeEvents[id];

  const opSymbols = {
    add: '+',
    subtract: '-',
    multiply: '×',
    divide: '÷'
  };

  const symbol = opSymbols[data.operation] || '×';

  return (
    <div className={`custom-flow-node ${selected ? 'selected' : ''} ${liveEvent ? 'node-pulse' : ''}`} style={{ width: 220 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#7c3aed' }}
      />

      <div className="node-header" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={16} />
          <span>{data.label || 'Math Operation'}</span>
        </div>
        <Settings size={14} style={{ opacity: 0.8, cursor: 'pointer' }} />
      </div>

      <div className="node-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#64748b' }}>Operation:</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            val {symbol} {data.operand !== undefined ? data.operand : 1}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Type:</span>
          <span style={{ fontWeight: 600, color: '#7c3aed', textTransform: 'capitalize' }}>
            {data.operation || 'multiply'}
          </span>
        </div>

        <div className="node-metric-display">
          <span style={{ fontSize: 11, color: '#64748b' }}>Result:</span>
          <span className="node-metric-val" style={{ color: '#7c3aed' }}>
            {liveEvent ? liveEvent.value : '--'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#7c3aed' }}
      />
    </div>
  );
};
