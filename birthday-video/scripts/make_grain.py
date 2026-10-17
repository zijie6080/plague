"""生成极淡的纸张颗粒贴图 public/grain.png（固定种子，确定性）。"""
import pathlib

import numpy as np
from scipy.ndimage import gaussian_filter
import zlib
import struct

ROOT = pathlib.Path(__file__).resolve().parent.parent
rng = np.random.default_rng(20261017)
W, H = 540, 960  # 渲染时放大两倍铺满，颗粒更柔和

fine = rng.standard_normal((H, W))
fibre = gaussian_filter(rng.standard_normal((H, W)), (0.6, 3.0))
blot = gaussian_filter(rng.standard_normal((H, W)), 18)
g = fine * 0.55 + fibre * 1.6 + blot * 9
g = (g - g.mean()) / g.std()
alpha = np.clip(np.abs(g) * 40, 0, 120).astype(np.uint8)
tone = np.where(g > 0, 255, 60).astype(np.uint8)
rgba = np.stack([tone, tone, (tone * 0.92).astype(np.uint8), alpha], -1)


def png(arr: np.ndarray) -> bytes:
    h, w, _ = arr.shape
    raw = b"".join(b"\x00" + arr[y].tobytes() for y in range(h))

    def chunk(t: bytes, d: bytes) -> bytes:
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


(ROOT / "public").mkdir(exist_ok=True)
(ROOT / "public" / "grain.png").write_bytes(png(rgba))
print("public/grain.png written")
