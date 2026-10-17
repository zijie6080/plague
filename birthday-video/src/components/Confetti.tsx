import React, { useLayoutEffect, useRef } from "react";
import { config } from "../config";
import { hash01, range } from "../lib/prng";
import { FPS } from "../timeline";

const W = config.width;
const H = config.height;
const P = config.colors.party;

export type Burst = { at: number; x: number; y: number; n: number; power: number; seed: number };
export type Rain = { from: number; to: number; n: number; seed: number; prefill: number };

// 解析式运动（带空气阻力的抛体）：位置只取决于 t，不依赖上一帧
function motion(t: number, vx: number, vy: number, k: number, g: number) {
  const e = (1 - Math.exp(-k * t)) / k;
  return { x: vx * e, y: (vy - g / k) * e + (g / k) * t };
}

function drawPiece(ctx: CanvasRenderingContext2D, kind: number, size: number, color: string, flip: number) {
  ctx.fillStyle = color;
  if (kind < 0.55) {
    ctx.fillRect(-size, (-size * 0.55) * flip, size * 2, size * 1.1 * flip);
  } else if (kind < 0.8) {
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.75, Math.max(0.5, size * 0.75 * Math.abs(flip)), 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.55;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-size * 1.4, 0);
    ctx.quadraticCurveTo(-size * 0.5, -size * 1.2 * flip, 0, 0);
    ctx.quadraticCurveTo(size * 0.5, size * 1.2 * flip, size * 1.4, 0);
    ctx.stroke();
  }
}

export const Confetti: React.FC<{ frame: number; bursts?: Burst[]; rain?: Rain; freeze?: number }> = ({ frame, bursts = [], rain, freeze }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const f = freeze !== undefined ? Math.min(frame, freeze) : frame;
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    for (const b of bursts) {
      const t = (f - b.at) / FPS;
      if (t < 0 || t > 4) continue;
      for (let i = 0; i < b.n; i++) {
        const h = (s: number) => hash01(i, b.seed * 97 + s);
        const a = h(1) * Math.PI * 2;
        const sp = b.power * (0.35 + 0.65 * Math.sqrt(h(2)));
        const vx = Math.cos(a) * sp;
        const vy = Math.sin(a) * sp - b.power * 0.35;
        const m = motion(t, vx, vy, 2.6, 1500);
        const sway = Math.sin(t * range(h(3), 3, 7) + h(4) * 6) * 22 * Math.min(1, t * 1.5);
        const x = b.x + m.x + sway;
        const y = b.y + m.y;
        if (y > H + 40) continue;
        const life = 1 - Math.max(0, (t - 2.6) / 1.2);
        if (life <= 0) continue;
        ctx.save();
        ctx.globalAlpha = life;
        ctx.translate(x, y);
        ctx.rotate(h(5) * 6 + t * range(h(6), -6, 6));
        drawPiece(ctx, h(7), range(h(8), 7, 13), P[Math.floor(h(9) * P.length)], Math.cos(t * range(h(10), 6, 14) + h(11) * 6));
        ctx.restore();
      }
    }
    if (rain) {
      for (let i = 0; i < rain.n; i++) {
        const h = (s: number) => hash01(i, rain.seed * 131 + s);
        const pre = i < rain.prefill;
        const born = pre ? rain.from : rain.from + h(1) * (rain.to - rain.from);
        const t = (f - born) / FPS;
        if (t < 0) continue;
        const x0 = h(2) * W;
        const y0 = pre ? -40 - h(3) * H * 1.1 : -40;
        const vt = range(h(4), 170, 320);
        const y = y0 + vt * t + (pre ? 260 * Math.min(t, 1.2) : 0);
        if (y > H + 40) continue;
        const x = x0 + Math.sin(t * range(h(5), 1.5, 3) + h(6) * 6) * range(h(7), 20, 60);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(h(8) * 6 + t * range(h(9), -3, 3));
        drawPiece(ctx, h(10), range(h(11), 7, 12), P[Math.floor(h(12) * P.length)], Math.cos(t * range(h(13), 4, 9) + h(14) * 6));
        ctx.restore();
      }
    }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, pointerEvents: "none" }} />;
};
