const BASE_URL = window.location.origin.includes('5173')
  ? 'http://localhost:5000/api'
  : '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  // Telemetry
  getStats: () => request('/telemetry/stats'),
  getHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/telemetry/history?${query}`);
  },
  getAggregations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/telemetry/aggregations?${query}`);
  },
  ingestSingle: (data) => request('/telemetry', { method: 'POST', body: JSON.stringify(data) }),
  ingestBatch: (records) => {
    const payload = Array.isArray(records) ? { records } : records;
    return request('/telemetry/batch', { method: 'POST', body: JSON.stringify(payload) });
  },

  // Rules
  getRules: () => request('/rules'),
  getRuleById: (id) => request(`/rules/${id}`),
  createRule: (data) => request('/rules', { method: 'POST', body: JSON.stringify(data) }),
  createThresholdRule: (data) => request('/rules/threshold', { method: 'POST', body: JSON.stringify(data) }),
  updateThresholdRule: (id, data) => request(`/rules/${id}/threshold`, { method: 'PUT', body: JSON.stringify(data) }),
  updateRule: (id, data) => request(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRule: (id) => request(`/rules/${id}`, { method: 'DELETE' }),
  toggleRule: (id) => request(`/rules/${id}/toggle`, { method: 'PATCH' }),
  validateGraph: (graph) => request('/rules/validate', { method: 'POST', body: JSON.stringify({ graph }) }),

  // Devices
  getDevices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(query ? `/devices?${query}` : '/devices');
  },
  getDeviceById: (deviceId) => request(`/devices/${deviceId}`),
  getDeviceTelemetryHistory: (deviceId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/devices/${deviceId}/telemetry?${query}`);
  },
  createDevice: (data) => request('/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (deviceId, data) => request(`/devices/${deviceId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (deviceId) => request(`/devices/${deviceId}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/alerts?${query}`);
  },
  getAlertById: (id) => request(`/alerts/${id}`),
  getAlertStats: () => request('/alerts/stats'),
  acknowledgeAlert: (id) => request(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  resolveAlert: (id) => request(`/alerts/${id}/resolve`, { method: 'PATCH' }),
  clearAlerts: () => request('/alerts', { method: 'DELETE' }),

  // Simulator
  getSimulatorStatus: () => request('/simulator/status'),
  startSimulator: (interval) => request('/simulator/start', { method: 'POST', body: JSON.stringify({ interval }) }),
  stopSimulator: () => request('/simulator/stop', { method: 'POST' }),
  triggerSpike: (deviceId, temperature, humidity) => request('/simulator/spike', {
    method: 'POST',
    body: JSON.stringify({ deviceId, temperature, humidity })
  })
};
