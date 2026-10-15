import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  FileCode,
  FileText,
  Image as ImageIcon,
  Type as TypeIcon,
  Server
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatBytes } from '../../utils/formatters';

export default function ResourceTable({ resources = [], onSelectResource }) {
  const [search, setSearch] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');

  // Sorting
  const [sortField, setSortField] = useState('url');
  const [sortAsc, setSortAsc] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      // Search
      const matchesSearch =
        !search ||
        res.url.toLowerCase().includes(search.toLowerCase()) ||
        res.domain.toLowerCase().includes(search.toLowerCase());

      // Protocol
      const matchesProtocol =
        protocolFilter === 'ALL' || res.protocolStatus === protocolFilter;

      // Type
      const matchesType =
        typeFilter === 'ALL' || res.type.toLowerCase() === typeFilter.toLowerCase();

      // Stage
      const matchesStage =
        stageFilter === 'ALL' ||
        (stageFilter === 'NONE' && !res.firstFailingStage) ||
        res.firstFailingStage === stageFilter;

      return matchesSearch && matchesProtocol && matchesType && matchesStage;
    });
  }, [resources, search, protocolFilter, typeFilter, stageFilter]);

  const sortedResources = useMemo(() => {
    return [...filteredResources].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredResources, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedResources.length / pageSize) || 1;
  const paginatedResources = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedResources.slice(start, start + pageSize);
  }, [sortedResources, page, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'script':
        return <FileCode size={14} color="#38bdf8" />;
      case 'stylesheet':
        return <FileText size={14} color="#c084fc" />;
      case 'image':
        return <ImageIcon size={14} color="#34d399" />;
      case 'font':
        return <TypeIcon size={14} color="#f472b6" />;
      case 'fetch':
      case 'api':
        return <Server size={14} color="#fbbf24" />;
      default:
        return <Globe size={14} color="#94a3b8" />;
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Discovered Sub-Resource Dependencies ({resources.length})</h3>
          <p className="card-subtitle">
            Every loaded script, stylesheet, font, and API isolated across IPv4 & IPv6 transport.
          </p>
        </div>
      </div>

      {/* Toolbar & Filter Controls */}
      <div className="table-toolbar">
        {/* Search */}
        <div className="input-icon-wrapper" style={{ minWidth: '240px', flex: 1 }}>
          <Search className="field-icon" size={14} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by URL or hostname..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Protocol filter */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="select-field"
            value={protocolFilter}
            onChange={(e) => {
              setProtocolFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="ALL">Protocol: All</option>
            <option value="DUAL_STACK">Dual-Stack</option>
            <option value="IPV4_ONLY">IPv4-Only</option>
            <option value="DEGRADED">Degraded / Broken</option>
          </select>

          {/* Type filter */}
          <select
            className="select-field"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="ALL">Type: All</option>
            <option value="script">Script (JS)</option>
            <option value="stylesheet">Styles (CSS)</option>
            <option value="image">Image</option>
            <option value="font">Font</option>
            <option value="fetch">Fetch / API</option>
            <option value="html">Document</option>
          </select>

          {/* Stage filter */}
          <select
            className="select-field"
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="ALL">Failing Stage: All</option>
            <option value="NONE">None (Passed)</option>
            <option value="DNS">DNS (NO_AAAA)</option>
            <option value="TCP">TCP Connection</option>
            <option value="TLS">TLS Negotiation</option>
            <option value="HTTP">HTTP (4xx/5xx)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort('url')}>
                Resource / URL {sortField === 'url' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
              </th>
              <th className="sortable" onClick={() => handleSort('type')}>
                Type {sortField === 'type' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
              </th>
              <th>IPv4</th>
              <th>IPv6</th>
              <th className="sortable" onClick={() => handleSort('protocolStatus')}>
                Protocol Verdict {sortField === 'protocolStatus' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
              </th>
              <th className="sortable" onClick={() => handleSort('firstFailingStage')}>
                First Failing Stage {sortField === 'firstFailingStage' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
              </th>
              <th className="sortable" onClick={() => handleSort('ttfbMs')}>
                TTFB {sortField === 'ttfbMs' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedResources.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No resources match the selected filters.
                </td>
              </tr>
            ) : (
              paginatedResources.map((res) => {
                const isPassing = res.failureClass === 'IPV6_OK';
                return (
                  <tr key={res.id}>
                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-main)'
                          }}
                          title={res.url}
                        >
                          {res.url.replace(/^https?:\/\//, '')}
                        </span>
                        <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {res.domain}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textTransform: 'capitalize' }}>
                        {getTypeIcon(res.type)}
                        {res.type}
                      </span>
                    </td>

                    <td className="font-mono" style={{ fontSize: '0.75rem', color: res.ipv4 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {res.ipv4 || '—'}
                    </td>

                    <td className="font-mono" style={{ fontSize: '0.74rem', color: res.ipv6 ? 'var(--cyber-cyan)' : 'var(--cyber-rose)' }}>
                      {res.ipv6 || <span style={{ color: 'var(--cyber-rose)' }}>None</span>}
                    </td>

                    <td>
                      <StatusBadge status={res.protocolStatus} />
                    </td>

                    <td>
                      {res.firstFailingStage ? (
                        <span className={`stage-pill ${res.firstFailingStage.toLowerCase()}`}>
                          {res.firstFailingStage}: {res.failureClass}
                        </span>
                      ) : (
                        <span className="stage-pill pass">ALL PASSED</span>
                      )}
                    </td>

                    <td className="font-mono" style={{ fontSize: '0.76rem' }}>
                      {res.ttfbMs > 0 ? `${res.ttfbMs} ms` : '—'}
                    </td>

                    <td>
                      <button
                        onClick={() => onSelectResource && onSelectResource(res)}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="table-pagination">
        <div>
          Showing {paginatedResources.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(page * pageSize, sortedResources.length)} of {sortedResources.length} entries
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-sm btn-secondary"
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="btn btn-sm btn-secondary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
