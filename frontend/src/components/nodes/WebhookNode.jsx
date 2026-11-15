import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const WebhookNode = ({ id, data, selected }) => {
  const { activeNodeEvents } = useApp();
  const liveEvent = activeNodeEvents[id];

  return (
    <div className={`custom-flow-node ${selected ? 'selected' : ''} ${liveEvent ? 'node-pulse' : ''}`} style={{ width: 230 }}>
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#0284c7' }}
      />

      <div className="node-header" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={16} />
          <span>{data.label || 'Webhook Action'}</span>
        </div>
        <Settings size={14} style={{ opacity: 0.8, cursor: 'pointer' }} />
      </div>

      <div className="node-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#64748b' }}>HTTP Method:</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.method || 'POST'}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: '#64748b', fontSize: 11 }}>Target Endpoint:</span>
          <span style={{ fontWeight: 500, color: '#0284c7', fontSize: 11, wordBreak: 'break-all' }}>
            {data.url ? data.url.replace(/^https?:\/\//, '') : 'https://api.factory.io/alert'}
          </span>
        </div>

        <div className="node-metric-display">
          <span style={{ fontSize: 11, color: '#64748b' }}>Status:</span>
          <span className="node-metric-val" style={{ color: liveEvent ? '#0284c7' : '#64748b', fontSize: 12 }}>
            {liveEvent ? 'POST 200 OK' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
};
