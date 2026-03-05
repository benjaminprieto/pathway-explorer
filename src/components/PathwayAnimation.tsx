import { useRef, useEffect, useState, useCallback } from 'react';

// ── Hardcoded biologically-plausible WNT/β-catenin-inspired network ──
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

const NODES: PNode[] = [
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
];

// Directed edges – upstream → downstream, with a feedback loop
const EDGES: PEdge[] = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 3 },
  { from: 3, to: 4 },
  { from: 3, to: 5 },
  { from: 4, to: 6 },
  { from: 7, to: 4 },
  { from: 5, to: 8 },
  { from: 4, to: 8 },
  { from: 6, to: 8 },
  { from: 8, to: 9 },
  { from: 9, to: 10 },
  { from: 9, to: 11 },
  // feedback loop
  { from: 8, to: 5 },
];

// Signal traversal order (BFS-ish path through the network)
const TRAVERSAL_ORDER = [0, 1, 2, 3, 5, 4, 7, 6, 8, 9, 10, 11];

const TARGET_IDS = [8]; // β-catenin

// ── Palette ──
const TEAL = 'rgba(62,207,178,1)';
const TEAL_DIM = 'rgba(62,207,178,0.25)';
const TEAL_GLOW = 'rgba(62,207,178,0.6)';
const GREY = 'rgba(120,120,130,0.5)';
const BG = '#000000';
const FONT = '"DM Sans", sans-serif';

// ── Phase config ──
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

