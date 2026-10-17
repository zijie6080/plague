// 全片时间轴（单位：帧，30fps）。画面和 audio/synth.py 都从这里读，保证音画对齐。
import { config } from "./config";

export const FPS = config.fps;
export const s = (sec: number) => Math.round(sec * FPS);

export const DURATION = s(78);

// 配乐速度：S0–S3 120 BPM（一拍 = 15 帧），S5–S6 的《Happy Birthday》变奏 132 BPM
export const BPM_A = 120;
export const BPM_B = 132;
const beatB = 60 / BPM_B;

export const scenes = {
  s0: { from: 0, to: s(7) },
  s1: { from: s(7), to: s(19) },
  s2: { from: s(19), to: s(37) },
  s3: { from: s(37), to: s(49) },
  s4: { from: s(49), to: s(62) },
  s5: { from: s(62), to: s(69) },
  s6: { from: s(69), to: DURATION },
};

// ---------- S0 打字 ----------
const CHAR = 3; // 每字 3 帧
const PUNCT = 7; // 标点后多停
function typeSchedule(text: string, start: number) {
  const frames: number[] = [];
  let f = start;
  for (const ch of text) {
    frames.push(f);
    f += CHAR + ("，。、".includes(ch) ? PUNCT : 0);
  }
  return { frames, end: f };
}
const t1 = typeSchedule(config.s0Lines[0], s(0.6));
const t2 = typeSchedule(config.s0Lines[1], t1.end + s(0.55));
const t3 = typeSchedule(config.s0Lines[2], t2.end + s(0.55));
export const s0 = {
  lines: [
    { text: config.s0Lines[0], chars: t1.frames, send: t1.end + s(0.25) },
    { text: config.s0Lines[1], chars: t2.frames, send: t2.end + s(0.25) },
    { text: config.s0Lines[2], chars: t3.frames, send: -1 },
  ],
  explode: t3.end + s(0.7),
  bubblesOut: s(6.6),
};

// ---------- S1 字雨 ----------
export const s1 = {
  title: s(7.0),
  subtitle: s(7.45),
  rainStart: s(7.9),
  rainEnd: s(17.6), // 最后一块出生的时间
  titleOut: s(18.8),
  // 物理模拟从 rainStart 开始，一直跑到 S2 吸起
};

// ---------- S2 三轮猜测 ----------
function round(start: number) {
  return {
    assemble: start, // 字块被吸起、飞向小人
    line: start + s(0.95),
    cardIn: start + s(2.2),
    stamp: start + s(2.95),
    opinion: start + s(3.1),
    collapse: start + s(3.65),
    cardOut: start + s(3.95),
    lineOut: start + s(3.75),
  };
}
const r1 = round(s(19.0));
const r2 = round(r1.collapse + s(1.05));
const r3 = round(r2.collapse + s(1.05));
export const s2 = {
  rounds: [r1, r2, r3],
  musicGap: s(0.3), // 盖章瞬间配乐"卡顿"
  after1: r3.collapse + s(2.05),
  after2: r3.collapse + s(3.4),
  afterOut: s(36.7),
};

// ---------- S3 贴纸 ----------
const sticker0 = s(38.5);
export const s3 = {
  intro: s(37.0),
  rise: s(37.75), // 字块重新飞起
  stickers: [0, 1, 2, 3, 4].map((i) => sticker0 + i * s(1.5)),
  flyLead: s(0.6), // 每组字块提前多久起飞
  bounce: sticker0 + 4 * s(1.5) + s(1.0),
  outro: sticker0 + 4 * s(1.5) + s(1.5),
  introOut: sticker0 + 4 * s(1.5) + s(1.3),
};

// ---------- S4 关灯 · 蛋糕 ----------
export const s4 = {
  switchOff: s(49.0),
  cakeStart: s(49.2),
  cakeEnd: s(51.7),
  candlesStart: s(51.75),
  candleStep: 2, // 每根蜡烛间隔帧
  ageLine: s(52.5),
  ignite: s(54.0),
  cardIn: s(54.8),
  stamp: s(55.6),
  opinion: s(55.75),
  cardOut: s(56.45),
  ageOut: s(56.3),
  wish: s(56.6),
  silenceStart: s(57.0),
  silenceEnd: s(60.0), // 3 秒全静音（只有极低火苗底噪）
  blow: s(60.0),
  extinguishStart: s(60.25),
  extinguishStep: 1.4, // 帧，依次熄灭
  wishOut: s(60.6),
  fadeToBlack: s(61.3),
  black: s(62.0),
  // 慢速钟琴《Happy Birthday》前两句
  glockStart: s(49.6),
  glockBeat: 0.5, // 秒
};

// ---------- S5 烟花 ----------
const burst1 = s(63.1);
const bb = (beats: number) => burst1 + Math.round(beats * beatB * FPS);
export const s5 = {
  // 每发：升空帧、炸开帧
  shots: [
    { launch: s(62.5), burst: burst1, x: 540, y: 640 },
    { launch: bb(1.5) - s(0.6), burst: bb(1.5), x: 290, y: 520 },
    { launch: bb(3) - s(0.6), burst: bb(3), x: 800, y: 600 },
    { launch: bb(4.5) - s(0.6), burst: bb(4.5), x: 400, y: 900 },
    { launch: bb(6) - s(0.6), burst: bb(6), x: 720, y: 430 },
    { launch: bb(7.5) - s(0.55), burst: bb(7.5), x: 230, y: 760 },
  ],
  final: { launch: bb(9) - s(0.65), burst: bb(9), x: 540, y: 760 },
  finalForm: s(0.45), // 火星飞到"20"的时间
  finalHold: s(1.0),
  musicReturn: burst1,
};

// ---------- S6 开灯 · 结尾 ----------
export const s6 = {
  lightsOn: bb(13), // = 第三句高音 "BIRTH-day dear"
  lines: [bb(13) + s(0.5), bb(13) + s(1.5), bb(13) + s(2.5)],
  title: bb(22), // = 旋律最后一个音落下
  signature: bb(22) + s(0.55),
  freeze: DURATION - s(1), // 最后 1 秒定格
  finalChord: bb(28),
};

// 第二段配乐的节拍零点（秒），synth.py 用
export const musicB = { start: burst1 / FPS, bpm: BPM_B, pickupBeats: 1 };
