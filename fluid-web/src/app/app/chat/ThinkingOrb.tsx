"use client";

// The "breathing" orb that stands in for Fluid in the thread.
//
// Ported from the design bundle's thinking-orb.js, which is itself a
// bundler-free port of Jakubantalik/thinking-orbs (MIT). The ring painter and
// its tuned preset are kept as they were — the numbers are the design, and
// there is nothing to gain from rederiving them.

import { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  z: number;
  r: number;
  white: number;
  a: number;
}

interface RingOptions {
  lanes: number;
  segs: number;
  ghostN: number;
  faceOn: number;
  rBase: number;
  rDepth: number;
  rsPow: number;
  rMin: number;
  spin: number;
  bandMul: number;
  wobMul: number;
  rSizeMul: number;
}

function fibDir(i: number, n: number): [number, number, number] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (2 * (i + 0.5)) / n;
  const rad = Math.sqrt(1 - y * y);
  const a = i * golden;
  return [rad * Math.cos(a), y, rad * Math.sin(a)];
}

function makeProj(yaw: number, tilt: number, cx: number, cy: number, scale: number) {
  const st = Math.sin(tilt);
  const ct = Math.cos(tilt);
  const sy = Math.sin(yaw);
  const cyw = Math.cos(yaw);
  return (x: number, y: number, z: number): [number, number, number] => {
    const x1 = x * cyw + z * sy;
    const z1 = -x * sy + z * cyw;
    const y1 = y * ct - z1 * st;
    const z2 = y * st + z1 * ct;
    return [cx + x1 * scale, cy - y1 * scale, z2];
  };
}

function paint(ctx: CanvasRenderingContext2D, dots: Dot[], dark: boolean, rMin: number) {
  dots.sort((a, b) => a.z - b.z);
  for (const d of dots) {
    if (d.a < 0.02) continue;
    const w = Math.min(1, Math.max(0, d.white));
    const g = Math.round((dark ? 1 - w : w) * 255);
    ctx.fillStyle = `rgba(${g},${g},${g},${d.a})`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, Math.max(rMin, d.r), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRibbon(
  ctx: CanvasRenderingContext2D,
  size: number,
  t: number,
  dark: boolean,
  o: RingOptions,
) {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * 0.78;
  const camTilt = 0.3;
  const pt = makeProj(t * 0.1 * o.spin, camTilt, cx, cy, 1);
  const rs = Math.pow(size / 300, o.rsPow) * o.rSizeMul;

  const dots: Dot[] = [];
  for (let i = 0; i < o.ghostN; i++) {
    const d = fibDir(i, o.ghostN);
    const g = pt(d[0] * R, d[1] * R, d[2] * R);
    const gdepth = (g[2] / R + 1) / 2;
    dots.push({ x: g[0], y: g[1], z: g[2], r: 0.8 * rs, white: 0.78, a: 0.1 + 0.22 * gdepth });
  }

  const ya = t * 0.24 * o.spin;
  const ta = o.faceOn ? -camTilt : 0.55 + 0.3 * Math.sin(t * 0.18) * o.spin;
  const ux = Math.cos(ya);
  const uy = 0;
  const uz = Math.sin(ya);
  const vx = -uz * Math.sin(ta);
  const vy = Math.cos(ta);
  const vz = ux * Math.sin(ta);
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;

  const wobAmp = 0.23 * o.wobMul;
  const baseR = o.faceOn ? R / (1 + 0.85 * wobAmp) : R;
  const lanes = Math.max(1, Math.round(o.lanes * o.bandMul));

  for (let w = 0; w < lanes; w++) {
    const laneOff = (w - (lanes - 1) / 2) * 0.075;
    const edge = Math.abs(w - (lanes - 1) / 2) / Math.max(1, (lanes - 1) / 2);
    for (let k = 0; k < o.segs; k++) {
      const a = (k / o.segs) * 2 * Math.PI;
      const wob =
        (0.16 * Math.sin(a * 3 - t * 1.7 + w * 0.22) + 0.07 * Math.sin(a * 5 + t * 1.1)) * o.wobMul;
      const radial = o.faceOn ? 1 + wob : 1;
      const off = o.faceOn ? laneOff : laneOff + wob;
      const x = ux * Math.cos(a) + vx * Math.sin(a) + nx * off;
      const y = uy * Math.cos(a) + vy * Math.sin(a) + ny * off;
      const z = uz * Math.cos(a) + vz * Math.sin(a) + nz * off;
      const l = Math.sqrt(x * x + y * y + z * z);
      const rr = baseR * radial;
      const p = pt((x / l) * rr, (y / l) * rr, (z / l) * rr);
      const depth = (p[2] / R + 1) / 2;
      dots.push({
        x: p[0],
        y: p[1],
        z: p[2],
        r: (o.rBase + o.rDepth * depth) * (1 - 0.25 * edge) * rs,
        white: 0.52 - 0.44 * depth + 0.18 * edge,
        a: 0.4 + 0.6 * depth,
      });
    }
  }
  paint(ctx, dots, dark, o.rMin);
}

// The 20px preset from the bundle, with its count and radius scaling already
// applied (count 0.028 over lanes/segs, size 1.622 over the radii).
const PRESET_20: { speed: number; opts: RingOptions } = {
  speed: 3.78,
  opts: {
    lanes: 2,
    segs: 15,
    ghostN: 0,
    faceOn: 1,
    rBase: 1.1,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3,
    spin: 0,
    bandMul: 3.968,
    wobMul: 0.565,
    rSizeMul: 1.622,
  },
};

export function ThinkingOrb({ size = 20, speed = 0.5 }: { size?: number; speed?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const effSpeed = PRESET_20.speed * speed;
    const frame = (tSec: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      drawRibbon(ctx, size, tSec, false, PRESET_20.opts);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frame(0.6);
      return;
    }

    let raf = 0;
    const loop = () => {
      frame((Date.now() / 1000) * effSpeed);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [size, speed]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Fluid is thinking"
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
