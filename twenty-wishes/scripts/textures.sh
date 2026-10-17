#!/usr/bin/env bash
# 把纸底纹理栅格化到 public/tex/（只需在改动 src/Textures.tsx 后运行）
set -e
cd "$(dirname "$0")/.."
for k in warm night nightLit table sheet; do
  case $k in warm) out=paper_warm;; night) out=paper_night;; nightLit) out=paper_nightLit;; *) out=$k;; esac
  npx remotion still src/index.ts "tex-$k" "public/tex/$out.png" --log=error
done
