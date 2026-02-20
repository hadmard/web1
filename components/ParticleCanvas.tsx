"use client";

import { useRef, useEffect, useCallback } from "react";

const DEFAULT_COUNT = 1600;
const REDUCED_MOTION_COUNT = 280;
const HUE_ORANGE = 22;
const HUE_PURPLE = 272;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  hue: number;
  alpha: number;
  seed: number;
  mode: number;
  orbitRadius: number;
  orbitSpeed: number;
  driftScale: number;
  swayPhase: number;
  noisePhase: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function createParticles(count: number, w: number, h: number): Particle[] {
  const list: Particle[] = [];
  const numClusters = 5 + Math.floor(Math.random() * 4);
  const centers: [number, number][] = [];
  for (let c = 0; c < numClusters; c++) {
    centers.push([Math.random() * w, Math.random() * h]);
  }
  for (let i = 0; i < count; i++) {
    const seed = Math.random();
    let x: number, y: number;
    if (seed < 0.4) {
      const [cx, cy] = centers[Math.floor(Math.random() * centers.length)];
      const angle = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * Math.min(w, h) * 0.25;
      x = cx + Math.cos(angle) * r;
      y = cy + Math.sin(angle) * r;
    } else {
      x = Math.random() * w;
      y = Math.random() * h;
    }
    const mode = Math.floor(Math.random() * 4);
    list.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      baseRadius: 0.6 + Math.random() * 2.2 + (Math.random() < 0.1 ? 1.5 : 0),
      hue: Math.random() < 0.5 ? HUE_ORANGE + (Math.random() - 0.5) * 24 : HUE_PURPLE + (Math.random() - 0.5) * 36,
      alpha: 0.2 + Math.random() * 0.5,
      seed: Math.random() * 1000,
      mode,
      orbitRadius: 8 + Math.random() * 40,
      orbitSpeed: (Math.random() - 0.5) * 0.002,
      driftScale: 0.3 + Math.random() * 0.8,
      swayPhase: Math.random() * Math.PI * 2,
      noisePhase: Math.random() * Math.PI * 2,
    });
  }
  return list;
}

const TRAIL_MAX = 24;
const TRAIL_DECAY = 0.88;
const CURSOR_LERP = 0.14;
const GLOW_RADIUS = 180;
const TRAIL_RADIUS = 70;
const INERTIA_GAIN = 0.35;
const INERTIA_DECAY = 0.91;
const INERTIA_SPEED = 2.2;

