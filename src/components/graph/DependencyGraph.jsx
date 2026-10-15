import React, { useState, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomResourceNode from './CustomResourceNode';
import NodeDetailDrawer from './NodeDetailDrawer';
import { Filter, Layers, ZoomIn, ZoomOut, Maximize2, ShieldAlert } from 'lucide-react';

const nodeTypes = {
  customResource: CustomResourceNode
};

export default function DependencyGraph({ initialData }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || []);

  const [selectedResource, setSelectedResource] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, BOTTLENECKS, DUAL_STACK

  // Filter nodes according to selection
  const displayedNodes = useMemo(() => {
    if (filterMode === 'BOTTLENECKS') {
      return nodes.filter(n => n.data.isRoot || n.data.failureClass !== 'IPV6_OK');
    }
    if (filterMode === 'DUAL_STACK') {
      return nodes.filter(n => n.data.failureClass === 'IPV6_OK');
    }
    return nodes;
  }, [nodes, filterMode]);

  const displayedNodeIds = useMemo(() => new Set(displayedNodes.map(n => n.id)), [displayedNodes]);

  const displayedEdges = useMemo(() => {
    return edges.filter(e => displayedNodeIds.has(e.source) && displayedNodeIds.has(e.target));
  }, [edges, displayedNodeIds]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedResource(node.data);
  }, []);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', height: '680px', display: 'flex', flexDirection: 'column' }}>
      {/* Graph Toolbar */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-card)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={18} color="var(--cyber-cyan)" />
          <div>
            <h3 className="card-title" style={{ fontSize: '0.95rem' }}>
              Sub-Resource Dependency Tree ({displayedNodes.length} Nodes)
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Click any resource to inspect its protocol socket diagnostics
            </span>
          </div>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={12} /> Filter:
          </span>
          <button
            onClick={() => setFilterMode('ALL')}
            className={`btn btn-sm ${filterMode === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Resources
          </button>
          <button
            onClick={() => setFilterMode('BOTTLENECKS')}
            className={`btn btn-sm ${filterMode === 'BOTTLENECKS' ? 'btn-danger' : 'btn-secondary'}`}
            title="Highlight IPv4-only and degraded dependencies"
          >
            <ShieldAlert size={13} />
            Bottlenecks Only
          </button>
          <button
            onClick={() => setFilterMode('DUAL_STACK')}
            className={`btn btn-sm ${filterMode === 'DUAL_STACK' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Dual-Stack Ready
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div style={{ flex: 1, position: 'relative', background: '#090d16' }}>
        <ReactFlow
          nodes={displayedNodes}
          edges={displayedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background
            color="rgba(255, 255, 255, 0.08)"
            gap={20}
            size={1.5}
            variant={BackgroundVariant.Dots}
          />
          <Controls position="top-right" />
          <MiniMap
            nodeStrokeColor="#38bdf8"
            nodeColor={(n) => {
              if (n.data.failureClass === 'IPV6_OK') return '#10b981';
              if (n.data.failureClass?.includes('TIMEOUT')) return '#f59e0b';
              return '#f43f5e';
            }}
            maskColor="rgba(8, 12, 20, 0.85)"
            style={{
              background: '#0a0f1d',
              border: '1px solid var(--border-card)',
              borderRadius: '8px'
            }}
          />
        </ReactFlow>
      </div>

      {/* Node Inspector Drawer */}
      <NodeDetailDrawer
        resource={selectedResource}
        isOpen={!!selectedResource}
        onClose={() => setSelectedResource(null)}
      />
    </div>
  );
}
