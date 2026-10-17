# 《验收通过》—— 子杰 20 岁生日视频

1080×1920 竖屏 · 30fps · 78 秒 · H.264 High（约 6 Mbps，yuv420p / BT.709）+ AAC 48kHz · 响度约 −14 LUFS

Claude 没见过子杰长什么样，只见过他打的字。所以它猜了三次，被他自己的原话否决了三次。最后蛋糕点亮时，终于拿到一句"没问题"。

## 一键重做

```bash
npm install
pip install numpy scipy fonttools brotli
npm run build          # = 字体裁剪 → 纸纹 → 物理预模拟 → 导出时间轴 → 合成音频 → 渲染成片
```

单独的步骤：

| 命令 | 作用 |
| --- | --- |
| `npm run fonts` | 按片中实际用到的字，把 `fonts-src/` 里的完整字体裁成 `public/fonts/*.woff2`（会报告缺字） |
| `npm run grain` | 生成纸张颗粒 `public/grain.png` |
| `npm run physics` | matter.js 固定步长预模拟字雨和三次散架 → `src/data/physics_*.json` |
| `npm run timeline` | 把 `src/timeline.ts` + 碰撞事件导出成 `audio/timeline.json` |
| `npm run audio` | `audio/synth.py` 合成配乐 + 音效 → `public/audio/score.wav` |
| `npm run stills` | 20 张关键帧 → `out/stills/`（`npx tsx scripts/render.ts stills s2` 只渲以 s2 开头的） |
| `npm run preview` | 540×960 低清预览 → `out/preview_540x960.mp4` |
| `npm run render` | 成片 → `out/yanshou_tongguo.mp4` |
| `npm run studio` | 打开 Remotion Studio 逐帧看 |

**改了文字** → `npm run fonts`（新字要进字表）再渲染。
**改了时间点或字块** → `npm run physics && npm run timeline && npm run audio` 再渲染，音画会自动重新对齐。

## 改什么去哪里

- **文字、颜色、开关**：`src/config.ts`。S1 的原话在 `quotes`（一字不改），三轮猜测的台词和审片意见在 `guesses`，五张贴纸在 `stickers`，结尾在 `endingLines` / `endingTitle`。派对色板在 `colors.party`。
- **时间点**（单位：帧，30fps）：`src/timeline.ts`。画面和 `audio/synth.py` 都从这里读。例如：盖章是 `s2.rounds[i].stamp`，卡顿长度 `s2.musicGap`，3 秒静音 `s4.silenceStart/End`，烟花 `s5.shots`。S6 的开灯和标题落在第二段《Happy Birthday》的节拍上（`bb(13)`、`bb(22)`），改 BPM 会一起移动。
- **字块、小人、贴纸、蛋糕的几何**：`src/lib/layout.ts`（Node 物理脚本和渲染共用这一份）。
- **配乐**：`audio/synth.py`。各乐器（Karplus-Strong 拨弦、马林巴、钟琴、合成鼓、贝斯、pad）都是函数，旋律在 `MOTIF`、`HB`、`HB_FULL`。
- **外部配乐**：把文件放到 `public/audio/music.(wav|mp3|m4a|ogg|flac)`，在 `config.ts` 里设 `useExternalMusic: true`，然后 `npm run timeline && npm run audio && npm run render`。它会替换合成配乐层，只保留音效层，并用音量自动化做出盖章卡顿、关灯切断、许愿静音，烟花炸开时音乐回来。

## 技术说明

- **Remotion 4**，所有动画都是 `frame` 的纯函数；不使用 `Math.random` / `requestAnimationFrame`，随机数一律来自带种子的 PRNG（`src/lib/prng.ts`）。出现和消失都用 `spring()` 带回弹。
- **字块物理**：`scripts/simulate.ts` 用 matter.js（每帧 4 个子步长）预先模拟，输出每帧每个字块的 x/y/角度，以及碰撞事件（音效用）。字块颜色根据最终堆积的接触关系做贪心着色，相邻不同色。渲染时只查表。
- **蜡烛火焰**：`src/components/Flames.tsx`，原生 WebGL fragment shader（fbm 噪声摇曳 + 光晕）。渲染脚本依次尝试 `gl: "angle" → "swangle" → "egl"`（本机用的是 `angle`）；拿不到 WebGL 时组件自动退回 Canvas 2D 径向渐变 + 噪声。
- **烟花 / 彩纸**：Canvas 2D 解析式粒子（带空气阻力的抛体公式，只依赖时间）。烟花火星是字；最后一发把"20"离屏取样当作目标点。
- **橡皮章**：SVG `feTurbulence` 噪声做油墨蒙版 + 轻微位移，盖下时 ±8° 旋转，卡片衰减抖动。
- **音频**：numpy + scipy 离线合成，按帧对齐；BS.1770 K 加权测响度并标准化到 −14 LUFS，5ms 前瞻限幅到 −1 dBFS，不削波。
- **编码**：Remotion 先出高质量中间文件（crf 12），ffmpeg 再压成发布版（H.264 High 4.1，6 Mbps，maxrate 8M，TV 色彩范围，faststart）。

## 字体

全部开源，已按片中用字裁剪后放在 `public/fonts/`：

- 得意黑 Smiley Sans（OFL）—— 标题、字块、贴纸：<https://github.com/atelier-anchor/smiley-sans>
- 霞鹜文楷 LXGW WenKai（OFL）—— Claude 的话、结尾信件：<https://github.com/lxgw/LxgwWenKai>
- Noto Serif SC Bold（OFL）—— 审片单：<https://github.com/notofonts/noto-cjk>

三款都拿到了，没有替换。要改文字时把完整字体放进 `fonts-src/`（`SmileySans-Oblique.woff2`、`LXGWWenKai-Regular.ttf`、`NotoSerifSC-Bold.otf`），再跑 `npm run fonts`。

## 自检记录

- `out/stills/` 20 张关键帧：中文字体正确加载、无方块字；字块无穿透、无出界（物理脚本会打印出界数量，均为 0）；审片单可读；三个小人可辨认；蛋糕居中、20 根蜡烛齐全；主要文字都在底部 18% 之外。
- 预览版用音频起音检测核对：打字、盖章、关灯、输入框炸开与画面同帧（误差 ≤ 2ms）；许愿 3 秒段只剩约 −54 dB 的火苗底噪。
- 成片 ffprobe：1080×1920，30fps，78.000s，h264 High yuv420p，AAC 48kHz 立体声，ebur128 积分响度 −14.1 LUFS。

成片和预览（`out/*.mp4`）文件较大，没有放进 git。
