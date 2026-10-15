import express from 'express';
import { getMeasurementVantage } from '../measurements/connectivity.js';
import { getAllAudits } from '../db/database.js';

const router = express.Router();

/**
 * GET /api/health - Backend health check and measurement worker readiness
 */
router.get('/', async (req, res) => {
  try {
    const vantage = await getMeasurementVantage();
    const storedAudits = getAllAudits(1);

    return res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      mode: 'LIVE_MEASUREMENT_ENGINE',
      workerAvailability: {
        ipv4Worker: vantage.ipv4.supported ? 'READY' : 'UNAVAILABLE',
        ipv6Worker: vantage.ipv6.supported ? 'READY' : 'UNAVAILABLE_OR_NO_ROUTE'
      },
      vantage,
      supportedProtocols: ['IPv4', 'IPv6', 'Forced-Socket-Isolation', 'CDP-Trace'],
      database: {
        engine: 'SQLite (sql.js / WebAssembly)',
        status: 'CONNECTED',
        recordsStored: storedAudits.length
      }
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

export default router;
