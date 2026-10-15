import React, { useState, useEffect } from 'react';
import { useAuditContext } from '../context/AuditContext';
import { getAuditGraph } from '../services/api';
import DependencyGraph from '../components/graph/DependencyGraph';
import DemoNotice from '../components/common/DemoNotice';
import { Network, Info, Layers, RefreshCw, ZoomIn, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DependencyGraphPage() {
  const { activeAudit } = useAuditContext();
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGraph() {
      if (!activeAudit) return;
      setLoading(true);
      try {
        const data = await getAuditGraph(activeAudit.id);
        setGraphData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, [activeAudit]);

  if (!activeAudit) {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Network size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3>No Audit Selected</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            Run an audit to generate a sub-resource dependency tree.
          </p>
          <div style={{ marginTop: '20px' }}>
            <Link to="/scanner" className="btn btn-primary">
              Run New Scan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <DemoNotice
        title="Interactive Resource Dependency Flow"
        message={`Graph mapped from Chrome DevTools Protocol (CDP) initiator chains for ${activeAudit.url}. Red nodes indicate IPv4 bottlenecks.`}
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Network size={24} color="var(--cyber-cyan)" />
            Dependency Graph Architecture
          </h1>
          <p className="page-desc">
            Visualizing dependency propagation: How a single IPv4-only script or font can degrade an otherwise IPv6-ready webpage.
          </p>
        </div>

        <div className="page-actions">
          <Link to="/failures" className="btn btn-secondary">
            Failure Diagnostics <ArrowRight size={14} />
          </Link>
          <Link to="/results" className="btn btn-outline">
            Table View
          </Link>
        </div>
      </div>

      {/* Legend Bar */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-input)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <Info size={14} color="var(--cyber-cyan)" />
          <strong>Node Status Color Legend:</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.74rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--cyber-emerald)', display: 'inline-block' }} />
            IPv6 Verified (Dual-Stack Ready)
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--cyber-amber)', display: 'inline-block' }} />
            Degraded / Timeout Warning
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--cyber-rose)', display: 'inline-block' }} />
            IPv4 Bottleneck / Failed Stage
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 16, height: 2, background: '#f43f5e', borderTop: '2px dashed #f43f5e', display: 'inline-block' }} />
            Broken Initiator Edge
          </span>
        </div>
      </div>

      {/* Graph Canvas */}
      {loading ? (
        <div className="card" style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw className="animate-spin" size={28} color="var(--cyber-cyan)" />
          <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>Rendering Dependency Graph...</span>
        </div>
      ) : (
        <DependencyGraph initialData={graphData} />
      )}
    </div>
  );
}
