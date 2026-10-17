# 二十个愿望

子杰 20 岁生日视频（2026.10.17）。Claude 写的二十个愿望，前十九个各配一个会动的剪纸立体书小场景，第二十页留白。

- 成片：`out/twenty_wishes.mp4`（1920×1080，30fps，85 秒，H.264，**无音轨**）
- 对音乐用的时间点：`out/cues.csv`（每个场景一行；时间精确到 0.1 秒；UTF-8 带 BOM，Excel 可直接打开）
- 预览：`out/preview_960x540.mp4`；关键帧：`out/stills/`

技术栈：Remotion 4（逐帧确定性渲染）+ React + SVG 纸张滤镜 + Canvas 2D（光尘、彩纸屑、火苗）。
全片没有 `Math.random`，所有随机都来自 `src/lib/rand.ts` 的带种子 PRNG，任何一帧都是 frame 的纯函数。

## 目录

```
src/
  config.ts        所有文字与颜色（愿望、序、结尾、场景里的小字、色板）
  timeline.ts      所有时间点（帧）：场景时长、转场类型、每个场景的节拍 beats、cues.csv 的关键动作
  Video.tsx        合成器：按 timeline 选场景、做转场，叠光尘 / 暖光 / 文字 / 印章
  lib/
    paper.tsx      纸张滤镜（毛边 + 纤维 + 随高度变化的投影）、Paper / Mist 组件
    stage.tsx      立体书舞台：PopUp（底边为轴弹起）、FlipCard、RiseGroup、Board
    figure.tsx     纸人（全片同一个角色：圆头、侧分短发、朱红围巾、没有五官）
    canvas.tsx     光尘、彩纸屑、剪纸火苗
    transitions.tsx 翻页 / 镜头横移到下一块纸台 / 大纸盖下再掀开（“纸片倒下再弹起”在 Video.tsx 里）
    text.tsx       愿望文字逐字淡入、朱红纸印章
  scenes/          Prologue、W01–W19（W13 与 W14 共用一张书桌）、Finale
public/fonts/      霞鹜文楷、Noto Serif SC 的子集 woff2（离线，不依赖网络）
public/tex/        预先栅格化的纸底纹理（暖白纸、深蓝卡纸、桌面等）
scripts/           渲染、关键帧、cues、字体子集、纹理
```

## 常用命令

```bash
npm install
npm run studio            # Remotion Studio，浏览器里拖时间轴预览
npm run stills            # 每个场景渲染 2 张关键帧到 out/stills/（也可：node scripts/stills.mjs w06 w15:40 @1500）
npm run preview           # 960×540 预览，检查节奏
npm run render            # 最终版：先渲高质量母版，再用 ffmpeg 压成 out/twenty_wishes.mp4
npm run cues              # 重新生成 out/cues.csv
```

渲染默认使用容器里的 Chromium（`/opt/pw-browsers/...headless_shell`），可用环境变量 `REMOTION_CHROME` 指向别的 Chrome。
GL 后端用 `angle`：SVG 滤镜（feTurbulence / feDiffuseLighting）走 GPU 路径，比软件渲染快约 10 倍。
在 4 核机器上预览约 4 分钟，最终版约 10–15 分钟。

## 修改愿望文字

1. 改 `src/config.ts` 里的 `WISHES`（第 n 条就是第 n 个愿望）。序的三行在 `PROLOGUE.lines`，结尾在 `FINALE`，场景里的小字（「有点假」、评论气泡、路牌数字、台历日期）在 `SCENE_TEXT`。
2. **改完必须重新生成字体子集**：`npm run fonts`（会扫描 `src/` 里所有字符串里的字；完整字体放在 `fonts-src/`，缺失时自动下载）。否则新字会显示成默认字体。
3. 文字超过约 25 个字会自动缩小字号，保证不撞到右上角印章。

## 调整单个场景时长

所有时间都在 `src/timeline.ts`，单位是帧（30fps，`sec(2.6)` = 78 帧）：

- 改场景条目的 `dur`，后面所有场景自动顺延，`cues.csv` 也会跟着变。
- `tIn` 是进入这个场景的转场（`flip` / `fold` / `pan` / `cover` / `continue`）和它占用的帧数；转场占用场景开头。
- `beats` 是场景内部节拍，**相对“动作开始”**（= 场景开始 + 转场时长）。如果把场景改长了，可以把 beats 按比例拉开；改短时注意最后的 beat 不要超过 `dur - tIn.dur`。
- 文字在动作开始后 0.3 秒逐字淡入，场景结束前 0.3 秒淡出（`TEXT_IN_DELAY` / `TEXT_OUT_LEAD`）。

改完跑 `npm run cues` 更新时间点，再 `npm run preview` 看节奏。

## 导出竖屏版本（1080×1920）

目前所有场景按 1920×1080 坐标布局。竖屏建议这样改：

1. `src/Root.tsx` 里加一个 `width={1080} height={1920}` 的 Composition，组件外包一层：把 1920×1080 的画面缩放到 1080 宽（`scale(0.5625)`）放在画面中部偏下（约 y=640–1250），这一段就是“纸台”。
2. 愿望文字移出画面区，放到上方空白处：`WishText` 的 `y` 改为约 360，字号 56–60，并按 12 字左右自动断成两行（在 `LineText` 里按 `，` 断行最自然）。
3. 编号印章放在文字上方右侧（约 right 64, top 220）。
4. 上下空白用暖白纸纹理 `tex/paper_warm.png` 铺满，下方可以延续场景的前景地面颜色（每个场景 `Ground` 的颜色），让纸台看起来是“从地面长出来”的。
5. 序和第二十页本身是“书在桌面上”的构图：把 `BOOK` 尺寸改成竖向居中（宽 900 左右），三行字放在书的上方。

需要的话直接让 Claude 按上面的方案改一版即可。

## 重新渲染

```bash
npm run fonts      # 只有改了文字才需要
./scripts/textures.sh   # 只有改了 src/Textures.tsx（纸底纹理）才需要
npm run render
npm run cues
```

最终编码参数（`scripts/render.mjs`）：libx264 high@4.1、yuv420p、CRF 18、最高码率 9 Mbps、BT.709、faststart、无音轨——适合直接上传抖音和 B 站。
