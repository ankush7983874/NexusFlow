import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { socket } from '../services/socket';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [stats, setStats] = useState({
    totalTelemetry: 0,
    totalDevices: 0,
    onlineDevices: 0,
    activeRules: 0,
    recentAlerts: []
  });
  const [liveTelemetryFeed, setLiveTelemetryFeed] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [activeNodeEvents, setActiveNodeEvents] = useState({});
  const [simulatorRunning, setSimulatorRunning] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [socketStatus, setSocketStatus] = useState(socket.connected ? 'connected' : 'disconnected');

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch initial stats
  const refreshStats = async () => {
    try {
      const res = await api.getStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch overview stats:', err);
    }
  };

  // Fetch initial simulator status
  useEffect(() => {
    refreshStats();
    api.getSimulatorStatus()
      .then(res => setSimulatorRunning(res.running))
      .catch(() => {});
  }, []);

  // Socket.IO event listeners
  useEffect(() => {
    const handleTelemetry = (data) => {
      setLiveTelemetryFeed(prev => [data, ...prev.slice(0, 49)]);
      setStats(prev => ({ ...prev, totalTelemetry: prev.totalTelemetry + 1 }));
    };

    const handleAlert = (alert) => {
      setLiveAlerts(prev => [alert, ...prev.slice(0, 29)]);
      showToast(`🚨 Alert: ${alert.ruleName} - ${alert.message}`, 'danger');
      refreshStats();
    };

    const handleNodeExecuted = (event) => {
      setActiveNodeEvents(prev => ({
        ...prev,
        [event.nodeId]: {
          value: event.value,
          metric: event.metric,
          timestamp: new Date()
        }
      }));
    };

    const handleDeviceUpdate = (evt) => {
      refreshStats();
    };

    const onConnect = () => setSocketStatus('connected');
    const onDisconnect = () => setSocketStatus('disconnected');
    const onConnectError = () => setSocketStatus('error');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('telemetry:data', handleTelemetry);
    socket.on('alert:trigger', handleAlert);
    socket.on('rule:node_executed', handleNodeExecuted);
    socket.on('device:update', handleDeviceUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('telemetry:data', handleTelemetry);
      socket.off('alert:trigger', handleAlert);
      socket.off('rule:node_executed', handleNodeExecuted);
      socket.off('device:update', handleDeviceUpdate);
    };
  }, []);

  const openRuleInBuilder = (ruleId) => {
    setSelectedRuleId(ruleId);
    setActiveTab('builder');
  };

  const openDeviceDetails = (deviceId) => {
    setSelectedDeviceId(deviceId);
    setActiveTab('devices');
  };

  const toggleSimulator = async () => {
    try {
      if (simulatorRunning) {
        await api.stopSimulator();
        setSimulatorRunning(false);
        showToast('Telemetry simulator stopped', 'info');
      } else {
        await api.startSimulator(2500);
        setSimulatorRunning(true);
        showToast('Telemetry simulator started', 'success');
      }
    } catch (err) {
      showToast(`Failed: ${err.message}`, 'danger');
    }
  };

  const triggerOverheatSpike = async (deviceId = 'TURBINE-001', temp = 92.5) => {
    try {
      showToast(`Injecting overheat spike (${temp}°C) for ${deviceId}...`, 'warning');
      await api.triggerSpike(deviceId, temp);
    } catch (err) {
      showToast(`Spike failed: ${err.message}`, 'danger');
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedRuleId,
        setSelectedRuleId,
        openRuleInBuilder,
        selectedDeviceId,
        setSelectedDeviceId,
        openDeviceDetails,
        stats,
        refreshStats,
        liveTelemetryFeed,
        liveAlerts,
        activeNodeEvents,
        socketStatus,
        simulatorRunning,
        toggleSimulator,
        triggerOverheatSpike,
        toasts,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
