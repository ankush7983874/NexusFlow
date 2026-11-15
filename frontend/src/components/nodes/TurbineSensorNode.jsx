import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Disc3, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TurbineSensorNode = ({ id, data, selected }) => {
  const { activeNodeEvents } = useApp();
  const liveEvent = activeNodeEvents[id];

  return (
    <div className={`custom-flow-node ${selected ? 'selected' : ''} ${liveEvent ? 'node-pulse' : ''}`} style={{ width: 230 }}>
      <div className="node-header" style={{ background: 'linear-gradient(135deg, #4f46e5, #4338ca)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Disc3 size={16} className={liveEvent ? 'animate-spin' : ''} />
          <span>{data.label || 'Turbine Sensor'}</span>
        </div>
        <Settings size={14} style={{ opacity: 0.8, cursor: 'pointer' }} />
      </div>

      <div className="node-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#64748b' }}>Device ID:</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.deviceId || 'TURBINE-001'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Monitored Metric:</span>
          <span style={{ fontWeight: 600, color: '#4f46e5', textTransform: 'capitalize' }}>
            {data.metric || 'temperature'}
          </span>
        </div>

        <div className="node-metric-display">
          <span style={{ fontSize: 11, color: '#64748b' }}>Live Stream:</span>
          <span className="node-metric-val" style={{ color: '#4f46e5' }}>
            {liveEvent ? `${liveEvent.value}${data.metric === 'humidity' ? '%' : '°C'}` : '--'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#4f46e5' }}
      />
    </div>
  );
};
