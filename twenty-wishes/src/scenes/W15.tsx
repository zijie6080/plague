// 15. 愿你脑子里的画面，都能被拍出来。
// 纸投影机打开，一束暖光投向前方的空白纸面。纸面上的山水一层层立起来：
// 远山、中山、松林、亭子、悬崖上站着纸人、太阳和飞鸟。投影光里漂着光尘。
import React from "react";
import { AbsoluteFill } from "remotion";
import { BASE } from "../config";
import { clamp, ease, prog } from "../lib/anim";
import { DustCanvas } from "../lib/canvas";
import { PaperFigure, POSE } from "../lib/figure";
import { Mist, Paper, darken, lighten, mix } from "../lib/paper";
import { fbm1 } from "../lib/rand";
import { ClipStage, PopUp, useScene } from "../lib/stage";
import { beatsOf } from "../timeline";
import { Ground, P, wavyTop } from "./common";

const B = beatsOf("w15");
const SCR = { x: 640, y: 258, w: 1180, h: 680 }; // 空白纸面
const LENS = { x: 492, y: 792 };
const SLOW = { damping: 15, stiffness: 95, mass: 0.9 };

/** 山脊线 */
const ridge = (pts: [number, number][], bottom = 960) => {
  let d = `M${pts[0][0]} ${bottom} L${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  return d + ` L${pts[pts.length - 1][0]} ${bottom} Z`;
};

const pine = (x: number, base: number, h: number) => {
  const w = h * 0.42;
  return `M${x} ${base - h} L${x + w * 0.55} ${base - h * 0.55} L${x + w * 0.32} ${base - h * 0.55} L${x + w} ${base - h * 0.08} L${x + 6} ${base - h * 0.08} L${x + 6} ${base} L${x - 6} ${base} L${x - 6} ${base - h * 0.08} L${x - w} ${base - h * 0.08} L${x - w * 0.32} ${base - h * 0.55} L${x - w * 0.55} ${base - h * 0.55} Z`;
};

const Projector: React.FC<{ f: number; on: number }> = ({ f, on }) => {
  const spin = Math.max(0, f - B.on) * 7 * on;
  const reel = (cx: number, cy: number, r: number, rot: number) => (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      <Paper color={P.ink} z={1.8} filter="paper-fine">
        <circle cx={cx} cy={cy} r={r} />
      </Paper>
      <Paper color={P.cream} z={2.1} filter="paper-fine" grad={0.05}>
        {[0, 120, 240].map((a) => (
          <circle key={a} cx={cx + Math.cos((a * Math.PI) / 180) * r * 0.5} cy={cy + Math.sin((a * Math.PI) / 180) * r * 0.5} r={r * 0.24} />
        ))}
        <circle cx={cx} cy={cy} r={r * 0.12} />
      </Paper>
    </g>
  );
  return (
    <>
      {/* 支架 */}
      <Paper color={darken(P.ink, 0.05)} z={1.4} filter="paper-fine">
        <path d="M250 880 L300 760 L318 760 L278 900 Z M396 880 L346 760 L328 760 L368 900 Z" />
      </Paper>
      {reel(258, 618, 62, spin)}
      {reel(398, 632, 52, -spin * 1.2)}
      <Paper color={P.ink} z={1.7} filter="paper-fine" line={6}>
        <path d="M258 618 L320 700 L398 632" fill="none" />
      </Paper>
      {/* 机身 */}
      <Paper color={P.vermilion} z={2} grad={0.14}>
        <path d="M170 690 C170 676 182 668 196 668 L440 668 C456 668 466 678 466 694 L466 772 C466 786 456 794 440 794 L196 794 C182 794 170 786 170 772 Z" />
      </Paper>
      <Paper color={P.cream} z={2.3} filter="paper-fine" grad={0.06}>
        <rect x={200} y={696} width={120} height={16} rx={8} />
        <rect x={200} y={724} width={80} height={12} rx={6} />
      </Paper>
      {/* 镜头 */}
      <Paper color={P.ink} z={2.4} filter="paper-fine">
        <path d="M462 708 L500 698 L500 790 L462 780 Z" />
      </Paper>
      <Paper color={mix(P.ink, BASE.warmLight, on * 0.9)} z={2.6} filter="paper-fine" grad={0.1}>
        <ellipse cx={LENS.x + 10} cy={744} rx={13} ry={42} />
      </Paper>
    </>
  );
};

export const W15: React.FC = () => {
  const { f } = useScene();
  const on = ease.out(prog(f, B.on, B.on + 8));
  const beam = ease.out(prog(f, B.on, B.on + 16));
  const sunY = 690 - 250 * ease.inOut(prog(f, B.sun, B.sun + 36));
  const flick = 1 + fbm1(f * 0.25, 9) * 0.06;

  // 光束多边形：从镜头扇形铺满纸面
  const reach = SCR.x + 40 + (SCR.w - 40) * beam;
  const beamPoly: [number, number][] = [
    [LENS.x + 14, 716],
    [reach, SCR.y + 30 - 20 * beam],
    [reach, SCR.y + SCR.h - 40],
    [LENS.x + 14, 772],
  ];

  const birds = [0, 1, 2, 3].map((i) => {
    const t = f - B.birds - i * 7;
    const x = 1700 - t * (6.2 + i * 0.6);
    const y = 400 + i * 26 + Math.sin(t * 0.08 + i) * 14;
    const flap = Math.sin(t * 0.55 + i * 1.7);
    const s = 0.9 - i * 0.12;
    return { t, x, y, flap, s };
  });

  return (
    <>
      {/* 房间略暗，衬出光束 */}
      <AbsoluteFill style={{ background: `rgba(52,34,22,${0.1 * on})` }} />
      {/* 空白纸面 */}
      <PopUp x={SCR.x - 10} y={SCR.y - 10} w={SCR.w + 20} h={SCR.h + 30} at={0} order={6} spring={SLOW}>
        <Paper color={lighten(P.cream, 0.45)} z={0.8} grad={0.05}>
          <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h + 20} rx={10} />
        </Paper>
        {/* 投影亮起后纸面的暖色天空 */}
        <defs>
          <linearGradient id="w15sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={lighten(P.fogBlue, 0.45)} />
            <stop offset="0.65" stopColor={lighten(P.sakura, 0.25)} />
            <stop offset="1" stopColor={lighten(P.apricot, 0.35)} />
          </linearGradient>
        </defs>
        <rect x={SCR.x + 14} y={SCR.y + 14} width={SCR.w - 28} height={SCR.h - 10} rx={6} fill="url(#w15sky)" opacity={0.75 * ease.inOut(prog(f, B.on + 4, B.far + 6))} filter="url(#fiber)" />
      </PopUp>

      <ClipStage x={SCR.x + 14} y={SCR.y + 14} w={SCR.w - 28} h={SCR.h} radius={6}>
        {/* 太阳：从远山后面升起 */}
        <PopUp x={1300} y={300} w={320} h={640} at={B.far - 2} order={5} spring={SLOW} extra={`translateY(${sunY - 690}px)`}>
          <Paper color={P.apricot} z={0.6} grad={0.14}>
            <circle cx={1460} cy={690} r={74} />
          </Paper>
        </PopUp>
        {/* 远山 */}
        <PopUp x={SCR.x} y={480} w={SCR.w} h={480} at={B.far} order={5} spring={SLOW}>
          <Paper color={P.lilac} z={0.9} grad={0.1}>
            <path d={ridge([[640, 640], [760, 560], [900, 600], [1060, 500], [1230, 590], [1380, 540], [1560, 620], [1700, 530], [1830, 600]])} />
          </Paper>
          <Mist y={640} h={200} opacity={0.75} color={lighten(P.sakura, 0.4)} x={SCR.x} w={SCR.w} />
        </PopUp>
        {/* 中山 */}
        <PopUp x={SCR.x} y={560} w={SCR.w} h={400} at={B.mid} order={4} spring={SLOW}>
          <Paper color={P.fogBlue} z={1.4} grad={0.12}>
            <path d={ridge([[640, 700], [780, 640], [940, 690], [1090, 610], [1260, 680], [1420, 640], [1600, 700], [1830, 660]])} />
          </Paper>
          <Mist y={700} h={180} opacity={0.65} color={lighten(P.cream, 0.4)} x={SCR.x} w={SCR.w} />
        </PopUp>
        {/* 松林 */}
        <PopUp x={SCR.x} y={620} w={SCR.w} h={340} at={B.pines} order={3} spring={SLOW}>
          <Paper color={P.pine} z={2} grad={0.14}>
            <path d={wavyTop(SCR.x, SCR.x + SCR.w, 800, 18, 15, 960)} />
            {[680, 720, 765, 812, 850, 1010, 1050, 1096, 1140, 1190, 1235, 1280].map((x, i) => (
              <path key={i} d={pine(x, 812 + (i % 3) * 6, 110 + ((i * 37) % 50))} />
            ))}
          </Paper>
        </PopUp>
        {/* 亭子 */}
        <PopUp x={880} y={600} w={170} h={220} at={B.pavilion} order={2} spring={SLOW}>
          <Paper color={P.cream} z={2.3} filter="paper-fine" grad={0.08}>
            <rect x={912} y={700} width={10} height={92} />
            <rect x={1008} y={700} width={10} height={92} />
            <rect x={900} y={786} width={130} height={14} rx={3} />
          </Paper>
          <Paper color={P.vermilion} z={2.6} filter="paper-fine" grad={0.12}>
            <path d="M884 712 C910 700 930 680 965 640 C1000 680 1020 700 1046 712 C1024 708 1002 704 965 704 C928 704 906 708 884 712 Z" />
            <path d="M960 640 L965 618 L970 640 Z" />
          </Paper>
        </PopUp>
        {/* 悬崖 + 纸人 */}
        <PopUp x={1440} y={520} w={400} h={440} at={B.cliff} order={1} spring={SLOW}>
          <Paper color={P.sage} z={2.8} grad={0.14}>
            <path d="M1470 960 C1480 860 1500 760 1530 690 C1550 640 1570 600 1600 590 L1700 586 C1740 600 1760 640 1790 700 L1840 960 Z" />
          </Paper>
          <Paper color={P.pine} z={3} filter="paper-fine" grad={0.1}>
            <path d={pine(1772, 700, 120)} />
          </Paper>
          <PaperFigure x={1640} y={592} s={0.52} facing={-1} z={3.2} pose={{ ...POSE.stand, armF: [-14, 10] }} wind={f * 0.18} />
        </PopUp>
        {/* 飞鸟 */}
        <svg width={1920} height={1080} style={{ position: "absolute", overflow: "visible" }}>
          {birds.map(
            (b, i) =>
              b.t > 0 && (
                <g key={i} transform={`translate(${b.x} ${b.y}) scale(${b.s})`}>
                  <Paper color={P.ink} z={2} filter="paper-fine" grad={0}>
                    <path d={`M-26 ${-10 * b.flap} Q-12 ${-12 * b.flap - 2} 0 4 Q12 ${-12 * b.flap - 2} 26 ${-10 * b.flap} Q12 ${-4 * b.flap + 8} 0 10 Q-12 ${-4 * b.flap + 8} -26 ${-10 * b.flap} Z`} />
                  </Paper>
                </g>
              ),
          )}
        </svg>
      </ClipStage>

      {/* 前景：地面与投影机 */}
      <Ground y={930} color={P.sakura} at={0} seed={15} order={0} amp={16} />
      <PopUp x={150} y={540} w={380} h={380} at={2} order={0} spring={SLOW}>
        <Projector f={f} on={on} />
      </PopUp>

      {/* 光束（screen 混合）+ 光束里的光尘 */}
      {beam > 0 && (
        <>
          <svg width={1920} height={1080} style={{ position: "absolute", mixBlendMode: "screen", opacity: 0.85 * flick }}>
            <defs>
              <linearGradient id="w15beam" x1={LENS.x} y1={0} x2={SCR.x + SCR.w} y2={0} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#FFE3B0" stopOpacity={0.85} />
                <stop offset="0.3" stopColor="#FFD79C" stopOpacity={0.42} />
                <stop offset="1" stopColor="#FFCF94" stopOpacity={0.24} />
              </linearGradient>
              <filter id="w15soft">
                <feGaussianBlur stdDeviation={10} />
              </filter>
            </defs>
            <polygon points={beamPoly.map((p) => p.join(",")).join(" ")} fill="url(#w15beam)" filter="url(#w15soft)" />
            <ellipse cx={LENS.x + 14} cy={744} rx={34 * on} ry={60 * on} fill="#FFE8C0" opacity={0.7} filter="url(#w15soft)" />
            {/* 投在纸面上的光斑 */}
            <radialGradient id="w15spot" cx={SCR.x + SCR.w * 0.45} cy={SCR.y + SCR.h * 0.5} r={SCR.w * 0.6} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFE1B0" stopOpacity={0.38} />
              <stop offset="1" stopColor="#FFE1B0" stopOpacity={0} />
            </radialGradient>
            <rect x={SCR.x} y={SCR.y} width={SCR.w} height={SCR.h} fill="url(#w15spot)" opacity={beam} />
          </svg>
          <DustCanvas f={f} count={70} seed={15} intensity={clamp(beam * 1.4)} clip={beamPoly} region={{ x: LENS.x, y: SCR.y, w: SCR.w + 200, h: SCR.h }} />
        </>
      )}
    </>
  );
};
