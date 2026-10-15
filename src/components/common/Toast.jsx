import React from 'react';
import { useAuditContext } from '../../context/AuditContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = useAuditContext();

  if (!toasts || toasts.length === 0) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--cyber-emerald)" />;
      case 'error':
        return <AlertCircle size={18} color="var(--cyber-rose)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--cyber-amber)" />;
      default:
        return <Info size={18} color="var(--cyber-cyan)" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <div style={{ flexShrink: 0, marginTop: 1 }}>{getIcon(toast.type)}</div>
          <div style={{ flex: 1, fontSize: '0.84rem' }}>{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            style={{ background: 'none', color: 'var(--text-muted)', padding: 0 }}
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
