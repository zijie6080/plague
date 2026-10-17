// 渲染关键帧到 out/stills/。
//   node scripts/stills.mjs                     → 每个场景 2 张（动作中段 + 结尾前）
//   node scripts/stills.mjs w06 w15 finale      → 只渲染指定场景
//   node scripts/stills.mjs @1234 @1500         → 指定全片帧号
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "out/stills");
fs.mkdirSync(outDir, { recursive: true });

const { register } = require("tsx/cjs/api");
register();
const { SCENES } = require(path.join(root, "src/timeline.ts"));

const CHROME = process.env.REMOTION_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

/** 每个场景的默认关键帧（相对动作开始） */
const pick = (s) => {
  const act = s.dur - s.tIn.dur;
  const custom = {
    prologue: [130, 205],
    finale: [70, 175, 300, 450],
    w06: [30, 52],
    w15: [44, 96],
  }[s.id];
  const rel = custom ?? [Math.round(act * 0.55), act - 12];
  return rel.map((r) => ({ frame: s.action + r, name: `${s.id}_${String(r).padStart(3, "0")}` }));
};

const args = process.argv.slice(2);
let jobs = [];
if (args.length === 0) jobs = SCENES.flatMap(pick);
for (const a of args) {
  if (a.startsWith("@")) jobs.push({ frame: Number(a.slice(1)), name: `f${a.slice(1).padStart(4, "0")}` });
  else {
    const [id, rel] = a.split(":");
    const s = SCENES.find((x) => x.id === id);
    if (!s) throw new Error(`unknown scene ${id}`);
    if (rel !== undefined) jobs.push({ frame: s.action + Number(rel), name: `${id}_${rel.padStart(3, "0")}` });
    else jobs.push(...pick(s));
  }
}

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const comp = await selectComposition({ serveUrl, id: "TwentyWishes", browserExecutable: CHROME, chromiumOptions: { gl: process.env.REMOTION_GL ?? "angle" } });
for (const j of jobs) {
  const t0 = Date.now();
  const output = path.join(outDir, `${j.name}.png`);
  await renderStill({ serveUrl, composition: comp, frame: j.frame, output, browserExecutable: CHROME, chromiumOptions: { gl: process.env.REMOTION_GL ?? "angle" }, overwrite: true });
  console.log(`${j.name} (frame ${j.frame}) ${Date.now() - t0}ms`);
}
