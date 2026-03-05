import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Pathway, PathwayEdge, ProteinNode, CLUSTER_COLORS, ClusterColor, generateCrossEdges } from '@/data/pathwayData';
import { motion } from 'framer-motion';

interface NetworkGraphProps {
  pathways: Pathway[];
  onClusterSelect: (color: ClusterColor) => void;
  selectedCluster: ClusterColor | null;
}

export default function NetworkGraph({ pathways, onClusterSelect, selectedCluster }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef<number>(0);
  const [hoveredCluster, setHoveredCluster] = useState<ClusterColor | null>(null);
  const [dimensions, setDimensions] = useState({ w: 500, h: 500 });

  const allNodes = useMemo(() => pathways.flatMap(p => p.nodes), [pathways]);
  const allEdges = useMemo(() => {
    const intra = pathways.flatMap(p => p.edges);
    const cross = generateCrossEdges(pathways);
    return [...intra, ...cross];
  }, [pathways]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, ProteinNode>();
    allNodes.forEach(n => m.set(n.id, n));
    return m;
  }, [allNodes]);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      setDimensions({ w, h });
    }

    ctx.clearRect(0, 0, w, h);

    // Draw edges
    allEdges.forEach(edge => {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) return;

      const isSameCluster = src.cluster === tgt.cluster;
      const isHighlighted = hoveredCluster && (src.cluster === hoveredCluster || tgt.cluster === hoveredCluster);
      const isDimmed = hoveredCluster && !isHighlighted;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      if (isDimmed) {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      } else if (isSameCluster) {
        const color = CLUSTER_COLORS[src.cluster];
        ctx.strokeStyle = color.replace(')', ', 0.25)').replace('hsl(', 'hsla(');
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      }
      ctx.lineWidth = edge.weight * 1.5;
      ctx.stroke();
    });

    // Draw nodes
    allNodes.forEach(node => {
      const isHighlighted = hoveredCluster === node.cluster;
      const isDimmed = hoveredCluster && hoveredCluster !== node.cluster;

      ctx.beginPath();
      const pulse = Math.sin(time / 1000 + node.x) * 0.5 + 0.5;
      const r = node.radius * (isHighlighted ? 1.3 + pulse * 0.3 : 1);
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

      const color = CLUSTER_COLORS[node.cluster];
      if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
      } else {
        ctx.fillStyle = color;
        if (isHighlighted) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
        }
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    animFrame.current = requestAnimationFrame(draw);
  }, [allNodes, allEdges, nodeMap, hoveredCluster]);

  useEffect(() => {
    animFrame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame.current);
  }, [draw]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find closest node
    let closest: ProteinNode | null = null;
    let minDist = 30;
    allNodes.forEach(n => {
      const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (d < minDist) { minDist = d; closest = n; }
    });

    if (closest) {
      onClusterSelect((closest as ProteinNode).cluster);
    }
  }, [allNodes, onClusterSelect]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let closest: ProteinNode | null = null;
    let minDist = 50;
    allNodes.forEach(n => {
      const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (d < minDist) { minDist = d; closest = n; }
    });

    setHoveredCluster(closest ? closest.cluster : null);
  }, [allNodes]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full aspect-square max-w-[500px] mx-auto"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer rounded-lg"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoveredCluster(null)}
      />
      {/* Cluster labels */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {pathways.map(p => (
          <button
            key={p.color}
            onClick={() => onClusterSelect(p.color)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all
              ${hoveredCluster === p.color || selectedCluster === p.color
                ? 'bg-secondary/80 scale-105'
                : 'bg-secondary/40 hover:bg-secondary/60'}`}
            onMouseEnter={() => setHoveredCluster(p.color)}
            onMouseLeave={() => setHoveredCluster(null)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: CLUSTER_COLORS[p.color] }}
            />
            <span className="text-foreground/80">{p.name}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
