#!/usr/bin/env python3
"""把片中实际用到的字从完整字体里抽出来，生成 public/fonts/*.woff2。

改了 src/config.ts 里的文字之后运行：  npm run fonts
完整字体放在 fonts-src/（不入库）；缺失时自动从官方发布地址下载。
"""
import pathlib
import re
import sys
import urllib.request

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "fonts-src"
OUT = ROOT / "public" / "fonts"

FONTS = {
    # 愿望文字：霞鹜文楷
    "LXGWWenKai-Regular.ttf": "https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Regular.ttf",
    "LXGWWenKai-Medium.ttf": "https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Medium.ttf",
    # 封面标题、编号：思源宋体（Noto Serif SC）
    "NotoSerifSC-SemiBold.ttf": "https://fonts.gstatic.com/s/notoserifsc/v36/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7RcrCWv.ttf",
    "NotoSerifSC-Black.ttf": "https://fonts.gstatic.com/s/notoserifsc/v36/H4cyBXePl9DZ0Xe7gG9cyOj7uK2-n-D2rd4FY7QrrCWv.ttf",
}

EXTRA = "".join(chr(c) for c in range(0x20, 0x7F)) + "∞％…—·“”‘’「」？！，。：；、（）《》"


def collect_chars() -> str:
    chars = set(EXTRA)
    for p in (ROOT / "src").rglob("*.ts*"):
        text = p.read_text(encoding="utf-8")
        # 只收字符串字面量里的内容，避免把注释里的字全塞进字体（注释无所谓，多几个字也不碍事）
        for m in re.finditer(r"\"([^\"\\\n]*)\"|'([^'\\\n]*)'|`([^`\\]*)`", text):
            s = next(g for g in m.groups() if g is not None)
            chars.update(s)
    return "".join(sorted(chars))


def main() -> None:
    SRC.mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    chars = collect_chars()
    print(f"collected {len(chars)} chars")
    for name, url in FONTS.items():
        src = SRC / name
        if not src.exists():
            print(f"downloading {name} …")
            urllib.request.urlretrieve(url, src)
        out = OUT / (src.stem + ".woff2")
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        font = subset.load_font(str(src), opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=chars)
        sub.subset(font)
        subset.save_font(font, str(out), opts)
        print(f"  {out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    sys.exit(main())
