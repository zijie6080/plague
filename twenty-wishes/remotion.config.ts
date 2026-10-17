import { Config } from "@remotion/cli/config";

// 使用容器里预装的 Chromium（Playwright 自带），避免渲染时再下载浏览器
const chrome = process.env.REMOTION_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
Config.setBrowserExecutable(chrome);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer("angle");
Config.setConcurrency(4);
