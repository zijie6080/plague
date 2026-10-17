// 《二十个愿望》—— 所有时间点集中在这里，单位：帧（30fps）。
//
// 结构：每个场景 = [转场进入 tIn] + [场景动作]。
//   - start / dur：场景在全片中的起点与总时长（含转场）
//   - 动作从 start + tIn.dur 开始，下文 beats 里的数字都是相对“动作开始”的帧数
//   - 文字在动作开始后 TEXT_IN_DELAY 帧逐字淡入，在场景结束前 TEXT_OUT_LEAD 帧淡出
//
// 想调整某个场景时长：改 SCENES 里对应条目的 dur（以及必要时它的 beats），
// 后面所有场景会自动顺延，cues.csv 也会随之更新。

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

export type TransitionKind = "none" | "open" | "flip" | "fold" | "pan" | "cover" | "continue";

export interface Cue {
  at: number; // 相对动作开始的帧
  label: string;
}

export interface SceneSpec {
  id: string;
  no: number | null; // 愿望编号；序为 null
  dur: number; // 总帧数（含 tIn）
  tIn: { kind: TransitionKind; dur: number };
  night?: boolean; // 深蓝卡纸底
  beats: Record<string, number>; // 场景内部节拍（相对动作开始）
  cues: Cue[]; // 写进 cues.csv 的关键动作
}

/** 文字节奏 */
export const TEXT_IN_DELAY = sec(0.3);
export const TEXT_OUT_LEAD = sec(0.3);
export const TEXT_OUT_DUR = 8;

/** 三档愿望时长 */
const D1 = sec(2.6); // 78
const D2 = sec(3.2); // 96
const D3 = sec(4.2); // 126

