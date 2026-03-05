import { useRef, useEffect, useState, useCallback } from 'react';
import { ClusterColor, CLUSTER_COLORS, CLUSTER_LABELS } from '@/data/pathwayData';

interface PathwayAnimationProps {
  cluster?: ClusterColor;
  onBack?: () => void;
}

// ── Hardcoded biologically-plausible network ──
interface PNode {
  id: number;
  label: string;
  x: number;
  y: number;
  role: 'upstream' | 'mid' | 'downstream' | 'target';
}

interface PEdge {
  from: number;
  to: number;
}

// Different topologies per cluster
const CLUSTER_NODES: Record<ClusterColor, PNode[]> = {
  teal: [
    { id: 0, label: 'PI3K', x: 0.10, y: 0.20, role: 'upstream' },
    { id: 1, label: 'PIP3', x: 0.25, y: 0.14, role: 'upstream' },
    { id: 2, label: 'PDK1', x: 0.22, y: 0.32, role: 'upstream' },
    { id: 3, label: 'AKT1', x: 0.42, y: 0.22, role: 'mid' },
    { id: 4, label: 'mTOR', x: 0.55, y: 0.38, role: 'mid' },
    { id: 5, label: 'TSC2', x: 0.58, y: 0.18, role: 'mid' },
    { id: 6, label: 'PTEN', x: 0.38, y: 0.48, role: 'mid' },
    { id: 7, label: 'RHEB', x: 0.50, y: 0.55, role: 'mid' },
    { id: 8, label: 'S6K1', x: 0.72, y: 0.42, role: 'target' },
    { id: 9, label: 'FOXO3', x: 0.82, y: 0.58, role: 'downstream' },
    { id: 10, label: 'BAD', x: 0.88, y: 0.72, role: 'downstream' },
    { id: 11, label: '4E-BP1', x: 0.75, y: 0.78, role: 'downstream' },
  ],
  blue: [
    { id: 0, label: 'EGF', x: 0.10, y: 0.20, role: 'upstream' },
    { id: 1, label: 'EGFR', x: 0.22, y: 0.15, role: 'upstream' },
    { id: 2, label: 'GRB2', x: 0.28, y: 0.30, role: 'upstream' },
    { id: 3, label: 'SOS1', x: 0.40, y: 0.20, role: 'mid' },
    { id: 4, label: 'RAS', x: 0.52, y: 0.32, role: 'mid' },
    { id: 5, label: 'BRAF', x: 0.60, y: 0.18, role: 'mid' },
    { id: 6, label: 'MEK1', x: 0.55, y: 0.50, role: 'mid' },
    { id: 7, label: 'RAF1', x: 0.42, y: 0.45, role: 'mid' },
    { id: 8, label: 'ERK2', x: 0.72, y: 0.40, role: 'target' },
    { id: 9, label: 'ELK1', x: 0.85, y: 0.55, role: 'downstream' },
    { id: 10, label: 'MYC', x: 0.88, y: 0.72, role: 'downstream' },
    { id: 11, label: 'FOS', x: 0.75, y: 0.78, role: 'downstream' },
  ],
  orange: [
    { id: 0, label: 'WNT3A', x: 0.12, y: 0.18, role: 'upstream' },
    { id: 1, label: 'FZD7', x: 0.28, y: 0.12, role: 'upstream' },
    { id: 2, label: 'LRP6', x: 0.30, y: 0.28, role: 'upstream' },
    { id: 3, label: 'DVL2', x: 0.45, y: 0.20, role: 'mid' },
    { id: 4, label: 'AXIN1', x: 0.52, y: 0.38, role: 'mid' },
    { id: 5, label: 'GSK3β', x: 0.60, y: 0.18, role: 'mid' },
    { id: 6, label: 'APC', x: 0.55, y: 0.55, role: 'mid' },
    { id: 7, label: 'CK1α', x: 0.40, y: 0.45, role: 'mid' },
    { id: 8, label: 'β-CAT', x: 0.72, y: 0.42, role: 'target' },
    { id: 9, label: 'TCF4', x: 0.85, y: 0.55, role: 'downstream' },
    { id: 10, label: 'MYC', x: 0.88, y: 0.72, role: 'downstream' },
    { id: 11, label: 'CCND1', x: 0.75, y: 0.78, role: 'downstream' },
  ],
  purple: [
    { id: 0, label: 'IFNγ', x: 0.10, y: 0.20, role: 'upstream' },
    { id: 1, label: 'IFNGR', x: 0.25, y: 0.14, role: 'upstream' },
    { id: 2, label: 'JAK1', x: 0.28, y: 0.30, role: 'upstream' },
    { id: 3, label: 'JAK2', x: 0.42, y: 0.22, role: 'mid' },
    { id: 4, label: 'TYK2', x: 0.55, y: 0.38, role: 'mid' },
    { id: 5, label: 'SHP2', x: 0.58, y: 0.18, role: 'mid' },
    { id: 6, label: 'SOCS1', x: 0.48, y: 0.52, role: 'mid' },
    { id: 7, label: 'PIAS1', x: 0.38, y: 0.45, role: 'mid' },
    { id: 8, label: 'STAT3', x: 0.72, y: 0.42, role: 'target' },
    { id: 9, label: 'STAT5', x: 0.85, y: 0.55, role: 'downstream' },
    { id: 10, label: 'BCL2', x: 0.88, y: 0.72, role: 'downstream' },
    { id: 11, label: 'CCND1', x: 0.75, y: 0.78, role: 'downstream' },
  ],
};

