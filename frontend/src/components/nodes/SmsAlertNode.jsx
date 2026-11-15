import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquareText, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SmsAlertNode = ({ id, data, selected }) => {
  const { activeNodeEvents } = useApp();
  const liveEvent = activeNodeEvents[id];

  return (
    <div className={`custom-flow-node ${selected ? 'selected' : ''} ${liveEvent ? 'node-pulse' : ''}`} style={{ width: 230 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#e11d48' }}
      />

      <div className="node-header" style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquareText size={16} />
          <span>{data.label || 'SMS Alert'}</span>
        </div>
        <Settings size={14} style={{ opacity: 0.8, cursor: 'pointer' }} />
      </div>

      <div className="node-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#64748b' }}>Recipient:</span>
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 11 }}>
            {data.recipient || '+1 (555) 019-2834'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Service:</span>
          <span style={{ fontWeight: 600, color: '#e11d48' }}>Mock Dispatcher</span>
        </div>

        <div className="node-metric-display">
          <span style={{ fontSize: 11, color: '#64748b' }}>Action State:</span>
          <span className="node-metric-val" style={{ color: liveEvent ? '#e11d48' : '#64748b', fontSize: 12 }}>
            {liveEvent ? 'DISPATCHED' : 'Standing By'}
          </span>
        </div>
      </div>
    </div>
  );
};
