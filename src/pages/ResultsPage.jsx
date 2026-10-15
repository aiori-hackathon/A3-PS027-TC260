import React, { useState, useEffect } from 'react';
import { useAuditContext } from '../context/AuditContext';
import { getAuditResources } from '../services/api';
import DiagnosticChecklist from '../components/results/DiagnosticChecklist';
import ResourceTable from '../components/results/ResourceTable';
import ExportButtons from '../components/common/ExportButtons';
import StatusBadge from '../components/common/StatusBadge';
import DemoNotice from '../components/common/DemoNotice';
import NodeDetailDrawer from '../components/graph/NodeDetailDrawer';
import { Globe, Calendar, Clock, Layers, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { Link } from 'react-router-dom';

export default function ResultsPage() {
  const { activeAudit, audits } = useAuditContext();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectedResource, setInspectedResource] = useState(null);

  useEffect(() => {
    async function fetchRes() {
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
    fetchRes();
  }, [activeAudit]);

  if (!activeAudit) {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Globe size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3>No Audit Selected</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Run a new audit from the scanner or select an audit from history.
          </p>
          <div style={{ marginTop: '20px' }}>
            <Link to="/scanner" className="btn btn-primary">
              Run New Scan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const successCount = resources.filter(r => r.failureClass === 'IPV6_OK').length;
  const failureCount = resources.filter(r => r.failureClass !== 'IPV6_OK').length;
  const ipv4OnlyCount = resources.filter(r => r.protocolStatus === 'IPV4_ONLY').length;

  return (
    <div className="page-wrapper">
      <DemoNotice
        title="Audit Results & Protocol Breakdown"
        message={`Displaying CDP capture and isolated probe measurements for ${activeAudit.url}.`}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-muted font-mono">{activeAudit.category || 'Website'}</span>
            <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Tested: {formatDate(activeAudit.timestamp)}
            </span>
          </div>
          <h1 className="page-title">
            <Globe size={24} color="var(--cyber-cyan)" />
            {activeAudit.url}
          </h1>
          <p className="page-desc">
            Complete diagnostic verdict separating DNS, TCP, TLS, and HTTP response layers.
          </p>
        </div>

        <div className="page-actions">
          <Link to="/graph" className="btn btn-secondary">
            View Dependency Graph <ArrowRight size={14} />
          </Link>
          <ExportButtons auditId={activeAudit.id} domain={new URL(activeAudit.url).hostname} />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Readiness Score
          </span>
          <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: activeAudit.readinessScore >= 80 ? 'var(--cyber-emerald)' : 'var(--cyber-amber)', marginTop: '4px' }}>
            {activeAudit.readinessScore}%
          </div>
          <div style={{ marginTop: '6px' }}>
            <StatusBadge status={activeAudit.status} size="sm" />
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Total Sub-Resources
          </span>
          <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {resources.length}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            CDP Network Trace
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            IPv6 Verified (OK)
          </span>
          <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cyber-emerald)', marginTop: '4px' }}>
            {successCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--cyber-emerald)' }}>
            Full Dual-Stack Parity
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            IPv4-Only Dependencies
          </span>
          <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cyber-amber)', marginTop: '4px' }}>
            {ipv4OnlyCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--cyber-amber)' }}>
            Missing AAAA Records
          </span>
        </div>

        <div className="card" style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Failed on IPv6
          </span>
          <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cyber-rose)', marginTop: '4px' }}>
            {failureCount}
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--cyber-rose)' }}>
            TCP RST / TLS Mismatch
          </span>
        </div>
      </div>

      {/* 4-Stage Apex Checklist */}
      <DiagnosticChecklist audit={activeAudit} />

      {/* Sub-resource Table */}
      <ResourceTable
        resources={resources}
        onSelectResource={(res) => setInspectedResource(res)}
      />

      {/* Side Detail Drawer for Inspected Resource */}
      <NodeDetailDrawer
        resource={inspectedResource}
        isOpen={!!inspectedResource}
        onClose={() => setInspectedResource(null)}
      />
    </div>
  );
}
