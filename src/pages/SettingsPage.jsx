import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Save,
  RotateCcw,
  Activity,
  CheckCircle2,
  XCircle,
  Wifi,
  Globe,
  Sliders,
  Shield,
  Sun,
  Moon,
  Info
} from 'lucide-react';
import { useAuditContext } from '../context/AuditContext';
import { getApiBaseUrl, checkBackendHealth } from '../services/api';
import DemoNotice from '../components/common/DemoNotice';

export default function SettingsPage() {
  const { theme, toggleTheme, backendStatus, refreshBackendHealth, addToast } = useAuditContext();

  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [defaultTimeout, setDefaultTimeout] = useState(() => localStorage.getItem('ipv6_default_timeout') || '15');
  const [forceMock, setForceMock] = useState(() => localStorage.getItem('ipv6_auditor_force_mock') === 'true');
  const [autoExportCsv, setAutoExportCsv] = useState(() => localStorage.getItem('ipv6_auto_export') === 'true');

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleSave = () => {
    localStorage.setItem('ipv6_auditor_api_base_url', apiUrl.trim());
    localStorage.setItem('ipv6_default_timeout', defaultTimeout);
    localStorage.setItem('ipv6_auditor_force_mock', forceMock ? 'true' : 'false');
    localStorage.setItem('ipv6_auto_export', autoExportCsv ? 'true' : 'false');

    refreshBackendHealth();
    addToast('Engine settings successfully saved', 'success');
  };

  const handleReset = () => {
    localStorage.removeItem('ipv6_auditor_api_base_url');
    localStorage.removeItem('ipv6_default_timeout');
    localStorage.removeItem('ipv6_auditor_force_mock');
    localStorage.removeItem('ipv6_auto_export');

    setApiUrl('http://localhost:8000');
    setDefaultTimeout('15');
    setForceMock(false);
    setAutoExportCsv(false);

    refreshBackendHealth();
    addToast('Settings reset to defaults', 'info');
  };

  const handleTestBackend = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await checkBackendHealth();
      setTestResult(res);
      if (res.online && !res.isMock) {
        addToast('Connected to live backend engine!', 'success');
      } else {
        addToast('Running in local simulated mode', 'info');
      }
    } catch (err) {
      setTestResult({ online: false, error: err.message });
      addToast('Backend connection failed', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="page-wrapper">
      <DemoNotice
        title="Auditor Engine Configuration"
        message="Configure target backend endpoints (FastAPI / Playwright CDP service) or test client browser vantage capabilities."
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Settings size={24} color="var(--cyber-cyan)" />
            Auditor Engine & API Configuration
          </h1>
          <p className="page-desc">
            Manage backend connection endpoints, probe timeouts, measurement vantage, and export defaults.
          </p>
        </div>

        <div className="page-actions">
          <button onClick={handleReset} className="btn btn-secondary">
            <RotateCcw size={14} /> Reset Defaults
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            <Save size={14} /> Save Configuration
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Card 1: Backend API Configuration */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Server size={18} color="var(--cyber-cyan)" />
                Audit Measurement Backend
              </h3>
              <p className="card-subtitle">FastAPI + Playwright CDP capture engine endpoint</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Backend API Base URL
              <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Env: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}
              </span>
            </label>
            <input
              type="text"
              className="input-field"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <span className="form-hint">
              Points to your FastAPI Python measurement daemon (e.g., http://localhost:8000 or custom host)
            </span>
          </div>

          {/* Test Connection Button */}
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleTestBackend}
              disabled={testingConnection}
              className="btn btn-secondary btn-sm"
            >
              <Activity size={14} />
              <span>{testingConnection ? 'Probing /api/health...' : 'Test Backend Connection'}</span>
            </button>

            {testResult && (
              <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {testResult.online && !testResult.isMock ? (
                  <span style={{ color: 'var(--cyber-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={14} /> Live Backend Connected
                  </span>
                ) : (
                  <span style={{ color: 'var(--cyber-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info size={14} /> Simulated Mode Active
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Mode Override Switch */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={forceMock}
                onChange={(e) => setForceMock(e.target.checked)}
              />
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Force Simulated Mode (Mock Engine)
                </span>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Disables live HTTP calls to FastAPI and uses preloaded AIORI Hackathon benchmark data.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Card 2: Probe Parameters & Timeout */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Sliders size={18} color="var(--cyber-cyan)" />
                Probe & Timeout Settings
              </h3>
              <p className="card-subtitle">Tune socket connect and dependency mapping timers</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Default Audit Timeout (seconds)</label>
            <select
              className="select-field"
              value={defaultTimeout}
              onChange={(e) => setDefaultTimeout(e.target.value)}
            >
              <option value="10">10 seconds (Quick audit)</option>
              <option value="15">15 seconds (Standard / recommended)</option>
              <option value="30">30 seconds (Large websites with rich media)</option>
              <option value="60">60 seconds (Heavy single page applications)</option>
            </select>
            <span className="form-hint">
              Socket connection timer will terminate stalled IPv6 SYN packets after this limit.
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Theme Appearance</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={toggleTheme}
                className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Moon size={14} /> Dark Cyber Navy
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className={`btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Sun size={14} /> Light Engineering
              </button>
            </div>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoExportCsv}
                onChange={(e) => setAutoExportCsv(e.target.checked)}
              />
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Auto-download CSV on Audit Completion
                </span>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Automatically triggers file download when a scan finishes.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Card 3: Client Measurement Context */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Globe size={18} color="var(--cyber-cyan)" />
                Auditor Measurement Vantage Context
              </h3>
              <p className="card-subtitle">Client host environment inspection and protocol capability</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operating System / Shell</span>
              <div className="font-mono" style={{ fontSize: '0.84rem', marginTop: '4px', color: 'var(--text-main)', fontWeight: 600 }}>
                {navigator.platform || 'Windows / Web Standard'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Browser User-Agent</span>
              <div className="font-mono" style={{ fontSize: '0.74rem', marginTop: '4px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {navigator.userAgent}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vantage Network Mode</span>
              <div className="font-mono" style={{ fontSize: '0.84rem', marginTop: '4px', color: 'var(--cyber-cyan)', fontWeight: 600 }}>
                Dual-Stack (IPv4 / IPv6 Forced Probes)
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audit Standard Reference</span>
              <div className="font-mono" style={{ fontSize: '0.84rem', marginTop: '4px', color: 'var(--text-main)', fontWeight: 600 }}>
                IETF RFC 8305 / RFC 8200 / CDP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
