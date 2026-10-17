// 把 timeline.ts + 物理碰撞数据导出成 audio/timeline.json，给 audio/synth.py 用（单位：帧）
import { writeFileSync } from "node:fs";
import rain from "../src/data/physics_s1.json";
import c1 from "../src/data/physics_c1.json";
import c2 from "../src/data/physics_c2.json";
import c3 from "../src/data/physics_c3.json";
import { config } from "../src/config";
import { DURATION, FPS, BPM_A, s0, s1, s2, s3, s4, s5, s6, musicB, scenes } from "../src/timeline";
import { cakeBricks, candles } from "../src/lib/layout";
import { candleRise, igniteFrame, extinguishFrame } from "../src/scenes/S4Cake";

type Imp = { f: number; id: number; v: number; size: number };
const impacts: { frame: number; v: number; size: number }[] = [];
const add = (d: { start: number; frames: unknown[]; impacts: Imp[] }, until: number) => {
  for (const i of d.impacts) {
    const frame = d.start + i.f;
    if (frame < until) impacts.push({ frame, v: i.v, size: i.size });
  }
};
add(rain, s2.rounds[0].assemble);
add(c1, s2.rounds[1].assemble);
add(c2, s2.rounds[2].assemble);
add(c3, s3.rise);

const typing = s0.lines.flatMap((l) => l.chars.filter((_, i) => [...l.text][i] !== " "));

const out = {
  fps: FPS,
  duration: DURATION,
  bpmA: BPM_A,
  typing,
  explode: s0.explode,
  sends: s0.lines.filter((l) => l.send >= 0).map((l) => l.send),
  s1Title: s1.title,
  impacts: impacts.sort((a, b) => a.frame - b.frame),
  whoosh: [...s2.rounds.map((r) => r.assemble), s3.rise, ...s3.stickers.map((f) => f - s3.flyLead)],
  stamps: [...s2.rounds.map((r) => ({ frame: r.stamp, pass: false })), { frame: s4.stamp, pass: true }],
  cardIn: [...s2.rounds.map((r) => r.cardIn), s4.cardIn],
  collapses: s2.rounds.map((r, i) => ({ frame: r.collapse, big: i === 2 })),
  musicGap: s2.musicGap,
  stickers: s3.stickers,
  stickerBounce: s3.bounce,
  switchOff: s4.switchOff,
  switchOn: s6.lightsOn,
  bricks: cakeBricks.map((b) => b.drop + 5),
  candles: candles.map((c) => candleRise(c.i)).sort((a, b) => a - b),
  ignite: candles.map((c) => igniteFrame(c.i)).sort((a, b) => a - b),
  silence: [s4.silenceStart, s4.silenceEnd],
  blow: s4.blow,
  extinguish: candles.map((c) => extinguishFrame(c.i)).sort((a, b) => a - b),
  glock: { start: s4.glockStart, beat: s4.glockBeat },
  fireworks: [...s5.shots, s5.final].map((x) => ({ launch: x.launch, burst: x.burst })),
  finalForm: s5.final.burst + s5.finalForm,
  musicB,
  title: s6.title,
  finalChord: s6.finalChord,
  freeze: s6.freeze,
  scenes,
  useExternalMusic: config.useExternalMusic,
};
writeFileSync(new URL("../audio/timeline.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`audio/timeline.json: ${impacts.length} impacts, ${typing.length} keys`);
