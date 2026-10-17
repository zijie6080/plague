// Canvas 2D 叠加层：光尘、彩纸屑、火苗与光晕。全部是 frame 的纯函数（带种子的 PRNG）。
import React, { useLayoutEffect, useRef } from "react";
import { BASE, PALETTE } from "../config";
import { fbm1, prng } from "./rand";
import { darken, lighten } from "./paper";

type Draw = (ctx: CanvasRenderingContext2D) => void;

const CanvasLayer: React.FC<{ draw: Draw; deps: unknown[]; blend?: React.CSSProperties["mixBlendMode"]; opacity?: number; w?: number; h?: number; style?: React.CSSProperties }> = ({
  draw,
  deps,
  blend,
  opacity = 1,
  w = 1920,
  h = 1080,
  style,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    draw(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{ position: "absolute", left: 0, top: 0, width: w, height: h, mixBlendMode: blend, opacity, pointerEvents: "none", ...style }}
    />
  );
};

/* ---------------- 光尘 ---------------- */
export const DustCanvas: React.FC<{
  f: number;
  count?: number;
  seed?: number;
  intensity?: number;
  /** 只在某个多边形区域内显示（例如投影光束） */
  clip?: [number, number][];
  color?: string;
  region?: { x: number; y: number; w: number; h: number };
}> = ({ f, count = 46, seed = 1, intensity = 1, clip, color = "#FFE2B0", region = { x: 0, y: 0, w: 1920, h: 1080 } }) => (
  <CanvasLayer
    deps={[f, count, seed, intensity, JSON.stringify(clip), color]}
    blend="screen"
    draw={(ctx) => {
      if (intensity <= 0) return;
      const r = prng(seed * 1013);
      if (clip) {
        ctx.beginPath();
        clip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.clip();
      }
      for (let i = 0; i < count; i++) {
        const x0 = r() * region.w;
        const y0 = r() * region.h;
        const vx = (r() - 0.35) * 0.55;
        const vy = -0.15 - r() * 0.35;
        const size = 1.4 + r() * r() * 5.5;
        const ph = r() * 100;
        const tw = 0.5 + 0.5 * Math.sin(f * (0.04 + r() * 0.05) + ph);
        const x = region.x + ((((x0 + vx * f + fbm1(f * 0.012 + ph, i) * 40) % region.w) + region.w) % region.w);
        const y = region.y + ((((y0 + vy * f + fbm1(f * 0.01 + ph + 7, i) * 30) % region.h) + region.h) % region.h);
        const a = (0.18 + 0.55 * tw) * intensity;
        const g = ctx.createRadialGradient(x, y, 0, x, y, size * 3.2);
        g.addColorStop(0, `rgba(255,236,200,${a})`);
        g.addColorStop(0.35, hexA(color, a * 0.55));
        g.addColorStop(1, hexA(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, size * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }}
  />
);

const hexA = (hex: string, a: number) => {
  const s = hex.replace("#", "");
  const n = parseInt(s, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(4)})`;
};

/* ---------------- 彩纸屑 ---------------- */
const CONFETTI_COLORS = [PALETTE.vermilion, PALETTE.apricot, PALETTE.sage, PALETTE.fogBlue, PALETTE.sakura, PALETTE.lilac, PALETTE.cream, PALETTE.pine];

export interface ConfettiProps {
  t: number; // 自发射起的帧数（<0 不画）
  seed?: number;
  count?: number;
  mode: "burst" | "fall";
  x?: number; // burst 原点 / fall 区域
  y?: number;
  spread?: number; // burst 角度范围（弧度）
  angle?: number; // burst 主方向（弧度，-PI/2 向上）
  power?: number;
  width?: number; // fall 区域宽度
  fade?: [number, number];
}

export const ConfettiCanvas: React.FC<ConfettiProps> = (p) => (
  <CanvasLayer
    deps={[p.t, p.seed, p.count, p.mode, p.x, p.y]}
    draw={(ctx) => {
      if (p.t < 0) return;
      const r = prng((p.seed ?? 7) * 7717);
      const n = p.count ?? 90;
      const t = p.t;
      const fadeA = p.fade ? 1 - Math.max(0, Math.min(1, (t - p.fade[0]) / (p.fade[1] - p.fade[0]))) : 1;
      // 先一次性取完所有随机参数，保证与 t 无关
      const parts = Array.from({ length: n }, () => ({
        col: CONFETTI_COLORS[Math.floor(r() * CONFETTI_COLORS.length)],
        w: 9 + r() * 10,
        h: 6 + r() * 6,
        spin: (r() - 0.5) * 0.5,
        flip: 0.12 + r() * 0.22,
        rot0: r() * Math.PI * 2,
        delay: r(),
        a: r(),
        b: r(),
        c: r(),
        d: r(),
        e: r(),
      }));
      for (let i = 0; i < n; i++) {
        const { col, w, h, spin, flip, rot0 } = parts[i];
        const q = parts[i];
        const tt = t - q.delay * (p.mode === "fall" ? 14 : 3);
        if (tt < 0) continue;
        let x: number;
        let y: number;
        if (p.mode === "burst") {
          const ang = (p.angle ?? -Math.PI / 2) + (q.a - 0.5) * (p.spread ?? Math.PI * 1.2);
          const sp = (p.power ?? 26) * (0.45 + q.b * 0.75);
          const k = 0.07 + q.c * 0.04; // 空气阻力
          const g = 0.55;
          const e = (1 - Math.exp(-k * tt)) / k;
          x = (p.x ?? 960) + Math.cos(ang) * sp * e + Math.sin(tt * 0.12 + i) * 6;
          y = (p.y ?? 540) + (Math.sin(ang) * sp + g / k) * e - (g / k) * tt;
        } else {
          const x0 = (p.x ?? 0) + q.a * (p.width ?? 1920);
          const vy = 4.2 + q.b * 3;
          x = x0 + Math.sin(tt * (0.05 + q.c * 0.04) + i) * (18 + q.d * 26);
          y = (p.y ?? -40) - q.e * 140 + vy * tt;
        }
        if (y > 1120 || x < -40 || x > 1960) continue;
        const rot = rot0 + spin * tt;
        const sy = Math.cos(rot0 + flip * tt * 2.2);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(1, sy);
        // 纸屑的小投影（光在左上 → 右下）
        ctx.globalAlpha = 0.18 * fadeA;
        ctx.fillStyle = BASE.shadow;
        ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
        ctx.globalAlpha = fadeA;
        const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        const face = sy > 0 ? col : darken(col, 0.18);
        gr.addColorStop(0, lighten(face, 0.12));
        gr.addColorStop(1, darken(face, 0.1));
        ctx.fillStyle = gr;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }}
  />
);

/* ---------------- 火苗 ---------------- */
export interface FlameProps {
  f: number;
  x: number; // 烛芯
  y: number;
  size: number; // 0..1 点亮/熄灭的大小
  glow: number; // 光晕强度 0..1
  lean?: number; // 被吹时的倾斜
}

/** 剪纸火苗：边缘干净，内外两层颜色，噪声驱动轻轻摇曳；外加暖光光晕 */
export const FlameCanvas: React.FC<FlameProps> = ({ f, x, y, size, glow, lean = 0 }) => (
  <CanvasLayer
    deps={[f, x, y, size, glow, lean]}
    draw={(ctx) => {
      // 光晕（叠加在场景之上，screen 混合在外层容器完成）
      if (glow > 0.001) {
        const R = 760 * (0.55 + 0.45 * glow);
        const flick = 1 + fbm1(f * 0.11, 3) * 0.05;
        const g = ctx.createRadialGradient(x, y - 40, 0, x, y - 40, R * flick);
        g.addColorStop(0, `rgba(255,214,150,${0.55 * glow})`);
        g.addColorStop(0.18, `rgba(255,190,120,${0.32 * glow})`);
        g.addColorStop(0.5, `rgba(240,150,90,${0.12 * glow})`);
        g.addColorStop(1, "rgba(200,110,60,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1920, 1080);
      }
      if (size <= 0.001) return;
      const sway = fbm1(f * 0.07, 11) * 0.22 + lean;
      const stretch = 1 + fbm1(f * 0.09 + 40, 5) * 0.08;
      const H = 92 * size * stretch;
      const Wd = 30 * size * (1 + fbm1(f * 0.08 + 9, 2) * 0.05);
      const tipX = x + sway * H * 0.9;
      const tipY = y - H;
      const shape = (k: number, off: number) => {
        const h = H * k;
        const w = Wd * k;
        const tx = x + (tipX - x) * k;
        const ty = y - h - off;
        const by = y + 6 * k - off * 0.2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.bezierCurveTo(tx + w * 0.25, ty + h * 0.32, x + w * 1.05, by - h * 0.38, x + w * 0.62, by - h * 0.08);
        ctx.bezierCurveTo(x + w * 0.3, by + 2 * k, x - w * 0.3, by + 2 * k, x - w * 0.62, by - h * 0.08);
        ctx.bezierCurveTo(x - w * 1.05, by - h * 0.38, tx - w * 0.2, ty + h * 0.3, tx, ty);
        ctx.closePath();
      };
      // 纸火苗的投影
      ctx.save();
      ctx.translate(5, 6);
      shape(1, 0);
      ctx.fillStyle = "rgba(20,10,5,0.22)";
      ctx.fill();
      ctx.restore();
      // 外层
      shape(1, 0);
      const g1 = ctx.createLinearGradient(0, tipY, 0, y);
      g1.addColorStop(0, BASE.flameMid);
      g1.addColorStop(1, BASE.flameOuter);
      ctx.fillStyle = g1;
      ctx.fill();
      // 内层
      shape(0.56, 3 * size);
      const g2 = ctx.createLinearGradient(0, tipY, 0, y);
      g2.addColorStop(0, BASE.flameInner);
      g2.addColorStop(1, "#FFE2A8");
      ctx.fillStyle = g2;
      ctx.fill();
    }}
  />
);
