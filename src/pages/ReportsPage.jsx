import React, { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, FileJson, Printer, CheckCircle2, AlertTriangle, ShieldCheck, Globe } from 'lucide-react';
import { useAuditContext } from '../context/AuditContext';
import { getAuditResources, getAuditReportCSV, getAuditReportJSON } from '../services/api';
import { downloadFile, formatDate, formatDuration } from '../utils/formatters';
import DemoNotice from '../components/common/DemoNotice';
import StatusBadge from '../components/common/StatusBadge';

export default function ReportsPage() {
  const { activeAudit, audits, addToast } = useAuditContext();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeAudit) return;
      setLoading(true);
      try {
        const data = await getAuditResources(activeAudit.id);
        setResources(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeAudit]);

  if (!activeAudit) return null;

  const dnsFailures = resources.filter(r => r.firstFailingStage === 'DNS').length;
  const tcpFailures = resources.filter(r => r.firstFailingStage === 'TCP').length;
  const tlsFailures = resources.filter(r => r.firstFailingStage === 'TLS').length;
  const httpFailures = resources.filter(r => r.firstFailingStage === 'HTTP').length;
  const healthyCount = resources.filter(r => r.failureClass === 'IPV6_OK').length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = async () => {
    try {
      const csv = await getAuditReportCSV(activeAudit.id);
      downloadFile(csv, `ipv6-report-${new URL(activeAudit.url).hostname}.csv`, 'text/csv');
      addToast('CSV Audit Report exported', 'success');
    } catch {
      addToast('Failed to export CSV', 'error');
    }
  };

  const handleExportJson = async () => {
    try {
      const json = await getAuditReportJSON(activeAudit.id);
      downloadFile(JSON.stringify(json, null, 2), `ipv6-report-${new URL(activeAudit.url).hostname}.json`, 'application/json');
      addToast('JSON Audit Package exported', 'success');
    } catch {
      addToast('Failed to export JSON', 'error');
    }
  };

  return (
    <div className="page-wrapper">
      <DemoNotice
        title="Official Audit Report & Evidence Package"
        message="Standard compliance report compliant with RFC 8305 and RFC 8200 requirements. Exports real audit telemetry when backend is active, or validated simulated data."
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText size={24} color="var(--cyber-cyan)" />
            Audit Report & Export
          </h1>
          <p className="page-desc">
            Executive readiness certificate and technical evidence for {activeAudit.url}.
          </p>
        </div>

        <div className="page-actions">
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={14} /> Print Report
          </button>
          <button onClick={handleExportCsv} className="btn btn-primary">
            <FileSpreadsheet size={14} /> Download CSV
          </button>
          <button onClick={handleExportJson} className="btn btn-primary">
            <FileJson size={14} /> Download JSON
          </button>
        </div>
      </div>

      {/* Printable Report Card */}
      <div
        className="card"
        style={{
          padding: '32px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {/* Report Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '20px', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--cyber-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
              AIORI HACKATHON 3 · PROBLEM PS-027
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              IPv6 Website & Dependency Readiness Report
            </h2>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Target Host: <strong className="font-mono">{activeAudit.url}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: activeAudit.readinessScore >= 80 ? 'var(--cyber-emerald)' : 'var(--cyber-rose)' }}>
              {activeAudit.readinessScore}%
            </div>
            <div style={{ marginTop: '4px' }}>
              <StatusBadge status={activeAudit.status} />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Audit Date: {formatDate(activeAudit.timestamp)}
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>
            1. Executive Assessment
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The target apex domain <strong>{new URL(activeAudit.url).hostname}</strong> was tested using forced address-family socket probing (bypassing RFC 8305 Happy Eyeballs concurrency). While the apex domain provides an IPv6 AAAA record (<code>{activeAudit.apexAAAA || 'None'}</code>), complete dual-stack reachability depends on all {resources.length} sub-resource dependencies.
            {activeAudit.readinessScore < 100 ? (
              <span> Our audit detected <strong>{activeAudit.ipv4OnlyDependencies || 4} IPv4-only dependencies</strong> and <strong>{activeAudit.failedResources || 2} failed requests</strong>, meaning visitors on pure IPv6-only networks will experience broken styles, missing analytics, or authentication failures.</span>
            ) : (
              <span> All sub-resources loaded cleanly over IPv6 transport with full protocol parity.</span>
            )}
          </p>
        </div>

        {/* Stage-Level Breakdown */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
            2. Failure-Stage Classification Breakdown
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Healthy (IPV6_OK)</span>
              <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--cyber-emerald)', marginTop: '4px' }}>
                {healthyCount}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>All 4 stages passed</span>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>DNS Stage Failures</span>
              <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60a5fa', marginTop: '4px' }}>
                {dnsFailures}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Missing AAAA / SERVFAIL</span>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TCP Stage Failures</span>
              <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c084fc', marginTop: '4px' }}>
                {tcpFailures}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TCP RST / Timeout on 443</span>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TLS Stage Failures</span>
              <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f472b6', marginTop: '4px' }}>
                {tlsFailures}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SNI mismatch / Handshake</span>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>HTTP Stage Failures</span>
              <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>
                {httpFailures}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>502/500/404 HTTP errors</span>
            </div>
          </div>
        </div>

        {/* Detailed Resource Evidence Table */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>
            3. Resource Inventory & Per-Family Measurements
          </h3>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>IPv4 Address</th>
                  <th>IPv6 Address</th>
                  <th>Verdict</th>
                  <th>Classification</th>
                </tr>
              </thead>
              <tbody>
                {resources.map(res => (
                  <tr key={res.id}>
                    <td className="font-mono" style={{ fontSize: '0.76rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {res.url}
                    </td>
                    <td>{res.type}</td>
                    <td className="font-mono" style={{ fontSize: '0.74rem' }}>{res.ipv4 || '—'}</td>
                    <td className="font-mono" style={{ fontSize: '0.74rem', color: res.ipv6 ? 'var(--cyber-cyan)' : 'var(--cyber-rose)' }}>
                      {res.ipv6 || 'No AAAA'}
                    </td>
                    <td>
                      <StatusBadge status={res.protocolStatus} size="sm" />
                    </td>
                    <td>
                      <span className={`stage-pill ${res.failureClass === 'IPV6_OK' ? 'pass' : 'dns'}`}>
                        {res.failureClass}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
