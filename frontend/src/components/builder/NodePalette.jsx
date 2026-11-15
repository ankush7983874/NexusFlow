import React from 'react';
import { 
  Thermometer, 
  Droplets, 
  Disc3, 
  Activity, 
  Sliders, 
  Calculator, 
  MessageSquareText, 
  Globe 
} from 'lucide-react';

export const NodePalette = () => {
  const onDragStart = (event, nodeType, defaultData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, data: defaultData }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeDefinitions = [
    {
      category: 'Data Sources (Sensors)',
      items: [
        {
          type: 'turbineSensor',
          label: 'Turbine Sensor',
          icon: Disc3,
          color: '#4f46e5',
          data: { label: 'Turbine Sensor', deviceId: 'TURBINE-001', metric: 'temperature' }
        },
        {
          type: 'tempSensor',
          label: 'Temperature Sensor',
          icon: Thermometer,
          color: '#ea580c',
          data: { label: 'Temp Sensor', deviceId: '*', metric: 'temperature' }
        },
        {
          type: 'humiditySensor',
          label: 'Humidity Sensor',
          icon: Droplets,
          color: '#0284c7',
          data: { label: 'Humidity Sensor', deviceId: '*', metric: 'humidity' }
        }
      ]
    },
    {
      category: 'Stream Processors',
      items: [
        {
          type: 'movingAverage',
          label: 'Moving Average Filter',
          icon: Activity,
          color: '#059669',
          data: { label: 'Moving Average', windowSize: 5 }
        },
        {
          type: 'threshold',
          label: 'Threshold Condition',
          icon: Sliders,
          color: '#d97706',
          data: { label: 'Threshold Condition', operator: '>', threshold: 80 }
        },
        {
          type: 'mathOp',
          label: 'Math Operation',
          icon: Calculator,
          color: '#7c3aed',
          data: { label: 'Math Operation', operation: 'multiply', operand: 1.8 }
        }
      ]
    },
    {
      category: 'Actions & Sinks',
      items: [
        {
          type: 'smsAlert',
          label: 'SMS Alert Notification',
          icon: MessageSquareText,
          color: '#e11d48',
          data: { 
            label: 'SMS Alert', 
            recipient: '+1 (555) 019-2834', 
            message: 'ALERT: {{metric}} on {{deviceId}} crossed threshold! Current: {{value}}' 
          }
        },
        {
          type: 'webhook',
          label: 'Webhook Action',
          icon: Globe,
          color: '#0284c7',
          data: { 
            label: 'Webhook Action', 
            url: 'https://api.factory.io/alert', 
            method: 'POST' 
          }
        }
      ]
    }
  ];

  return (
    <aside className="node-palette">
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Component Palette</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Drag nodes onto canvas</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {nodeDefinitions.map((cat, idx) => (
          <div key={idx} className="palette-category">
            <div className="palette-category-title">{cat.category}</div>
            {cat.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <div
                  key={itemIdx}
                  className="draggable-node-item"
                  draggable
                  onDragStart={(e) => onDragStart(e, item.type, item.data)}
                >
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid var(--border)', background: '#f8fafc', fontSize: 12, color: '#64748b' }}>
        💡 <strong>Tip:</strong> Click any node on canvas to configure parameters. Double-click edge to delete.
      </div>
    </aside>
  );
};
