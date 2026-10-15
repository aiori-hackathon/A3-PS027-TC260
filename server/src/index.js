import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db/database.js';
import { seedInitialDataIfEmpty } from './db/seedData.js';
import { getMeasurementVantage } from './measurements/connectivity.js';
import { startControlledTestEnvironment } from './test-site/controlledServer.js';

import healthRoutes from './routes/health.js';
import auditRoutes from './routes/audits.js';
import controlledTestRoutes from './routes/controlledTest.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '8000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// 1. Middleware
app.use(cors({
  origin: '*', // Allow React Vite frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 2. Mount API Routes
app.use('/api/health', healthRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/controlled-test', controlledTestRoutes);

// Root summary endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'IPv6 Website and Dependency Readiness Auditor Backend (PS-027)',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'ONLINE'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// 3. Server Startup
async function bootstrap() {
  console.log('------------------------------------------------------------');
  console.log(' IPv6 Website and Dependency Readiness Auditor Backend');
  console.log(' AIORI Hackathon 3 · Problem PS-027');
  console.log('------------------------------------------------------------');

  try {
    // Initialize SQLite
    console.log('[INIT] Initializing SQLite database...');
    await initDatabase();
    seedInitialDataIfEmpty();
    console.log('[INIT] SQLite database initialized and seeded successfully.');

    // Probe initial connectivity vantage
    console.log('[INIT] Probing host network connectivity...');
    const vantage = await getMeasurementVantage();
    console.log(`[VANTAGE] IPv4 Probe: ${vantage.ipv4.status} (RTT: ${vantage.ipv4.rttMs || 'N/A'}ms)`);
    console.log(`[VANTAGE] IPv6 Probe: ${vantage.ipv6.status} (RTT: ${vantage.ipv6.rttMs || 'N/A'}ms)`);

    // Start Controlled Test Site
    const controlledPort = parseInt(process.env.CONTROLLED_SITE_PORT || '8001', 10);
    startControlledTestEnvironment(controlledPort, 8002);

    // Start Main API Server
    const server = app.listen(PORT, HOST, () => {
      console.log(`[READY] API Server listening on http://${HOST}:${PORT}`);
      console.log(`[READY] Connected React frontend can reach endpoints at http://localhost:${PORT}/api/audits`);
      console.log('------------------------------------------------------------');
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[SHUTDOWN] Closing server...');
      server.close(() => {
        console.log('[SHUTDOWN] Server closed gracefully.');
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('[FATAL] Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();
