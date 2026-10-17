// 字块、小人、贴纸、蛋糕的几何布局。物理脚本（Node）和渲染（Remotion）共用这一份。
import { config } from "../config";
import { s4 } from "../timeline";

export const W = config.width;
export const H = config.height;
export const FLOOR_Y = 1572; // 字块山的地面（底部约 18% 留给平台 UI）
export const CHAR_W = 0.96; // 得意黑单字宽度 ≈ 0.96em（含标点全角）

export type BlockDef = {
  id: number;
  quote: number;
  text: string;
  lines: string[];
  font: number;
  w: number;
  h: number;
};

function splitLines(text: string): string[] {
  const n = [...text].length;
  if (n < 8) return [text];
  // 在第一个逗号后断行；没有逗号就居中断
  const idx = text.indexOf("，");
  if (idx > 0 && idx < n - 1) return [text.slice(0, idx + 1), text.slice(idx + 1)];
  const m = Math.ceil(n / 2);
  return [text.slice(0, m), text.slice(m)];
}

function fontFor(lines: string[]) {
  if (lines.length > 1) return 38;
  const n = [...lines[0]].length;
  if (n <= 2) return 86;
  if (n <= 3) return 70;
  if (n <= 4) return 60;
  return 50;
}

export function makeBlock(id: number, quote: number): BlockDef {
  const text = config.quotes[quote];
  const lines = splitLines(text);
  const font = fontFor(lines);
  const maxChars = Math.max(...lines.map((l) => [...l].length));
  const padX = font * 0.62;
  const w = Math.round(maxChars * font * CHAR_W + padX * 2);
  const h = Math.round(lines.length > 1 ? font * 2.55 : font * 1.5);
  return { id, quote, text, lines, font, w, h };
}

// S1 的全部字块：先每句一次，再在结尾密集倾泻时重复几句
export const blocks: BlockDef[] = [
  ...config.quotes.map((_, i) => i),
  ...config.repeatQuotes,
].map((q, id) => makeBlock(id, q));

export const N_BLOCKS = blocks.length;
export const HEAD_ID = N_BLOCKS; // 小人的头作为一个额外的圆形刚体参与散架

// ---------------- 小人 ----------------
export type Slot = { x: number; y: number; angle: number; scale: number };
export type FigureKind = "party" | "cool" | "wild";
export type Figure = {
  kind: FigureKind;
  slots: Slot[]; // 按 block id 索引
  head: { x: number; y: number; r: number; angle: number };
  k: number; // 整体缩放
  color: string; // 头的颜色
};

type RawSlot = { x: number; y: number; angle: number; len: number; thick: number };

function seg(ax: number, ay: number, bx: number, by: number, n: number, thick: number): RawSlot[] {
  const len = Math.hypot(bx - ax, by - ay);
  const angle = Math.atan2(by - ay, bx - ax);
  const out: RawSlot[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, angle, len: len / n - 6, thick });
  }
  return out;
}

// 躯干：cols × rows 的字块格子（长宽比约 2.7，和字块本身接近，字不会被缩得太小）
function torso(top: number, rows: number, cols: number, width: number, lean = 0, angle = 0): RawSlot[] {
  const out: RawSlot[] = [];
  const rowH = 54;
  const cw = width / cols;
  for (let i = 0; i < rows; i++)
    for (let c = 0; c < cols; c++)
      out.push({
        x: lean * (rows - 1 - i) - width / 2 + cw * (c + 0.5) + (i % 2 ? 6 : -6),
        y: top + rowH / 2 + i * (rowH + 5),
        angle,
        len: cw - 6,
        thick: rowH,
      });
  return out;
}

