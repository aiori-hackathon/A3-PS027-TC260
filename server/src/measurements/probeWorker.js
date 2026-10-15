import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';

/**
 * Low-Level 4-Stage Network Measurement Worker
 * Isolates DNS, TCP, TLS, and HTTP failures independently over forced IPv4 and IPv6 sockets
 * Compliant with AIORI Hackathon PS-027 and RFC 8305 bypass requirements.
 */

/**
 * 1. DNS Resolution Stage: separate A and AAAA lookups
 */
export async function probeDNS(hostname, timeoutMs = 3000) {
  const result = {
    ipv4: { addresses: [], status: 'UNKNOWN', latencyMs: 0, error: null },
    ipv6: { addresses: [], status: 'UNKNOWN', latencyMs: 0, error: null }
  };

  // IPv4 A query
  const startV4 = Date.now();
  try {
    const aRecords = await dns.resolve4(hostname);
    result.ipv4 = {
      addresses: aRecords || [],
      status: aRecords && aRecords.length > 0 ? 'RESOLVED' : 'NO_A',
      latencyMs: Date.now() - startV4,
      error: null
    };
  } catch (err) {
    result.ipv4 = {
      addresses: [],
      status: err.code === 'ENODATA' ? 'NO_A' : (err.code === 'TIMEOUT' ? 'DNS_TIMEOUT' : 'DNS_ERROR'),
      latencyMs: Date.now() - startV4,
      error: err.code || err.message
    };
  }

  // IPv6 AAAA query
  const startV6 = Date.now();
  try {
    const aaaaRecords = await dns.resolve6(hostname);
    result.ipv6 = {
      addresses: aaaaRecords || [],
      status: aaaaRecords && aaaaRecords.length > 0 ? 'RESOLVED' : 'NO_AAAA',
      latencyMs: Date.now() - startV6,
      error: null
    };
  } catch (err) {
    result.ipv6 = {
      addresses: [],
      status: err.code === 'ENODATA' ? 'NO_AAAA' : (err.code === 'TIMEOUT' ? 'DNS_TIMEOUT' : 'DNS_ERROR'),
      latencyMs: Date.now() - startV6,
      error: err.code || err.message
    };
  }

  return result;
}

/**
 * 2. TCP Handshake Stage: forced family socket connect
 */
export function probeTCP(ipAddress, port, family, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let finished = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!finished) {
        finished = true;
        const latencyMs = Date.now() - startTime;
        resolve({
          success: true,
          status: 'CONNECTED',
          latencyMs,
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort,
          socket // Return connected socket for TLS upgrade
        });
      }
    });

    socket.on('timeout', () => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve({
          success: false,
          status: 'TCP_TIMEOUT',
          latencyMs: Date.now() - startTime,
          error: `TCP connect timed out after ${timeoutMs}ms`,
          socket: null
        });
      }
    });

    socket.on('error', (err) => {
      if (!finished) {
        finished = true;
        socket.destroy();
        let status = 'TCP_ERROR';
        if (err.code === 'ECONNREFUSED') status = 'TCP_REFUSED';
        else if (err.code === 'ENETUNREACH' || err.code === 'EHOSTUNREACH') status = 'TCP_UNREACHABLE';
        else if (err.code === 'ETIMEDOUT') status = 'TCP_TIMEOUT';

        resolve({
          success: false,
          status,
          latencyMs: Date.now() - startTime,
          error: err.code || err.message,
          socket: null
        });
      }
    });

    try {
      socket.connect({ host: ipAddress, port, family });
    } catch (err) {
      if (!finished) {
        finished = true;
        resolve({
          success: false,
          status: 'TCP_ERROR',
          latencyMs: Date.now() - startTime,
          error: err.message,
          socket: null
        });
      }
    }
  });
}

/**
 * 3. TLS Negotiation Stage: SNI handshake & certificate inspection
 */
