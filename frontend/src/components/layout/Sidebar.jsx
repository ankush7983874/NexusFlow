import React from 'react';
import { 
  LayoutDashboard, 
  Workflow, 
  Cpu, 
  Activity, 
  Sliders, 
  BellRing, 
  BarChart3, 
  Settings as SettingsIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar = () => {
  const { activeTab, setActiveTab, liveAlerts } = useApp();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'builder', label: 'Rule Builder', icon: Workflow, highlight: true },
    { id: 'devices', label: 'Devices', icon: Cpu },
    { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
    { id: 'rules', label: 'Rule Management', icon: Sliders },
    { id: 'alerts', label: 'Alerts', icon: BellRing, badge: liveAlerts.length },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Health', icon: SettingsIcon }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <img 
            src="/images/nexusflow-logo.png" 
            alt="NexusFlow Logo" 
            className="brand-logo-img" 
          />
        </div>
        <div>
          <div className="brand-title">NexusFlow</div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>IoT Stream & Rule Engine</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span className="badge badge-danger" style={{ padding: '2px 6px', fontSize: 10 }}>
                  {item.badge}
                </span>
              )}
              {item.highlight && (
                <span style={{ fontSize: 10, background: '#4f46e5', color: 'white', borderRadius: 4, padding: '1px 5px' }}>
                  Visual
                </span>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
        <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: '#10b981', display: 'inline-block' }}></span>
            MongoDB 8.x
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            Native Time-Series: <strong style={{ color: '#059669' }}>Active</strong>
          </div>
        </div>
      </div>
    </aside>
  );
};
