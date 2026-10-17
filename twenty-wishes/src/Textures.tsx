// 纸底纹理：用与纸片相同的 SVG 滤镜管线一次性栅格化成 PNG（public/tex/），
// 正式渲染时整屏纸底直接贴图，避免每帧重算全屏 feTurbulence。
import React from "react";
import { AbsoluteFill } from "remotion";
import { BASE, PALETTE } from "./config";
import { lighten, mix } from "./lib/paper";
import { prng } from "./lib/rand";

export type TexKind = "warm" | "night" | "nightLit" | "table" | "sheet";

const SPEC: Record<TexKind, { base: string; fiber: string; mottle: number; lit: number; strand: string; strandA: number; seed: number }> = {
  warm: { base: BASE.paper, fiber: "#ffffff", mottle: 0.06, lit: 1, strand: "#FFFDF8", strandA: 0.8, seed: 3 },
  night: { base: BASE.night, fiber: "#ffffff", mottle: 0.025, lit: 0.9, strand: "#33425F", strandA: 0.45, seed: 5 },
  nightLit: { base: mix(BASE.night, "#B7804C", 0.36), fiber: "#ffffff", mottle: 0.025, lit: 1.2, strand: "#D9A673", strandA: 0.4, seed: 5 },
  table: { base: "#D9C9B0", fiber: "#ffffff", mottle: 0.12, lit: 1, strand: "#EADCC6", strandA: 0.5, seed: 8 },
  sheet: { base: lighten(PALETTE.cream, 0.25), fiber: "#ffffff", mottle: 0.07, lit: 1, strand: "#FFFFFF", strandA: 0.6, seed: 13 },
};

export const Texture: React.FC<{ kind: TexKind }> = ({ kind }) => {
  const s = SPEC[kind];
  const r = prng(s.seed * 7919);
  const strands = Array.from({ length: 340 }, () => {
    const x = r() * 1920;
    const y = r() * 1080;
    const len = 10 + r() * 46;
    const a = r() * Math.PI * 2;
    const bend = (r() - 0.5) * 18;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    const cx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend;
    const cy = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend;
    return { d: `M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, w: 0.6 + r() * 1.1, o: 0.25 + r() * 0.75 };
  });
  const k1 = 0.62 * s.lit;
  return (
    <AbsoluteFill style={{ background: s.base }}>
      <svg width={1920} height={1080}>
        <defs>
          <filter id="tex" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            {/* 纤维：高频噪声 + 漫反射光照（光在左上） */}
            <feTurbulence type="fractalNoise" baseFrequency="0.85 0.5" numOctaves={4} seed={s.seed} result="fiber" />
            <feDiffuseLighting in="fiber" surfaceScale={1.7} diffuseConstant={1.1} lightingColor={s.fiber} result="lit">
              <feDistantLight azimuth={225} elevation={56} />
            </feDiffuseLighting>
            {/* 低频斑驳：纸浆厚薄不匀 */}
            <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.005" numOctaves={3} seed={s.seed + 2} result="mot" />
            <feColorMatrix in="mot" type="matrix" values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  ${s.mottle * 4} 0 0 0 ${-s.mottle * 2}`} result="motA" />
            <feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1={k1} k2={0.45} k3={0} k4={0} result="tex" />
            <feComposite in="motA" in2="tex" operator="over" />
          </filter>
          <filter id="soft" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={0.5} />
          </filter>
        </defs>
        <rect width={1920} height={1080} fill={s.base} filter="url(#tex)" />
        <g filter="url(#soft)" fill="none" stroke={s.strand} strokeLinecap="round">
          {strands.map((st, i) => (
            <path key={i} d={st.d} strokeWidth={st.w} opacity={st.o * s.strandA} />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