const CLUSTER_EDGES: Record<ClusterColor, PEdge[]> = {
  teal: [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 },
    { from: 3, to: 4 }, { from: 3, to: 5 }, { from: 4, to: 7 }, { from: 6, to: 4 },
    { from: 5, to: 8 }, { from: 4, to: 8 }, { from: 7, to: 8 }, { from: 8, to: 9 },
    { from: 9, to: 10 }, { from: 9, to: 11 }, { from: 8, to: 5 },
  ],
  blue: [
    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
    { from: 4, to: 5 }, { from: 5, to: 6 }, { from: 7, to: 6 }, { from: 4, to: 7 },
    { from: 6, to: 8 }, { from: 5, to: 8 }, { from: 8, to: 9 }, { from: 9, to: 10 },
    { from: 9, to: 11 }, { from: 8, to: 4 },
  ],
  orange: [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }, { from: 2, to: 3 },
    { from: 3, to: 4 }, { from: 3, to: 5 }, { from: 4, to: 6 }, { from: 7, to: 4 },
    { from: 5, to: 8 }, { from: 4, to: 8 }, { from: 6, to: 8 }, { from: 8, to: 9 },
    { from: 9, to: 10 }, { from: 9, to: 11 }, { from: 8, to: 5 },
  ],
  purple: [
    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 },
    { from: 4, to: 5 }, { from: 3, to: 6 }, { from: 7, to: 6 }, { from: 4, to: 8 },
    { from: 5, to: 8 }, { from: 8, to: 9 }, { from: 9, to: 10 }, { from: 9, to: 11 },
    { from: 8, to: 3 },
  ],
};

const TRAVERSAL_ORDERS: Record<ClusterColor, number[]> = {
  teal: [0, 1, 2, 3, 5, 4, 6, 7, 8, 9, 10, 11],
  blue: [0, 1, 2, 3, 4, 5, 7, 6, 8, 9, 10, 11],
  orange: [0, 1, 2, 3, 5, 4, 7, 6, 8, 9, 10, 11],
  purple: [0, 1, 2, 3, 4, 5, 7, 6, 8, 9, 10, 11],
};

const TARGET_ID = 8; // All clusters use id 8 as target

const BG = '#000000';
const FONT = '"DM Sans", "Inter", sans-serif';
const GREY = 'rgba(120,120,130,0.5)';

function getClusterPalette(cluster: ClusterColor) {
  const hslStr = CLUSTER_COLORS[cluster]; // e.g. 'hsl(170, 80%, 50%)'
  const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return { full: hslStr, dim: 'rgba(120,120,130,0.25)', glow: hslStr };
  const [, h, s, l] = match;
  return {
    full: `hsla(${h}, ${s}%, ${l}%, 1)`,
    dim: `hsla(${h}, ${s}%, ${l}%, 0.25)`,
    glow: `hsla(${h}, ${s}%, ${l}%, 0.6)`,
  };
}

