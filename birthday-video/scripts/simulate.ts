// 字块物理预模拟：matter.js 固定步长，每帧输出每个字块的位置和角度到 src/data/physics_*.json。
// 渲染时只读取结果，不做实时模拟。
//   physics_s1.json  S1 字雨（从 rainStart 开始）
//   physics_c1/2/3.json  S2 三次散架（从各自 collapse 帧开始）
import Matter from "matter-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { blocks, figures, FLOOR_Y, W, HEAD_ID, N_BLOCKS } from "../src/lib/layout";
import { s1, s2, s, FPS } from "../src/timeline";
import { config } from "../src/config";
import { mulberry32, range } from "../src/lib/prng";

const SUBSTEPS = 4;
const DT = 1000 / FPS / SUBSTEPS;
const OUT = new URL("../src/data/", import.meta.url);
mkdirSync(OUT, { recursive: true });

type Frame = number[]; // [x, y, angle, x, y, angle, ...]（按 id）
type Impact = { f: number; id: number; v: number; size: number };

function makeWorld(gravity = 2.4) {
  const engine = Matter.Engine.create({ positionIterations: 14, velocityIterations: 10 });
  engine.gravity.y = gravity;
  const opts = { isStatic: true, friction: 0.9, restitution: 0.1, label: "wall" };
  Matter.Composite.add(engine.world, [
    Matter.Bodies.rectangle(W / 2, FLOOR_Y + 200, W * 3, 400, opts),
    Matter.Bodies.rectangle(-200 + 4, 0, 400, 6000, opts),
    Matter.Bodies.rectangle(W + 200 - 4, 0, 400, 6000, opts),
  ]);
  return engine;
}

function capsule(x: number, y: number, w: number, h: number, angle: number, o: Matter.IChamferableBodyDefinition) {
  return Matter.Bodies.rectangle(x, y, w, h, {
    angle,
    chamfer: { radius: Math.min(h / 2 - 0.5, w / 2 - 0.5) },
    ...o,
  });
}

function run(
  engine: Matter.Engine,
  bodies: (Matter.Body | null)[],
  frames: number,
  spawn: (f: number) => void,
) {
  const out: Frame[] = [];
  const impacts: Impact[] = [];
  const lastHit = new Map<number, number>();
  let curF = 0;
  Matter.Events.on(engine, "collisionStart", (ev) => {
    for (const p of ev.pairs) {
      for (const [a, b] of [
        [p.bodyA, p.bodyB],
        [p.bodyB, p.bodyA],
      ]) {
        const id = (a as Matter.Body & { blockId?: number }).blockId;
        if (id === undefined) continue;
        const rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        if (rel < 3.2) continue;
        if ((lastHit.get(id) ?? -99) > curF - 5) continue;
        lastHit.set(id, curF);
        impacts.push({ f: curF, id, v: +rel.toFixed(2), size: +(a.area / 1e4).toFixed(2) });
      }
    }
  });
  for (let f = 0; f < frames; f++) {
    curF = f;
    spawn(f);
    for (let k = 0; k < SUBSTEPS; k++) Matter.Engine.update(engine, DT);
    const fr: Frame = [];
    bodies.forEach((b) => {
      if (!b) fr.push(NaN, NaN, 0);
      else fr.push(+b.position.x.toFixed(1), +b.position.y.toFixed(1), +b.angle.toFixed(4));
    });
    out.push(fr);
  }
  return { out, impacts };
}

