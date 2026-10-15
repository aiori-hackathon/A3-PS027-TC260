import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, FileCode, FileText, Image as ImageIcon, Type, Server, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

function CustomResourceNode({ data, selected }) {
  const { label, type, domain, status, failureClass, protocol, isRoot, size, ttfb } = data;

  const getTypeIcon = () => {
    switch (type) {
      case 'script':
        return <FileCode size={13} color="#38bdf8" />;
      case 'stylesheet':
        return <FileText size={13} color="#c084fc" />;
      case 'image':
        return <ImageIcon size={13} color="#34d399" />;
      case 'font':
        return <Type size={13} color="#f472b6" />;
      case 'fetch':
        return <Server size={13} color="#fbbf24" />;
      default:
        return <Globe size={13} color="#38bdf8" />;
    }
  };

  const getStatusClass = () => {
    if (status === 'READY' || failureClass === 'IPV6_OK') return 'status-ready';
    if (status === 'WARNING' || failureClass?.includes('TIMEOUT')) return 'status-warning';
    return 'status-fail';
  };

  return (
    <div className={`custom-node ${getStatusClass()} ${isRoot ? 'root-node' : ''} ${selected ? 'selected' : ''}`}>
      {/* Input Handle */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: 'var(--cyber-cyan)', width: 8, height: 8 }}
        />
      )}

      <div className="custom-node-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {getTypeIcon()}
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 700 }}>
            {type}
          </span>
        </div>

        {status === 'READY' || failureClass === 'IPV6_OK' ? (
          <CheckCircle2 size={13} color="var(--cyber-emerald)" />
        ) : status === 'WARNING' ? (
          <AlertTriangle size={13} color="var(--cyber-amber)" />
        ) : (
          <XCircle size={13} color="var(--cyber-rose)" />
        )}
      </div>

      <div className="custom-node-title" title={label}>
        {label}
      </div>

      <div className="custom-node-domain" title={domain}>
        {domain}
      </div>

      <div className="custom-node-chips">
        <span className={`stage-pill ${failureClass === 'IPV6_OK' ? 'pass' : 'dns'}`} style={{ fontSize: '0.62rem' }}>
          {failureClass}
        </span>
        {ttfb && (
          <span className="font-mono" style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
            {ttfb}
          </span>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'var(--cyber-cyan)', width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(CustomResourceNode);
