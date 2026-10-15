import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine, ArrowRight, ShieldCheck, FileCheck2, Network, ShieldAlert } from 'lucide-react';
import ScanForm from '../components/scanner/ScanForm';
import AuditProgress from '../components/scanner/AuditProgress';
import DemoNotice from '../components/common/DemoNotice';
import { useAuditContext } from '../context/AuditContext';

export default function ScannerPage() {
  const { isScanning, scanProgress, activeAudit } = useAuditContext();
  const progressSectionRef = useRef(null);

  const handleScanStarted = () => {
    setTimeout(() => {
      progressSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="page-wrapper">
      <DemoNotice
        title="Probing Engine Vantage"
        message="Running isolated socket queries with Happy Eyeballs disabled. When backend server is offline, the client simulates realistic CDP crawls and taxonomy verdicts."
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ScanLine size={24} color="var(--cyber-cyan)" />
            Network Audit Scanner
          </h1>
          <p className="page-desc">
            Enter any public website URL to crawl its complete sub-resource dependency tree and test DNS, TCP, TLS, and HTTP reachability over native IPv6 and IPv4.
          </p>
        </div>
      </div>

      {/* Main Scan Form */}
      <ScanForm onScanStarted={handleScanStarted} />

      {/* Audit Progress & Real-time Console */}
      <div ref={progressSectionRef}>
        <AuditProgress />
      </div>

      {/* Quick Jump to Results if scan just completed */}
      {!isScanning && scanProgress.stage === 'COMPLETED' && activeAudit && (
        <div
          className="card"
          style={{
            maxWidth: '820px',
            margin: '20px auto 0 auto',
            border: '1px solid var(--status-ready-border)',
            background: 'var(--status-ready-bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={24} color="var(--cyber-emerald)" />
              <div>
                <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.96rem' }}>
                  Audit Ready for {activeAudit.url}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Readiness Score: <strong className="font-mono">{activeAudit.readinessScore}%</strong> — {activeAudit.ipv6ReadyResources} of {activeAudit.totalResources} resources verified.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Link to="/results" className="btn btn-sm btn-primary">
                <FileCheck2 size={14} /> View Results
              </Link>
              <Link to="/graph" className="btn btn-sm btn-secondary">
                <Network size={14} /> Dependency Graph
              </Link>
              <Link to="/failures" className="btn btn-sm btn-outline">
                <ShieldAlert size={14} /> Failure Trace
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
