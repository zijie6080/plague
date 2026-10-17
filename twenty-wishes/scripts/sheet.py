#!/usr/bin/env python3
"""把若干关键帧拼成 2×2 联系表，方便检查：python3 scripts/sheet.py out.png a.png b.png c.png d.png"""
import sys
from PIL import Image
out, *ims = sys.argv[1:]
W = Image.new("RGB", (1920, 1080), "white")
for i, n in enumerate(ims[:4]):
    im = Image.open(n).convert("RGB").resize((960, 540))
    W.paste(im, ((i % 2) * 960, (i // 2) * 540))
W.save(out)