export function probeTLS(existingSocket, hostname, port = 443, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let finished = false;

    const tlsSocket = tls.connect({
      socket: existingSocket,
      servername: hostname,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: false // Inspect certificate even if self-signed or invalid
    });

    tlsSocket.setTimeout(timeoutMs);

    tlsSocket.on('secureConnect', () => {
      if (!finished) {
        finished = true;
        const latencyMs = Date.now() - startTime;
        const cert = tlsSocket.getPeerCertificate(true);
        const authorized = tlsSocket.authorized;
        const alpnProtocol = tlsSocket.alpnProtocol || 'http/1.1';
        const cipher = tlsSocket.getCipher();

        // Check Subject Alternative Names (SANs)
        const sans = cert?.subjectaltname ? cert.subjectaltname.split(', ').map(s => s.replace(/^DNS:/, '')) : [];
        const cn = cert?.subject?.CN;
        const isValidHost = verifyHostnameInCert(hostname, cn, sans);

        let status = 'TLS_SUCCESS';
        let failureClass = null;

        if (!isValidHost) {
          status = 'TLS_FAILED';
          failureClass = 'CERT_MISMATCH';
        } else if (!authorized && tlsSocket.authorizationError) {
          status = 'TLS_WARNING';
          failureClass = tlsSocket.authorizationError;
        }

        resolve({
          success: status === 'TLS_SUCCESS',
          status,
          failureClass,
          latencyMs,
          alpnProtocol,
          cipher: cipher?.name,
          validFrom: cert?.valid_from,
          validTo: cert?.valid_to,
          cn,
          sans,
          tlsSocket // Can be reused for HTTP
        });
      }
    });

    tlsSocket.on('timeout', () => {
      if (!finished) {
        finished = true;
        tlsSocket.destroy();
        resolve({
          success: false,
          status: 'TLS_TIMEOUT',
          failureClass: 'TLS_TIMEOUT',
          latencyMs: Date.now() - startTime,
          error: 'TLS handshake timed out'
        });
      }
    });

    tlsSocket.on('error', (err) => {
      if (!finished) {
        finished = true;
        tlsSocket.destroy();
        resolve({
          success: false,
          status: 'TLS_FAILED',
          failureClass: 'TLS_FAIL',
          latencyMs: Date.now() - startTime,
          error: err.code || err.message
        });
      }
    });
  });
}

function verifyHostnameInCert(hostname, cn, sans) {
  const lowerHost = hostname.toLowerCase();
  const allNames = [cn, ...sans].filter(Boolean).map(n => n.toLowerCase());

  for (const name of allNames) {
    if (name === lowerHost) return true;
    if (name.startsWith('*.')) {
      const wildcardDomain = name.slice(2);
      const hostParts = lowerHost.split('.');
      if (hostParts.length > 1) {
        const hostApex = hostParts.slice(1).join('.');
        if (hostApex === wildcardDomain) return true;
      }
    }
  }
  return false;
}

/**
 * 4. HTTP Request Stage: GET / HEAD over established socket
 */
export function probeHTTP(tlsSocket, hostname, path = '/', timeoutMs = 4000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let settled = false;

    const requestRaw = `GET ${path} HTTP/1.1\r\nHost: ${hostname}\r\nUser-Agent: IPv6-Readiness-Auditor-PS027/1.0\r\nAccept: */*\r\nConnection: close\r\n\r\n`;

    let responseBuffer = '';
    let statusCode = 0;
    let headers = {};
    let ttfbMs = 0;

    tlsSocket.setTimeout(timeoutMs);

    tlsSocket.on('data', (chunk) => {
      if (ttfbMs === 0) {
        ttfbMs = Date.now() - startTime;
      }
      responseBuffer += chunk.toString();
    });

    tlsSocket.on('end', () => {
      if (!settled) {
        settled = true;
        const totalDuration = Date.now() - startTime;
        const lines = responseBuffer.split('\r\n');
        const statusLine = lines[0] || '';
        const statusMatch = statusLine.match(/HTTP\/[0-9.]+\s+([0-9]{3})/);
        statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 0;

        let failureClass = null;
        let status = 'HTTP_SUCCESS';

        if (statusCode >= 400 && statusCode < 500) {
          status = 'HTTP_FAILED';
          failureClass = 'HTTP_4XX';
        } else if (statusCode >= 500) {
          status = 'HTTP_FAILED';
          failureClass = 'HTTP_5XX';
        } else if (statusCode === 0) {
          status = 'HTTP_FAILED';
          failureClass = 'HTTP_RETRIEVAL_FAIL';
        }

        resolve({
          success: status === 'HTTP_SUCCESS',
          status,
          failureClass,
          statusCode,
          ttfbMs: ttfbMs || totalDuration,
          durationMs: totalDuration,
          sizeBytes: responseBuffer.length
        });
      }
    });

    tlsSocket.on('timeout', () => {
      if (!settled) {
        settled = true;
        tlsSocket.destroy();
        resolve({
          success: false,
          status: 'HTTP_TIMEOUT',
          failureClass: 'HTTP_TIMEOUT',
          statusCode: 0,
          ttfbMs: 0,
          durationMs: Date.now() - startTime,
          error: 'HTTP response timed out'
        });
      }
    });

    tlsSocket.on('error', (err) => {
      if (!settled) {
        settled = true;
        tlsSocket.destroy();
        resolve({
          success: false,
          status: 'HTTP_FAILED',
          failureClass: 'HTTP_RETRIEVAL_FAIL',
          statusCode: 0,
          ttfbMs: 0,
          error: err.message
        });
      }
    });

    try {
      tlsSocket.write(requestRaw);
    } catch (err) {
      if (!settled) {
        settled = true;
        resolve({
          success: false,
          status: 'HTTP_FAILED',
          failureClass: 'HTTP_RETRIEVAL_FAIL',
          statusCode: 0,
          error: err.message
        });
      }
    }
  });
}

