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

    socket.on('subscribe:device', (deviceId) => {
      socket.join(`device:${deviceId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined room device:${deviceId}`);
    });

    socket.on('unsubscribe:device', (deviceId) => {
      socket.leave(`device:${deviceId}`);
      console.log(`[Socket.IO] Client ${socket.id} left room device:${deviceId}`);
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
  const deviceId = telemetryData.metadata?.deviceId || telemetryData.deviceId;
  if (deviceId) {
    ioInstance.to(`device:${deviceId}`).emit('telemetry:device_data', telemetryData);
  }
};

export const broadcastAlert = (alertData) => {
  if (!ioInstance) return;
  ioInstance.emit('alert:trigger', alertData);
};

export const broadcastNodeExecution = (eventData) => {
  if (!ioInstance) return;
  ioInstance.emit('rule:node_executed', eventData);
};
