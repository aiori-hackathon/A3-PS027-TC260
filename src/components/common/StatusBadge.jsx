import React from 'react';
import { getStatusBadgeInfo } from '../../utils/formatters';
import { CheckCircle2, AlertTriangle, XCircle, Globe, ShieldAlert, Clock } from 'lucide-react';

export default function StatusBadge({ status, customLabel, size = 'md' }) {
  const info = getStatusBadgeInfo(status);
  const label = customLabel || info.label;

  const renderIcon = () => {
    switch (info.type) {
      case 'success':
        return <CheckCircle2 size={13} />;
      case 'warning':
        return <AlertTriangle size={13} />;
      case 'fail':
        return <XCircle size={13} />;
      case 'ipv4':
        return <Globe size={13} />;
      case 'info':
        return <Globe size={13} />;
      default:
        return <Clock size={13} />;
    }
  };

  return (
    <span className={`badge badge-${info.type} ${size === 'sm' ? 'badge-sm' : ''}`}>
      {renderIcon()}
      <span>{label}</span>
    </span>
  );
}
