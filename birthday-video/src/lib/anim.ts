// 弹性动画工具。所有函数都是 frame 的纯函数。
import { spring, interpolate } from "remotion";
import { FPS } from "../timeline";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 带回弹的出现：0 → (≈1.15) → 1
export function pop(frame: number, start: number, bouncy = 1) {
  if (frame < start) return 0;
  return spring({
    frame: frame - start,
    fps: FPS,
    config: { damping: 9 / bouncy, stiffness: 170, mass: 0.7 },
  });
}

// 平稳一点的弹簧（位移用）
export function glide(frame: number, start: number, stiffness = 120, damping = 15) {
  if (frame < start) return 0;
  return spring({ frame: frame - start, fps: FPS, config: { damping, stiffness, mass: 0.8 } });
}

// 消失：先鼓一下再缩没，1 → 1.15 → 0
export function popOut(frame: number, start: number, dur = 9) {
  if (frame < start) return 1;
  const t = (frame - start) / dur;
  if (t >= 1) return 0;
  return interpolate(t, [0, 0.35, 1], [1, 1.16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// 出现 × 消失
export function life(frame: number, start: number, end: number, bouncy = 1) {
  return pop(frame, start, bouncy) * popOut(frame, end);
}

// 衰减抖动（盖章时卡片抖一下）
export function shake(frame: number, at: number, amp = 10, dur = 12) {
  if (frame < at || frame > at + dur) return { x: 0, y: 0, r: 0 };
  const t = frame - at;
  const k = Math.exp(-t / (dur / 3.2));
  return {
    x: Math.sin(t * 2.7) * amp * k,
    y: Math.cos(t * 3.9) * amp * 0.6 * k,
    r: Math.sin(t * 3.3) * 1.6 * k,
  };
}

export function nearestAngle(from: number, to: number) {
  const TAU = Math.PI * 2;
  return to + TAU * Math.round((from - to) / TAU);
}