type Phase = 'pathway' | 'traversal' | 'target';
const PHASES: { key: Phase; label: string }[] = [
  { key: 'pathway', label: 'Pathway' },
  { key: 'traversal', label: 'Traversal' },
  { key: 'target', label: 'Target' },
];
const PHASE_DURATION = { pathway: 2500, traversal: 3500, target: 3000 };

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function PathwayAnimation({ cluster = 'orange', onBack }: PathwayAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const NODES = CLUSTER_NODES[cluster];
  const EDGES = CLUSTER_EDGES[cluster];
  const TRAVERSAL_ORDER = TRAVERSAL_ORDERS[cluster];
  const palette = getClusterPalette(cluster);

  const shortLabels: Record<ClusterColor, string> = {
    teal: 'PI3K / AKT',
    blue: 'MAPK / ERK',
    orange: 'WNT / β-catenin',
    purple: 'JAK / STAT',
  };

  const stateRef = useRef({
    phase: 'pathway' as Phase,
    phaseStart: 0,
    paused: false,
    pauseTime: 0,
    nodeAppear: new Float32Array(12),
    edgeAppear: new Float32Array(15),
    traversalIdx: -1,
    litNodes: new Set<number>(),
    litEdges: new Set<number>(),
    targetHighlight: 0,
    fadeOut: 0,
  });
  const frameRef = useRef(0);
  const [phase, setPhase] = useState<Phase>('pathway');
  const [paused, setPaused] = useState(false);

  const reset = useCallback(() => {
    const s = stateRef.current;
    s.phase = 'pathway';
    s.phaseStart = performance.now();
    s.nodeAppear.fill(0);
    s.edgeAppear.fill(0);
    s.traversalIdx = -1;
    s.litNodes.clear();
    s.litEdges.clear();
    s.targetHighlight = 0;
    s.fadeOut = 0;
    setPhase('pathway');
  }, []);

  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.paused) {
      const delta = performance.now() - s.pauseTime;
      s.phaseStart += delta;
      s.paused = false;
      setPaused(false);
    } else {
      s.pauseTime = performance.now();
      s.paused = true;
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset state for new cluster
    const s = stateRef.current;
    s.phase = 'pathway';
    s.phaseStart = performance.now();
    s.nodeAppear = new Float32Array(NODES.length);
    s.edgeAppear = new Float32Array(EDGES.length);
    s.traversalIdx = -1;
    s.litNodes.clear();
    s.litEdges.clear();
    s.targetHighlight = 0;
    s.fadeOut = 0;
    setPhase('pathway');

    const draw = (now: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const sRef = stateRef.current;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (sRef.paused) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const elapsed = now - sRef.phaseStart;
      const dur = PHASE_DURATION[sRef.phase];
      const t = Math.min(elapsed / dur, 1);

      // ── Update state per phase ──
      if (sRef.phase === 'pathway') {
        NODES.forEach((_, i) => {
          const stagger = i / NODES.length;
          const nodeT = Math.max(0, Math.min(1, (t - stagger * 0.6) / 0.4));
          sRef.nodeAppear[i] = easeInOutCubic(nodeT);
        });
        EDGES.forEach((_, i) => {
          const stagger = i / EDGES.length;
          const edgeT = Math.max(0, Math.min(1, (t - 0.3 - stagger * 0.5) / 0.3));
          sRef.edgeAppear[i] = easeInOutCubic(edgeT);
        });
        if (t >= 1) {
          sRef.nodeAppear.fill(1);
          sRef.edgeAppear.fill(1);
          sRef.phase = 'traversal';
          sRef.phaseStart = now;
          setPhase('traversal');
        }
      } else if (sRef.phase === 'traversal') {
        const idx = t * TRAVERSAL_ORDER.length;
        sRef.traversalIdx = idx;
        const litCount = Math.floor(idx);
        sRef.litNodes.clear();
        sRef.litEdges.clear();
        for (let i = 0; i <= litCount && i < TRAVERSAL_ORDER.length; i++) {
          sRef.litNodes.add(TRAVERSAL_ORDER[i]);
        }
        EDGES.forEach((e, ei) => {
          if (sRef.litNodes.has(e.from) && sRef.litNodes.has(e.to)) {
            sRef.litEdges.add(ei);
          }
        });
        if (t >= 1) {
          sRef.phase = 'target';
          sRef.phaseStart = now;
          setPhase('target');
        }
      } else if (sRef.phase === 'target') {
        sRef.targetHighlight = easeInOutCubic(Math.min(t / 0.3, 1));
        if (t > 0.85) {
          sRef.fadeOut = easeInOutCubic((t - 0.85) / 0.15);
        }
        if (t >= 1) {
          reset();
        }
      }

      // ── Draw ──
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      const pad = 60;
      const gw = w - pad * 2;
      const gh = h - pad * 2 - 50;
      const px = (nx: number) => pad + nx * gw;
      const py = (ny: number) => pad + ny * gh;

      // Draw edges
      EDGES.forEach((edge, ei) => {
        const appear = sRef.edgeAppear[ei];
        if (appear <= 0) return;

        const fromNode = NODES[edge.from];
        const toNode = NODES[edge.to];
        const x1 = px(fromNode.x);
        const y1 = py(fromNode.y);
        const x2 = px(toNode.x);
        const y2 = py(toNode.y);

        const mx = lerp(x1, x2, appear);
        const my = lerp(y1, y2, appear);

        const isLit = sRef.litEdges.has(ei);
        const isTraversalPhase = sRef.phase === 'traversal' || sRef.phase === 'target';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(mx, my);

        if (isTraversalPhase && isLit) {
          ctx.strokeStyle = palette.full;
          ctx.lineWidth = 2;
          ctx.shadowColor = palette.full;
          ctx.shadowBlur = 8;
        } else if (isTraversalPhase && !isLit) {
          ctx.strokeStyle = GREY;
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = palette.dim;
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Arrowhead
        if (appear > 0.8) {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const arrowLen = 6;
          const ax = mx - arrowLen * Math.cos(angle - 0.4);
          const ay = my - arrowLen * Math.sin(angle - 0.4);
          const bx = mx - arrowLen * Math.cos(angle + 0.4);
          const by = my - arrowLen * Math.sin(angle + 0.4);

          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(ax, ay);
          ctx.moveTo(mx, my);
          ctx.lineTo(bx, by);
          ctx.strokeStyle = isLit && isTraversalPhase ? palette.full : palette.dim;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Draw nodes
      NODES.forEach((node, ni) => {
        const appear = sRef.nodeAppear[ni];
        if (appear <= 0) return;

        const cx = px(node.x);
        const cy = py(node.y);
        const isLit = sRef.litNodes.has(ni);
        const isTarget = ni === TARGET_ID;
        const isTraversalPhase = sRef.phase === 'traversal' || sRef.phase === 'target';

        let radius = 5 * appear;
        let fillColor = palette.dim;
        let glowAmount = 0;

        if (isTraversalPhase) {
          if (isTarget && sRef.phase === 'target') {
            radius = lerp(5, 14, sRef.targetHighlight);
            fillColor = palette.full;
            glowAmount = 25 * sRef.targetHighlight;
          } else if (isLit) {
            const nodeOrderIdx = TRAVERSAL_ORDER.indexOf(ni);
            const pulseT = sRef.traversalIdx - nodeOrderIdx;
            const pulse = pulseT > 0 && pulseT < 1.5 ? Math.sin(pulseT * Math.PI) * 0.4 : 0;
            radius = 5 + pulse * 4;
            fillColor = palette.glow;
            glowAmount = 6 + pulse * 10;
          } else {
            fillColor = GREY;
            radius = 4;
          }
        } else {
          fillColor = palette.dim;
          radius = 5 * appear;
        }

        if (glowAmount > 0) {
          ctx.shadowColor = palette.full;
          ctx.shadowBlur = glowAmount;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Target bracket
        if (isTarget && sRef.phase === 'target' && sRef.targetHighlight > 0.3) {
          const bAlpha = (sRef.targetHighlight - 0.3) / 0.7;
          const bPad = 22;
          const bLen = 8;
          ctx.strokeStyle = palette.full.replace(/[\d.]+\)$/, `${bAlpha})`);
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(cx - bPad, cy - bPad + bLen); ctx.lineTo(cx - bPad, cy - bPad); ctx.lineTo(cx - bPad + bLen, cy - bPad); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx + bPad - bLen, cy - bPad); ctx.lineTo(cx + bPad, cy - bPad); ctx.lineTo(cx + bPad, cy - bPad + bLen); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - bPad, cy + bPad - bLen); ctx.lineTo(cx - bPad, cy + bPad); ctx.lineTo(cx - bPad + bLen, cy + bPad); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx + bPad - bLen, cy + bPad); ctx.lineTo(cx + bPad, cy + bPad); ctx.lineTo(cx + bPad, cy + bPad - bLen); ctx.stroke();
        }

        // Label
        const labelAlpha = isTraversalPhase
          ? isLit || (isTarget && sRef.phase === 'target') ? 0.9 : 0.25
          : appear * 0.6;
        ctx.fillStyle = `rgba(255,255,255,${labelAlpha})`;
        ctx.font = `${isTarget && sRef.phase === 'target' ? '11px' : '9px'} ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, cx, cy - radius - 6);

        // "Target" label
        if (isTarget && sRef.phase === 'target' && sRef.targetHighlight > 0.5) {
          const tAlpha = (sRef.targetHighlight - 0.5) / 0.5;
          ctx.fillStyle = palette.full.replace(/[\d.]+\)$/, `${tAlpha})`);
          ctx.font = `bold 10px ${FONT}`;
          ctx.fillText('TARGET', cx, cy + radius + 16);
        }
      });

      // Pathway title (top-left)
      const titleAlpha = sRef.phase === 'pathway' ? easeInOutCubic(Math.min(t / 0.3, 1)) * 0.7 : 0.4;
      ctx.fillStyle = `rgba(255,255,255,${titleAlpha})`;
      ctx.font = `500 11px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(shortLabels[cluster], pad, pad - 20);

      // Fade-out overlay
      if (sRef.fadeOut > 0) {
        ctx.fillStyle = `rgba(0,0,0,${sRef.fadeOut})`;
        ctx.fillRect(0, 0, w, h);
      }

      // ── Step bar ──
      const barY = h - 36;
      const barW = 120;
      const barGap = 8;
      const totalBarW = PHASES.length * barW + (PHASES.length - 1) * barGap;
      const barStartX = (w - totalBarW) / 2;

      PHASES.forEach((p, i) => {
        const bx = barStartX + i * (barW + barGap);
        const isActive = p.key === sRef.phase;
        const isPast = PHASES.findIndex(pp => pp.key === sRef.phase) > i;

        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.roundRect(bx, barY, barW, 4, 2);
        ctx.fill();

        if (isActive || isPast) {
          const fillW = isPast ? barW : barW * t;
          ctx.fillStyle = palette.full;
          ctx.shadowColor = palette.full;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.roundRect(bx, barY, fillW, 4, 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = isActive ? 'rgba(255,255,255,0.8)' : isPast ? palette.glow : 'rgba(255,255,255,0.25)';
        ctx.font = `500 9px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(p.label, bx + barW / 2, barY + 18);
      });

      // Pause hint / back hint
      if (!sRef.paused) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = `9px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText('click to pause', w - 16, 20);
      } else {
        ctx.fillStyle = palette.full;
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('▶  PAUSED', w / 2, h / 2);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [cluster, reset, NODES, EDGES, TRAVERSAL_ORDER, palette, shortLabels]);

  return (
    <div className="relative w-full flex flex-col items-center">
      <canvas
        ref={canvasRef}
        onClick={togglePause}
        className="w-full aspect-[4/3] max-w-2xl cursor-pointer"
        style={{ background: BG }}
      />
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 text-xs font-mono px-3 py-1.5 rounded bg-secondary/60 hover:bg-secondary text-foreground/70 hover:text-foreground transition-all"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
