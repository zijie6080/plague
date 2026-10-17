// 每个字块在 S1–S3 的状态：位置/角度/缩放，都是 frame 的纯函数。
// 物理段直接查表（预模拟数据），过渡段用弹簧插值。
import rain from "../data/physics_s1.json";
import c1 from "../data/physics_c1.json";
import c2 from "../data/physics_c2.json";
import c3 from "../data/physics_c3.json";
import { blocks, figures, HEAD_ID, stickerLayout } from "./layout";
import { s1, s2, s3 } from "../timeline";
import { glide, lerp, clamp, nearestAngle } from "./anim";
import { hash01 } from "./prng";

type Phys = { start: number; frames: number[][] };
const RAIN = rain as Phys & { spawn: number[]; colors: string[] };
const COLLAPSE = [c1, c2, c3] as Phys[];

export const blockColors: string[] = RAIN.colors;

export type BState = { x: number; y: number; a: number; s: number; visible: boolean; z?: number };

function phys(d: Phys, frame: number, id: number) {
  const i = Math.max(0, Math.min(d.frames.length - 1, frame - d.start));
  const fr = d.frames[i];
  return { x: fr[id * 3], y: fr[id * 3 + 1], a: fr[id * 3 + 2] };
}

const R = s2.rounds;
// 飞向小人时每块错开的帧数（固定的随机序）
const delayOf = (id: number, k: number) => Math.floor(hash01(id, 11 + k) * 9);

export function stickerGroup(id: number) {
  return id % stickerLayout.length;
}

export function blockState(id: number, frame: number): BState {
  const isHead = id === HEAD_ID;
  // ---- S1 ----
  if (frame < R[0].assemble) {
    if (isHead) return { x: 0, y: 0, a: 0, s: 0, visible: false };
    const local = frame - RAIN.start;
    if (local < RAIN.spawn[id]) return { x: 0, y: 0, a: 0, s: 1, visible: false };
    const p = phys(RAIN, frame, id);
    return { x: p.x, y: p.y, a: p.a, s: 1, visible: true };
  }
  // ---- S2：三轮 ----
  for (let k = 0; k < 3; k++) {
    const nextAssemble = k < 2 ? R[k + 1].assemble : Infinity;
    if (frame >= R[k].assemble && frame < R[k].collapse) {
      const fig = figures[k];
      const to = isHead ? { x: fig.head.x, y: fig.head.y, angle: fig.head.angle, scale: 1 } : fig.slots[id];
      let from: { x: number; y: number; a: number };
      let fromS: number;
      if (k === 0) {
        if (isHead) {
          // 第一次：头直接弹出来
          const p = glide(frame, R[0].assemble + 16, 170, 9);
          return { x: to.x, y: to.y, a: to.angle, s: p, visible: p > 0.001 };
        }
        from = phys(RAIN, R[0].assemble, id);
        fromS = 1;
      } else {
        from = phys(COLLAPSE[k - 1], R[k].assemble, isHead ? HEAD_ID : id);
        fromS = isHead ? 1 : figures[k - 1].slots[id].scale;
      }
      const d = isHead ? 10 : delayOf(id, k);
      const p = glide(frame, R[k].assemble + d, 105, 12);
      const pc = clamp(p);
      const a1 = nearestAngle(from.a, to.angle) + (hash01(id, 5 + k) < 0.25 ? Math.PI * 2 : 0);
      const toS = isHead ? to.scale * (fig.head.r / 84) : to.scale;
      const fromScale = isHead && k > 0 ? figures[k - 1].head.r / 84 : fromS;
      return {
        x: lerp(from.x, to.x, p),
        y: lerp(from.y, to.y, p) - Math.sin(Math.PI * pc) * (90 + hash01(id, 9) * 120),
        a: lerp(from.a, a1, p),
        s: lerp(fromScale, toS, p),
        visible: true,
      };
    }
    if (frame >= R[k].collapse && frame < nextAssemble) {
      const fig = figures[k];
      const p = phys(COLLAPSE[k], frame, isHead ? HEAD_ID : id);
      const sc = isHead ? fig.head.r / 84 : fig.slots[id].scale;
      if (k < 2 || frame < s3.rise) return { x: p.x, y: p.y, a: p.a, s: sc, visible: true };
      // ---- S3：飞起，重组成贴纸 ----
      if (isHead) {
        const o = 1 - clamp((frame - s3.rise) / 8);
        return { x: p.x, y: p.y - (1 - o) * 60, a: p.a, s: sc * o, visible: o > 0 };
      }
      const g = stickerGroup(id);
      const st = stickerLayout[g];
      const arrive = s3.stickers[g];
      const fly = arrive - s3.flyLead;
      if (frame >= arrive) return { x: st.x, y: st.y, a: 0, s: 0, visible: false };
      const hover = glide(frame, s3.rise + (id % 7) * 2, 90, 10);
      const hx = p.x + (hash01(id, 21) - 0.5) * 60 * hover;
      const hy = p.y - hover * (90 + hash01(id, 22) * 220) + Math.sin((frame + id * 7) / 6) * 6 * hover;
      const ha = p.a * (1 - hover * 0.6) + Math.sin((frame + id * 5) / 9) * 0.12 * hover;
      if (frame < fly) return { x: hx, y: hy, a: ha, s: sc, visible: true };
      const q = glide(frame, fly, 150, 18);
      const tx = st.x + (hash01(id, 31) - 0.5) * st.w * 0.6;
      const ty = st.y + (hash01(id, 32) - 0.5) * 40;
      return {
        x: lerp(hx, tx, q),
        y: lerp(hy, ty, q),
        a: lerp(ha, (st.rot * Math.PI) / 180, q),
        s: lerp(sc, 0.32, q),
        visible: true,
        z: 5,
      };
    }
  }
  return { x: 0, y: 0, a: 0, s: 0, visible: false };
}

export const N_TOTAL = blocks.length + 1;
