import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 24px' }}>
        <AlertCircle size={48} color="var(--cyber-rose)" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>404 - Page Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '0.88rem' }}>
          The requested diagnostics view or endpoint does not exist on this auditor console.
        </p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">
            <Home size={15} /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
