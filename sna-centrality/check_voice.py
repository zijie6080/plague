"""语音校对：用 Whisper 把每段合成语音转写回文字，与讲稿逐字比对。

输出 voice_check.md：每段的字错误率（CER）与差异片段。
用法：python3 check_voice.py [模型名，默认 medium]
"""
import difflib
import glob
import os
import re
import subprocess
import sys

import json

import cn2an
import numpy as np
from pypinyin import lazy_pinyin

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, "build", "voice")
CACHE = os.path.join(HERE, "build", "asr.json")


def norm(s):
    """统一书写形式：阿拉伯数字读成汉字，运算符读成汉字，去掉标点。"""
    s = re.sub(r"(?<=[\dA-Za-z])\s*[-−]\s*(?=\d)", "减", s)
    s = re.sub(r"\s*[×xX]\s*(?=\d)", "乘", s)
    s = cn2an.transform(s, "an2cn")
    return re.sub(r"[^一-鿿A-Za-z]", "", s).upper()


def py(s):
    """转为无声调拼音序列（字母原样保留），用于区分“同音别字”和“真正读错”。"""
    return [x for x in lazy_pinyin(s) if x.strip()]


def errors(a, b):
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    ops = [o for o in sm.get_opcodes() if o[0] != "equal"]
    return sum(max(i2 - i1, j2 - j1) for _, i1, i2, j1, j2 in ops), ops


def load(mp3):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3,
                          "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def main():
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    model = None
    rows, tot = [], np.zeros(3, int)
    for mp3 in sorted(glob.glob(os.path.join(AUDIO, "*.wav"))):
        k = os.path.basename(mp3)[:2]
        ref = open(mp3[:-4] + ".txt").read()
        if cache.get(k, {}).get("ref") != ref:
            if model is None:
                from faster_whisper import WhisperModel
                model = WhisperModel(sys.argv[1] if len(sys.argv) > 1 else "medium",
                                     device="cpu", compute_type="int8")
            segs, _ = model.transcribe(load(mp3), language="zh", beam_size=5,
                                       initial_prompt="以下是普通话课堂讲解：社会网络分析，中心性。")
            cache[k] = {"ref": ref, "hyp": "".join(x.text for x in segs)}
            json.dump(cache, open(CACHE, "w"), ensure_ascii=False, indent=1)
        hyp = cache[k]["hyp"]
        a, b = norm(ref), norm(hyp)
        cerr, ops = errors(a, b)
        perr, pops = errors(py(a), py(b))
        pa, pb = py(a), py(b)
        diffs = [f"「{a[i1:i2]}」→「{b[j1:j2]}」" for _, i1, i2, j1, j2 in ops]
        pdiffs = [f"{' '.join(pa[i1:i2]) or '∅'} → {' '.join(pb[j1:j2]) or '∅'}" for _, i1, i2, j1, j2 in pops]
        tot += [cerr, perr, len(a)]
        rows.append((k, cerr / len(a), perr / len(a), ref, hyp, diffs, pdiffs))
        print(k, f"字 {cerr / len(a):.1%}  音 {perr / len(a):.1%}", " ".join(diffs), "|", "; ".join(pdiffs), flush=True)
    with open(os.path.join(HERE, "voice_check.md"), "w") as f:
        f.write("# 语音校对报告\n\n"
                "方法：用 Whisper（medium）把每段 CosyVoice 合成语音转写回文字，与讲稿比对。"
                "数字、运算符先统一为汉字读法；“音错误率”按无声调拼音比对，"
                "可排除“原/圆”“他/它”这类同音字造成的假差异。\n\n"
                f"- 字错误率（CER）：{tot[0] / tot[2]:.2%}（{tot[0]}/{tot[2]}）\n"
                f"- 音错误率（拼音级）：{tot[1] / tot[2]:.2%}（{tot[1]}/{tot[2]}）\n\n")
        f.write("| 段 | 字错误 | 音错误 | 文字差异（讲稿 → 识别） | 读音差异 |\n|---|---|---|---|---|\n")
        for k, c, p, ref, hyp, diffs, pdiffs in rows:
            f.write(f"| {k} | {c:.1%} | {p:.1%} | {' '.join(diffs) or '—'} | {'; '.join(pdiffs) or '—'} |\n")
        f.write("\n## 逐段对照\n\n")
        for k, c, p, ref, hyp, diffs, pdiffs in rows:
            f.write(f"**{k}**\n\n- 讲稿：{ref}\n- 识别：{hyp}\n\n")


if __name__ == "__main__":
    main()
