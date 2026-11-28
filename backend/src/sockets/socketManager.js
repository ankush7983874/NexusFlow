import { Server } from 'socket.io';

let ioInstance = null;

export const initSocket = (server, corsOrigin) => {
  ioInstance = new Server(server, {
    cors: {
      origin: corsOrigin || '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('subscribe:device', (payload) => {
      const rawId = typeof payload === 'object' && payload !== null ? payload.deviceId : payload;
      if (!rawId) return;
      const deviceId = String(rawId).trim();
      const upperId = deviceId.toUpperCase();
      socket.join(`device:${upperId}`);
      if (deviceId !== upperId) {
        socket.join(`device:${deviceId}`);
      }
      console.log(`[Socket.IO] Client ${socket.id} joined room device:${upperId}`);
      socket.emit('subscribed:device', { deviceId: upperId, success: true });
    });

    socket.on('unsubscribe:device', (payload) => {
      const rawId = typeof payload === 'object' && payload !== null ? payload.deviceId : payload;
      if (!rawId) return;
      const deviceId = String(rawId).trim();
      const upperId = deviceId.toUpperCase();
      socket.leave(`device:${upperId}`);
      if (deviceId !== upperId) {
        socket.leave(`device:${deviceId}`);
      }
      console.log(`[Socket.IO] Client ${socket.id} left room device:${upperId}`);
      socket.emit('unsubscribed:device', { deviceId: upperId, success: true });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};

export const broadcastTelemetry = (telemetryData) => {
  if (!ioInstance) return;
  // Broadcast to global feed
  ioInstance.emit('telemetry:data', telemetryData);

  // Broadcast to specific device room if present
  const rawId = telemetryData.metadata?.deviceId || telemetryData.deviceId;
  if (rawId) {
    const deviceId = String(rawId).trim();
    const upperId = deviceId.toUpperCase();
    ioInstance.to(`device:${upperId}`).emit('telemetry:device_data', telemetryData);
    if (deviceId !== upperId) {
      ioInstance.to(`device:${deviceId}`).emit('telemetry:device_data', telemetryData);
    }
  }
};

export const broadcastAlert = (alertData) => {
  if (!ioInstance) return;
  ioInstance.emit('alert:trigger', alertData);
};

export const broadcastAlertUpdate = (alertData) => {
  if (!ioInstance) return;
  ioInstance.emit('alert:update', alertData);
};

export const broadcastNodeExecution = (eventData) => {
  if (!ioInstance) return;
  ioInstance.emit('rule:node_executed', eventData);
};

export const broadcastDeviceUpdate = (deviceData) => {
  if (!ioInstance) return;
  ioInstance.emit('device:update', deviceData);
};