export default function PathwayAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    phase: 'pathway' as Phase,
    phaseStart: 0,
    paused: false,
    pauseTime: 0,
    // per-node appearance progress [0-1]
    nodeAppear: new Float32Array(NODES.length),
    // per-edge appearance progress [0-1]
    edgeAppear: new Float32Array(EDGES.length),
    // traversal progress index (fractional)
    traversalIdx: -1,
    // lit nodes set
    litNodes: new Set<number>(),
    // lit edges set
    litEdges: new Set<number>(),
    // target highlight progress [0-1]
    targetHighlight: 0,
    // fade-out progress for loop restart
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

    stateRef.current.phaseStart = performance.now();

    const draw = (now: number) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const s = stateRef.current;

      // DPR scaling
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (s.paused) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      const elapsed = now - s.phaseStart;
      const dur = PHASE_DURATION[s.phase];
      const t = Math.min(elapsed / dur, 1);

      // ── Update state per phase ──
      if (s.phase === 'pathway') {
        // Stagger node appearances
        NODES.forEach((_, i) => {
          const stagger = i / NODES.length;
          const nodeT = Math.max(0, Math.min(1, (t - stagger * 0.6) / 0.4));
          s.nodeAppear[i] = easeInOutCubic(nodeT);
        });
        // Stagger edge appearances (after nodes start showing)
        EDGES.forEach((_, i) => {
          const stagger = i / EDGES.length;
          const edgeT = Math.max(0, Math.min(1, (t - 0.3 - stagger * 0.5) / 0.3));
          s.edgeAppear[i] = easeInOutCubic(edgeT);
        });
        if (t >= 1) {
          s.nodeAppear.fill(1);
          s.edgeAppear.fill(1);
          s.phase = 'traversal';
          s.phaseStart = now;
          setPhase('traversal');
        }
      } else if (s.phase === 'traversal') {
        const idx = t * TRAVERSAL_ORDER.length;
        s.traversalIdx = idx;
        // Light up nodes and connecting edges
        const litCount = Math.floor(idx);
        s.litNodes.clear();
        s.litEdges.clear();
        for (let i = 0; i <= litCount && i < TRAVERSAL_ORDER.length; i++) {
          s.litNodes.add(TRAVERSAL_ORDER[i]);
        }
        // Light edges whose both endpoints are lit
        EDGES.forEach((e, ei) => {
          if (s.litNodes.has(e.from) && s.litNodes.has(e.to)) {
            s.litEdges.add(ei);
          }
        });
        if (t >= 1) {
          s.phase = 'target';
          s.phaseStart = now;
          setPhase('target');
        }
      } else if (s.phase === 'target') {
        s.targetHighlight = easeInOutCubic(Math.min(t / 0.3, 1));
        // After hold, fade out and restart
        if (t > 0.85) {
          s.fadeOut = easeInOutCubic((t - 0.85) / 0.15);
        }
        if (t >= 1) {
          reset();
        }
      }

      // ── Draw ──
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);

      // Map normalized coords to canvas with padding
      const pad = 60;
      const gw = w - pad * 2;
      const gh = h - pad * 2 - 50; // leave room for step bar
      const px = (nx: number) => pad + nx * gw;
      const py = (ny: number) => pad + ny * gh;

      // Draw edges
      EDGES.forEach((edge, ei) => {
        const appear = s.edgeAppear[ei];
        if (appear <= 0) return;

        const fromNode = NODES[edge.from];
        const toNode = NODES[edge.to];
        const x1 = px(fromNode.x);
        const y1 = py(fromNode.y);
        const x2 = px(toNode.x);
        const y2 = py(toNode.y);

        // Partially draw edge based on appear
        const mx = lerp(x1, x2, appear);
        const my = lerp(y1, y2, appear);

        const isLit = s.litEdges.has(ei);
        const isTraversalPhase = s.phase === 'traversal' || s.phase === 'target';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(mx, my);

        if (isTraversalPhase && isLit) {
          ctx.strokeStyle = TEAL;
          ctx.lineWidth = 2;
          ctx.shadowColor = TEAL;
          ctx.shadowBlur = 8;
        } else if (isTraversalPhase && !isLit) {
          ctx.strokeStyle = GREY;
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = TEAL_DIM;
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
          ctx.strokeStyle = isLit && isTraversalPhase ? TEAL : TEAL_DIM;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Draw nodes
      NODES.forEach((node, ni) => {
        const appear = s.nodeAppear[ni];
        if (appear <= 0) return;

        const cx = px(node.x);
        const cy = py(node.y);
        const isLit = s.litNodes.has(ni);
        const isTarget = TARGET_IDS.includes(ni);
        const isTraversalPhase = s.phase === 'traversal' || s.phase === 'target';

        let radius = 5 * appear;
        let fillColor = TEAL_DIM;
        let glowAmount = 0;

        if (isTraversalPhase) {
          if (isTarget && s.phase === 'target') {
            radius = lerp(5, 14, s.targetHighlight);
            fillColor = TEAL;
            glowAmount = 25 * s.targetHighlight;
          } else if (isLit) {
            // Pulse when just reached
            const nodeOrderIdx = TRAVERSAL_ORDER.indexOf(ni);
            const pulseT = s.traversalIdx - nodeOrderIdx;
            const pulse = pulseT > 0 && pulseT < 1.5 ? Math.sin(pulseT * Math.PI) * 0.4 : 0;
            radius = 5 + pulse * 4;
            fillColor = TEAL_GLOW;
            glowAmount = 6 + pulse * 10;
          } else {
            fillColor = GREY;
            radius = 4;
          }
        } else {
          // Pathway phase – all teal
          fillColor = TEAL_DIM;
          radius = 5 * appear;
        }

        if (glowAmount > 0) {
          ctx.shadowColor = TEAL;
          ctx.shadowBlur = glowAmount;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Target bracket
        if (isTarget && s.phase === 'target' && s.targetHighlight > 0.3) {
          const bAlpha = (s.targetHighlight - 0.3) / 0.7;
          const bPad = 22;
          const bLen = 8;
          ctx.strokeStyle = `rgba(62,207,178,${bAlpha})`;
          ctx.lineWidth = 2;
          // top-left bracket
          ctx.beginPath();
          ctx.moveTo(cx - bPad, cy - bPad + bLen);
          ctx.lineTo(cx - bPad, cy - bPad);
          ctx.lineTo(cx - bPad + bLen, cy - bPad);
          ctx.stroke();
          // top-right
          ctx.beginPath();
          ctx.moveTo(cx + bPad - bLen, cy - bPad);
          ctx.lineTo(cx + bPad, cy - bPad);
          ctx.lineTo(cx + bPad, cy - bPad + bLen);
          ctx.stroke();
          // bottom-left
          ctx.beginPath();
          ctx.moveTo(cx - bPad, cy + bPad - bLen);
          ctx.lineTo(cx - bPad, cy + bPad);
          ctx.lineTo(cx - bPad + bLen, cy + bPad);
          ctx.stroke();
          // bottom-right
          ctx.beginPath();
          ctx.moveTo(cx + bPad - bLen, cy + bPad);
          ctx.lineTo(cx + bPad, cy + bPad);
          ctx.lineTo(cx + bPad, cy + bPad - bLen);
          ctx.stroke();
        }

        // Label
        const labelAlpha = isTraversalPhase
          ? isLit || (isTarget && s.phase === 'target') ? 0.9 : 0.25
          : appear * 0.6;
        ctx.fillStyle = `rgba(255,255,255,${labelAlpha})`;
        ctx.font = `${isTarget && s.phase === 'target' ? '11px' : '9px'} ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, cx, cy - radius - 6);

        // "Target" label
        if (isTarget && s.phase === 'target' && s.targetHighlight > 0.5) {
          const tAlpha = (s.targetHighlight - 0.5) / 0.5;
          ctx.fillStyle = `rgba(62,207,178,${tAlpha})`;
          ctx.font = `bold 10px ${FONT}`;
          ctx.fillText('TARGET', cx, cy + radius + 16);
        }
      });

      // Pathway title (top-left)
      if (s.phase === 'pathway') {
        const titleAlpha = easeInOutCubic(Math.min(t / 0.3, 1));
        ctx.fillStyle = `rgba(255,255,255,${titleAlpha * 0.7})`;
        ctx.font = `500 11px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText('WNT / β-catenin', pad, pad - 20);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = `500 11px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText('WNT / β-catenin', pad, pad - 20);
      }

      // Fade-out overlay for loop restart
      if (s.fadeOut > 0) {
        ctx.fillStyle = `rgba(0,0,0,${s.fadeOut})`;
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
        const isActive = p.key === s.phase;
        const isPast = PHASES.findIndex(pp => pp.key === s.phase) > i;

        // Track background
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.roundRect(bx, barY, barW, 4, 2);
        ctx.fill();

        // Progress fill
        if (isActive || isPast) {
          const fillW = isPast ? barW : barW * t;
          ctx.fillStyle = TEAL;
          ctx.shadowColor = TEAL;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.roundRect(bx, barY, fillW, 4, 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Label
        ctx.fillStyle = isActive ? 'rgba(255,255,255,0.8)' : isPast ? 'rgba(62,207,178,0.6)' : 'rgba(255,255,255,0.25)';
        ctx.font = `500 9px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(p.label, bx + barW / 2, barY + 18);
      });

      // Pause icon hint (top-right)
      if (!s.paused) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = `9px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText('click to pause', w - 16, 20);
      } else {
        ctx.fillStyle = TEAL;
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('▶  PAUSED', w / 2, h / 2);
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reset]);

  return (
    <canvas
      ref={canvasRef}
      onClick={togglePause}
      className="w-full aspect-[4/3] max-w-2xl cursor-pointer rounded-lg"
      style={{ background: BG }}
    />
  );
}
