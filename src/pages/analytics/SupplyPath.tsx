import React, { useState } from 'react';

const advertisers = [
  { id: 'adv1', label: 'IKEA' },
];
const activations = [
  { id: 'act1', label: 'LightBox' },
  { id: 'act2', label: 'MIQ' },
  { id: 'act3', label: 'Broadlab' },
];
const dsps = [
  { id: 'dsp1', label: 'SSP Direct' },
  { id: 'dsp2', label: 'Trade Desk' },
  { id: 'dsp3', label: 'DV360' },
  { id: 'dsp4', label: 'Amazon DSP' },
  { id: 'dsp5', label: 'Xandr DSP' },
];
const ssps = [
  { id: 'ssp1', label: 'Magnite' },
  { id: 'ssp2', label: 'Xandr SSP' },
  { id: 'ssp3', label: 'DSP Direct' },
  { id: 'ssp4', label: 'Freewheel' },
];
const inventory = [
  { id: 'inv1', label: 'Pluto' },
  { id: 'inv2', label: 'Rakuten' },
  { id: 'inv3', label: 'SamsungTV' },
  { id: 'inv4', label: 'Tubi' },
  { id: 'inv5', label: 'LG Ads' },
];

const columns = [
  { key: 'advertiser', label: 'Advertiser', nodes: advertisers },
  { key: 'activation', label: 'Activation', nodes: activations },
  { key: 'dsp', label: 'DSP', nodes: dsps },
  { key: 'ssp', label: 'SSP', nodes: ssps },
  { key: 'inventory', label: 'Inventory', nodes: inventory },
];

const colWidth = 180;
const rowHeight = 70;
const nodeHeight = 48;
const nodeGap = 22;
const nodeWidth = 140;
const nodeRadius = 8;
const blue = '#02b3e5';

function getColumnIndexByNodeId(nodeId: string) {
  for (let i = 0; i < columns.length; i++) {
    if (columns[i].nodes.some(n => n.id === nodeId)) return i;
  }
  return -1;
}