/**
 * Executes the complete 4-stage pipeline for a single target hostname
 * @param {string} targetUrl
 * @param {number} family - 4 or 6
 */
export async function runFullProbePipeline(targetUrl, family = 6, timeoutSec = 15) {
  const parsed = new URL(targetUrl);
  const hostname = parsed.hostname;
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
  const path = parsed.pathname + parsed.search;

  const result = {
    url: targetUrl,
    hostname,
    family,
    dns: null,
    tcp: null,
    tls: null,
    http: null,
    firstFailingStage: null,
    failureClass: 'IPV6_OK',
    evidence: '',
    durationMs: 0
  };

  const startPipeline = Date.now();

  // STAGE 1: DNS
  const dnsResult = await probeDNS(hostname, 3500);
  result.dns = dnsResult;

  const addresses = family === 6 ? dnsResult.ipv6.addresses : dnsResult.ipv4.addresses;
  if (!addresses || addresses.length === 0) {
    result.firstFailingStage = 'DNS';
    result.failureClass = family === 6 ? 'NO_AAAA' : 'NO_A';
    result.evidence = `DNS query for ${family === 6 ? 'AAAA' : 'A'} records on ${hostname} returned 0 answers (status: ${family === 6 ? dnsResult.ipv6.status : dnsResult.ipv4.status}).`;
    result.durationMs = Date.now() - startPipeline;
    return result;
  }

  const selectedIp = addresses[0];

  // STAGE 2: TCP
  const tcpResult = await probeTCP(selectedIp, port, family, 4000);
  result.tcp = {
    status: tcpResult.status,
    latencyMs: tcpResult.latencyMs,
    remoteAddress: selectedIp,
    error: tcpResult.error
  };

  if (!tcpResult.success) {
    result.firstFailingStage = 'TCP';
    result.failureClass = tcpResult.status;
    result.evidence = `TCP SYN to [${selectedIp}]:${port} over IPv${family} socket failed: ${tcpResult.error || tcpResult.status} (RTT: ${tcpResult.latencyMs}ms).`;
    result.durationMs = Date.now() - startPipeline;
    return result;
  }

  // STAGE 3: TLS (for HTTPS)
  let activeSocket = tcpResult.socket;
  if (parsed.protocol === 'https:') {
    const tlsResult = await probeTLS(activeSocket, hostname, port, 4000);
    result.tls = {
      status: tlsResult.status,
      failureClass: tlsResult.failureClass,
      latencyMs: tlsResult.latencyMs,
      alpn: tlsResult.alpnProtocol,
      cipher: tlsResult.cipher,
      cn: tlsResult.cn
    };

    if (!tlsResult.success) {
      activeSocket.destroy();
      result.firstFailingStage = 'TLS';
      result.failureClass = tlsResult.failureClass || 'TLS_FAIL';
      result.evidence = `TLS 1.3/1.2 handshake failed on [${selectedIp}]:443. SNI='${hostname}'. Cause: ${tlsResult.failureClass || tlsResult.error}.`;
      result.durationMs = Date.now() - startPipeline;
      return result;
    }
    activeSocket = tlsResult.tlsSocket;
  }

  // STAGE 4: HTTP
  const httpResult = await probeHTTP(activeSocket, hostname, path, 4500);
  result.http = {
    status: httpResult.status,
    statusCode: httpResult.statusCode,
    ttfbMs: httpResult.ttfbMs,
    sizeBytes: httpResult.sizeBytes
  };

  if (!httpResult.success) {
    result.firstFailingStage = 'HTTP';
    result.failureClass = httpResult.failureClass || 'HTTP_RETRIEVAL_FAIL';
    result.evidence = `HTTP GET over IPv${family} socket returned status ${httpResult.statusCode}. TTFB: ${httpResult.ttfbMs}ms.`;
    result.durationMs = Date.now() - startPipeline;
    return result;
  }

  // ALL PASSED
  result.firstFailingStage = null;
  result.failureClass = family === 6 ? 'IPV6_OK' : 'IPV4_OK';
  result.evidence = `All 4 stages passed over forced IPv${family} transport. Target resolved to ${selectedIp}. HTTP status ${httpResult.statusCode}.`;
  result.durationMs = Date.now() - startPipeline;

  return result;
}
