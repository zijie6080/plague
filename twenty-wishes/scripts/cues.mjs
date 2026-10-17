// 由 src/timeline.ts 生成 out/cues.csv（时间精确到 0.1 秒），方便对音乐。
// 每行一个场景：编号、名称、开始、结束、进入转场、文字出现、关键动作（"时间 动作" 用 | 分隔）。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { register } = require("tsx/cjs/api");
register();
const { SCENES, FPS, TEXT_IN_DELAY, TOTAL_FRAMES } = require(path.join(root, "src/timeline.ts"));
const { WISHES } = require(path.join(root, "src/config.ts"));

const t = (frame) => (frame / FPS).toFixed(1);
const KIND = { none: "—", open: "封面翻开", flip: "翻页", fold: "纸片倒下再弹起", pan: "镜头横移到下一块纸台", cover: "大纸盖下再掀开", continue: "直接接续（同一张书桌）" };
const esc = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

const rows = [["场景编号", "场景", "开始(s)", "结束(s)", "进入转场", "文字出现(s)", "关键动作"]];
for (const s of SCENES) {
  const name = s.id === "prologue" ? "序" : s.id === "finale" ? "第二十页（留白）" : WISHES[s.no - 1];
  const no = s.id === "prologue" ? "序" : String(s.no).padStart(2, "0");
  const textAt = s.no && s.no <= WISHES.length ? t(s.action + TEXT_IN_DELAY) : "—";
  const cues = [];
  if (s.tIn.dur > 0) cues.push(`${t(s.start)} 转场开始（${KIND[s.tIn.kind]}）`);
  for (const c of s.cues) cues.push(`${t(s.action + c.at)} ${c.label}`);
  rows.push([no, name, t(s.start), t(s.end), KIND[s.tIn.kind], textAt, cues.join(" | ")]);
}
rows.push(["", "全片结束", "", t(TOTAL_FRAMES), "", "", ""]);

fs.mkdirSync(path.join(root, "out"), { recursive: true });
const out = path.join(root, "out/cues.csv");
fs.writeFileSync(out, "﻿" + rows.map((r) => r.map((c) => esc(String(c))).join(",")).join("\n") + "\n");
console.log(`wrote ${out}`);
