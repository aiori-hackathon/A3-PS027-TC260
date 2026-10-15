import React, { useState } from 'react';
import { Globe, Play, XCircle, Timer, AlertCircle, Sparkles } from 'lucide-react';
import { useAuditContext } from '../../context/AuditContext';

export default function ScanForm({ onScanStarted }) {
  const { isScanning, runAuditScan, cancelScan, addToast } = useAuditContext();

  const [url, setUrl] = useState('https://nic.in');
  const [mode, setMode] = useState('both');
  const [timeout, setTimeoutVal] = useState('15');
  const [error, setError] = useState('');

  const quickPresets = [
    { label: 'nic.in (Indian Gov)', url: 'https://nic.in', mode: 'both' },
    { label: 'google.com (Global Tech)', url: 'https://google.com', mode: 'both' },
    { label: 'github.com (IPv4-only Apex)', url: 'https://github.com', mode: 'both' },
    { label: 'cnn.com (3rd-party Heavy)', url: 'https://cnn.com', mode: 'both' },
    { label: 'v4only.test.local (Seeded Fault)', url: 'https://v4only.test.local', mode: 'ipv6' },
    { label: 'badtls.test.local (Seeded Fault)', url: 'https://badtls.test.local', mode: 'ipv6' }
  ];

  const validateUrl = (value) => {
    if (!value || value.trim() === '') {
      return 'Target website URL is required';
    }
    try {
      const parsed = new URL(value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`);
      if (!parsed.hostname.includes('.')) {
        return 'Please enter a valid hostname or fully qualified domain name';
      }
      return '';
    } catch {
      return 'Please enter a valid URL (e.g. https://example.com)';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
      setUrl(targetUrl);
    }

    const err = validateUrl(targetUrl);
    if (err) {
      setError(err);
      return;
    }
    setError('');

    try {
      if (onScanStarted) onScanStarted();
      await runAuditScan({ url: targetUrl, mode, timeout: Number(timeout) });
    } catch (err) {
      // Handled in context
    }
  };

  return (
    <div className="card" style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Globe size={18} color="var(--cyber-cyan)" />
            Configure Target Audit
          </h2>
          <p className="card-subtitle">
            Initiate isolated Happy-Eyeballs-bypassing probe across sub-resource dependencies.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Target URL */}
        <div className="form-group">
          <label className="form-label">
            Target Website URL
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Supports HTTPS & HTTP
            </span>
          </label>
          <div className="input-icon-wrapper">
            <Globe className="field-icon" size={16} />
            <input
              type="text"
              className="input-field"
              placeholder="https://example.gov.in"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError('');
              }}
              disabled={isScanning}
            />
          </div>
          {error && (
            <div className="form-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={13} color="var(--cyber-cyan)" /> Quick Benchmarks & Controlled Fault Presets:
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {quickPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={isScanning}
                onClick={() => {
                  setUrl(preset.url);
                  setMode(preset.mode);
                  setError('');
                }}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scan Parameters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Test Mode</label>
            <select
              className="select-field"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={isScanning}
            >
              <option value="both">Dual-Stack Baseline (v4 + v6 forced)</option>
              <option value="ipv6">IPv6-Only (Strict reachability)</option>
              <option value="ipv4">IPv4-Only (Control baseline)</option>
            </select>
            <span className="form-hint">RFC 8305 per-family socket isolation</span>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Timer size={14} /> Probe Timeout (seconds)
              </span>
            </label>
            <select
              className="select-field"
              value={timeout}
              onChange={(e) => setTimeoutVal(e.target.value)}
              disabled={isScanning}
            >
              <option value="10">10 seconds (Fast)</option>
              <option value="15">15 seconds (Standard)</option>
              <option value="30">30 seconds (Deep crawl)</option>
              <option value="60">60 seconds (Heavy third-party)</option>
            </select>
            <span className="form-hint">Socket connect and CDP capture window</span>
          </div>
        </div>

        {/* Submit / Cancel Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          {isScanning && (
            <button
              type="button"
              onClick={cancelScan}
              className="btn btn-danger"
            >
              <XCircle size={16} />
              <span>Cancel Audit</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isScanning}
            className="btn btn-primary btn-lg"
          >
            <Play size={16} fill="currentColor" />
            <span>{isScanning ? 'Probing Target...' : 'Start IPv6 Readiness Audit'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
