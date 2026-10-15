import React, { useRef, useEffect } from 'react';
import { useAuditContext } from '../../context/AuditContext';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Terminal, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AuditProgress() {
  const { isScanning, scanProgress, cancelScan } = useAuditContext();
  const logContainerRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [scanProgress.logs]);

  if (!isScanning && scanProgress.stage === 'IDLE') {
    return null;
  }

  const stages = [
    { key: 'DNS', name: '1. DNS', desc: 'A & AAAA queries' },
    { key: 'TCP', name: '2. TCP', desc: 'Port 443 IPv6 socket' },
    { key: 'TLS', name: '3. TLS', desc: 'SNI & ALPN check' },
    { key: 'MAPPING', name: '4. HTTP & Graph', desc: 'Sub-resource mapping' }
  ];

  const getStageStatus = (stageKey) => {
    const stageOrder = ['DNS', 'TCP', 'TLS', 'MAPPING', 'COMPLETED'];
    const currentIndex = stageOrder.indexOf(scanProgress.stage);
    const targetIndex = stageOrder.indexOf(stageKey);

    if (scanProgress.stage === 'FAILED' || scanProgress.stage === 'CANCELLED') {
      if (currentIndex === targetIndex) return 'failed';
      return 'idle';
    }

    if (scanProgress.stage === 'COMPLETED' || targetIndex < currentIndex) {
      return 'success';
    }
    if (targetIndex === currentIndex) {
      return 'active';
    }
    return 'idle';
  };

  return (
    <div className="card" style={{ maxWidth: '820px', margin: '24px auto 0 auto' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isScanning ? (
            <Loader2 className="animate-spin" size={20} color="var(--cyber-cyan)" />
          ) : scanProgress.stage === 'COMPLETED' ? (
            <ShieldCheck size={20} color="var(--cyber-emerald)" />
          ) : (
            <XCircle size={20} color="var(--cyber-rose)" />
          )}
          <div>
            <h3 className="card-title">
              {isScanning ? 'Audit in Progress' : scanProgress.stage === 'COMPLETED' ? 'Audit Complete' : 'Audit Stopped'}
            </h3>
            <p className="card-subtitle">{scanProgress.message}</p>
          </div>
        </div>

        {isScanning && (
          <button onClick={cancelScan} className="btn btn-sm btn-danger">
            Cancel Scan
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
          <span>Overall Pipeline Progress</span>
          <span className="font-mono">{scanProgress.progress}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${scanProgress.progress}%`,
              background: scanProgress.stage === 'FAILED' || scanProgress.stage === 'CANCELLED'
                ? 'var(--cyber-rose)'
                : 'linear-gradient(90deg, var(--cyber-cyan), var(--cyber-blue))',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>

      {/* 4-Stage Visual Timeline */}
      <div className="pipeline-flow" style={{ margin: '0 0 20px 0', background: 'var(--bg-input)' }}>
        {stages.map((st, index) => {
          const status = getStageStatus(st.key);
          return (
            <React.Fragment key={st.key}>
              <div className={`pipeline-step ${status}`}>
                <div className="step-circle">
                  {status === 'success' ? (
                    <CheckCircle2 size={18} color="var(--cyber-emerald)" />
                  ) : status === 'active' ? (
                    <Loader2 size={16} className="animate-spin" color="var(--cyber-cyan)" />
                  ) : status === 'failed' ? (
                    <XCircle size={18} color="var(--cyber-rose)" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="step-info">
                  <span className="step-name">{st.name}</span>
                  <span className="step-desc">{st.desc}</span>
                </div>
              </div>
              {index < stages.length - 1 && (
                <ArrowRight size={16} className="pipeline-arrow" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Real-time Diagnostics Terminal Console */}
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', background: '#070b12', overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: '#0c121f', borderBottom: '1px solid #162033', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
          <Terminal size={14} color="var(--cyber-cyan)" />
          <span className="font-mono">Live Measurement Engine Diagnostics (CDP & Socket Stream)</span>
        </div>
        <div
          ref={logContainerRef}
          style={{
            height: '140px',
            overflowY: 'auto',
            padding: '10px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.74rem',
            lineHeight: 1.6,
            color: '#a5b4fc',
            background: '#070b12'
          }}
        >
          {scanProgress.logs.map((log, idx) => {
            const isError = log.includes('[ERROR]') || log.includes('[WARN]');
            const isSuccess = log.includes('[SUCCESS]');
            const isProbe = log.includes('[PROBE');
            return (
              <div
                key={idx}
                style={{
                  color: isError ? '#f43f5e' : isSuccess ? '#34d399' : isProbe ? '#38bdf8' : '#94a3b8'
                }}
              >
                {log}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
