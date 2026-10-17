// 本地字体：public/fonts/ 下的子集 woff2，用 delayRender 等字体真正加载完再截帧。
import { continueRender, delayRender, staticFile } from "remotion";
import { FONTS } from "../config";

const FACES: { family: string; file: string; weight: string }[] = [
  { family: FONTS.wish, file: "fonts/LXGWWenKai-Regular.woff2", weight: "400" },
  { family: FONTS.wish, file: "fonts/LXGWWenKai-Medium.woff2", weight: "500" },
  { family: FONTS.serif, file: "fonts/NotoSerifSC-SemiBold.woff2", weight: "600" },
  { family: FONTS.serif, file: "fonts/NotoSerifSC-Black.woff2", weight: "900" },
];

let started = false;

export const loadFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("load fonts");
  Promise.all(
    FACES.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)}) format("woff2")`, { weight: f.weight });
      await face.load();
      (document.fonts as unknown as { add: (f: FontFace) => void }).add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error("font load failed", e);
      continueRender(handle);
    });
};
