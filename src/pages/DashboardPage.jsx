import React from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Network,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import DemoNotice from '../components/common/DemoNotice';
import { useAuditContext } from '../context/AuditContext';
import { formatDate } from '../utils/formatters';

export default function DashboardPage() {
  const { audits, setActiveAudit } = useAuditContext();

  // Metrics calculations
  const totalAudits = audits.length;
  const ipv6ReadyCount = audits.filter(a => a.status === 'READY' || a.readinessScore >= 80).length;
  const degradedCount = audits.filter(a => a.status === 'DEGRADED').length;
  const failedCount = audits.filter(a => a.status === 'FAILED' || a.readinessScore < 50).length;

  const totalDependencies = audits.reduce((acc, a) => acc + (a.totalResources || 0), 0);
  const totalIpv4OnlyDeps = audits.reduce((acc, a) => acc + (a.ipv4OnlyDependencies || 0), 0);
  const totalFailedRequests = audits.reduce((acc, a) => acc + (a.failedResources || 0), 0);

  // Success rate data for charts
  const protocolSuccessData = [
    { name: 'Apex DNS', ipv4: 100, ipv6: 78 },
    { name: 'TCP Port 443', ipv4: 99, ipv6: 72 },
    { name: 'TLS Handshake', ipv4: 98, ipv6: 66 },
    { name: 'HTTP Response', ipv4: 97, ipv6: 64 },
    { name: 'Dependencies', ipv4: 98, ipv6: 52 }
  ];

  // Stage failure distribution data
  const stageFailureData = [
    { name: 'DNS (NO_AAAA)', count: 28, fill: '#60a5fa' },
    { name: 'TCP Refused/Timeout', count: 18, fill: '#c084fc' },
    { name: 'TLS Handshake', count: 12, fill: '#f472b6' },
    { name: 'HTTP 4xx/5xx', count: 9, fill: '#fbbf24' }
  ];

  // Category Readiness
  const categoryData = [
    { category: 'Indian Gov / Edu', ready: 62, degraded: 28, failed: 10 },
    { category: 'Global Tech', ready: 85, degraded: 10, failed: 5 },
    { category: 'Commercial 3rd-Party', ready: 38, degraded: 48, failed: 14 }
  ];

  return (
    <div className="page-wrapper">
      {/* Demo Banner */}
      <DemoNotice
        title="AIORI Hackathon 3 Benchmark Environment"
        message="Displaying baseline data for 30 benchmark websites across Indian Gov/Edu, Global Tech, and Commercial sectors with Happy Eyeballs isolation."
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity size={24} color="var(--cyber-cyan)" />
            IPv6 Readiness & Dependency Dashboard
          </h1>
          <p className="page-desc">
            Continuous auditing of websites and their full sub-resource dependency trees over isolated IPv6 & IPv4 paths (RFC 8305 bypass).
          </p>
        </div>

        <div className="page-actions">
          <Link to="/scanner" className="btn btn-primary">
            Launch New Audit
          </Link>
        </div>
      </div>

      {/* Key Metric Stat Cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Websites Tested"
          value={totalAudits}
          icon={Globe}
          sublabel="30 Benchmarks + Local Runs"
        />
        <StatCard
          label="IPv6-Ready Websites"
          value={ipv6ReadyCount}
          icon={CheckCircle2}
          variant="ready"
          trend={`${Math.round((ipv6ReadyCount / totalAudits) * 100)}% Ready`}
          trendPositive={true}
          sublabel="Apex & core dependencies OK"
        />
        <StatCard
          label="IPv4-Only Dependencies"
          value={totalIpv4OnlyDeps}
          icon={AlertTriangle}
          variant="warning"
          trend="Hidden Bottlenecks"
          sublabel="CDNs, scripts, fonts with no AAAA"
        />
        <StatCard
          label="Failed Sub-Resources"
          value={totalFailedRequests}
          icon={XCircle}
          variant="danger"
          trend="Broken on v6-only"
          sublabel="TCP RST, TLS certs, HTTP 500"
        />
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Chart 1: Protocol Success Rate Comparison */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">IPv4 vs IPv6 Success Rate by Loading Stage</h3>
              <p className="card-subtitle">Exposes how Happy Eyeballs hides sub-resource degradation</p>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={protocolSuccessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#24324d', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="ipv4" name="IPv4 Success Rate (%)" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ipv6" name="IPv6 Success Rate (%)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Failure Breakdown by Stage */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Primary Failure Stage Classification</h3>
              <p className="card-subtitle">Isolated first failing stage for each blocked dependency</p>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={stageFailureData}
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#24324d', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" name="Detected Failures" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {stageFailureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sector Category Performance Chart */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Readiness Distribution by Web Category</h3>
            <p className="card-subtitle">Comparison across Indian Gov/Edu, Global Tech, and Commercial sectors</p>
          </div>
        </div>
        <div style={{ height: '220px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', borderColor: '#24324d', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
              <Bar dataKey="ready" name="Fully Ready (%)" fill="#10b981" stackId="a" />
              <Bar dataKey="degraded" name="Degraded / IPv4-Deps (%)" fill="#f59e0b" stackId="a" />
              <Bar dataKey="failed" name="Incompatible / Failed (%)" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Audits Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Recent Benchmark & Scanned Audits</h3>
            <p className="card-subtitle">Latest diagnostic runs with per-resource breakdown</p>
          </div>
          <Link to="/comparison" className="btn btn-sm btn-secondary">
            View All Benchmarks <ArrowRight size={13} />
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Target Website</th>
                <th>Category</th>
                <th>IPv4 Status</th>
                <th>IPv6 Status</th>
                <th>Total Resources</th>
                <th>IPv4-Only Deps</th>
                <th>Readiness Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {audits.slice(0, 7).map((audit) => (
                <tr key={audit.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {audit.url}
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {formatDate(audit.timestamp)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-muted">{audit.category || 'Benchmark'}</span>
                  </td>
                  <td>
                    <StatusBadge status={audit.ipv4Status} />
                  </td>
                  <td>
                    <StatusBadge status={audit.ipv6Status} />
                  </td>
                  <td className="font-mono">{audit.totalResources || '—'}</td>
                  <td className="font-mono" style={{ color: audit.ipv4OnlyDependencies > 0 ? 'var(--cyber-amber)' : 'var(--text-muted)' }}>
                    {audit.ipv4OnlyDependencies || 0}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono" style={{ fontWeight: 700 }}>
                        {audit.readinessScore}%
                      </span>
                      <StatusBadge status={audit.status} />
                    </div>
                  </td>
                  <td>
                    <Link
                      to="/results"
                      onClick={() => setActiveAudit(audit)}
                      className="btn btn-sm btn-outline"
                    >
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