const SupplyPath: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Layout: one node per row per column, evenly spaced vertically
  const maxRows = Math.max(...columns.map(col => col.nodes.length));
  const svgWidth = columns.length * colWidth;

  // Calculate node positions: evenly distribute nodes vertically in each column
  const nodePositions: Record<string, { x: number; y: number; colIdx: number; rowIdx: number }> = {};
  columns.forEach((col, colIdx) => {
    const totalNodes = col.nodes.length;
    const verticalGap = (svgWidth - totalNodes * nodeHeight) / (totalNodes + 1);
    col.nodes.forEach((node, rowIdx) => {
      nodePositions[node.id] = {
        x: colIdx * colWidth + colWidth / 2,
        y: verticalGap + rowIdx * (nodeHeight + verticalGap) + nodeHeight / 2,
        colIdx,
        rowIdx,
      };
    });
  });

  // Define a few valid paths (mocked)
  const validPaths = [
    ['adv1', 'act1', 'dsp1', 'ssp1', 'inv1'], // IKEA → LightBox → SSP Direct → Magnite → Pluto
    ['adv1', 'act2', 'dsp2', 'ssp2', 'inv2'], // IKEA → MIQ → Trade Desk → Xandr SSP → Rakuten
    ['adv1', 'act3', 'dsp3', 'ssp3', 'inv3'], // IKEA → Broadlab → DV360 → DSP Direct → SamsungTV
    ['adv1', 'act1', 'dsp4', 'ssp4', 'inv4'], // IKEA → LightBox → Amazon DSP → Freewheel → Tubi
  ];

  // For each path, build connections between adjacent nodes
  const connections: Array<{ from: string; to: string }> = [];
  validPaths.forEach(path => {
    for (let i = 0; i < path.length - 1; i++) {
      connections.push({ from: path[i], to: path[i + 1] });
    }
  });

  // Vertically align nodes in the same path for straight lines
  // 1. Compute nodeOrder and maxOrder first
  const nodeOrder: Record<string, number> = {};
  columns.forEach((col, colIdx) => {
    let seen = new Set();
    let order = 0;
    validPaths.forEach(path => {
      const nodeId = path[colIdx];
      if (!seen.has(nodeId)) {
        nodeOrder[nodeId] = order++;
        seen.add(nodeId);
      }
    });
    col.nodes.forEach(n => {
      if (!(n.id in nodeOrder)) nodeOrder[n.id] = order++;
    });
  });
  const maxOrder = Math.max(...Object.values(nodeOrder));
  // 2. Now compute svgHeight
  const svgHeight = (maxOrder + 1) * rowHeight;
  // 3. Now compute nodePositions using svgHeight
  columns.forEach((col, colIdx) => {
    col.nodes.forEach((node) => {
      nodePositions[node.id] = {
        x: colIdx * colWidth + colWidth / 2,
        y: nodeOrder[node.id] * rowHeight + rowHeight / 2,
        colIdx,
        rowIdx: nodeOrder[node.id],
      };
    });
  });

  // Find all nodes/lines connected to the selected node
  let highlightedNodes = new Set<string>();
  let highlightedConnections = new Set<number>();
  if (selectedNode) {
    highlightedNodes.add(selectedNode);
    // Forward
    let current = [selectedNode];
    for (let col = nodePositions[selectedNode].colIdx; col < columns.length - 1; col++) {
      let next: string[] = [];
      connections.forEach((conn, idx) => {
        if (current.includes(conn.from)) {
          highlightedConnections.add(idx);
          highlightedNodes.add(conn.to);
          next.push(conn.to);
        }
      });
      current = next;
    }
    // Backward
    current = [selectedNode];
    for (let col = nodePositions[selectedNode].colIdx; col > 0; col--) {
      let prev: string[] = [];
      connections.forEach((conn, idx) => {
        if (current.includes(conn.to)) {
          highlightedConnections.add(idx);
          highlightedNodes.add(conn.from);
          prev.push(conn.from);
        }
      });
      current = prev;
    }
  }

  // Details for selected node
  let details: React.ReactNode = null;
  if (selectedNode) {
    const colIdx = nodePositions[selectedNode].colIdx;
    const col = columns[colIdx];
    const node = col.nodes.find(n => n.id === selectedNode);
    // Find connected nodes in next/prev columns
    let nextNodes: string[] = [];
    let prevNodes: string[] = [];
    if (colIdx < columns.length - 1) {
      nextNodes = connections.filter(c => c.from === selectedNode).map(c => c.to);
    }
    if (colIdx > 0) {
      prevNodes = connections.filter(c => c.to === selectedNode).map(c => c.from);
    }
    details = (
      <div className="bg-white rounded-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{col.label}: {node?.label}</h3>
        </div>
        <div className="p-6">
          {prevNodes.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-700">Previous:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {prevNodes.map(id => {
                  const prevNode = columns[colIdx-1].nodes.find(n => n.id === id);
                  return (
                    <span key={id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {prevNode?.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {nextNodes.length > 0 && (
            <div>
              <span className="text-sm font-medium text-gray-700">Next:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {nextNodes.map(id => {
                  const nextNode = columns[colIdx+1].nodes.find(n => n.id === id);
                  return (
                    <span key={id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {nextNode?.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Supply Path Diagram Card */}
      <div className="bg-white rounded-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Supply Path Analysis</h2>
          <p className="text-sm text-gray-500 mt-1">Track and optimize your supply path efficiency and performance metrics.</p>
        </div>
        
        {/* Filters Header Row */}
        <div className="flex gap-2 px-6 py-4 border-b border-gray-200 bg-gray-50">
          {columns.map(col => (
            <div key={col.key} className="flex-1 flex flex-col items-center">
              <label className="text-xs font-semibold text-gray-500 mb-1">{col.label}</label>
              <select className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-white">
                <option>All</option>
                {col.nodes.map(n => <option key={n.id}>{n.label}</option>)}
              </select>
            </div>
          ))}
        </div>
        
        {/* Diagram */}
        <div className="relative p-8" onClick={e => { if (e.target === e.currentTarget) setSelectedNode(null); }}>
          <svg width={svgWidth} height={svgHeight} className="absolute left-0 top-0 z-0 pointer-events-none">
            {connections.map((conn, i) => {
              const from = nodePositions[conn.from];
              const to = nodePositions[conn.to];
              const isHighlighted = highlightedConnections.has(i);
              return (
                <line
                  key={i}
                  x1={from.x + nodeWidth / 2}
                  y1={from.y}
                  x2={to.x - nodeWidth / 2}
                  y2={to.y}
                  stroke={isHighlighted ? blue : '#e5e7eb'}
                  strokeWidth={isHighlighted ? 4 : 2}
                  opacity={isHighlighted ? 1 : 0.5}
                />
              );
            })}
          </svg>
          <div className="relative z-10 flex">
            {columns.map((col, colIdx) => (
              <div key={col.key} className="flex flex-col items-center" style={{ width: colWidth }}>
                {col.nodes.map((node, rowIdx) => {
                  const isSelected = selectedNode === node.id;
                  const isHighlighted = highlightedNodes.has(node.id);
                  return (
                    <div
                      key={node.id}
                      className={`flex items-center justify-center border-2 rounded shadow-sm mb-4 font-semibold text-gray-800 text-sm cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#02b3e5] bg-[#e6f8fc] text-[#02b3e5] ring-2 ring-[#02b3e5]'
                          : isHighlighted
                          ? 'border-[#02b3e5] bg-white text-[#02b3e5]'
                          : 'border-gray-200 bg-white text-gray-800 opacity-60'
                      }`}
                      style={{
                        width: nodeWidth,
                        height: nodeHeight,
                        marginTop: rowIdx === 0 ? nodePositions[node.id].y - nodeHeight / 2 : nodeGap,
                      }}
                      onClick={e => { e.stopPropagation(); setSelectedNode(node.id); }}
                    >
                      {node.label}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Node Details Card */}
      {details && (
        <div className="space-y-6">
          {details}
        </div>
      )}
      
      {/* Supply Path Metrics Card */}
      <div className="bg-white rounded-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Supply Path Metrics</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#02b3e5]">4</div>
              <div className="text-sm text-gray-500 mt-1">Active Paths</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#02b3e5]">5</div>
              <div className="text-sm text-gray-500 mt-1">DSP Partners</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#02b3e5]">5</div>
              <div className="text-sm text-gray-500 mt-1">Inventory Sources</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplyPath; 