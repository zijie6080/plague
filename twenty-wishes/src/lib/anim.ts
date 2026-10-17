// 动画工具：全部是 frame 的纯函数。
import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../timeline";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** frame 在 [a,b] 内的线性进度 0..1 */
export const prog = (f: number, a: number, b: number) => clamp((f - a) / Math.max(1e-6, b - a));

export const ease = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
  soft: Easing.bezier(0.33, 0, 0.2, 1),
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  backIn: Easing.bezier(0.36, 0, 0.66, -0.56),
};

/** 带区间与缓动的插值 */
export const tween = (
  f: number,
  a: number,
  b: number,
  from: number,
  to: number,
  e: (t: number) => number = ease.inOut,
) => interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

/** 纸片弹起用的 spring：轻微回弹 */
export const pop = (f: number, at: number, cfg?: { damping?: number; stiffness?: number; mass?: number }) =>
  spring({
    frame: f - at,
    fps: FPS,
    config: { damping: cfg?.damping ?? 11, stiffness: cfg?.stiffness ?? 150, mass: cfg?.mass ?? 0.7 },
  });

/** 柔和、几乎不回弹的 spring（后段真诚场景用） */
export const glide = (f: number, at: number, dur = 30) =>
  spring({ frame: f - at, fps: FPS, config: { damping: 18, stiffness: 60, mass: 1 }, durationInFrames: dur });

/** 衰减正弦：用于"抖一下""轻轻摇晃" */
export const wobble = (f: number, at: number, amp: number, freq = 0.45, decay = 0.09) => {
  const t = f - at;
  if (t < 0) return 0;
  return amp * Math.sin(t * freq * Math.PI * 2 * 0.25) * Math.exp(-t * decay);
};

/** 0→1→0 的钟形 */
export const bell = (f: number, a: number, b: number) => {
  const t = prog(f, a, b);
  return Math.sin(Math.PI * t);
};
