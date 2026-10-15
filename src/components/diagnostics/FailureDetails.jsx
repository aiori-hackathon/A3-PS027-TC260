import React, { useState } from 'react';
import {
  ShieldAlert,
  Globe,
  Wifi,
  Lock,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  AlertOctagon,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';
import { useAuditContext } from '../../context/AuditContext';

export default function FailureDetails({ failures = [] }) {
  const { addToast } = useAuditContext();
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);

  const categories = [
    { key: 'ALL', label: 'All Failure Modes', count: failures.length },
    { key: 'DNS', label: 'DNS Resolution', count: failures.filter(f => f.stage === 'DNS').length, icon: Globe },
    { key: 'TCP', label: 'TCP Connection', count: failures.filter(f => f.stage === 'TCP').length, icon: Wifi },
    { key: 'TLS', label: 'TLS Handshake', count: failures.filter(f => f.stage === 'TLS').length, icon: Lock },
    { key: 'HTTP', label: 'HTTP Retrieval', count: failures.filter(f => f.stage === 'HTTP').length, icon: ArrowDownRight },
    { key: 'TIMEOUT', label: 'Timeouts', count: failures.filter(f => f.failureClass?.includes('TIMEOUT')).length, icon: Clock },
    { key: 'SECURITY', label: 'CORS / Security', count: failures.filter(f => f.stage === 'SECURITY').length, icon: AlertOctagon }
  ];

  const filteredFailures = failures.filter(f => {
    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'TIMEOUT') return f.failureClass?.includes('TIMEOUT');
    return f.stage === activeCategory;
  });

  const handleCopyEvidence = (id, evidence) => {
    navigator.clipboard.writeText(evidence);
    setCopiedId(id);
    addToast('Diagnostic evidence copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`btn btn-sm ${activeCategory === cat.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {Icon && <Icon size={13} />}
              <span>{cat.label}</span>
              <span className="badge badge-muted" style={{ padding: '1px 5px', fontSize: '0.68rem' }}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Failure Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredFailures.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
            <ShieldCheck size={36} color="var(--cyber-emerald)" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              No Failures in This Category
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              All audited resources passed validation for the selected stage.
            </p>
          </div>
        ) : (
          filteredFailures.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                borderLeft: '4px solid var(--cyber-rose)',
                padding: '18px 20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className={`stage-pill ${item.stage.toLowerCase()}`}>
                      Stage: {item.stage}
                    </span>
                    <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cyber-rose)' }}>
                      {item.failureClass}
                    </span>
                    <span className="badge badge-ipv6">IPv6 Probe Failure</span>
                  </div>

                  <div className="font-mono" style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                    {item.url}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {item.description}
                  </p>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.timestamp || 'Recorded during audit'}
                  </span>
                  <button
                    onClick={() => handleCopyEvidence(item.id, item.evidence)}
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                  >
                    {copiedId === item.id ? <Check size={12} color="var(--cyber-emerald)" /> : <Copy size={12} />}
                    <span>{copiedId === item.id ? 'Copied' : 'Copy Evidence'}</span>
                  </button>
                </div>
              </div>

              {/* Diagnostic Evidence Box */}
              <div
                style={{
                  marginTop: '14px',
                  background: '#070b12',
                  border: '1px solid #162033',
                  borderRadius: '6px',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                    Diagnostic Evidence (Network Socket / CDP Trace)
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--cyber-cyan)', fontFamily: 'var(--font-mono)' }}>
                    Standard: RFC 8305 / Forced v6
                  </span>
                </div>
                <div className="font-mono" style={{ fontSize: '0.76rem', color: '#38bdf8', lineHeight: 1.5 }}>
                  {item.evidence}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
