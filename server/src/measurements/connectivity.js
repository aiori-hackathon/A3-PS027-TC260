import net from 'node:net';
import dns from 'node:dns/promises';
import os from 'node:os';

/**
 * Host Connectivity & Vantage Environment Inspector
 */

let cachedVantage = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Test socket connection to verify reachability of specific IP & family
 */
function probeSocket(host, port, family, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let settled = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!settled) {
        settled = true;
        const rtt = Date.now() - startTime;
        socket.destroy();
        resolve({ available: true, rtt });
      }
    });

    socket.on('timeout', () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve({ available: false, error: 'TIMEOUT' });
      }
    });

    socket.on('error', (err) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve({ available: false, error: err.code || err.message });
      }
    });

    try {
      socket.connect({ host, port, family });
    } catch (err) {
      if (!settled) {
        settled = true;
        resolve({ available: false, error: err.message });
      }
    }
  });
}

/**
 * Probes local host IPv4 and IPv6 network readiness
 */
export async function getMeasurementVantage(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedVantage && (now - lastCheckTime < CACHE_TTL_MS)) {
    return cachedVantage;
  }

  // 1. Probe IPv4 connectivity (Google & Cloudflare DNS servers)
  const v4Probe = await probeSocket('8.8.8.8', 53, 4, 1800);
  const ipv4Available = v4Probe.available;

  // 2. Probe IPv6 connectivity (Google & Cloudflare IPv6 DNS)
  const v6Probe = await probeSocket('2001:4860:4860::8888', 53, 6, 2000);
  const ipv6Available = v6Probe.available;

  // 3. Inspect local network interfaces
  const interfaces = os.networkInterfaces();
  const localIps = { v4: [], v6: [] };

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const a of addrs || []) {
      if (!a.internal) {
        if (a.family === 'IPv4' || a.family === 4) {
          localIps.v4.push({ interface: name, address: a.address });
        } else if (a.family === 'IPv6' || a.family === 6) {
          if (!a.address.startsWith('fe80')) { // non link-local
            localIps.v6.push({ interface: name, address: a.address });
          }
        }
      }
    }
  }

  cachedVantage = {
    checkedAt: new Date().toISOString(),
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    location: process.env.VANTAGE_LOCATION || 'Local Workstation / AIORI Lab',
    ipv4: {
      supported: ipv4Available,
      rttMs: v4Probe.rtt || null,
      probeTarget: '8.8.8.8:53',
      status: ipv4Available ? 'ACTIVE' : 'UNREACHABLE',
      localInterfacesCount: localIps.v4.length
    },
    ipv6: {
      supported: ipv6Available,
      rttMs: v6Probe.rtt || null,
      probeTarget: '2001:4860:4860::8888:53',
      status: ipv6Available ? 'ACTIVE' : (localIps.v6.length === 0 ? 'NO_LOCAL_IPV6_ROUTE' : 'UNREACHABLE'),
      localInterfacesCount: localIps.v6.length
    },
    resolvers: {
      configured: [
        process.env.DNS_RESOLVER_IPV4 || '8.8.8.8',
        process.env.DNS_RESOLVER_IPV6 || '2001:4860:4860::8888'
      ]
    }
  };

  lastCheckTime = now;
  return cachedVantage;
}