// ---------------- S1 字雨 ----------------
function simRain() {
  const engine = makeWorld(2.4);
  const rnd = mulberry32(2026_10_17);
  const bodies: (Matter.Body | null)[] = new Array(N_BLOCKS).fill(null);
  const n = N_BLOCKS;
  // 由疏到密：t = start + D * u^0.6
  const D = s1.rainEnd - s1.rainStart;
  const spawnF = blocks.map((_, i) => Math.round(D * Math.pow(i / (n - 1), 0.62)));
  const xs: number[] = [];
  blocks.forEach((b, i) => {
    let x = 0;
    for (let tries = 0; tries < 20; tries++) {
      x = range((rnd() + rnd() + rnd()) / 3, b.w / 2 + 10, W - b.w / 2 - 10);
      if (xs.slice(-2).every((px) => Math.abs(px - x) > 220)) break;
    }
    xs.push(x);
  });
  const frames = s2.rounds[0].assemble - s1.rainStart + 2;
  const res = run(engine, bodies, frames, (f) => {
    blocks.forEach((b, i) => {
      if (spawnF[i] !== f) return;
      const body = capsule(xs[i], -b.h - 30 - rnd() * 120, b.w, b.h, range(rnd(), -0.5, 0.5), {
        friction: 0.55,
        frictionAir: 0.004,
        restitution: 0.32,
        density: 0.0016,
      });
      (body as Matter.Body & { blockId?: number }).blockId = i;
      Matter.Body.setVelocity(body, { x: range(rnd(), -3, 3), y: range(rnd(), 6, 14) });
      Matter.Body.setAngularVelocity(body, range(rnd(), -0.06, 0.06));
      Matter.Composite.add(engine.world, body);
      bodies[i] = body;
    });
  });

  // 相邻不同色：根据最终堆积的接触关系做贪心着色
  const final = res.out[res.out.length - 1];
  const neighbors: Set<number>[] = blocks.map(() => new Set());
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const bi = bodies[i]!;
      const bj = bodies[j]!;
      const dx = Math.abs(final[i * 3] - final[j * 3]);
      const dy = Math.abs(final[i * 3 + 1] - final[j * 3 + 1]);
      const touching =
        Matter.Collision.collides(bi, bj) !== null ||
        (dx < (blocks[i].w + blocks[j].w) / 2 + 30 && dy < (blocks[i].h + blocks[j].h) / 2 + 30);
      if (touching || Math.abs(i - j) === 1) {
        neighbors[i].add(j);
        neighbors[j].add(i);
      }
    }
  const pal = config.colors.party;
  const colors: number[] = [];
  for (let i = 0; i < n; i++) {
    const used = new Set([...neighbors[i]].filter((j) => j < i).map((j) => colors[j]));
    let c = (i * 7 + 3) % pal.length;
    for (let k = 0; k < pal.length && used.has(c); k++) c = (c + 1) % pal.length;
    colors.push(c);
  }

  const minY = Math.min(...blocks.map((b, i) => final[i * 3 + 1] - b.h / 2));
  const outOfBounds = blocks.filter((b, i) => final[i * 3] < 0 || final[i * 3] > W || final[i * 3 + 1] > FLOOR_Y);
  console.log(`S1: ${frames} frames, pile top y≈${minY.toFixed(0)}, impacts ${res.impacts.length}, oob ${outOfBounds.length}`);
  writeFileSync(
    new URL("physics_s1.json", OUT),
    JSON.stringify({ start: s1.rainStart, spawn: spawnF, colors: colors.map((c) => pal[c]), frames: res.out, impacts: res.impacts }),
  );
}

// ---------------- S2 散架 ----------------
function simCollapse(idx: number) {
  const fig = figures[idx];
  const wild = fig.kind === "wild";
  const engine = makeWorld(wild ? 2.1 : 2.5);
  const rnd = mulberry32(777 + idx * 31);
  const bodies: (Matter.Body | null)[] = [];
  const cx = 540;
  const cy = fig.head.y + 380 * fig.k;
  blocks.forEach((b, i) => {
    const sl = fig.slots[i];
    const body = capsule(sl.x, sl.y, b.w * sl.scale, b.h * sl.scale, sl.angle, {
      friction: wild ? 0.05 : 0.5,
      frictionAir: wild ? 0.002 : 0.006,
      restitution: wild ? 0.45 : 0.25,
      density: 0.0016,
    });
    (body as Matter.Body & { blockId?: number }).blockId = i;
    const dx = sl.x - cx;
    const dy = sl.y - cy;
    const d = Math.hypot(dx, dy) + 1;
    const kick = wild ? range(rnd(), 9, 17) : idx === 0 ? range(rnd(), 0.5, 2.5) : range(rnd(), 1.5, 4);
    Matter.Body.setVelocity(body, {
      x: (dx / d) * kick + range(rnd(), -1.5, 1.5),
      y: (dy / d) * kick * 0.6 - (wild ? range(rnd(), 4, 10) : range(rnd(), 0, 3)),
    });
    Matter.Body.setAngularVelocity(body, range(rnd(), -1, 1) * (wild ? 0.25 : 0.08));
    bodies.push(body);
  });
  // 头：一个圆
  const head = Matter.Bodies.circle(fig.head.x, fig.head.y, fig.head.r, {
    friction: wild ? 0.02 : 0.3,
    restitution: wild ? 0.6 : 0.45,
    density: 0.0012,
    frictionAir: 0.003,
  });
  (head as Matter.Body & { blockId?: number }).blockId = HEAD_ID;
  Matter.Body.setVelocity(head, { x: wild ? 9 : idx === 0 ? -2.5 : 3, y: wild ? -12 : -4 });
  Matter.Body.setAngularVelocity(head, wild ? 0.3 : 0.1);
  bodies.push(head);
  Matter.Composite.add(engine.world, bodies.filter(Boolean) as Matter.Body[]);

  const start = s2.rounds[idx].collapse;
  const end = idx < 2 ? s2.rounds[idx + 1].assemble + 2 : s(37) + 2;
  const res = run(engine, bodies, end - start, () => {});
  const fin = res.out[res.out.length - 1];
  const oob = blocks.filter((b, i) => fin[i * 3] < 0 || fin[i * 3] > W || fin[i * 3 + 1] > FLOOR_Y);
  console.log(`collapse ${idx + 1}: ${end - start} frames, impacts ${res.impacts.length}, oob ${oob.length}`);
  writeFileSync(new URL(`physics_c${idx + 1}.json`, OUT), JSON.stringify({ start, frames: res.out, impacts: res.impacts }));
}

simRain();
[0, 1, 2].forEach(simCollapse);
