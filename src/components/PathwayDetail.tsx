import { useMemo, useState } from 'react';
import { Pathway, ProteinNode, CLUSTER_COLORS, ClusterColor } from '@/data/pathwayData';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Target, Zap, Circle } from 'lucide-react';

interface PathwayDetailProps {
  pathway: Pathway;
  onBack: () => void;
  onSelectProtein: (protein: ProteinNode) => void;
}

const ROLE_ICONS = {
  target: Target,
  intermediary: Zap,
  effector: Circle,
};

const ROLE_LABELS = {
  target: 'Target',
  intermediary: 'Intermediario',
  effector: 'Efector',
};

export default function PathwayDetail({ pathway, onBack, onSelectProtein }: PathwayDetailProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Layout nodes in a vertical DAG-like arrangement
  const layoutNodes = useMemo(() => {
    const sorted = [...pathway.nodes].sort((a, b) => {
      const order = { target: 0, intermediary: 1, effector: 2 };
      return order[a.role] - order[b.role];
    });

    const groups = { target: [] as ProteinNode[], intermediary: [] as ProteinNode[], effector: [] as ProteinNode[] };
    sorted.forEach(n => groups[n.role].push(n));

    const positioned: (ProteinNode & { lx: number; ly: number })[] = [];
    const layers = [groups.target, groups.intermediary, groups.effector];
    const layerY = [60, 200, 340];

    layers.forEach((layer, li) => {
      const spacing = 400 / (layer.length + 1);
      layer.forEach((node, ni) => {
        positioned.push({
          ...node,
          lx: spacing * (ni + 1),
          ly: layerY[li] + (Math.random() - 0.5) * 20,
        });
      });
    });

    return positioned;
  }, [pathway.nodes]);

  const nodePositionMap = useMemo(() => {
    const m = new Map<string, { lx: number; ly: number }>();
    layoutNodes.forEach(n => m.set(n.id, { lx: n.lx, ly: n.ly }));
    return m;
  }, [layoutNodes]);

  const color = CLUSTER_COLORS[pathway.color];
  const activeNode = layoutNodes.find(n => n.id === selectedNode);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <h2 className="text-lg font-semibold font-mono text-foreground">{pathway.name}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* SVG Graph */}
        <div className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
          {/* Layer labels */}
          <div className="absolute left-2 top-0 h-full flex flex-col justify-around text-[10px] font-mono text-muted-foreground pointer-events-none">
            <span className="rotate-[-90deg]">TARGETS</span>
            <span className="rotate-[-90deg]">INTERMEDIARIOS</span>
            <span className="rotate-[-90deg]">EFECTORES</span>
          </div>

          <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
            {/* Edges */}
            {pathway.edges.map((edge, i) => {
              const src = nodePositionMap.get(edge.source);
              const tgt = nodePositionMap.get(edge.target);
              if (!src || !tgt) return null;
              const isActive = hoveredNode === edge.source || hoveredNode === edge.target;
              return (
                <line
                  key={i}
                  x1={src.lx} y1={src.ly}
                  x2={tgt.lx} y2={tgt.ly}
                  stroke={isActive ? color : 'rgba(255,255,255,0.1)'}
                  strokeWidth={isActive ? 2 : 1}
                  strokeDasharray={isActive ? undefined : '2,4'}
                />
              );
            })}

            {/* Nodes */}
            {layoutNodes.map(node => {
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode === node.id;
              const isConnected = hoveredNode && pathway.edges.some(
                e => (e.source === hoveredNode && e.target === node.id) ||
                     (e.target === hoveredNode && e.source === node.id)
              );
              const dimmed = hoveredNode && !isHovered && !isConnected;

              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {
                    setSelectedNode(node.id);
                    onSelectProtein(node);
                  }}
                >
                  {(isHovered || isSelected) && (
                    <circle
                      cx={node.lx} cy={node.ly}
                      r={14}
                      fill="none"
                      stroke={color}
                      strokeWidth={1}
                      strokeDasharray="3,3"
                      opacity={0.5}
                    />
                  )}
                  <circle
                    cx={node.lx} cy={node.ly}
                    r={isHovered ? 9 : 7}
                    fill={dimmed ? 'rgba(255,255,255,0.15)' : color}
                    opacity={dimmed ? 0.3 : 1}
                    stroke={isSelected ? '#fff' : 'none'}
                    strokeWidth={2}
                  />
                  <text
                    x={node.lx} y={node.ly - 12}
                    textAnchor="middle"
                    fill={dimmed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)'}
                    fontSize={8}
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Protein list / detail panel */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Proteínas ({pathway.nodes.length})
          </h3>

          <AnimatePresence mode="wait">
            {activeNode ? (
              <ProteinInfoCard
                key={activeNode.id}
                node={activeNode}
                color={color}
                clusterColor={pathway.color}
                onSelect={() => onSelectProtein(activeNode)}
              />
            ) : null}
          </AnimatePresence>

          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-1">
            {layoutNodes.map(node => {
              const Icon = ROLE_ICONS[node.role];
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    setSelectedNode(node.id);
                    onSelectProtein(node);
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-mono transition-all text-left
                    ${selectedNode === node.id
                      ? 'bg-secondary border border-border'
                      : 'hover:bg-secondary/50'}`}
                >
                  <Icon className="w-3 h-3 shrink-0" style={{ color }} />
                  <span className="text-foreground">{node.name}</span>
                  <span className="text-muted-foreground ml-auto text-[10px]">{ROLE_LABELS[node.role]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProteinInfoCard({
  node, color, clusterColor, onSelect,
}: {
  node: ProteinNode & { lx: number; ly: number };
  color: string;
  clusterColor: ClusterColor;
  onSelect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card border border-border rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-mono font-semibold text-foreground">{node.name}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
          {ROLE_LABELS[node.role]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{node.fullName}</p>
      <p className="text-xs text-foreground/60">{node.description}</p>
      <div className="text-[10px] text-muted-foreground font-mono">
        Conexiones: {node.connections.length}
      </div>
      <button
        onClick={onSelect}
        className="w-full mt-2 px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all hover:scale-[1.02]"
        style={{
          backgroundColor: color,
          color: 'hsl(220, 20%, 6%)',
        }}
      >
        ★ Rescatar como {node.role === 'target' ? 'Target' : 'Intermediario'}
      </button>
    </motion.div>
  );
}