function figureRaw(kind: FigureKind) {
  if (kind === "party") {
    return {
      cx: 540,
      cy: 820,
      k: 1,
      head: { x: 0, y: -338, r: 84, angle: 0 },
      body: [
        ...torso(-246, 4, 2, 300),
        ...seg(-176, -236, -190, -100, 1, 50),
        ...seg(-190, -96, -198, 34, 1, 50),
        ...seg(176, -236, 190, -100, 1, 50),
        ...seg(190, -96, 198, 34, 1, 50),
        ...seg(-70, -4, -74, 146, 1, 58),
        ...seg(-74, 150, -78, 300, 1, 58),
        ...seg(70, -4, 74, 146, 1, 58),
        ...seg(74, 150, 78, 300, 1, 58),
      ],
      podiumTop: 312,
    };
  }
  if (kind === "cool") {
    return {
      cx: 540,
      cy: 820,
      k: 1,
      head: { x: 26, y: -336, r: 84, angle: 0.14 },
      body: [
        ...torso(-246, 4, 2, 300, 4, -0.03),
        // 手插兜：手肘外撇，手收到胯部
        ...seg(-160, -232, -250, -118, 1, 50),
        ...seg(-246, -108, -146, -14, 1, 50),
        ...seg(170, -236, 258, -122, 1, 50),
        ...seg(254, -112, 152, -18, 1, 50),
        // 一条腿直，一条腿交叉
        ...seg(-66, -4, -62, 146, 1, 58),
        ...seg(-62, 150, -56, 300, 1, 58),
        ...seg(72, -4, 30, 146, 1, 58),
        ...seg(28, 152, -18, 296, 1, 58),
      ],
      podiumTop: 312,
    };
  }
  // wild：巨大夸张，双臂高举，长翅膀
  const wings: RawSlot[] = [];
  for (const side of [-1, 1]) {
    const px = side * 150;
    const py = -150;
    [-0.55, -0.05, 0.45].forEach((a, i) => {
      const dir = side < 0 ? Math.PI - a : a;
      const r = 150 + (i === 1 ? 20 : 0);
      wings.push({ x: px + Math.cos(dir) * r, y: py + Math.sin(dir) * r, angle: dir, len: 170 - i * 14, thick: 54 });
    });
  }
  return {
    cx: 540,
    cy: 900,
    k: 1.18,
    head: { x: 0, y: -338, r: 84, angle: -0.1 },
    body: [
      ...torso(-246, 4, 2, 300),
      ...seg(-176, -240, -246, -360, 1, 50),
      ...seg(-252, -372, -300, -500, 1, 50),
      ...seg(176, -240, 246, -360, 1, 50),
      ...seg(252, -372, 300, -500, 1, 50),
      ...seg(-70, -4, -126, 140, 1, 58),
      ...seg(-130, 150, -180, 290, 1, 58),
      ...seg(70, -4, 126, 140, 1, 58),
      ...seg(130, 150, 180, 290, 1, 58),
      ...wings,
    ],
    podiumTop: 312,
  };
}

function fitScale(b: BlockDef, len: number, thick: number) {
  return Math.min(len / b.w, thick / b.h);
}

export function buildFigure(kind: FigureKind): Figure {
  const raw = figureRaw(kind);
  const k = raw.k;
  const slots: Slot[] = new Array(N_BLOCKS);
  const free = new Set(blocks.map((b) => b.id));
  // 身体：按长度从大到小，挑长宽比最接近的字块
  const order = raw.body.map((sl, i) => ({ sl, i })).sort((a, b) => b.sl.len - a.sl.len);
  for (const { sl } of order) {
    const aspect = sl.len / sl.thick;
    let best = -1;
    let bestScore = Infinity;
    for (const id of free) {
      const b = blocks[id];
      const score = Math.abs(Math.log(b.w / b.h / aspect));
      if (score < bestScore) {
        bestScore = score;
        best = id;
      }
    }
    free.delete(best);
    const b = blocks[best];
    slots[best] = {
      x: raw.cx + sl.x * k,
      y: raw.cy + sl.y * k,
      angle: sl.angle,
      scale: fitScale(b, sl.len, sl.thick) * k * 0.98,
    };
  }
  // 剩下的字块堆成脚下的小舞台
  const T = 50 * k;
  const maxW = 860;
  const rest = [...free];
  const rows: number[][] = [[]];
  let rowW = 0;
  for (const id of rest) {
    const b = blocks[id];
    const bw = (b.w * T) / b.h + 6;
    if (rowW + bw > maxW && rows[rows.length - 1].length) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1].push(id);
    rowW += bw;
  }
  const top = raw.cy + raw.podiumTop * k;
  rows.forEach((row, r) => {
    const widths = row.map((id) => (blocks[id].w * T) / blocks[id].h);
    const total = widths.reduce((a, b) => a + b, 0) + 6 * (row.length - 1);
    let x = 540 - total / 2;
    row.forEach((id, j) => {
      slots[id] = {
        x: x + widths[j] / 2,
        y: top + T / 2 + r * (T + 5),
        angle: 0,
        scale: T / blocks[id].h,
      };
      x += widths[j] + 6;
    });
  });
  return {
    kind,
    slots,
    head: {
      x: raw.cx + raw.head.x * k,
      y: raw.cy + raw.head.y * k,
      r: raw.head.r * k,
      angle: raw.head.angle,
    },
    k,
    color: kind === "party" ? "#FECA57" : kind === "cool" ? "#48DBFB" : "#FF9F43",
  };
}

