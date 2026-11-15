import { io } from 'socket.io-client';

const SOCKET_URL = window.location.origin.includes('5173') 
  ? 'http://localhost:5000' 
  : window.location.origin;

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('[Socket] Connected to NexusFlow Engine with ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected from server:', reason);
});
