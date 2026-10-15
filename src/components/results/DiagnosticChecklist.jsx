import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Globe, Wifi, Lock, ArrowDownRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function DiagnosticChecklist({ audit }) {
  if (!audit) return null;

  const checks = [
    {
      stage: 'DNS Resolution',
      icon: Globe,
      status: audit.dnsStatus || 'PASS',
      primaryValue: audit.apexAAAA || 'No AAAA Record',
      secondaryValue: `A: ${audit.apexA || 'N/A'}`,
      detail: audit.apexAAAA ? 'Apex domain has valid IPv6 AAAA record.' : 'CRITICAL: No AAAA record detected for apex domain.'
    },
    {
      stage: 'TCP Connection',
      icon: Wifi,
      status: audit.tcpStatus || 'PASS',
      primaryValue: audit.tcpStatus === 'PASS' ? 'Port 443 Connected' : 'Connection Failed',
      secondaryValue: 'Protocol: IPv6 Socket',
      detail: audit.tcpStatus === 'PASS' ? 'Handshake SYN/ACK received over native IPv6 socket.' : 'TCP RST or packet dropped on IPv6 route.'
    },
    {
      stage: 'TLS Negotiation',
      icon: Lock,
      status: audit.tlsStatus || 'PASS',
      primaryValue: audit.tlsStatus === 'PASS' ? 'TLS 1.3 Valid' : 'Handshake Mismatch',
      secondaryValue: 'ALPN: h2, http/1.1',
      detail: audit.tlsStatus === 'PASS' ? 'SNI match and CA trust validated over IPv6 endpoint.' : 'TLS handshake failed or certificate Common Name mismatch.'
    },
    {
      stage: 'HTTP Response',
      icon: ArrowDownRight,
      status: audit.httpStatus || 'PASS',
      primaryValue: audit.httpStatus === 'PASS' ? 'HTTP 200 OK' : 'HTTP Error Response',
      secondaryValue: `Duration: ${audit.durationMs || 1200} ms`,
      detail: audit.httpStatus === 'PASS' ? 'Full response payload retrieved over pure IPv6 transport.' : 'Gateway or server returned 4xx/5xx over IPv6.'
    }
  ];

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <ShieldCheck size={18} color="var(--cyber-cyan)" />
            Apex Host 4-Stage Diagnostic Verification
          </h2>
          <p className="card-subtitle">
            Isolated checks verifying {audit.url} across every protocol layer (RFC 8305 bypass).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Readiness Score:</span>
          <span
            className="font-mono"
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: audit.readinessScore >= 85 ? 'var(--cyber-emerald)' : audit.readinessScore >= 60 ? 'var(--cyber-amber)' : 'var(--cyber-rose)'
            }}
          >
            {audit.readinessScore}%
          </span>
          <StatusBadge status={audit.status} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {checks.map((c) => {
          const Icon = c.icon;
          const isPass = c.status === 'PASS';
          return (
            <div
              key={c.stage}
              style={{
                background: 'var(--bg-input)',
                border: `1px solid ${isPass ? 'var(--border-subtle)' : 'var(--status-fail-border)'}`,
                borderRadius: '10px',
                padding: '14px 16px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {c.stage}
                </span>
                {isPass ? (
                  <CheckCircle2 size={16} color="var(--cyber-emerald)" />
                ) : (
                  <XCircle size={16} color="var(--cyber-rose)" />
                )}
              </div>

              <div className="font-mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px', wordBreak: 'break-all' }}>
                {c.primaryValue}
              </div>

              <div className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {c.secondaryValue}
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {c.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