export const figures: Figure[] = (["party", "cool", "wild"] as FigureKind[]).map(buildFigure);

// ---------------- S3 贴纸 ----------------
export const stickerLayout = config.stickers.map((text, i) => {
  const font = 60;
  const n = [...text].length;
  const w = Math.min(980, Math.round(n * font * CHAR_W * 0.94 + 120));
  return {
    text,
    font,
    w,
    h: 132,
    x: 540 + [-24, 26, -12, 20, -6][i],
    y: 470 + i * 205,
    rot: [-3.5, 2.8, -2.2, 3.4, -1.6][i],
    color: ["#FF6B6B", "#48DBFB", "#FECA57", "#1DD1A1", "#A29BFE"][i],
  };
});

// ---------------- S4 蛋糕 ----------------
export type Brick = {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  font: number;
  color: string;
  drop: number; // 开始下落的帧
  tier: number;
};

export const cakeTiers = [
  { width: 820, rows: 3, rowH: 62, bottom: 1494, font: 26 },
  { width: 660, rows: 3, rowH: 54, bottom: 1300, font: 23 },
  { width: 520, rows: 2, rowH: 56, bottom: 1126, font: 23 },
];
export const CAKE_TOP = 1006;
export const CAKE_X = 540;

export const cakeBricks: Brick[] = (() => {
  const out: Brick[] = [];
  let q = 3;
  const gap = 4;
  cakeTiers.forEach((tier, t) => {
    for (let r = 0; r < tier.rows; r++) {
      const y = tier.bottom - (tier.rows - r) * (tier.rowH + gap) + gap;
      const row: { text: string; w: number }[] = [];
      let sum = 0;
      while (sum < tier.width - 40) {
        const text = config.quotes[q % config.quotes.length];
        q += 5;
        const w = [...text].length * tier.font * 0.98 + 26;
        row.push({ text, w });
        sum += w + gap;
      }
      const scale = (tier.width - gap * (row.length - 1)) / (sum - gap);
      let x = CAKE_X - tier.width / 2;
      row.forEach((b, i) => {
        const w = b.w * scale;
        out.push({
          x: x + w / 2,
          y: y + tier.rowH / 2,
          w,
          h: tier.rowH,
          text: b.text,
          font: tier.font,
          color: config.colors.party[(i * 2 + r * 3 + t) % 6],
          drop: 0,
          tier: t,
        });
        x += w + gap;
      });
    }
  });
  // 自下而上，一行一行落
  const span = s4.cakeEnd - s4.cakeStart - 8;
  out.forEach((b, i) => {
    b.drop = s4.cakeStart + Math.round((i / (out.length - 1)) * span);
  });
  return out;
})();

// 20 根蜡烛：两排，后排 10 根、前排 10 根，交错
export const candles = Array.from({ length: config.candles }, (_, i) => {
  const back = i % 2 === 0;
  const j = Math.floor(i / 2);
  const spacing = 46;
  const rowW = spacing * 9;
  const x = CAKE_X - rowW / 2 + j * spacing + (back ? -11 : 11);
  const base = back ? 1000 : 1016;
  const height = back ? 100 : 88;
  return {
    i,
    x,
    base,
    height,
    top: base - height,
    back,
    color: config.colors.party[(i * 5 + 1) % 6],
  };
});
