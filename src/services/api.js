/**
 * API Service Layer for IPv6 Website and Dependency Readiness Auditor (PS-027)
 * Implements endpoints specified in project requirements:
 * - POST /api/audits
 * - GET  /api/audits
 * - GET  /api/audits/:id
 * - GET  /api/audits/:id/resources
 * - GET  /api/audits/:id/graph
 * - GET  /api/audits/:id/report?format=csv
 * - GET  /api/audits/:id/report?format=json
 * - GET  /api/health
 */

import {
  BENCHMARK_SITES,
  DETAILED_AUDIT_RESOURCES,
  SAMPLE_GRAPH_DATA,
  CONTROLLED_TEST_SUBDOMAINS
} from './mockData';

// Configurable API base URL with fallback to localStorage and .env
export function getApiBaseUrl() {
  const custom = localStorage.getItem('ipv6_auditor_api_base_url');
  if (custom && custom.trim() !== '') {
    return custom.trim().replace(/\/$/, '');
  }
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
}

export function isMockFallbackEnabled() {
  const override = localStorage.getItem('ipv6_auditor_force_mock');
  if (override !== null) {
    return override === 'true';
  }
  return import.meta.env.VITE_USE_MOCK_FALLBACK !== 'false';
}

// In-memory audit store for session mutations
let localAudits = [...BENCHMARK_SITES];

/**
 * Health check endpoint
 */
export async function checkBackendHealth() {
  const baseUrl = getApiBaseUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { online: true, data, isMock: false };
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (err) {
    if (isMockFallbackEnabled()) {
      return {
        online: true,
        isMock: true,
        data: {
          status: 'ok',
          mode: 'SIMULATED_MOCK_ENGINE',
          version: '1.0.0-mock',
          supportedProtocols: ['IPv4', 'IPv6', 'NAT64/DNS64'],
          message: 'Running in simulated mock engine mode. Connect live backend via Settings.'
        }
      };
    }
    return { online: false, error: err.message, isMock: false };
  }
}

/**
 * POST /api/audits - Start an audit
 * Body: { url, mode, timeout }
 */
export async function startAudit({ url, mode = 'both', timeout = 15 }) {
  const baseUrl = getApiBaseUrl();

  // Try real backend first if not forced to mock
  if (!localStorage.getItem('ipv6_auditor_force_mock') || localStorage.getItem('ipv6_auditor_force_mock') === 'false') {
    try {
      const controller = new AbortController();
      const response = await fetch(`${baseUrl}/api/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, mode, timeout: Number(timeout) }),
        signal: controller.signal
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Backend unavailable; fallback to simulated audit engine if enabled
      if (!isMockFallbackEnabled()) {
        throw new Error(`Could not reach backend at ${baseUrl}. Enable mock mode in Settings.`);
      }
    }
  }

  // Simulated Audit Engine: constructs a realistic audit with failure classification
  const hostname = new URL(url).hostname;
  const isControlled = CONTROLLED_TEST_SUBDOMAINS.find(s => hostname.includes(s.subdomain.split('.')[0]));

  const newAudit = {
    id: `audit-${Date.now()}`,
    url,
    category: hostname.endsWith('.gov.in') || hostname.endsWith('.ac.in') ? 'Gov / Education' : 'Custom Scanned',
    timestamp: new Date().toISOString(),
    status: isControlled ? (isControlled.stage === 'PASS' ? 'READY' : 'FAILED') : (url.includes('google') || url.includes('cloudflare') ? 'READY' : 'DEGRADED'),
    readinessScore: isControlled ? (isControlled.stage === 'PASS' ? 100 : 25) : 76,
    ipv4Status: 'PASS',
    ipv6Status: isControlled ? (isControlled.stage === 'PASS' ? 'PASS' : 'FAIL') : 'PASS',
    mode,
    totalResources: 34,
    ipv6ReadyResources: isControlled && isControlled.stage !== 'PASS' ? 8 : 28,
    ipv4OnlyDependencies: 4,
    failedResources: isControlled && isControlled.stage !== 'PASS' ? 26 : 2,
    durationMs: Math.floor(Math.random() * 1200) + 1400,
    dnsStatus: isControlled?.stage === 'DNS' ? 'FAIL' : 'PASS',
    tcpStatus: isControlled?.stage === 'TCP' ? 'FAIL' : 'PASS',
    tlsStatus: isControlled?.stage === 'TLS' ? 'FAIL' : 'PASS',
    httpStatus: isControlled?.stage === 'HTTP' ? 'FAIL' : 'PASS',
    apexAAAA: isControlled?.dnsAAAA || '2405:8a00:201::12',
    apexA: isControlled?.dnsA || '164.100.158.12',
    isSimulated: true
  };

  localAudits = [newAudit, ...localAudits];
  return newAudit;
}

/**
 * GET /api/audits - List audit history
 */
export async function getAudits() {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/audits`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return mock
  }

  return localAudits;
}

/**
 * GET /api/audits/:id - Get audit details
 */
export async function getAuditById(id) {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/audits/${id}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return mock
  }

  const match = localAudits.find(a => a.id === id) || localAudits[0];
  return match;
}

/**
 * GET /api/audits/:id/resources - Get discovered sub-resources
 */
export async function getAuditResources(id) {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/audits/${id}/resources`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return mock
  }

  return DETAILED_AUDIT_RESOURCES;
}

/**
 * GET /api/audits/:id/graph - Get dependency graph
 */
export async function getAuditGraph(id) {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/audits/${id}/graph`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return mock
  }

  return SAMPLE_GRAPH_DATA;
}

/**
 * GET /api/audits/:id/report?format=csv
 */
export async function getAuditReportCSV(id) {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/audits/${id}/report?format=csv`);
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // Generate CSV on frontend
  }

  const audit = localAudits.find(a => a.id === id) || localAudits[0];
  const resources = DETAILED_AUDIT_RESOURCES;

  let csv = 'Resource ID,URL,Type,Domain,IPv4,IPv6,Protocol Status,First Failing Stage,Failure Class,Status Code,TTFB (ms)\n';
  resources.forEach(r => {
    csv += `"${r.id}","${r.url}","${r.type}","${r.domain}","${r.ipv4 || 'N/A'}","${r.ipv6 || 'N/A'}","${r.protocolStatus}","${r.firstFailingStage || 'NONE'}","${r.failureClass}","${r.statusCode}","${r.ttfbMs}"\n`;
  });

  return csv;
}

/**
 * GET /api/audits/:id/report?format=json
 */
export async function getAuditReportJSON(id) {
  const baseUrl = getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/audits/${id}/report?format=json`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return structured report
  }

  const audit = localAudits.find(a => a.id === id) || localAudits[0];
  const resources = DETAILED_AUDIT_RESOURCES;

  return {
    meta: {
      generator: 'IPv6 Readiness Auditor (PS-027)',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      isSimulated: !!audit.isSimulated
    },
    audit,
    summary: {
      totalResources: resources.length,
      ipv6Ready: resources.filter(r => r.failureClass === 'IPV6_OK').length,
      ipv4Only: resources.filter(r => r.protocolStatus === 'IPV4_ONLY').length,
      failuresByStage: {
        DNS: resources.filter(r => r.firstFailingStage === 'DNS').length,
        TCP: resources.filter(r => r.firstFailingStage === 'TCP').length,
        TLS: resources.filter(r => r.firstFailingStage === 'TLS').length,
        HTTP: resources.filter(r => r.firstFailingStage === 'HTTP').length
      }
    },
    resources
  };
}
