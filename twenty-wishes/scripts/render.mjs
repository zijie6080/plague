// 渲染视频。
//   node scripts/render.mjs preview            → out/preview_960x540.mp4（检查节奏用）
//   node scripts/render.mjs final              → out/twenty_wishes.mp4（1920×1080，H.264，无音轨）
//   可选：--range=1440-1566 只渲染一段（帧号，含首尾）；--concurrency=4
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
fs.mkdirSync(out, { recursive: true });

const mode = process.argv[2] ?? "preview";
const opt = Object.fromEntries(
  process.argv
    .slice(3)
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("=")),
);
const CHROME = process.env.REMOTION_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const frameRange = opt.range ? opt.range.split("-").map(Number) : undefined;
const concurrency = Number(opt.concurrency ?? 4);

const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts"), publicDir: path.join(root, "public") });
const inputProps = { debug: opt.debug ?? "" };
const gl = opt.gl ?? "angle";
const composition = await selectComposition({ serveUrl, id: "TwentyWishes", inputProps, browserExecutable: CHROME, chromiumOptions: { gl } });

const t0 = Date.now();
let last = 0;
const onProgress = ({ renderedFrames, encodedFrames }) => {
  const now = Date.now();
  if (now - last > 15000) {
    last = now;
    const s = ((now - t0) / 1000).toFixed(0);
    console.log(`[${s}s] rendered ${renderedFrames} encoded ${encodedFrames}`);
  }
};

const common = {
  serveUrl,
  composition,
  browserExecutable: CHROME,
  chromiumOptions: { gl },
  inputProps,
  concurrency,
  frameRange,
  muted: true, // 成片无声
  imageFormat: "jpeg",
  jpegQuality: 96,
  onProgress,
  timeoutInMilliseconds: 120000,
};

if (mode === "preview") {
  const file = path.join(out, opt.out ?? "preview_960x540.mp4");
  await renderMedia({ ...common, codec: "h264", scale: 0.5, crf: 20, outputLocation: file, overwrite: true });
  console.log(`done ${file} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
} else {
  // 先渲高质量母版，再用 ffmpeg 压成适合抖音 / B 站的 H.264
  const master = path.join(out, opt.master ?? "_master.mp4");
  await renderMedia({ ...common, codec: "h264", crf: 10, x264Preset: "medium", outputLocation: master, overwrite: true });
  console.log(`master done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const file = path.join(out, opt.out ?? "twenty_wishes.mp4");
  execFileSync(
    "ffmpeg",
    [
      "-y", "-i", master,
      "-an",
      "-c:v", "libx264", "-preset", "slow", "-tune", "film",
      "-crf", "18", "-maxrate", "9M", "-bufsize", "18M",
      "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
      "-r", "30", "-g", "60", "-bf", "2",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      "-movflags", "+faststart",
      file,
    ],
    { stdio: "inherit" },
  );
  console.log(`done ${file} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