export function ParticleCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[] | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const mouseTargetRef = useRef({ x: -1e4, y: -1e4 });
  const mouseLastRef = useRef({ x: -1e4, y: -1e4 });
  const mouseDisplayRef = useRef({ x: -1e4, y: -1e4 });
  const mouseVelRef = useRef({ vx: 0, vy: 0 });
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastRef = useRef(0);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number, reducedMotion: boolean) => {
      const particles = particlesRef.current;
      if (!particles) return;

      const mouseTarget = mouseTargetRef.current;
      const mouseDisplay = mouseDisplayRef.current;
      const trail = trailRef.current;
      const inside = mouseTarget.x > -1e3 && mouseTarget.y > -1e3;
      const useMouse = !reducedMotion && inside;

      ctx.clearRect(0, 0, w, h);

      const T = t * 0.001;
      const smooth = 1 - Math.exp(-CURSOR_LERP * (dt / 16));
      if (useMouse) {
        const vel = mouseVelRef.current;
        const d = dt / 16;
        mouseDisplayRef.current.x += vel.vx * d * INERTIA_SPEED;
        mouseDisplayRef.current.y += vel.vy * d * INERTIA_SPEED;
        mouseDisplayRef.current.x = lerp(mouseDisplayRef.current.x, mouseTarget.x, smooth);
        mouseDisplayRef.current.y = lerp(mouseDisplayRef.current.y, mouseTarget.y, smooth);
        mouseVelRef.current.vx *= INERTIA_DECAY;
        mouseVelRef.current.vy *= INERTIA_DECAY;
      }
      const cx = mouseDisplayRef.current.x;
      const cy = mouseDisplayRef.current.y;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const t1 = T + p.seed;
        let dx = 0, dy = 0;
        switch (p.mode) {
          case 0:
            dx = Math.sin(t1 * 0.7 + p.x * 0.005) * 0.4 * p.driftScale;
            dy = Math.cos(t1 * 0.5 + p.y * 0.004) * 0.35 * p.driftScale;
            break;
          case 1: {
            const angle = t1 * 2 + p.noisePhase;
            dx = -Math.sin(angle) * 0.25 * p.driftScale;
            dy = Math.cos(angle) * 0.25 * p.driftScale;
            break;
          }
          case 2:
            dx = Math.sin(t1 * 1.2 + p.swayPhase) * 0.8 * p.driftScale;
            dy = Math.cos(t1 * 0.9 + p.swayPhase * 1.3) * 0.6 * p.driftScale;
            break;
          default: {
            const n1 = Math.sin(t1 * 0.4 + p.x * 0.01) * Math.cos(t1 * 0.3 + p.y * 0.008);
            const n2 = Math.cos(t1 * 0.35 + p.y * 0.012) * Math.sin(t1 * 0.45 + p.x * 0.007);
            dx = (n1 + n2) * 0.5 * p.driftScale;
            dy = (n2 - n1) * 0.4 * p.driftScale;
          }
        }
        p.x += p.vx + dx;
        p.y += p.vy + dy;

        const margin = 20;
        if (p.x < -margin || p.x > w + margin) { p.vx *= -0.96; p.x = Math.max(-margin, Math.min(w + margin, p.x)); }
        if (p.y < -margin || p.y > h + margin) { p.vy *= -0.96; p.y = Math.max(-margin, Math.min(h + margin, p.y)); }

        let drawR = p.baseRadius;
        let alpha = p.alpha;
        if (useMouse && cx > 0 && cy > 0) {
          const dist = Math.hypot(cx - p.x, cy - p.y);
          if (dist < GLOW_RADIUS) {
            const t0 = easeOutCubic(1 - dist / GLOW_RADIUS);
            drawR = p.baseRadius * (1 + t0 * 1.4);
            alpha = Math.min(0.9, p.alpha * (1 + t0 * 0.8));
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, drawR, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 78%, 55%, ${alpha})`;
        ctx.fill();
      }

      if (useMouse && cx > 0 && cy > 0) {
        for (let i = trail.length - 1; i >= 0; i--) {
          const pt = trail[i];
          pt.alpha *= TRAIL_DECAY;
          if (pt.alpha < 0.02) {
            trail.splice(i, 1);
            continue;
          }
          const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, TRAIL_RADIUS);
          g.addColorStop(0, `rgba(255,230,200,${pt.alpha * 0.35})`);
          g.addColorStop(0.5, `rgba(255,180,120,${pt.alpha * 0.12})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.fillRect(pt.x - TRAIL_RADIUS, pt.y - TRAIL_RADIUS, TRAIL_RADIUS * 2, TRAIL_RADIUS * 2);
        }

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, GLOW_RADIUS);
        g.addColorStop(0, "rgba(255,255,255,0.2)");
        g.addColorStop(0.15, "rgba(255,220,180,0.12)");
        g.addColorStop(0.4, "rgba(255,180,100,0.06)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
    },
    []
  );

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = reducedMotion ? REDUCED_MOTION_COUNT : DEFAULT_COUNT;
    let w = container.clientWidth;
    let h = container.clientHeight;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const resize = () => {
      w = container.clientWidth;
      h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      const cw = Math.floor(w * dpr);
      const ch = Math.floor(h * dpr);
      canvas.width = cw;
      canvas.height = ch;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      if (!particlesRef.current) {
        particlesRef.current = createParticles(count, w, h);
      } else {
        const list = particlesRef.current;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          p.x = Math.min(p.x, w + 20);
          p.y = Math.min(p.y, h + 20);
        }
      }
    };

    let ticking = false;
    const onResize = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          resize();
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleMouse = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const last = mouseLastRef.current;
        if (last.x > -1e3 && last.y > -1e3) {
          const vx = (x - last.x) * INERTIA_GAIN;
          const vy = (y - last.y) * INERTIA_GAIN;
          mouseVelRef.current.vx = vx;
          mouseVelRef.current.vy = vy;
        }
        mouseLastRef.current.x = x;
        mouseLastRef.current.y = y;
        mouseTargetRef.current.x = x;
        mouseTargetRef.current.y = y;
        const trail = trailRef.current;
        trail.push({ x, y, alpha: 1 });
        if (trail.length > TRAIL_MAX) trail.shift();
      } else {
        mouseTargetRef.current.x = -1e4;
        mouseTargetRef.current.y = -1e4;
        mouseLastRef.current.x = -1e4;
        mouseLastRef.current.y = -1e4;
      }
    };

    resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", handleMouse, { passive: true });

    const loop = (now: number) => {
      const dt = Math.min(now - lastRef.current, 64);
      lastRef.current = now;
      timeRef.current += dt;
      draw(ctx, w, h, timeRef.current, dt, reducedMotion);
      rafRef.current = requestAnimationFrame(loop);
    };
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(rafRef.current);
      particlesRef.current = null;
      trailRef.current = [];
    };
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none contain-strict"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full pointer-events-none"
        style={{ display: "block", contain: "strict" }}
      />
    </div>
  );
}
