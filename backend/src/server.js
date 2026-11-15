import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initSocket } from './sockets/socketManager.js';
import { ruleEngine } from './services/ruleEngine.service.js';
import { seedInitialData } from './utils/seedData.js';
import { TelemetrySimulator } from './utils/simulator.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Socket.IO
initSocket(server, process.env.CORS_ORIGIN || '*');

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB Time-Series DB
    await connectDB();

    // 2. Seed initial hardware & rules if first run
    await seedInitialData();

    // 3. Initialize Rule Engine & compile active graphs
    await ruleEngine.init();

    // 4. Start Live IoT Telemetry Simulator
    TelemetrySimulator.start(3000);

    // 5. Start HTTP Server
    server.listen(PORT, () => {
      console.log(`\n========================================================`);
      console.log(`🚀 [NexusFlow Engine] Running on port ${PORT}`);
      console.log(`📡 WebSocket Gateway: ws://localhost:${PORT}`);
      console.log(`📊 Health Endpoint: http://localhost:${PORT}/api/health`);
      console.log(`========================================================\n`);
    });
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Gracefully shutting down...');
  TelemetrySimulator.stop();
  server.close(() => {
    console.log('[Server] Closed all connections.');
    process.exit(0);
  });
});
