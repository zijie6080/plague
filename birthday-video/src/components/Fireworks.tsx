import React, { useLayoutEffect, useRef } from "react";
import { config } from "../config";
import { hash01, range } from "../lib/prng";
import { FPS, s5 } from "../timeline";

const W = config.width;
const H = config.height;
const P = config.colors.party;

// 火星用字：S1 原话里的字 + 生日快乐20
const POOL: string[] = (() => {
  const set: string[] = [];
  for (const q of config.quotes) for (const c of q) if (!"，。、“”".includes(c) && !set.includes(c)) set.push(c);
  return [...set, ...config.fireworkExtraChars, ...config.fireworkExtraChars];
})();

function motion(t: number, vx: number, vy: number, k: number, g: number) {
  const e = (1 - Math.exp(-k * t)) / k;
  return { x: vx * e, y: (vy - g / k) * e + (g / k) * t };
}

// "20" 的目标点：离屏画一次，按网格取样（结果缓存，确定性）
let targetsCache: { x: number; y: number }[] | null = null;
function targets(): { x: number; y: number }[] {
  if (targetsCache) return targetsCache;
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 700;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `640px ${config.fonts.title}`;
  ctx.fillText(config.fireworkFinal, 450, 370);
  const d = ctx.getImageData(0, 0, 900, 700).data;
  const pts: { x: number; y: number }[] = [];
  const step = 30;
  for (let y = 0; y < 700; y += step)
    for (let x = 0; x < 900; x += step) {
      const row = Math.floor(y / step);
      const xx = x + (row % 2 ? step / 2 : 0);
      if (xx >= 900) continue;
      if (d[(y * 900 + xx) * 4 + 3] > 128) pts.push({ x: xx - 450, y: y - 370 });
    }
  targetsCache = pts;
  return pts;
}

type Shot = { launch: number; burst: number; x: number; y: number };

function drawRocket(ctx: CanvasRenderingContext2D, f: number, s: Shot, i: number) {
  if (f < s.launch || f >= s.burst) return;
  const x0 = s.x + (hash01(i, 3) - 0.5) * 160;
  for (let k = 0; k < 10; k++) {
    const ff = f - k * 0.8;
    if (ff < s.launch) break;
    const u = (ff - s.launch) / (s.burst - s.launch);
    const e = 1 - (1 - u) * (1 - u);
    const x = x0 + (s.x - x0) * e + Math.sin(u * 9 + i) * 4;
    const y = H + 30 + (s.y - H - 30) * e;
    ctx.globalAlpha = (1 - k / 10) * 0.9;
    ctx.fillStyle = k === 0 ? "#FFF6E5" : P[2];
    ctx.beginPath();
    ctx.arc(x, y, (k === 0 ? 7 : 5) * (1 - k / 14), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGlyph(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, size: number, color: string, alpha: number, rot: number) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px ${config.fonts.title}`;
  ctx.fillStyle = color;
  ctx.fillText(ch, 0, 0);
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = "#FFFDF5";
  ctx.font = `${size * 0.55}px ${config.fonts.title}`;
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

export const Fireworks: React.FC<{ frame: number }> = ({ frame }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalCompositeOperation = "lighter";
    const all = [...s5.shots, s5.final];
    all.forEach((s, i) => drawRocket(ctx, frame, s, i));
    // 普通烟花
    s5.shots.forEach((s, si) => {
      const t = (frame - s.burst) / FPS;
      if (t < 0 || t > 2.2) return;
      const main = P[(si * 2 + 1) % 6];
      const alt = P[(si * 2 + 4) % 6];
      const n = 46;
      // 炸开的一瞬间的闪光
      if (t < 0.15) {
        ctx.globalAlpha = (1 - t / 0.15) * 0.8;
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 260);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(s.x - 260, s.y - 260, 520, 520);
        ctx.globalAlpha = 1;
      }
      for (let i = 0; i < n; i++) {
        const h = (k: number) => hash01(i, si * 71 + k);
        const a = (i / n) * Math.PI * 2 + h(1) * 0.2;
        const sp = range(h(2), 520, 780) * (i % 3 === 0 ? 0.62 : 1);
        const m = motion(t, Math.cos(a) * sp, Math.sin(a) * sp, 1.9, 300);
        const life = 1 - Math.pow(Math.min(1, t / 2.0), 1.6);
        const twinkle = t > 1.1 ? 0.55 + 0.45 * Math.sin(frame * 1.7 + i * 2.1) : 1;
        const ch = POOL[Math.floor(h(3) * POOL.length)];
        drawGlyph(ctx, ch, s.x + m.x, s.y + m.y, range(h(4), 32, 46), h(5) < 0.7 ? main : alt, life * twinkle, (h(6) - 0.5) * 0.6 + t * (h(7) - 0.5));
      }
    });
    // 最后一发：火星拼成"20"
    const fs = s5.final;
    const tf = frame - fs.burst;
    if (tf >= 0) {
      const pts = targets();
      const form = s5.finalForm;
      const hold = s5.finalHold;
      if (tf < 4) {
        ctx.globalAlpha = (1 - tf / 4) * 0.9;
        const g = ctx.createRadialGradient(fs.x, fs.y, 0, fs.x, fs.y, 340);
        g.addColorStop(0, "#FFFFFF");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(fs.x - 340, fs.y - 340, 680, 680);
        ctx.globalAlpha = 1;
      }
      pts.forEach((p, i) => {
        const h = (k: number) => hash01(i, 900 + k);
        const delay = h(1) * 4;
        const u = Math.min(1, Math.max(0, (tf - delay) / form));
        const e = 1 - Math.pow(1 - u, 3);
        // 先往外冲一点再收回到目标点
        const a = Math.atan2(p.y, p.x) + (h(2) - 0.5);
        const over = Math.sin(Math.PI * u) * 90;
        let x = fs.x + p.x * e + Math.cos(a) * over;
        let y = fs.y + p.y * e + Math.sin(a) * over;
        let alpha = 1;
        const tFall = (tf - form - hold) / FPS;
        if (tFall > 0) {
          const m = motion(tFall, (h(3) - 0.5) * 160, -h(4) * 120, 1.2, 700);
          x += m.x;
          y += m.y;
          alpha = Math.max(0, 1 - tFall / 1.0);
        } else if (u >= 1) {
          alpha = 0.75 + 0.25 * Math.sin(frame * 1.3 + i);
        }
        const ch = i % 3 === 0 ? config.fireworkExtraChars[i % 6] : POOL[Math.floor(h(5) * POOL.length)];
        drawGlyph(ctx, ch, x, y, 30, P[i % 6], alpha, (h(6) - 0.5) * 0.5);
      });
    }
    ctx.globalCompositeOperation = "source-over";
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
};
