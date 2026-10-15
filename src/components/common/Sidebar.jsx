import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  FileCheck2,
  Network,
  ShieldAlert,
  GitCompare,
  FileText,
  FlaskConical,
  Settings,
  Globe2,
  ChevronLeft,
  ChevronRight,
  Radio
} from 'lucide-react';
import { useAuditContext } from '../../context/AuditContext';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { backendStatus, audits } = useAuditContext();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/scanner', label: 'Website Scanner', icon: ScanLine, badge: 'PROBE' },
    { to: '/results', label: 'Audit Results', icon: FileCheck2 },
    { to: '/graph', label: 'Dependency Graph', icon: Network, badge: 'FLOW' },
    { to: '/failures', label: 'Failure Analysis', icon: ShieldAlert },
    { to: '/comparison', label: 'Site Comparison', icon: GitCompare },
    { to: '/reports', label: 'Reports & Export', icon: FileText },
    { to: '/test-site', label: 'Controlled Test Site', icon: FlaskConical, badge: 'LAB' },
    { to: '/settings', label: 'Settings & API', icon: Settings }
  ];

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon-box">
          <Globe2 size={20} />
        </div>
        {!collapsed && (
          <div className="brand-text-box">
            <span className="brand-title">IPv6 Auditor</span>
            <span className="brand-tag">PS-027 · AIORI-3</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-title">Diagnostics Platform</div>}

        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="nav-item-icon" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="nav-item-badge">{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer with Vantage Info & Collapse Toggle */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div className="testnet-badge">
            <Radio size={14} color="var(--cyber-cyan)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ color: 'var(--text-main)', fontSize: '0.74rem' }}>
                Vantage: Dual-Stack
              </strong>
              <span>RFC 8305 / Forced Probes</span>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: collapsed ? 'center' : 'space-between' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsed && <span>Collapse Sidebar</span>}
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
