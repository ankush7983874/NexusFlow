import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Workflow, 
  Play, 
  Square, 
  Trash2, 
  Sliders, 
  CheckCircle, 
  AlertTriangle,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const RulesManagement = () => {
  const { openRuleInBuilder, showToast, refreshStats, setActiveTab } = useApp();
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRules = async () => {
    setIsLoading(true);
    try {
      const res = await api.getRules();
      if (res.success) {
        setRules(res.data);
      }
    } catch (err) {
      showToast(`Failed to load rules: ${err.message}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (ruleId) => {
    try {
      const res = await api.toggleRule(ruleId);
      if (res.success) {
        showToast(res.message, 'success');
        fetchRules();
        refreshStats();
      }
    } catch (err) {
      showToast(`Toggle failed: ${err.message}`, 'danger');
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Delete this rule and stop its stream pipeline?')) return;
    try {
      await api.deleteRule(ruleId);
      showToast('Rule deleted', 'info');
      fetchRules();
      refreshStats();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'danger');
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Rule Engine Management</h1>
          <p className="page-subtitle">Inspect active RxJS dynamic streams, trigger statistics, and execution health</p>
        </div>

        <button className="btn btn-primary" onClick={() => setActiveTab('builder')}>
          <Plus size={16} />
          Create New Rule
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        {rules.map(rule => {
          const isRunning = rule.isRunning || rule.active;
          const nodeCount = rule.graph?.nodes?.length || 0;
          const edgeCount = rule.graph?.edges?.length || 0;

          return (
            <div key={rule._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{rule.name}</h3>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {rule.description || 'No description configured'}
                    </p>
                  </div>
                  <span className={`badge ${isRunning ? 'badge-success' : 'badge-warning'}`}>
                    {isRunning ? '● Executing' : '○ Stopped'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
                  <div style={{ flex: 1, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Evaluations</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                      {(rule.metrics?.totalEvaluations || 0).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Triggers</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
                      {(rule.metrics?.totalTriggers || 0).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Nodes / Edges</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#4f46e5' }}>
                      {nodeCount} / {edgeCount}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  Last Triggered: {rule.metrics?.lastTriggeredAt ? new Date(rule.metrics.lastTriggeredAt).toLocaleString() : 'Never'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 16 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => openRuleInBuilder(rule._id)}
                >
                  <Workflow size={14} />
                  Edit in Canvas
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={`btn btn-sm ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => handleToggle(rule._id)}
                  >
                    {isRunning ? <Square size={12} /> : <Play size={12} />}
                    {isRunning ? 'Stop Pipeline' : 'Start Pipeline'}
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(rule._id)}
                    style={{ padding: 6 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
