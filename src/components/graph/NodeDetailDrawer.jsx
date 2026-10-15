import React from 'react';
import { X, Globe, ShieldAlert, Cpu, Clock, HardDrive, Terminal, CheckCircle2, XCircle } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function NodeDetailDrawer({ resource, isOpen, onClose }) {
  if (!isOpen || !resource) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="side-drawer">
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} color="var(--cyber-cyan)" />
            <h3 className="card-title" style={{ margin: 0 }}>Resource Inspector</h3>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Target URL */}
          <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Resource URL
            </div>
            <div className="font-mono" style={{ fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--text-main)', fontWeight: 600 }}>
              {resource.url || resource.label}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>
                {resource.type}
              </span>
              <StatusBadge status={resource.protocolStatus || resource.protocol} />
            </div>
          </div>

          {/* Network Address Families */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>IPv4 Address</span>
              <div className="font-mono" style={{ fontSize: '0.82rem', marginTop: '4px', color: resource.ipv4 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {resource.ipv4 || 'None'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>IPv6 Address</span>
              <div className="font-mono" style={{ fontSize: '0.82rem', marginTop: '4px', color: resource.ipv6 ? 'var(--cyber-cyan)' : 'var(--cyber-rose)' }}>
                {resource.ipv6 || 'No AAAA record'}
              </div>
            </div>
          </div>

          {/* Failure Stage & Taxonomy Verdict */}
          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Failure Taxonomy Verdict
              </span>
              <span className={`stage-pill ${resource.failureClass === 'IPV6_OK' ? 'pass' : 'dns'}`}>
                {resource.failureClass}
              </span>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginBottom: '8px' }}>
              First Failing Stage: <strong>{resource.firstFailingStage || (resource.failureClass === 'IPV6_OK' ? 'None (Healthy)' : 'Classified')}</strong>
            </div>

            {resource.evidence && (
              <div style={{ background: '#070b12', padding: '10px 12px', borderRadius: '6px', border: '1px solid #162033', fontSize: '0.74rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {resource.evidence}
              </div>
            )}
          </div>

          {/* Timing Breakdown */}
          {resource.timing && (
            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} /> Stage Timing Breakdown (RTT)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>1. DNS Query:</span>
                  <span className="font-mono">{resource.timing.dns} ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>2. TCP Connect (v6 socket):</span>
                  <span className="font-mono">{resource.timing.tcp} ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>3. TLS Handshake:</span>
                  <span className="font-mono">{resource.timing.tls} ms</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>4. HTTP Processing & Transfer:</span>
                  <span className="font-mono">{resource.timing.http} ms</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close Inspector
          </button>
        </div>
      </aside>
    </>
  );
}
