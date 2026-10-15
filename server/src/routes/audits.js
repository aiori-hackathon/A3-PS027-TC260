import express from 'express';
import crypto from 'node:crypto';
import { validateUrlFormat, validateHostSafety } from '../security/urlValidator.js';
import { getMeasurementVantage } from '../measurements/connectivity.js';
import { runFullProbePipeline } from '../measurements/probeWorker.js';
import { discoverAndMeasureDependencies } from '../crawler/discoveryWorker.js';
import {
  insertAudit,
  getAllAudits,
  getAuditById,
  insertResources,
  getResourcesByAuditId,
  insertGraph,
  getGraphByAuditId
} from '../db/database.js';

const router = express.Router();

// Active audit job cancellation tokens
const activeJobs = new Map();

/**
 * POST /api/audits - Start a new audit
 */
router.post('/', async (req, res) => {
  const { url, mode = 'both', timeout = 15 } = req.body || {};

  // 1. Validate URL format and scheme
  const formatValidation = validateUrlFormat(url);
  if (!formatValidation.valid) {
    return res.status(400).json({ error: formatValidation.error });
  }

  // 2. Security & SSRF check
  const safety = await validateHostSafety(formatValidation.hostname, process.env.ALLOW_LOCAL_TEST_DOMAINS === 'true');
  if (!safety.safe) {
    return res.status(403).json({ error: safety.error });
  }

  const auditId = `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const startTime = Date.now();

  try {
    // 3. Inspect measurement vantage
    const vantage = await getMeasurementVantage();

    // 4. Run Apex Probes (4-stage pipeline on apex domain)
    const [v6Apex, v4Apex] = await Promise.all([
      runFullProbePipeline(formatValidation.url, 6, timeout),
      runFullProbePipeline(formatValidation.url, 4, timeout)
    ]);

    // 5. Discover sub-resource dependencies and build graph
    const discovery = await discoverAndMeasureDependencies(formatValidation.url, {
      timeout: Number(timeout),
      mode,
      maxResources: parseInt(process.env.MAX_RESOURCES_PER_AUDIT || '60', 10)
    });

    const totalRes = discovery.resources.length;
    const readyRes = discovery.resources.filter(r => r.failureClass === 'IPV6_OK').length;
    const v4OnlyDeps = discovery.resources.filter(r => r.protocolStatus === 'IPV4_ONLY').length;
    const failedRes = discovery.resources.filter(r => r.protocolStatus === 'FAILED' || r.protocolStatus === 'DEGRADED').length;

    // Calculate score
    const readinessScore = totalRes > 0 ? Math.round((readyRes / totalRes) * 100) : 100;
    let status = 'READY';
    if (readinessScore < 50 || v6Apex.firstFailingStage !== null) {
      status = 'FAILED';
    } else if (readinessScore < 85 || v4OnlyDeps > 0) {
      status = 'DEGRADED';
    }

    const durationMs = Date.now() - startTime;

    const hostname = formatValidation.hostname;
    let category = 'Commercial';
    if (hostname.endsWith('.gov.in') || hostname.endsWith('.nic.in') || hostname.endsWith('.gov')) {
      category = 'Indian Gov / Edu';
    } else if (hostname.endsWith('.ac.in') || hostname.endsWith('.edu')) {
      category = 'Indian Gov / Edu';
    } else if (['google.com', 'cloudflare.com', 'wikipedia.org', 'github.com', 'bbc.com'].some(g => hostname.includes(g))) {
      category = 'Global Tech';
    }

    const auditRecord = {
      id: auditId,
      url: formatValidation.url,
      hostname,
      category,
      mode,
      status,
      readinessScore,
      ipv4Status: v4Apex.firstFailingStage === null ? 'PASS' : 'FAIL',
      ipv6Status: v6Apex.firstFailingStage === null ? 'PASS' : 'FAIL',
      durationMs,
      dnsStatus: v6Apex.dns?.ipv6?.status === 'RESOLVED' ? 'PASS' : 'FAIL',
      tcpStatus: v6Apex.tcp?.status === 'CONNECTED' ? 'PASS' : 'FAIL',
      tlsStatus: v6Apex.tls?.status === 'TLS_SUCCESS' ? 'PASS' : 'FAIL',
      httpStatus: v6Apex.http?.status === 'HTTP_SUCCESS' ? 'PASS' : 'FAIL',
      apexAAAA: v6Apex.dns?.ipv6?.addresses?.[0] || null,
      apexA: v4Apex.dns?.ipv4?.addresses?.[0] || null,
      totalResources: totalRes,
      ipv6ReadyResources: readyRes,
      ipv4OnlyDependencies: v4OnlyDeps,
      failedResources: failedRes,
      measurementContext: {
        vantage: vantage.location,
        browserEngine: discovery.browserEngine,
        checkedAt: new Date().toISOString(),
        hostIPv6Supported: vantage.ipv6.supported,
        hostIPv4Supported: vantage.ipv4.supported
      },
      timestamp: new Date().toISOString()
    };

    // 6. Persist to SQLite
    insertAudit(auditRecord);
    insertResources(auditId, discovery.resources);
    insertGraph(auditId, discovery.graph);

    return res.status(201).json(auditRecord);
  } catch (err) {
    console.error('Audit execution failed:', err);
    return res.status(500).json({ error: `Audit execution failed: ${err.message}` });
  }
});

/**
 * GET /api/audits - List audits with pagination
 */
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit || '50', 10);
  const offset = parseInt(req.query.offset || '0', 10);
  const search = req.query.search || '';

  const list = getAllAudits(limit, offset, search);
  return res.json(list);
});

/**
 * GET /api/audits/:id - Get audit details
 */
router.get('/:id', (req, res) => {
  const audit = getAuditById(req.params.id);
  if (!audit) {
    return res.status(404).json({ error: `Audit "${req.params.id}" not found` });
  }
  return res.json(audit);
});

/**
 * GET /api/audits/:id/resources - Get discovered resources
 */
router.get('/:id/resources', (req, res) => {
  const resources = getResourcesByAuditId(req.params.id);
  return res.json(resources);
});

/**
 * GET /api/audits/:id/graph - Get React Flow dependency graph
 */
router.get('/:id/graph', (req, res) => {
  const graph = getGraphByAuditId(req.params.id);
  if (!graph) {
    return res.json({ nodes: [], edges: [] });
  }
  return res.json(graph);
});

/**
 * GET /api/audits/:id/report?format=csv | json
 */
router.get('/:id/report', (req, res) => {
  const audit = getAuditById(req.params.id);
  if (!audit) {
    return res.status(404).json({ error: `Audit "${req.params.id}" not found` });
  }

  const resources = getResourcesByAuditId(req.params.id);
  const format = (req.query.format || 'json').toLowerCase();

  if (format === 'csv') {
    let csv = 'Resource ID,URL,Type,Domain,IPv4,IPv6,Protocol Status,First Failing Stage,Failure Class,Status Code,TTFB (ms),Size (Bytes),Evidence\n';
    for (const r of resources) {
      const cleanUrl = `"${(r.url || '').replace(/"/g, '""')}"`;
      const cleanDomain = `"${(r.domain || '').replace(/"/g, '""')}"`;
      const cleanEvidence = `"${(r.evidence || '').replace(/"/g, '""')}"`;

      csv += `"${r.id}",${cleanUrl},"${r.type}",${cleanDomain},"${r.ipv4 || 'N/A'}","${r.ipv6 || 'N/A'}","${r.protocolStatus}","${r.firstFailingStage || 'NONE'}","${r.failureClass}","${r.statusCode}","${r.ttfbMs}","${r.sizeBytes}",${cleanEvidence}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${audit.id}.csv"`);
    return res.send(csv);
  }

  // JSON format
  const reportPayload = {
    meta: {
      generator: 'IPv6 Website and Dependency Readiness Auditor (PS-027)',
      standard: 'RFC 8305 / RFC 8200 / CDP Trace',
      version: '1.0.0',
      exportedAt: new Date().toISOString()
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

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="audit-${audit.id}.json"`);
  return res.json(reportPayload);
});

/**
 * POST /api/audits/:id/cancel
 */
router.post('/:id/cancel', (req, res) => {
  const auditId = req.params.id;
  const controller = activeJobs.get(auditId);
  if (controller) {
    controller.abort();
    activeJobs.delete(auditId);
    return res.json({ message: `Audit ${auditId} cancelled successfully` });
  }
  return res.json({ message: `No active job found for ${auditId}` });
});

export default router;
