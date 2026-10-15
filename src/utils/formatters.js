/**
 * Formatting and Helper Utilities
 */

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(ms) {
  if (!ms) return '0 ms';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatDate(isoString) {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function getStatusBadgeInfo(status) {
  switch (status?.toUpperCase()) {
    case 'READY':
    case 'PASS':
    case 'SUCCESS':
    case 'IPV6_OK':
      return { label: 'IPv6 Ready', type: 'success', textClass: 'text-ready' };
    case 'DEGRADED':
    case 'WARNING':
      return { label: 'Degraded', type: 'warning', textClass: 'text-warning' };
    case 'FAILED':
    case 'FAIL':
    case 'NO_AAAA':
    case 'TCP_TIMEOUT':
    case 'TCP_REFUSED':
    case 'CERT_MISMATCH':
    case 'HTTP_5XX':
      return { label: 'Failed', type: 'fail', textClass: 'text-fail' };
    case 'IPV4_ONLY':
      return { label: 'IPv4 Only', type: 'ipv4', textClass: 'text-v4' };
    case 'DUAL_STACK':
      return { label: 'Dual-Stack', type: 'info', textClass: 'text-info' };
    default:
      return { label: status || 'Unknown', type: 'muted', textClass: 'text-muted' };
  }
}

export function getStageDescription(stage) {
  switch (stage?.toUpperCase()) {
    case 'DNS':
      return 'DNS Resolution: A and AAAA record queries';
    case 'TCP':
      return 'TCP Socket Connection to port 443 over forced IPv6';
    case 'TLS':
      return 'TLS Handshake with SNI and ALPN negotiation';
    case 'HTTP':
      return 'HTTP/1.1 or HTTP/2 GET/HEAD response handling';
    default:
      return 'Full 4-Stage Probing Pipeline';
  }
}

export function downloadFile(content, fileName, contentType = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
