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
  ingestBatch: (records) => request('/telemetry/batch', { method: 'POST', body: JSON.stringify({ records }) }),

  // Rules
  getRules: () => request('/rules'),
  getRuleById: (id) => request(`/rules/${id}`),
  createRule: (data) => request('/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id, data) => request(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRule: (id) => request(`/rules/${id}`, { method: 'DELETE' }),
  toggleRule: (id) => request(`/rules/${id}/toggle`, { method: 'PATCH' }),
  validateGraph: (graph) => request('/rules/validate', { method: 'POST', body: JSON.stringify({ graph }) }),

  // Devices
  getDevices: () => request('/devices'),
  getDeviceById: (deviceId) => request(`/devices/${deviceId}`),
  createDevice: (data) => request('/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (deviceId, data) => request(`/devices/${deviceId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (deviceId) => request(`/devices/${deviceId}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/alerts?${query}`);
  },
  getAlertStats: () => request('/alerts/stats'),
  acknowledgeAlert: (id) => request(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  clearAlerts: () => request('/alerts', { method: 'DELETE' }),

  // Simulator
  getSimulatorStatus: () => request('/simulator/status'),
  startSimulator: (interval) => request('/simulator/start', { method: 'POST', body: JSON.stringify({ interval }) }),
  stopSimulator: () => request('/simulator/stop', { method: 'POST' }),
  triggerSpike: (deviceId, temperature) => request('/simulator/spike', {
    method: 'POST',
    body: JSON.stringify({ deviceId, temperature })
  })
};
