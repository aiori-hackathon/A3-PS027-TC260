import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Clock,
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import DemoNotice from '../components/common/DemoNotice';
import { useAuditContext } from '../context/AuditContext';
import { formatDuration } from '../utils/formatters';
import { Link } from 'react-router-dom';

export default function ComparisonPage() {
  const { audits, setActiveAudit } = useAuditContext();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sorting
  const [sortField, setSortField] = useState('readinessScore');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Multi-site selection for direct side-by-side comparison
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      const matchSearch =
        !search || a.url.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        categoryFilter === 'ALL' || a.category === categoryFilter;
      const matchStatus =
        statusFilter === 'ALL' || a.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [audits, search, categoryFilter, statusFilter]);

  const sortedAudits = useMemo(() => {
    return [...filteredAudits].sort((a, b) => {
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
  }, [filteredAudits, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedAudits.length / pageSize) || 1;
  const paginatedAudits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedAudits.slice(start, start + pageSize);
  }, [sortedAudits, page, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc for scores
    }
  };

  const selectedAudits = useMemo(() => {
    return audits.filter(a => selectedIds.includes(a.id));
  }, [audits, selectedIds]);

  return (
    <div className="page-wrapper">
      <DemoNotice
        title="Multi-Website Benchmark Dataset"
        message="Comparing 30 target websites evaluated during the AIORI Hackathon campaign across Indian Government/Education, Global Top 10, and Commercial media."
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <GitCompare size={24} color="var(--cyber-cyan)" />
            Website Readiness Benchmark Comparison
          </h1>
          <p className="page-desc">
            Sort and evaluate dual-stack parity, sub-resource success rate, and probe latency across different industry sectors.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--cyber-cyan)', fontWeight: 600 }}>
              {selectedIds.length} site(s) selected for side-by-side comparison
            </span>
            <button onClick={() => setSelectedIds([])} className="btn btn-sm btn-secondary">
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Box if sites are selected */}
      {selectedAudits.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            border: '1.5px solid var(--border-highlight)',
            background: 'linear-gradient(180deg, #131c2e 0%, #0d1424 100%)'
          }}
        >
          <div className="card-header">
            <div>
              <h3 className="card-title">Side-by-Side Direct Comparison</h3>
              <p className="card-subtitle">Comparing key parameters across selected targets</p>
            </div>
            <button onClick={() => setSelectedIds([])} className="btn-icon">
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedAudits.length}, 1fr)`, gap: '16px', overflowX: 'auto' }}>
            {selectedAudits.map(site => (
              <div
                key={site.id}
                style={{
                  background: 'var(--bg-input)',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '1px solid var(--border-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {site.url.replace(/^https?:\/\//, '')}
                  </h4>
                  <StatusBadge status={site.status} size="sm" />
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {site.category}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Readiness Score:</span>
                    <strong className="font-mono" style={{ color: 'var(--cyber-cyan)' }}>{site.readinessScore}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IPv4 Reachability:</span>
                    <span className="font-mono">{site.ipv4Status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IPv6 Reachability:</span>
                    <span className="font-mono" style={{ color: site.ipv6Status === 'PASS' ? 'var(--cyber-emerald)' : 'var(--cyber-rose)' }}>{site.ipv6Status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Sub-Resources:</span>
                    <span className="font-mono">{site.totalResources}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IPv4-Only Dependencies:</span>
                    <span className="font-mono" style={{ color: site.ipv4OnlyDependencies > 0 ? 'var(--cyber-amber)' : 'var(--text-muted)' }}>
                      {site.ipv4OnlyDependencies}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Audit Duration:</span>
                    <span className="font-mono">{formatDuration(site.durationMs)}</span>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <Link
                    to="/results"
                    onClick={() => setActiveAudit(site)}
                    className="btn btn-sm btn-primary"
                    style={{ width: '100%' }}
                  >
                    Open Full Report
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Benchmark Comparison Table */}
      <div className="card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="input-icon-wrapper" style={{ minWidth: '240px', flex: 1 }}>
            <Search className="field-icon" size={14} />
            <input
              type="text"
              className="input-field"
              placeholder="Filter benchmark sites..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="select-field"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: 'auto' }}
            >
              <option value="ALL">Sector: All</option>
              <option value="Indian Gov / Edu">Indian Gov / Education</option>
              <option value="Global Tech">Global Tech</option>
              <option value="Commercial / 3rd Party">Commercial / 3rd Party</option>
            </select>

            <select
              className="select-field"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: 'auto' }}
            >
              <option value="ALL">Status: All</option>
              <option value="READY">IPv6 Ready</option>
              <option value="DEGRADED">Degraded</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Select</th>
                <th className="sortable" onClick={() => handleSort('url')}>
                  Website URL {sortField === 'url' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
                </th>
                <th>Category</th>
                <th className="sortable" onClick={() => handleSort('ipv4Status')}>IPv4</th>
                <th className="sortable" onClick={() => handleSort('ipv6Status')}>IPv6</th>
                <th className="sortable" onClick={() => handleSort('totalResources')}>
                  Total Res {sortField === 'totalResources' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
                </th>
                <th className="sortable" onClick={() => handleSort('ipv6ReadyResources')}>
                  IPv6 Ready {sortField === 'ipv6ReadyResources' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
                </th>
                <th className="sortable" onClick={() => handleSort('failedResources')}>
                  Failed {sortField === 'failedResources' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
                </th>
                <th className="sortable" onClick={() => handleSort('readinessScore')}>
                  Score {sortField === 'readinessScore' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
                </th>
                <th className="sortable" onClick={() => handleSort('durationMs')}>
                  Duration {sortField === 'durationMs' && (sortAsc ? <ArrowUp size={12} style={{ display: 'inline' }} /> : <ArrowDown size={12} style={{ display: 'inline' }} />)}
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAudits.map((site) => {
                const isSelected = selectedIds.includes(site.id);
                return (
                  <tr key={site.id} style={{ background: isSelected ? 'rgba(6, 182, 212, 0.06)' : undefined }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(site.id)}
                        title="Select for comparison (up to 3)"
                      />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {site.url}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                        {site.category || 'Standard'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={site.ipv4Status} size="sm" />
                    </td>
                    <td>
                      <StatusBadge status={site.ipv6Status} size="sm" />
                    </td>
                    <td className="font-mono">{site.totalResources}</td>
                    <td className="font-mono" style={{ color: 'var(--cyber-emerald)' }}>
                      {site.ipv6ReadyResources}
                    </td>
                    <td className="font-mono" style={{ color: site.failedResources > 0 ? 'var(--cyber-rose)' : 'var(--text-muted)' }}>
                      {site.failedResources}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="font-mono" style={{ fontWeight: 700 }}>
                          {site.readinessScore}%
                        </span>
                        <StatusBadge status={site.status} size="sm" />
                      </div>
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatDuration(site.durationMs)}
                    </td>
                    <td>
                      <Link
                        to="/results"
                        onClick={() => setActiveAudit(site)}
                        className="btn btn-sm btn-outline"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="table-pagination">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedAudits.length)} of {sortedAudits.length} benchmark sites
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-secondary"
            >
              Previous
            </button>
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
    </div>
  );
}
