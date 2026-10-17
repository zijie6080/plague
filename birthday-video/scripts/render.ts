// 渲染：stills（关键帧截图）/ preview（540×960 低清）/ final（1080×1920 成片）
//   npx tsx scripts/render.ts stills|preview|final
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, ChromiumOptions } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { scenes, s0, s1, s2, s3, s4, s5, s6, s } from "../src/timeline";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
mkdirSync(path.join(OUT, "stills"), { recursive: true });
const mode = process.argv[2] ?? "final";
const only = process.argv.slice(3);

const CANDIDATES = [
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
  process.env.REMOTION_BROWSER ?? "",
].filter((p) => p && existsSync(p));
const browserExecutable = CANDIDATES[0] ?? null;

const STILLS: [string, number][] = [
  ["s0_typing", s0.lines[1].chars[8]],
  ["s0_line3", s0.explode - 6],
  ["s0_boom", s0.explode + 5],
  ["s1_title", s1.rainStart + s(2)],
  ["s1_pile", scenes.s2.from - 3],
  ["s2_fig1", s2.rounds[0].stamp + 12],
  ["s2_fig2", s2.rounds[1].stamp + 12],
  ["s2_fig3", s2.rounds[2].stamp + 12],
  ["s2_collapse3", s2.rounds[2].collapse + 20],
  ["s2_after", s2.after2 + 25],
  ["s3_flying", s3.stickers[1] - 6],
  ["s3_all", s3.outro + 20],
  ["s4_cake", s4.ageLine + 10],
  ["s4_lit", s4.stamp + 18],
  ["s4_wish", s4.silenceStart + 30],
  ["s4_blow", s4.extinguishStart + 12],
  ["s5_burst", s5.shots[2].burst + 10],
  ["s5_20", s5.final.burst + s5.finalForm + 8],
  ["s6_lines", s6.lines[2] + 20],
  ["s6_title", s6.freeze],
];

async function main() {
  console.log("bundling…");
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), publicDir: path.join(ROOT, "public") });
  const inputProps = { withAudio: false };

  // WebGL：angle → swangle → egl；都不行时火焰组件自动退回 Canvas 2D
  let gl: ChromiumOptions["gl"] = "angle";
  for (const cand of ["angle", "swangle", "egl"] as const) {
    let warned = false;
    try {
      const comp = await selectComposition({ serveUrl, id: "YanshouTongguo", inputProps, browserExecutable, chromiumOptions: { gl: cand } });
      await renderStill({
        serveUrl,
        composition: comp,
        frame: s4.stamp,
        output: path.join(OUT, "tmp_gl.png"),
        inputProps,
        browserExecutable,
        chromiumOptions: { gl: cand },
        onBrowserLog: (l) => {
          if (l.text.includes("flame shader failed")) warned = true;
        },
      });
      rmSync(path.join(OUT, "tmp_gl.png"), { force: true });
      if (!warned) {
        gl = cand;
        break;
      }
      console.log(`gl=${cand}: WebGL not available`);
    } catch (e) {
      console.log(`gl=${cand} failed: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  console.log(`using gl=${gl}`);
  const chromiumOptions: ChromiumOptions = { gl };
  const composition = await selectComposition({ serveUrl, id: "YanshouTongguo", inputProps, browserExecutable, chromiumOptions });

  if (mode === "stills") {
    for (const [name, frame] of STILLS) {
      if (only.length && !only.some((o) => name.startsWith(o))) continue;
      await renderStill({ serveUrl, composition, frame, output: path.join(OUT, "stills", `${name}.png`), inputProps, browserExecutable, chromiumOptions, scale: 0.5 });
      console.log(`still ${name} @${frame}`);
    }
    return;
  }

  const preview = mode === "preview";
  const silent = path.join(OUT, preview ? "preview_silent.mp4" : "final_silent.mp4");
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    outputLocation: silent,
    inputProps,
    browserExecutable,
    chromiumOptions,
    muted: true,
    scale: preview ? 0.5 : 1,
    concurrency: Math.max(1, os.cpus().length),
    crf: preview ? 18 : 12, // 中间文件，下面再用 ffmpeg 压成发布码率
    pixelFormat: "yuv420p",
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 20);
      if (p !== last) {
        last = p;
        console.log(`${(progress * 100).toFixed(0)}%  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
    },
  });

  // 混入音频（AAC 48kHz）
  const audio = path.join(ROOT, "public/audio/score.wav"); // synth.py 输出的完整混音（含外部配乐时也是它）
  const out = path.join(OUT, preview ? "preview_540x960.mp4" : "yanshou_tongguo.mp4");
  // 发布编码：H.264 High / yuv420p（TV 范围，BT.709）/ 约 6 Mbps，适合抖音、朋友圈；AAC 48kHz
  const vArgs = preview
    ? ["-c:v", "libx264", "-preset", "veryfast", "-crf", "26"]
    : ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-level", "4.1", "-b:v", "6M", "-maxrate", "8M", "-bufsize", "12M"];
  execFileSync(
    "ffmpeg",
    [
      "-y", "-loglevel", "error", "-i", silent, "-i", audio,
      "-map", "0:v:0", "-map", "1:a:0",
      ...vArgs,
      "-vf", "scale=in_range=full:out_range=tv,format=yuv420p",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
      "-r", "30", "-g", "60",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
      "-shortest", "-movflags", "+faststart", out,
    ],
    { stdio: "inherit" },
  );
  rmSync(silent, { force: true });
  console.log(`done → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
