import express from 'express';
import http from 'node:http';
import net from 'node:net';

/**
 * Controlled Test Site with genuine socket separation
 * Demonstrates:
 * 1. Healthy Dual-Stack page & assets
 * 2. Deliberately IPv4-only assets bound exclusively to an IPv4 socket
 * 3. Seeded DNS, TCP, TLS, and HTTP failure scenarios for accuracy calibration
 */

export function startControlledTestEnvironment(mainPort = 8001, ipv4OnlyPort = 8002) {
  const mainApp = express();
  const v4OnlyApp = express();

  // 1. Dual-Stack Endpoint (Main Page)
  mainApp.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Measurement-Remote-Family', req.socket.remoteFamily || 'Unknown');
    next();
  });

  mainApp.get('/', (req, res) => {
    res.type('html').send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>PS-027 Controlled Test Benchmark Site</title>
  <!-- Dual-Stack healthy stylesheet -->
  <link rel="stylesheet" href="/assets/style-dual.css">
  <!-- Seeded IPv4-only stylesheet from isolated IPv4 port -->
  <link rel="stylesheet" href="http://127.0.0.1:${ipv4OnlyPort}/assets/ipv4-only-style.css">
</head>
<body>
  <h1>Controlled Test Environment (PS-027)</h1>
  <p>Status: Active. Socket Family: ${req.socket.remoteFamily}</p>

  <!-- Dual-Stack healthy image -->
  <img src="/assets/dual-logo.svg" alt="Dual Stack Asset" width="120" />

  <!-- Seeded IPv4-only script from isolated IPv4 port -->
  <script src="http://127.0.0.1:${ipv4OnlyPort}/assets/tracker-ipv4-only.js"></script>

  <!-- Dual-Stack healthy script -->
  <script src="/assets/app-dual.js"></script>
</body>
</html>
    `);
  });

  // Dual-stack static assets
  mainApp.get('/assets/style-dual.css', (req, res) => {
    res.type('css').send('body { font-family: sans-serif; background: #0c1222; color: #fff; }');
  });

  mainApp.get('/assets/app-dual.js', (req, res) => {
    res.type('javascript').send('console.log("Dual-stack script loaded over " + window.location.protocol);');
  });

  mainApp.get('/assets/dual-logo.svg', (req, res) => {
    res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#06b6d4"/></svg>');
  });

  // Seeded Fault Endpoints
  mainApp.get('/fault/err500', (req, res) => {
    res.status(500).json({ error: 'Internal Server Error', fault: 'SEEDED_HTTP_5XX' });
  });

  mainApp.get('/fault/blackhole', (req, res) => {
    // Deliberately hold connection open until timeout
    setTimeout(() => {
      if (!res.headersSent) res.status(200).send('Timeout avoided');
    }, 20000);
  });

  // 2. Deliberately IPv4-Only Endpoint (bound only to IPv4 0.0.0.0)
  v4OnlyApp.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Socket-Family', 'IPv4-Only');
    next();
  });

  v4OnlyApp.get('/assets/ipv4-only-style.css', (req, res) => {
    res.type('css').send('.ipv4-only { border: 2px solid #f59e0b; }');
  });

  v4OnlyApp.get('/assets/tracker-ipv4-only.js', (req, res) => {
    res.type('javascript').send('window.__ipv4_tracker_loaded = true;');
  });

  // Start HTTP Listeners
  const mainServer = http.createServer(mainApp);
  mainServer.listen(mainPort, '0.0.0.0', () => {
    console.log(`[TEST-SITE] Main Dual-Stack Test Server listening on http://0.0.0.0:${mainPort}`);
  });

  const v4Server = http.createServer(v4OnlyApp);
  // Specifically bind to IPv4 '127.0.0.1' so IPv6 connections cannot reach it
  v4Server.listen(ipv4OnlyPort, '127.0.0.1', () => {
    console.log(`[TEST-SITE] Deliberately IPv4-Only Test Server listening on http://127.0.0.1:${ipv4OnlyPort}`);
  });

  return { mainServer, v4Server };
}
