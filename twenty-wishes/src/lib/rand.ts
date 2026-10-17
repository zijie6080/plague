// 确定性随机与噪声：全片禁止 Math.random，一律走这里。

/** mulberry32：带种子的 PRNG，返回 [0,1) */
export const prng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 由整数/字符串直接得到 [0,1) 的哈希值（无状态） */
export const hash = (...xs: (number | string)[]) => {
  let h = 2166136261 >>> 0;
  for (const x of xs) {
    const s = String(x);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  }
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};

/** 在 [a,b) 之间的带种子取值 */
export const rangeOf = (r: () => number, a: number, b: number) => a + (b - a) * r();

/** 一维值噪声（平滑），t 连续，输出 [-1,1] */
export const noise1 = (t: number, seed = 0) => {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(seed, i) * 2 - 1;
  const b = hash(seed, i + 1) * 2 - 1;
  return a + (b - a) * u;
};

/** 分形一维噪声 */
export const fbm1 = (t: number, seed = 0, oct = 3) => {
  let s = 0;
  let amp = 1;
  let norm = 0;
  let fr = 1;
  for (let o = 0; o < oct; o++) {
    s += amp * noise1(t * fr, seed + o * 101);
    norm += amp;
    amp *= 0.5;
    fr *= 2.03;
  }
  return s / norm;
};
