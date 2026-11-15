import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Thermometer, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TempSensorNode = ({ id, data, selected }) => {
  const { activeNodeEvents } = useApp();
  const liveEvent = activeNodeEvents[id];

  return (
    <div className={`custom-flow-node ${selected ? 'selected' : ''} ${liveEvent ? 'node-pulse' : ''}`} style={{ width: 220 }}>
      <div className="node-header" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Thermometer size={16} />
          <span>{data.label || 'Temp Sensor'}</span>
        </div>
        <Settings size={14} style={{ opacity: 0.8, cursor: 'pointer' }} />
      </div>

      <div className="node-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#64748b' }}>Target Device:</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{data.deviceId || 'Any (*)'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#64748b' }}>Metric:</span>
          <span style={{ fontWeight: 600, color: '#f97316' }}>temperature (°C)</span>
        </div>

        <div className="node-metric-display">
          <span style={{ fontSize: 11, color: '#64748b' }}>Live Reading:</span>
          <span className="node-metric-val" style={{ color: '#ea580c' }}>
            {liveEvent ? `${liveEvent.value}°C` : '-- °C'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#f97316' }}
      />
    </div>
  );
};
