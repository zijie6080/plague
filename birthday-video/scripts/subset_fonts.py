"""把 fonts-src/ 里的完整字体按全片实际用到的字裁成 woff2，放进 public/fonts/。
字表 = src/ 下所有 .ts/.tsx 文件里出现的字 + ASCII。改了文字以后重跑：npm run fonts
完整字体下载地址见 README。"""
import pathlib
import string
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "fonts-src"
OUT = ROOT / "public" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

chars = set(string.printable)
for p in (ROOT / "src").rglob("*.ts*"):
    chars |= set(p.read_text(encoding="utf-8"))
chars |= set("·—…“”‘’「」『』（）！？，。、：；％")
chars = {c for c in chars if ord(c) >= 32}
text = "".join(sorted(chars))

FONTS = [
    ("SmileySans-Oblique.woff2", "SmileySans.woff2"),
    ("LXGWWenKai-Regular.ttf", "WenKai.woff2"),
    ("NotoSerifSC-Bold.otf", "NotoSerifSC-Bold.woff2"),
]

missing_any = False
for src, dst in FONTS:
    path = SRC / src
    if not path.exists():
        print(f"!! 缺少 {path}，跳过（README 里有下载地址）")
        missing_any = True
        continue
    font = TTFont(path)
    cmap = font.getBestCmap()
    cjk = [c for c in text if ord(c) > 0x2E80]
    missing = [c for c in cjk if ord(c) not in cmap]
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    font.flavor = "woff2"
    font.save(OUT / dst)
    size = (OUT / dst).stat().st_size / 1024
    print(f"{dst}: {size:.0f} KB, 缺字 {''.join(missing) or '无'}")

sys.exit(1 if missing_any else 0)
