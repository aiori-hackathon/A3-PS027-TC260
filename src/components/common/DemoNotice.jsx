import React from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuditContext } from '../../context/AuditContext';

export default function DemoNotice({ title, message }) {
  const { backendStatus } = useAuditContext();

  if (!backendStatus.isMock) {
    return null;
  }

  return (
    <div className="demo-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Info size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>{title || 'Simulated Benchmark Dataset (PS-027)'}:</strong>{' '}
          {message || 'Operating on 30 curated benchmark sites & controlled test subdomains for hackathon evaluation. Real backend network scanner can be connected anytime.'}
        </div>
      </div>
      <Link to="/settings" className="btn btn-sm btn-outline" style={{ whiteSpace: 'nowrap' }}>
        Backend Settings <ExternalLink size={12} style={{ marginLeft: 4 }} />
      </Link>
    </div>
  );
}
