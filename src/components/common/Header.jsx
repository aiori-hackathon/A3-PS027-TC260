import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sun,
  Moon,
  Activity,
  PlusCircle,
  Server,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAuditContext } from '../../context/AuditContext';

export default function Header() {
  const { theme, toggleTheme, backendStatus, activeAudit, audits, setActiveAudit } = useAuditContext();
  const location = useLocation();

  const getPageTitle = (path) => {
    switch (path) {
      case '/':
        return { title: 'Network Health & Readiness Dashboard', sub: 'Auditing 30 Real-World Benchmarks & Dual-Stack Parity' };
      case '/scanner':
        return { title: 'Target Website Scanner', sub: 'Isolated 4-Stage Probing (DNS, TCP, TLS, HTTP) with CDP Trace' };
      case '/results':
        return { title: 'Audit Deep Dive & Resource Verdicts', sub: activeAudit ? `${activeAudit.url} (Score: ${activeAudit.readinessScore}%)` : 'Resource Verdicts' };
      case '/graph':
        return { title: 'Sub-Resource Dependency Graph', sub: 'Interactive Flow: Visualizing Bottlenecks & IPv4-Only Initiators' };
      case '/failures':
        return { title: 'Failure Taxonomy & Evidence Diagnostics', sub: 'Separating DNS, TCP, TLS, and HTTP Failure Modes' };
      case '/comparison':
        return { title: 'Multi-Site Parity Comparison', sub: 'Benchmarking Global, Indian Gov, & Commercial Targets' };
      case '/reports':
        return { title: 'Audit Reports & Data Export', sub: 'Download Standard CSV/JSON Evidence Packages' };
      case '/test-site':
        return { title: 'Controlled Test Environment Ground-Truth', sub: 'Validating Classifier Accuracy Against 6 Seeded Fault Subdomains' };
      case '/settings':
        return { title: 'Engine Configuration & Vantage Settings', sub: 'API Endpoints, Scan Timeout & Probe Parameters' };
      default:
        return { title: 'IPv6 Readiness Auditor', sub: 'PS-027 Network Diagnostics' };
    }
  };

  const currentMeta = getPageTitle(location.pathname);

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-title-group">
          <h1 className="header-title">
            {currentMeta.title}
          </h1>
          <span className="header-subtitle">{currentMeta.sub}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Active Audit Quick Selector if on results, graph, or failures */}
        {['/results', '/graph', '/failures', '/reports'].includes(location.pathname) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Target:</span>
            <select
              value={activeAudit?.id || ''}
              onChange={(e) => {
                const found = audits.find(a => a.id === e.target.value);
                if (found) setActiveAudit(found);
              }}
              className="select-field"
              style={{ padding: '4px 8px', fontSize: '0.76rem', minWidth: '160px' }}
            >
              {audits.map(a => (
                <option key={a.id} value={a.id}>
                  {a.url.replace(/^https?:\/\//, '')} ({a.readinessScore}%)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Backend Status Live Pill */}
        <div className="system-status-pill" title={backendStatus.message}>
          <span
            className={`status-dot ${backendStatus.isMock ? 'simulated' : 'pulsing'}`}
          />
          <span>{backendStatus.isMock ? 'Simulated Engine' : 'Backend Online'}</span>
        </div>

        {/* Quick Scan Action */}
        <Link to="/scanner" className="btn btn-primary btn-sm">
          <PlusCircle size={14} />
          <span>New Audit</span>
        </Link>

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
