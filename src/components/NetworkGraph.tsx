import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Pathway, PathwayEdge, ProteinNode, CLUSTER_COLORS, ClusterColor, generateCrossEdges, CLUSTER_LABELS } from '@/data/pathwayData';

interface NetworkGraphProps {
  pathways: Pathway[];
  onClusterSelect: (color: ClusterColor) => void;
  selectedCluster: ClusterColor | null;
  expandingCluster: ClusterColor | null;
  onExpansionComplete: () => void;
}

const BG = '#000000';
const FONT = '"DM Sans", "Inter", sans-serif';

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function NetworkGraph({ pathways, onClusterSelect, selectedCluster, expandingCluster, onExpansionComplete }: NetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrame = useRef<number>(0);
  const [hoveredCluster, setHoveredCluster] = useState<ClusterColor | null>(null);
  const expansionStart = useRef<number | null>(null);
  const EXPANSION_DURATION = 1200;

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

  // Compute cluster centers
  const clusterCenters = useMemo(() => {
    const centers: Record<string, { x: number; y: number }> = {};
    pathways.forEach(p => {
      const avgX = p.nodes.reduce((s, n) => s + n.x, 0) / p.nodes.length;
      const avgY = p.nodes.reduce((s, n) => s + n.y, 0) / p.nodes.length;
      centers[p.color] = { x: avgX, y: avgY };
    });
    return centers;
  }, [pathways]);

  useEffect(() => {
    if (expandingCluster) {
      expansionStart.current = performance.now();
    } else {
      expansionStart.current = null;
    }
  }, [expandingCluster]);

  const draw = useCallback((now: number) => {
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
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    // Expansion animation progress
    let expT = 0;
    if (expandingCluster && expansionStart.current !== null) {
      expT = Math.min((now - expansionStart.current) / EXPANSION_DURATION, 1);
      expT = easeInOutCubic(expT);
      if (expT >= 1) {
        onExpansionComplete();
        return;
      }
    }

    const isExpanding = expandingCluster !== null && expT > 0;
    const centerX = w / 2;
    const centerY = h / 2;

    // Draw edges
    allEdges.forEach(edge => {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) return;

      const isSameCluster = src.cluster === tgt.cluster;
      const isHighlighted = hoveredCluster && (src.cluster === hoveredCluster || tgt.cluster === hoveredCluster);
      const isDimmed = hoveredCluster && !isHighlighted;

      // During expansion: fade non-selected edges
      let alpha = 1;
      if (isExpanding) {
        if (src.cluster !== expandingCluster && tgt.cluster !== expandingCluster) {
          alpha = 1 - expT;
        } else if (src.cluster !== expandingCluster || tgt.cluster !== expandingCluster) {
          alpha = 1 - expT; // cross edges
        }
      }

      if (alpha <= 0.01) return;

      // Scale coordinates for expansion
      let x1 = src.x, y1 = src.y, x2 = tgt.x, y2 = tgt.y;
      if (isExpanding && src.cluster === expandingCluster) {
        const ec = clusterCenters[expandingCluster];
        const scale = 1 + expT * 2;
        x1 = lerp(src.x, centerX + (src.x - ec.x) * scale, expT);
        y1 = lerp(src.y, centerY + (src.y - ec.y) * scale, expT);
      }
      if (isExpanding && tgt.cluster === expandingCluster) {
        const ec = clusterCenters[expandingCluster];
        const scale = 1 + expT * 2;
        x2 = lerp(tgt.x, centerX + (tgt.x - ec.x) * scale, expT);
        y2 = lerp(tgt.y, centerY + (tgt.y - ec.y) * scale, expT);
      }

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.globalAlpha = alpha;

      if (isDimmed) {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      } else if (isSameCluster) {
        const color = CLUSTER_COLORS[src.cluster];
        ctx.strokeStyle = color.replace(')', ', 0.3)').replace('hsl(', 'hsla(');
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      }
      ctx.lineWidth = edge.weight * 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Draw nodes
    allNodes.forEach(node => {
      const isHighlighted = hoveredCluster === node.cluster;
      const isDimmed = hoveredCluster && hoveredCluster !== node.cluster;

      let alpha = 1;
      let nx = node.x, ny = node.y;

      if (isExpanding) {
        if (node.cluster !== expandingCluster) {
          alpha = 1 - expT;
        } else {
          // Move toward expanded position
          const ec = clusterCenters[expandingCluster];
          const scale = 1 + expT * 2;
          nx = lerp(node.x, centerX + (node.x - ec.x) * scale, expT);
          ny = lerp(node.y, centerY + (node.y - ec.y) * scale, expT);
        }
      }

      if (alpha <= 0.01) return;

      ctx.globalAlpha = alpha;

      const pulse = Math.sin(now / 1000 + node.x) * 0.5 + 0.5;
      let r = node.radius;
      if (isHighlighted) r = node.radius * (1.3 + pulse * 0.3);
      if (isExpanding && node.cluster === expandingCluster) {
        r = lerp(node.radius, node.radius * 1.8, expT);
      }

      const color = CLUSTER_COLORS[node.cluster];

      if (isDimmed) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
      } else {
        ctx.fillStyle = color;
        if (isHighlighted || (isExpanding && node.cluster === expandingCluster)) {
          ctx.shadowColor = color;
          ctx.shadowBlur = isExpanding ? lerp(5, 20, expT) : 15;
        }
      }
      ctx.beginPath();
      ctx.arc(nx, ny, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });

    // Cluster labels
    pathways.forEach(p => {
      let labelAlpha = 0.6;
      if (hoveredCluster === p.color) labelAlpha = 0.9;
      if (isExpanding && p.color !== expandingCluster) labelAlpha = 0.6 * (1 - expT);
      if (isExpanding && p.color === expandingCluster) labelAlpha = lerp(0.6, 0, expT * 1.5);

      if (labelAlpha <= 0.01) return;

      const center = clusterCenters[p.color];
      let lx = center.x, ly = center.y + 55;

      ctx.fillStyle = `rgba(255,255,255,${labelAlpha * 0.5})`;
      ctx.font = `500 10px ${FONT}`;
      ctx.textAlign = 'center';

      // Short label like reference image
      const shortLabels: Record<ClusterColor, string> = {
        teal: 'PI3K / AKT',
        blue: 'MAPK / ERK',
        orange: 'WNT / β-CATENIN',
        purple: 'JAK / STAT',
      };
      ctx.fillStyle = CLUSTER_COLORS[p.color].replace(')', `, ${labelAlpha})`).replace('hsl(', 'hsla(');
      ctx.fillText(shortLabels[p.color], lx, ly);
    });

    animFrame.current = requestAnimationFrame(draw);
  }, [allNodes, allEdges, nodeMap, hoveredCluster, expandingCluster, onExpansionComplete, clusterCenters, pathways]);

  useEffect(() => {
    animFrame.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrame.current);
  }, [draw]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (expandingCluster) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let closest: ProteinNode | null = null;
    let minDist = 40;
    allNodes.forEach(n => {
      const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
      if (d < minDist) { minDist = d; closest = n; }
    });

    if (closest) {
      onClusterSelect((closest as ProteinNode).cluster);
    }
  }, [allNodes, onClusterSelect, expandingCluster]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (expandingCluster) return;
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
  }, [allNodes, expandingCluster]);

  return (
    <div className="relative w-full flex flex-col items-center">
      <canvas
        ref={canvasRef}
        className="w-full aspect-square max-w-[600px] cursor-pointer"
        style={{ background: BG }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoveredCluster(null)}
      />
    </div>
  );
}
