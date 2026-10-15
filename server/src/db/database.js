import initSqlJs from 'sql.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * SQLite Data Access Layer powered by SQL.js (WebAssembly SQLite)
 * Provides schema initialization, persistent file storage, and CRUD DAO methods.
 */

let dbInstance = null;
const DB_PATH = process.env.DB_FILE_PATH || './data/audits.db';

export async function initDatabase() {
  if (dbInstance) return dbInstance;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch {
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Create Tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      hostname TEXT NOT NULL,
      category TEXT,
      mode TEXT,
      status TEXT,
      readiness_score INTEGER,
      ipv4_status TEXT,
      ipv6_status TEXT,
      duration_ms INTEGER,
      dns_status TEXT,
      tcp_status TEXT,
      tls_status TEXT,
      http_status TEXT,
      apex_a TEXT,
      apex_aaaa TEXT,
      total_resources INTEGER,
      ipv6_ready_resources INTEGER,
      ipv4_only_dependencies INTEGER,
      failed_resources INTEGER,
      measurement_context TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT,
      audit_id TEXT,
      url TEXT,
      domain TEXT,
      type TEXT,
      initiator TEXT,
      ipv4 TEXT,
      ipv6 TEXT,
      protocol_status TEXT,
      first_failing_stage TEXT,
      failure_class TEXT,
      status_code INTEGER,
      ttfb_ms INTEGER,
      size_bytes INTEGER,
      dns_timing INTEGER,
      tcp_timing INTEGER,
      tls_timing INTEGER,
      http_timing INTEGER,
      evidence TEXT,
      confidence TEXT,
      PRIMARY KEY (id, audit_id),
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS graphs (
      audit_id TEXT PRIMARY KEY,
      nodes_json TEXT,
      edges_json TEXT,
      FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
    );
  `);

  saveToDisk();
  return dbInstance;
}

export function saveToDisk() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('Failed to persist SQLite DB to disk:', err);
  }
}

// --------------------------------------------------------------------------
// Audit DAO Methods
// --------------------------------------------------------------------------

export function insertAudit(audit) {
  const db = dbInstance;
  const sql = `
    INSERT OR REPLACE INTO audits (
      id, url, hostname, category, mode, status, readiness_score,
      ipv4_status, ipv6_status, duration_ms, dns_status, tcp_status,
      tls_status, http_status, apex_a, apex_aaaa, total_resources,
      ipv6_ready_resources, ipv4_only_dependencies, failed_resources,
      measurement_context, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let hostname = 'unknown';
  try {
    hostname = new URL(audit.url).hostname;
  } catch {
    hostname = audit.url;
  }

  db.run(sql, [
    audit.id,
    audit.url,
    hostname,
    audit.category || 'General',
    audit.mode || 'both',
    audit.status || 'READY',
    audit.readinessScore || 0,
    audit.ipv4Status || 'PASS',
    audit.ipv6Status || 'PASS',
    audit.durationMs || 0,
    audit.dnsStatus || 'PASS',
    audit.tcpStatus || 'PASS',
    audit.tlsStatus || 'PASS',
    audit.httpStatus || 'PASS',
    audit.apexA || null,
    audit.apexAAAA || null,
    audit.totalResources || 0,
    audit.ipv6ReadyResources || 0,
    audit.ipv4OnlyDependencies || 0,
    audit.failedResources || 0,
    typeof audit.measurementContext === 'object' ? JSON.stringify(audit.measurementContext) : audit.measurementContext || '{}',
    audit.timestamp || new Date().toISOString()
  ]);

  saveToDisk();
  return audit;
}

export function getAllAudits(limit = 50, offset = 0, search = '') {
  const db = dbInstance;
  let query = 'SELECT * FROM audits';
  const params = [];

  if (search && search.trim() !== '') {
    query += ' WHERE url LIKE ? OR hostname LIKE ? OR category LIKE ?';
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  stmt.bind(params);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(mapAuditRow(row));
  }
  stmt.free();

  return results;
}

export function getAuditById(id) {
  const db = dbInstance;
  const stmt = db.prepare('SELECT * FROM audits WHERE id = ?');
  stmt.bind([id]);

  let result = null;
  if (stmt.step()) {
    result = mapAuditRow(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

export function insertResources(auditId, resources = []) {
  const db = dbInstance;
  const sql = `
    INSERT OR REPLACE INTO resources (
      id, audit_id, url, domain, type, initiator, ipv4, ipv6,
      protocol_status, first_failing_stage, failure_class, status_code,
      ttfb_ms, size_bytes, dns_timing, tcp_timing, tls_timing,
      http_timing, evidence, confidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const r of resources) {
    db.run(sql, [
      r.id,
      auditId,
      r.url,
      r.domain,
      r.type,
      r.initiator,
      r.ipv4,
      r.ipv6,
      r.protocolStatus,
      r.firstFailingStage,
      r.failureClass,
      r.statusCode || 200,
      r.ttfbMs || 0,
      r.sizeBytes || 0,
      r.dnsTiming || 0,
      r.tcpTiming || 0,
      r.tlsTiming || 0,
      r.httpTiming || 0,
      r.evidence || '',
      r.confidence || 'HIGH_SOCKET_PROBE_EVIDENCE'
    ]);
  }

  saveToDisk();
}

export function getResourcesByAuditId(auditId) {
  const db = dbInstance;
  const stmt = db.prepare('SELECT * FROM resources WHERE audit_id = ?');
  stmt.bind([auditId]);

  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push({
      id: row.id,
      url: row.url,
      domain: row.domain,
      type: row.type,
      initiator: row.initiator,
      ipv4: row.ipv4,
      ipv6: row.ipv6,
      protocolStatus: row.protocol_status,
      firstFailingStage: row.first_failing_stage || null,
      failureClass: row.failure_class,
      statusCode: row.status_code,
      ttfbMs: row.ttfb_ms,
      sizeBytes: row.size_bytes,
      dnsTiming: row.dns_timing,
      tcpTiming: row.tcp_timing,
      tlsTiming: row.tls_timing,
      httpTiming: row.http_timing,
      evidence: row.evidence,
      confidence: row.confidence
    });
  }
  stmt.free();
  return results;
}

export function insertGraph(auditId, graph) {
  const db = dbInstance;
  const sql = 'INSERT OR REPLACE INTO graphs (audit_id, nodes_json, edges_json) VALUES (?, ?, ?)';
  db.run(sql, [
    auditId,
    JSON.stringify(graph.nodes || []),
    JSON.stringify(graph.edges || [])
  ]);
  saveToDisk();
}

export function getGraphByAuditId(auditId) {
  const db = dbInstance;
  const stmt = db.prepare('SELECT * FROM graphs WHERE audit_id = ?');
  stmt.bind([auditId]);

  let result = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    result = {
      nodes: JSON.parse(row.nodes_json || '[]'),
      edges: JSON.parse(row.edges_json || '[]')
    };
  }
  stmt.free();
  return result;
}

function mapAuditRow(row) {
  let context = {};
  try {
    context = JSON.parse(row.measurement_context || '{}');
  } catch {}

  return {
    id: row.id,
    url: row.url,
    category: row.category,
    timestamp: row.created_at,
    status: row.status,
    readinessScore: row.readiness_score,
    ipv4Status: row.ipv4_status,
    ipv6Status: row.ipv6_status,
    mode: row.mode,
    totalResources: row.total_resources,
    ipv6ReadyResources: row.ipv6_ready_resources,
    ipv4OnlyDependencies: row.ipv4_only_dependencies,
    failedResources: row.failed_resources,
    durationMs: row.duration_ms,
    dnsStatus: row.dns_status,
    tcpStatus: row.tcp_status,
    tlsStatus: row.tls_status,
    httpStatus: row.http_status,
    apexAAAA: row.apex_aaaa,
    apexA: row.apex_a,
    measurementContext: context
  };
}