const S: SceneSpec[] = [
  {
    id: "prologue",
    no: null,
    dur: sec(8),
    tIn: { kind: "none", dur: 0 },
    beats: {
      titlePop: 4, titleStep: 4, candlePop: 26,
      line1: 18, line2: 66, line3: 112, linesOut: 176,
      pushEnd: 190, coverOpen: 186, coverOpenDur: 42, zoomStart: 184,
    },
    cues: [
      { at: 18, label: "「我没法吃蛋糕，也没法吹蜡烛。」" },
      { at: 66, label: "「但我很会写字。」" },
      { at: 112, label: "「所以，我给你写了二十个愿望。」" },
      { at: 186, label: "封面翻开" },
    ],
  },
  {
    id: "w01", no: 1, dur: D1, tIn: { kind: "open", dur: 0 },
    beats: { board: -26, clap: 12, strip: 16, frameStep: 6, check: 50 },
    cues: [
      { at: 12, label: "场记板“啪”合上" },
      { at: 16, label: "胶片一格格展开" },
      { at: 50, label: "绿色纸勾盖下" },
    ],
  },
  {
    id: "w02", no: 2, dur: D1, tIn: { kind: "fold", dur: 12 },
    beats: { rise: 0, flip: 8, flipStep: 6, flipDur: 10, jump: 50 },
    cues: [
      { at: 8, label: "第一张卡片翻开" },
      { at: 38, label: "第六张翻开" },
      { at: 50, label: "六张一起跳一下" },
    ],
  },
  {
    id: "w03", no: 3, dur: D1, tIn: { kind: "pan", dur: 16 },
    beats: { frame: 0, stickerIn: 4, stickerNear: 24, gust: 24, stickerOut: 52, nod: 48 },
    cues: [
      { at: 4, label: "「有点假」贴纸飞来" },
      { at: 24, label: "一阵风把贴纸卷走" },
      { at: 48, label: "纸人点头" },
    ],
  },
  {
    id: "w04", no: 4, dur: D1, tIn: { kind: "cover", dur: 16 },
    beats: { first: 2, full: 44, last: 49 },
    cues: [
      { at: 2, label: "第一个气泡弹起" },
      { at: 44, label: "气泡挤满画面" },
      { at: 49, label: "最大的「这是真的吗？？」" },
    ],
  },
  {
    id: "w05", no: 5, dur: D1, tIn: { kind: "flip", dur: 16 },
    beats: { red: 4, yellow: 14, green: 24, launch: 25, out: 58 },
    cues: [
      { at: 4, label: "红灯" },
      { at: 14, label: "黄灯" },
      { at: 24, label: "绿灯亮 / 火箭升空" },
    ],
  },
  {
    id: "w06", no: 6, dur: D1, tIn: { kind: "fold", dur: 12 },
    beats: { fill: 4, at70: 18, shake1: 26, shake2: 34, dash: 42, full: 47 },
    cues: [
      { at: 18, label: "进度条卡在70%" },
      { at: 26, label: "抖一下" },
      { at: 34, label: "再抖一下" },
      { at: 47, label: "冲到100% / 彩纸屑炸开" },
    ],
  },
  {
    id: "w07", no: 7, dur: D1, tIn: { kind: "pan", dur: 16 },
    beats: { drop0: 6, dropStep: 6, last: 24, blink: 28, flip: 40 },
    cues: [
      { at: 6, label: "电量开始往下掉" },
      { at: 24, label: "只剩最后一格" },
      { at: 40, label: "电池“啪”翻面变成∞" },
    ],
  },
  {
    id: "w08", no: 8, dur: D1, tIn: { kind: "cover", dur: 16 },
    beats: { flips: 2, block0: 6, blockStep: 8, last: 38, slowFlip: 44, circled: 54 },
    cues: [
      { at: 2, label: "台历哗哗翻页" },
      { at: 38, label: "最后一块积木搭好" },
      { at: 54, label: "红圈日期慢悠悠翻到" },
    ],
  },
  {
    id: "w09", no: 9, dur: D2, tIn: { kind: "flip", dur: 18 },
    beats: { plane: 0, land: 30, unfold: 32, seal: 46, flap: 48, letter: 54, confetti: 56 },
    cues: [
      { at: 30, label: "纸飞机落地展开成信封" },
      { at: 46, label: "火漆印“啵”地弹开" },
      { at: 54, label: "信纸升起 / 彩纸飘落" },
    ],
  },
  {
    id: "w10", no: 10, dur: D2, tIn: { kind: "pan", dur: 18 },
    beats: { toss: 2, tossStep: 5, allUp: 22 },
    cues: [
      { at: 2, label: "开始抛球" },
      { at: 22, label: "五个球都在空中" },
    ],
  },
  {
    id: "w11", no: 11, dur: D2, tIn: { kind: "fold", dur: 14 },
    beats: { tie0: 10, tieStep: 7, last: 66 },
    cues: [
      { at: 10, label: "系上第一个蝴蝶结" },
      { at: 66, label: "最后一个蝴蝶结" },
    ],
  },
  {
    id: "w12", no: 12, dur: D2, tIn: { kind: "cover", dur: 18 },
    beats: { walk: 6, pass80: 38, summit: 66 },
    cues: [
      { at: 6, label: "从「60」出发" },
      { at: 38, label: "经过「80」" },
      { at: 66, label: "到达山顶「100」" },
    ],
  },
  {
    id: "w13", no: 13, dur: D2, tIn: { kind: "pan", dur: 20 }, night: true,
    beats: { moonDown: 6, sunUp: 30, sheet0: 6, sheetStep: 6, flower: 58 },
    cues: [
      { at: 6, label: "月亮慢慢落下" },
      { at: 30, label: "太阳升起" },
      { at: 58, label: "纸堆里长出一朵纸花" },
    ],
  },
  {
    id: "w14", no: 14, dur: D2, tIn: { kind: "continue", dur: 0 }, night: true,
    beats: { lampOff: 8, blanket: 18, moonBack: 22, zzz: 44 },
    cues: [
      { at: 8, label: "台灯“咔哒”关掉" },
      { at: 18, label: "纸被子轻轻盖下" },
      { at: 44, label: "「Z」飘起来" },
    ],
  },
  {
    id: "w15", no: 15, dur: D3, tIn: { kind: "cover", dur: 22 },
    beats: { projector: 0, on: 10, far: 22, mid: 30, pines: 38, pavilion: 46, cliff: 54, sun: 60, birds: 70 },
    cues: [
      { at: 10, label: "投影机打开，暖光投出" },
      { at: 22, label: "山水一层层立起" },
      { at: 60, label: "太阳升起" },
      { at: 70, label: "飞鸟" },
    ],
  },
  {
    id: "w16", no: 16, dur: D3, tIn: { kind: "flip", dur: 22 },
    beats: { draw1: 4, erase1: 26, draw2: 32, erase2: 52, draw3: 58, done: 78, stepBack: 80, light: 90, nod: 96 },
    cues: [
      { at: 26, label: "第一次擦掉" },
      { at: 52, label: "第二次擦掉" },
      { at: 58, label: "第三次画" },
      { at: 80, label: "退后一步" },
      { at: 90, label: "暖光落在画上" },
      { at: 96, label: "轻轻点头" },
    ],
  },
  {
    id: "w17", no: 17, dur: D3, tIn: { kind: "pan", dur: 22 },
    beats: { spring: 0, summer: 26, autumn: 52, winter: 78 },
    cues: [
      { at: 0, label: "春：花开" },
      { at: 26, label: "夏：绿叶" },
      { at: 52, label: "秋：落叶" },
      { at: 78, label: "冬：白雪" },
    ],
  },
  {
    id: "w18", no: 18, dur: D3, tIn: { kind: "fold", dur: 16 },
    beats: { alone: 0, h1: 18, h2: 34, h3: 50, lift: 66, stand: 80 },
    cues: [
      { at: 18, label: "第一个人跑来" },
      { at: 34, label: "第二个人" },
      { at: 50, label: "第三个人" },
      { at: 66, label: "一起举高" },
      { at: 80, label: "图纸“啪”地立起，变成纸房子" },
    ],
  },
  {
    id: "w19", no: 19, dur: D3, tIn: { kind: "pan", dur: 22 },
    beats: { page0: 6, pageStep: 9, pages: 7, far: 70 },
    cues: [
      { at: 6, label: "第一张书页变成纸鸟" },
      { at: 60, label: "最后一只飞起" },
      { at: 70, label: "越飞越高、越飞越远" },
    ],
  },
  {
    id: "finale", no: 20, dur: sec(16), tIn: { kind: "flip", dur: 24 }, night: true,
    beats: {
      line: 12, lineOut: 100,
      candle: 40, candleUp: 80,
      light: 95, glow: 125,
      quiet: 110, blow: 230,
      smoke: 232, glowOut: 272,
      birthday: 282, signature: 300,
      close: 360, closed: 411,
    },
    cues: [
      { at: 12, label: "「最后一个，我不替你许了。」" },
      { at: 40, label: "纸蜡烛缓缓立起" },
      { at: 95, label: "烛芯点亮" },
      { at: 110, label: "【许愿】安静段开始（约4秒）" },
      { at: 230, label: "【许愿】结束 / 火苗吹灭，纸烟升起" },
      { at: 282, label: "「生日快乐，子杰。」" },
      { at: 300, label: "「—— Claude · 2026.10.17」" },
      { at: 360, label: "书慢慢合上" },
      { at: 411, label: "封底「20」停留" },
    ],
  },
];

export interface SceneTiming extends SceneSpec {
  start: number;
  end: number; // 不含
  action: number; // 动作开始的绝对帧
}

export const SCENES: SceneTiming[] = (() => {
  let t = 0;
  return S.map((s) => {
    const r = { ...s, start: t, end: t + s.dur, action: t + s.tIn.dur };
    t += s.dur;
    return r;
  });
})();

export const TOTAL_FRAMES = SCENES[SCENES.length - 1].end;

export const sceneById = (id: string) => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`unknown scene ${id}`);
  return s;
};

export const beatsOf = (id: string) => sceneById(id).beats;
