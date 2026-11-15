import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { BarChart3, Database, TrendingUp, Layers } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export const Analytics = () => {
  const { showToast } = useApp();
  const [aggregations, setAggregations] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('all');
  const [hours, setHours] = useState(24);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAggs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAggregations({ deviceId: selectedDevice, hours });
      if (res.success) {
        setAggregations(res.data);
      }
    } catch (err) {
      showToast(`Failed to load analytics: ${err.message}`, 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAggs();
  }, [selectedDevice, hours]);

  const chartData = aggregations.map(a => ({
    hour: a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${a._id.hour}:00`,
    avgTemp: Number((a.avgTemp || 0).toFixed(1)),
    maxTemp: Number((a.maxTemp || 0).toFixed(1)),
    minTemp: Number((a.minTemp || 0).toFixed(1)),
    avgHumidity: Number((a.avgHumidity || 0).toFixed(1)),
    count: a.count || 0
  }));

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">MongoDB Time-Series Analytics</h1>
          <p className="page-subtitle">Real aggregation pipelines executed directly over native append-only time-series buckets</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            className="form-select"
            style={{ width: 180, fontSize: 13 }}
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
          >
            <option value="all">All Devices Combined</option>
            <option value="TURBINE-001">TURBINE-001</option>
            <option value="TURBINE-002">TURBINE-002</option>
            <option value="TEMP-SENSOR-01">TEMP-SENSOR-01</option>
            <option value="HVAC-UNIT-04">HVAC-UNIT-04</option>
          </select>

          <select
            className="form-select"
            style={{ width: 140, fontSize: 13 }}
            value={hours}
            onChange={e => setHours(Number(e.target.value))}
          >
            <option value="6">Last 6 Hours</option>
            <option value="12">Last 12 Hours</option>
            <option value="24">Last 24 Hours</option>
            <option value="48">Last 48 Hours</option>
          </select>
        </div>
      </div>

      {/* Temperature Range Chart */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Temperature Range (Min, Average, Max)</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>Calculated from time-series buckets over selected time window</p>
          </div>
        </div>
        <div style={{ height: 320, width: '100%' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="maxTemp" name="Max Temp (°C)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="avgTemp" name="Average Temp (°C)" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="minTemp" name="Min Temp (°C)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              No bucketed aggregations available in the selected window.
            </div>
          )}
        </div>
      </div>

      {/* Hourly Document Volume / Ingestion Count */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Time-Series Telemetry Volume by Bucket</h3>
            <p style={{ fontSize: 12, color: '#64748b' }}>Number of hardware readings stored per hourly bucket</p>
          </div>
        </div>
        <div style={{ height: 260, width: '100%' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="count" name="Ingested Points" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              No volume data found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
