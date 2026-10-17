"""《验收通过》离线合成配乐 + 音效 → public/audio/score.wav（48kHz 立体声，约 -14 LUFS，不削波）

读取 audio/timeline.json（由 `npm run timeline` 从 src/timeline.ts 和物理数据导出），
所有音效都按帧对齐。全部合成，无采样。固定随机种子，结果确定。

    python3 audio/synth.py
"""
from __future__ import annotations

import json
import pathlib
import subprocess
import sys

import numpy as np
from scipy.signal import butter, sosfilt, lfilter, fftconvolve
from scipy.io import wavfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
T = json.loads((ROOT / "audio" / "timeline.json").read_text())
SR = 48000
FPS = T["fps"]
DUR = T["duration"] / FPS
N = int(DUR * SR)
rng = np.random.default_rng(20261017)


def fr(f: float) -> float:
    """帧 → 秒"""
    return f / FPS


# ---------------------------------------------------------------- 基础
def bus() -> np.ndarray:
    return np.zeros((N, 2))


def place(b: np.ndarray, sig: np.ndarray, t: float, gain=1.0, pan=0.0):
    """把单声道信号放到总线上（t 秒），等功率声像"""
    i = int(round(t * SR))
    if i >= N or len(sig) == 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    l = np.cos((pan + 1) * np.pi / 4) * gain
    r = np.sin((pan + 1) * np.pi / 4) * gain
    b[i : i + len(sig), 0] += sig * l
    b[i : i + len(sig), 1] += sig * r


def tt(d: float) -> np.ndarray:
    return np.arange(int(d * SR)) / SR


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "highpass", fs=SR, output="sos"), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def adsr(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr and nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def midi(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def m(name: str) -> int:
    """'C4' → midi"""
    return 12 * (int(name[-1]) + 1) + NOTE[name[:-1]]


# ---------------------------------------------------------------- 乐器
def pluck(f, d=0.9, bright=0.6):
    """Karplus-Strong 拨弦"""
    L = max(2, int(round(SR / f)))
    n = int(d * SR)
    exc = lp(rng.uniform(-1, 1, L), 1500 + 6000 * bright)
    x = np.zeros(n)
    x[:L] = exc
    decay = 0.996
    a = np.zeros(L + 2)
    a[0] = 1
    a[L] = -0.5 * decay
    a[L + 1] = -0.5 * decay
    y = lfilter([1.0], a, x)
    return y * adsr(n, 0.001, 0.08) * 0.8


def marimba(f, d=0.45):
    t = tt(d)
    env1 = np.exp(-t * 9)
    env2 = np.exp(-t * 30)
    y = np.sin(2 * np.pi * f * t) * env1 + 0.35 * np.sin(2 * np.pi * f * 4.0 * t) * env2 + 0.12 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t * 60)
    return y * adsr(len(t), 0.002, 0.03) * 0.7


def glock(f, d=2.2):
    t = tt(d)
    parts = [(1, 1.0, 2.2), (2.76, 0.45, 5), (5.4, 0.22, 9), (8.93, 0.1, 14)]
    y = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * dec) for k, a, dec in parts)
    click = np.exp(-t * 400) * np.sin(2 * np.pi * f * 12 * t) * 0.15
    return (y + click) * adsr(len(t), 0.001, 0.1) * 0.5


def kick(d=0.38, punch=1.0):
    t = tt(d)
    f = 45 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * 9) * punch + 0.3 * np.exp(-t * 200) * rng.uniform(-1, 1, len(t))
    return y * 0.9


def clap(d=0.25):
    n = noise(d)
    t = tt(d)
    env = np.zeros(len(t))
    for k, off in enumerate([0, 0.011, 0.022]):
        env += np.exp(-np.clip(t - off, 0, None) * 140) * (t >= off) * (0.7 if k < 2 else 1)
    env += 0.25 * np.exp(-t * 18)
    return bp(n, 900, 2600) * env * 0.6


def shaker(d=0.07, g=1.0):
    t = tt(d)
    return hp(noise(d), 6000) * np.exp(-t * 60) * (1 - np.exp(-t * 400)) * 0.25 * g


def bass(f, d=0.4):
    t = tt(d)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * np.sign(np.sin(2 * np.pi * f * t))
    return lp(y, 900) * adsr(len(t), 0.004, 0.06) * np.exp(-t * 2.5) * 0.55


def pad(freqs, d):
    t = tt(d)
    y = np.zeros(len(t))
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            y += 2 * ((t * ff + rng.random()) % 1) - 1
    y = lp(y / (len(freqs) * 3), 1800)
    return y * adsr(len(t), 0.25, 0.4) * 0.35


def crash(d=2.0):
    t = tt(d)
    return hp(noise(d), 5000) * np.exp(-t * 2.2) * 0.25


def reverb(x: np.ndarray, sec=1.6, wet=0.2, seed=1):
    r = np.random.default_rng(seed)
    n = int(sec * SR)
    t = np.arange(n) / SR
    out = x.copy()
    for ch in range(2):
        ir = r.standard_normal(n) * np.exp(-t * 6.9 / sec)
        ir = lp(ir, 5000)
        ir /= np.sqrt(np.sum(ir**2))
        out[:, ch] += fftconvolve(x[:, ch], ir)[: len(x)] * wet
    return out


# ---------------------------------------------------------------- 配乐 A：S0–S3 俏皮小调（C 大调 120 BPM）
music = bus()
beat = 60 / T["bpmA"]
endA = fr(T["switchOff"])
CHORDS = [["C3", "E3", "G3"], ["A2", "C3", "E3"], ["F2", "A2", "C3"], ["G2", "B2", "D3"]]
CHORDS_B = [["C3", "E3", "G3"], ["G2", "B2", "D3"], ["A2", "C3", "E3"], ["F2", "A2", "C3"]]
# 两小节的马林巴动机（拍, 音, 时值拍）
MOTIF = [
    [(0, "E5", 0.5), (0.5, "G5", 0.5), (1, "C6", 0.5), (2, "G5", 0.5), (2.5, "E5", 0.5), (3.5, "D5", 0.5)],
    [(0, "C5", 0.5), (0.5, "E5", 0.5), (1, "A5", 1), (2.5, "G5", 0.5), (3, "E5", 0.5)],
    [(0, "F5", 0.5), (0.5, "A5", 0.5), (1, "C6", 0.5), (1.5, "A5", 0.5), (2, "F5", 0.5), (3, "A5", 0.5), (3.5, "G5", 0.5)],
    [(0, "G5", 0.5), (0.75, "B5", 0.25), (1, "D6", 0.5), (2, "B5", 0.5), (2.5, "G5", 0.25), (2.75, "A5", 0.25), (3, "B5", 1)],
]
s1 = fr(T["scenes"]["s1"]["from"])
s2 = fr(T["scenes"]["s2"]["from"])
s3 = fr(T["scenes"]["s3"]["from"])
nbar = int(np.ceil(endA / (4 * beat)))
for bar in range(nbar):
    t0 = bar * 4 * beat
    if t0 >= endA:
        break
    prog = CHORDS if (bar // 4) % 2 == 0 else CHORDS_B
    ch = prog[bar % 4]
    root = midi(m(ch[0]))
    # 拨弦琶音（8 分音符）
    arp = [ch[0], ch[1], ch[2], ch[1]]
    for k in range(8):
        tk = t0 + k * beat / 2
        nm = m(arp[k % 4]) + 12 + (12 if k in (2, 6) else 0)
        place(music, pluck(midi(nm), 0.7, 0.5), tk, 0.22 if t0 < s1 else 0.28, pan=-0.35 + 0.1 * (k % 2))
    # 马林巴旋律（S0 只有一半音量）
    mot = MOTIF[(bar % 4)] if (bar // 4) % 2 == 0 else MOTIF[(bar + 2) % 4]
    for b_, nt, d_ in mot:
        g = 0.32 if t0 < s1 else 0.42
        place(music, marimba(midi(m(nt)), 0.5), t0 + b_ * beat, g, pan=0.25)
    # 鼓 + 贝斯：S1 起加入
    if t0 >= s1 - 0.01:
        for k in range(4):
            place(music, kick(), t0 + k * beat, 0.55 if k % 2 == 0 else 0.0)
            if k % 2 == 1:
                place(music, clap(), t0 + k * beat, 0.38, pan=0.05)
        if t0 >= s2 - 0.01 or t0 >= s1 + 8:  # S1 尾段开始更满
            place(music, kick(), t0 + 3.5 * beat, 0.35)
        for k in range(8):
            place(music, shaker(g=1.0 if k % 2 else 0.6), t0 + k * beat / 2, 1.0, pan=0.4)
        if t0 >= s1 + 8:
            for k in range(8):
                place(music, shaker(0.04, 0.5), t0 + k * beat / 2 + beat / 4, 1.0, pan=-0.4)
        bl = [(0, root, 1), (1.5, root, 0.5), (2, midi(m(ch[2])), 1), (3, root * 2, 0.5), (3.5, midi(m(ch[2])), 0.5)]
        for b_, f_, d_ in bl:
            place(music, bass(f_, d_ * beat + 0.05), t0 + b_ * beat, 0.6)
    elif t0 >= 3.5:
        for k in range(8):
            place(music, shaker(g=0.5), t0 + k * beat / 2, 0.7, pan=0.4)
music = reverb(music, 1.2, 0.14, 2)

# 盖章"卡顿"：章落下的瞬间，配乐停 0.3 秒
gate = np.ones(N)


def gate_off(t_a, t_b, fade=0.006):
    a, b = int(t_a * SR), int(t_b * SR)
    nf = int(fade * SR)
    gate[a:b] = 0
    gate[max(0, a - nf) : a] *= np.linspace(1, 0, min(nf, a))
    gate[b : b + nf] *= np.linspace(0, 1, len(gate[b : b + nf]))


for st in T["stamps"]:
    if not st["pass"]:
        gate_off(fr(st["frame"]), fr(st["frame"]) + T["musicGap"] / FPS)
# 关灯：随开关声切断
cut = int(endA * SR)
gate[cut:] = 0
gate[cut - int(0.004 * SR) : cut] *= np.linspace(1, 0, int(0.004 * SR))
music *= gate[:, None]

# ---------------------------------------------------------------- 钟琴慢弹《Happy Birthday》前两句（S4）
gl = bus()
HB = [
    ("G4", 0, 0.75), ("G4", 0.75, 0.25), ("A4", 1, 1), ("G4", 2, 1), ("C5", 3, 1), ("B4", 4, 2),
    ("G4", 6, 0.75), ("G4", 6.75, 0.25), ("A4", 7, 1), ("G4", 8, 1), ("D5", 9, 1), ("C5", 10, 2),
]
g0 = fr(T["glock"]["start"])
gb = T["glock"]["beat"]
for nt, b_, d_ in HB:
    place(gl, glock(midi(m(nt) + 12), 2.4), g0 + b_ * gb, 0.55, pan=0.1)
# 极轻的长音垫底
place(gl, pad([midi(m("C3")), midi(m("G3")), midi(m("E4"))], 6.4), g0, 0.25)
gl = reverb(gl, 2.2, 0.35, 3)
silA, silB = fr(T["silence"][0]), fr(T["silence"][1])
fade_a = int((silA - 0.6) * SR)
gl[fade_a : int(silA * SR)] *= np.linspace(1, 0, int(silA * SR) - fade_a)[:, None]
gl[int(silA * SR) :] = 0
music += gl

# ---------------------------------------------------------------- 配乐 B：S5–S6 全编制《Happy Birthday》变奏（3/4，132 BPM）
mb = bus()
B0 = T["musicB"]["start"]
bb = 60 / T["musicB"]["bpm"]
HB_FULL = [
    ("G4", 0, 0.75), ("G4", 0.75, 0.25), ("A4", 1, 1), ("G4", 2, 1), ("C5", 3, 1), ("B4", 4, 2),
    ("G4", 6, 0.75), ("G4", 6.75, 0.25), ("A4", 7, 1), ("G4", 8, 1), ("D5", 9, 1), ("C5", 10, 2),
    ("G4", 12, 0.75), ("G4", 12.75, 0.25), ("G5", 13, 1), ("E5", 14, 1), ("C5", 15, 1), ("B4", 16, 1), ("A4", 17, 1),
    ("F5", 18, 0.75), ("F5", 18.75, 0.25), ("E5", 19, 1), ("C5", 20, 1), ("D5", 21, 1), ("C5", 22, 3),
]
for nt, b_, d_ in HB_FULL:
    f_ = midi(m(nt) + 12)
    place(mb, marimba(f_, 0.6), B0 + b_ * bb, 0.5, pan=-0.15)
    place(mb, glock(f_, 1.4), B0 + b_ * bb, 0.32, pan=0.2)
    place(mb, pluck(f_ / 2, 0.8, 0.8), B0 + b_ * bb, 0.25, pan=0.0)
# 每小节（从第 1 拍起，每 3 拍）的和弦
BAR_CH = [
    ["C3", "E3", "G3"], ["G2", "B2", "F3"], ["G2", "B2", "F3"], ["C3", "E3", "G3"],
    ["C3", "E3", "A#3"], ["F2", "A2", "C3"], ["C3", "E3", "G3"], ["C3", "E3", "G3"], ["C3", "E3", "G3"],
]
final = fr(T["finalChord"])
for i, ch in enumerate(BAR_CH):
    t0 = B0 + (1 + 3 * i) * bb
    if t0 >= final - 0.01:
        break
    chord = [midi(m(n)) for n in ch]
    if i == 6:  # C - G
        place(mb, pad([midi(m(n)) * 2 for n in ch], 2 * bb + 0.2), t0, 0.5)
        place(mb, pad([midi(m(n)) * 2 for n in ["G2", "B2", "D3"]], bb + 0.2), t0 + 2 * bb, 0.5)
    else:
        place(mb, pad([f * 2 for f in chord], 3 * bb + 0.2), t0, 0.5)
    place(mb, bass(chord[0], bb * 1.2), t0, 0.75)
    place(mb, bass(chord[0] * 1.5, bb * 0.8), t0 + 2 * bb, 0.55)
    place(mb, kick(punch=1.1), t0, 0.7)
    place(mb, kick(), t0 + 1.5 * bb, 0.4)
    place(mb, clap(), t0 + bb, 0.35)
    place(mb, clap(), t0 + 2 * bb, 0.4)
    for k in range(6):
        place(mb, shaker(g=1.0 if k % 2 else 0.6), t0 + k * bb / 2, 1.0, pan=0.4)
    for k in range(6):
        nt = ch[k % 3]
        place(mb, pluck(midi(m(nt) + 24), 0.5, 0.5), t0 + k * bb / 2, 0.18, pan=-0.4)
# 音乐回归的一瞬：鼓 + 镲
place(mb, kick(punch=1.3), B0, 0.8)
place(mb, crash(2.5), B0, 0.9)
place(mb, crash(2.5), fr(T["switchOn"]), 0.7)
place(mb, crash(2.5), fr(T["title"]), 0.8)
# 结尾响亮的和弦
fc = [midi(m(n)) for n in ["C3", "G3", "C4", "E4", "G4", "C5"]]
place(mb, pad([f for f in fc], DUR - final), final, 0.9)
for f_ in fc[2:]:
    place(mb, pluck(f_, 2.5, 0.9), final, 0.3)
    place(mb, glock(f_ * 2, 2.5), final, 0.25)
place(mb, marimba(midi(m("C6")), 1.0), final, 0.5)
place(mb, kick(punch=1.4), final, 0.9)
place(mb, crash(3), final, 1.1)
place(mb, bass(midi(m("C2")), 2.0), final, 0.8)
mb = reverb(mb, 1.6, 0.2, 4)
music += mb

# ---------------------------------------------------------------- 音效
fx = bus()

# 打字：短噪声 burst + 带通，每次随机音高
for f in T["typing"]:
    c = rng.uniform(2200, 4200)
    d = 0.035
    t = tt(d)
    s = bp(noise(d), c * 0.7, c * 1.3) * np.exp(-t * 140)
    s += np.sin(2 * np.pi * c / 2.5 * t) * np.exp(-t * 300) * 0.4
    place(fx, s, fr(f), 0.35, pan=rng.uniform(-0.2, 0.2))
# 发送：小气泡音
for f in T["sends"]:
    t = tt(0.12)
    fq = 500 + 900 * t / 0.12
    place(fx, np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-t * 25), fr(f), 0.25)
# 输入框炸开：砰 + 彩纸沙沙
t = tt(0.6)
boom = np.sin(2 * np.pi * np.cumsum(50 + 120 * np.exp(-t * 20)) / SR) * np.exp(-t * 7)
boom += lp(noise(0.6), 2500) * np.exp(-t * 14) * 0.8
place(fx, boom, fr(T["explode"]), 0.8)
for k in range(40):
    tk = fr(T["explode"]) + rng.uniform(0.02, 1.2)
    d = 0.02
    place(fx, hp(noise(d), 5000) * np.exp(-tt(d) * 200), tk, rng.uniform(0.05, 0.15), pan=rng.uniform(-0.8, 0.8))


def thud(size, v):
    """字块落地：低沉的'咚' + 木头敲击。越大越低"""
    f0 = float(np.clip(150 / (size**0.35 + 0.1), 70, 200))
    d = 0.28
    t = tt(d)
    body = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.6 * np.exp(-t * 40))) / SR) * np.exp(-t * 18)
    wf = f0 * rng.uniform(4.5, 7.5)
    wood = np.sin(2 * np.pi * wf * t) * np.exp(-t * 55) * 0.6 + bp(noise(d), wf * 0.8, wf * 1.6) * np.exp(-t * 90) * 0.6
    return body * 0.9 + wood


imps = T["impacts"]
times = np.array([fr(i["frame"]) for i in imps])
for i in imps:
    t0 = fr(i["frame"])
    dens = np.sum(np.abs(times - t0) < 0.12)
    g = float(np.clip(i["v"] / 14, 0.15, 1.0)) * 0.55 / np.sqrt(dens)
    place(fx, thud(i["size"], i["v"]), t0 + rng.uniform(0, 0.008), g, pan=rng.uniform(-0.5, 0.5))


def whoosh(d=0.55, lo=300, hi=3500, g=1.0):
    n = int(d * SR)
    x = noise(d)
    out = np.zeros(n)
    seg = 512
    for k in range(0, n, seg):
        u = k / n
        fc = lo * (hi / lo) ** u
        blk = x[max(0, k - 2048) : k + seg]
        y = bp(blk, fc * 0.7, min(fc * 1.4, SR / 2 - 100))
        out[k : k + seg] = y[-len(out[k : k + seg]) :]
    env = np.sin(np.pi * np.clip(np.arange(n) / n, 0, 1)) ** 1.5
    return out * env * g


for f in T["whoosh"]:
    place(fx, whoosh(), fr(f), 0.5)
for f in T["cardIn"]:
    place(fx, whoosh(0.3, 800, 4000), fr(f), 0.25, pan=0.5)

# 盖章：厚重的"嘭"（低频冲击 + 纸张噪声）；通过章再加一个上行的"叮~"
for st in T["stamps"]:
    t0 = fr(st["frame"])
    t = tt(0.5)
    hit = np.sin(2 * np.pi * np.cumsum(48 + 90 * np.exp(-t * 35)) / SR) * np.exp(-t * 10)
    hit += lp(noise(0.5), 1200) * np.exp(-t * 30) * 0.9
    hit += bp(noise(0.5), 2000, 7000) * np.exp(-t * 45) * 0.35
    place(fx, hit, t0, 1.0)
    if st["pass"]:
        for k, nt in enumerate(["E6", "G#6", "B6", "E7"]):
            place(fx, glock(midi(m(nt)), 2.0), t0 + 0.12 + k * 0.07, 0.35, pan=-0.2 + 0.15 * k)

# 散架：一串碎碎的木块散落声
for c in T["collapses"]:
    t0 = fr(c["frame"])
    n = 34 if c["big"] else 18
    span = 1.0 if c["big"] else 0.6
    for k in range(n):
        tk = t0 + span * (rng.random() ** 1.6)
        wf = rng.uniform(600, 1800)
        d = 0.08
        tt_ = tt(d)
        s = np.sin(2 * np.pi * wf * tt_) * np.exp(-tt_ * 70) + bp(noise(d), wf * 0.8, wf * 1.5) * np.exp(-tt_ * 120) * 0.5
        place(fx, s, tk, rng.uniform(0.12, 0.3), pan=rng.uniform(-0.7, 0.7))

# 贴纸：短促的"啪"
for f in T["stickers"]:
    t = tt(0.12)
    s = hp(noise(0.12), 1500) * np.exp(-t * 60) + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 40) * 0.8
    place(fx, s, fr(f), 0.65, pan=rng.uniform(-0.3, 0.3))
t = tt(0.4)
place(fx, np.sin(2 * np.pi * np.cumsum(300 + 200 * np.sin(t * 30)) / SR) * np.exp(-t * 8), fr(T["stickerBounce"]), 0.18)

# 开关：清脆的"咔哒"


def click():
    d = 0.06
    t = tt(d)
    a = bp(noise(d), 2500, 7000) * np.exp(-t * 400)
    b = np.zeros_like(a)
    o = int(0.018 * SR)
    b[o:] = a[: len(a) - o] * 0.7
    return a + b + np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 250) * 0.4


place(fx, click(), fr(T["switchOff"]), 0.9)
place(fx, click(), fr(T["switchOn"]), 0.8)

# 蛋糕砖、蜡烛立起
for f in T["bricks"]:
    place(fx, thud(1.2, 8), fr(f), 0.12, pan=rng.uniform(-0.4, 0.4))
for f in T["candles"]:
    t = tt(0.05)
    place(fx, np.sin(2 * np.pi * rng.uniform(1500, 2200) * t) * np.exp(-t * 90), fr(f), 0.08, pan=rng.uniform(-0.5, 0.5))

# 点燃：轻柔的"噗"
for f in T["ignite"]:
    d = 0.18
    t = tt(d)
    s = lp(noise(d), 900) * np.exp(-t * 22) * (1 - np.exp(-t * 200))
    place(fx, s, fr(f) + rng.uniform(0, 0.03), 0.14, pan=rng.uniform(-0.4, 0.4))

# 火苗底噪：从点燃到全部熄灭，极低（许愿时只剩它）
fb_a, fb_b = fr(T["ignite"][0]), fr(T["extinguish"][-1]) + 0.2
d = fb_b - fb_a
t = tt(d)
bed = lp(noise(d), 380) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 0.23 * t))
crack = np.zeros(len(t))
for k in range(int(d * 5)):
    i = rng.integers(0, len(t) - 400)
    crack[i : i + 400] += hp(noise(400 / SR), 2500) * np.exp(-np.arange(400) / 40)
bed = bed + crack * 0.25
bed *= adsr(len(t), 0.3, 0.2)
place(fx, bed, fb_a, 0.03)

# 吹蜡烛：低通噪声的气流
d = 1.4
t = tt(d)
gust = lp(noise(d), 700) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.8 * (0.8 + 0.2 * np.sin(2 * np.pi * 5 * t))
place(fx, gust, fr(T["blow"]), 0.75)
for f in T["extinguish"]:
    d = 0.1
    place(fx, bp(noise(d), 400, 1500) * np.exp(-tt(d) * 30), fr(f), 0.06, pan=rng.uniform(-0.4, 0.4))

# 烟花：升空哨声 + 炸开的"砰" + 噼啪碎响
for i, fw in enumerate(T["fireworks"]):
    tl, tb = fr(fw["launch"]), fr(fw["burst"])
    d = tb - tl
    t = tt(d)
    fq = 900 + 1500 * (t / d) ** 0.7 + 30 * np.sin(2 * np.pi * 9 * t)
    wh = np.sin(2 * np.pi * np.cumsum(fq) / SR) * (t / d) ** 0.5 * 0.4 + hp(noise(d), 3000) * 0.1
    place(fx, wh * adsr(len(t), 0.05, 0.03), tl, 0.22, pan=(i % 3 - 1) * 0.4)
    t = tt(1.2)
    bm = np.sin(2 * np.pi * np.cumsum(40 + 80 * np.exp(-t * 15)) / SR) * np.exp(-t * 5)
    bm += lp(noise(1.2), 1800) * np.exp(-t * 8) * 0.9
    place(fx, bm, tb, 0.95 if i == len(T["fireworks"]) - 1 else 0.75, pan=(i % 3 - 1) * 0.3)
    for k in range(45):
        tk = tb + 0.15 + 1.4 * rng.random() ** 1.3
        dd = 0.015
        place(fx, hp(noise(dd), 3500) * np.exp(-tt(dd) * 250), tk, rng.uniform(0.05, 0.16), pan=rng.uniform(-0.9, 0.9))

# ---------------------------------------------------------------- 外部配乐（可选）
ext = None
if T.get("useExternalMusic"):
    for e in ("wav", "mp3", "m4a", "ogg", "flac"):
        p = ROOT / "public" / "audio" / f"music.{e}"
        if p.exists():
            ext = p
            break
if ext is not None:
    print(f"using external music: {ext.name}")
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ext), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    em = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    em = np.pad(em, ((0, max(0, N - len(em))), (0, 0)))[:N]
    em /= max(1e-9, np.max(np.abs(em))) / 0.5
    auto = gate.copy()  # 盖章卡顿 + 关灯切断
    ret = int(B0 * SR)
    auto[ret:] = 1  # 烟花炸开时回来
    auto[ret : ret + int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
    music = em * auto[:, None]

# ---------------------------------------------------------------- 混音
mix = music * 0.8 + fx
# 许愿：除火苗底噪外完全静音 3 秒（底噪已在 fx 里，单独保留）
a, b = int(silA * SR), int(silB * SR)
bed_only = bus()
place(bed_only, bed, fb_a, 0.03)
mix[a:b] = bed_only[a:b]
# 最后淡出
fo = int(1.2 * SR)
mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5


def k_weight(x):
    # ITU-R BS.1770 K 加权（48kHz 系数）
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]
    a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]
    a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def lufs(x):
    y = k_weight(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    pw = np.array([np.mean(np.sum(y[i : i + blk] ** 2, axis=1)) for i in range(0, len(y) - blk, hop)])
    l = -0.691 + 10 * np.log10(pw + 1e-12)
    g = pw[l > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    g = pw[(l > -70) & (l > rel)]
    return -0.691 + 10 * np.log10(np.mean(g))


def limit(x, ceil=0.89, release=0.08):
    peak = np.max(np.abs(x), axis=1)
    need = np.minimum(1.0, ceil / np.maximum(peak, 1e-9))
    # 5ms 前瞻：取窗口最小值
    w = int(0.005 * SR)
    from scipy.ndimage import minimum_filter1d

    g = minimum_filter1d(need, size=2 * w + 1)
    # 释放平滑
    a = np.exp(-1 / (release * SR))
    out = lfilter([1 - a], [1, -a], g)
    out = np.minimum(out, g)
    return x * out[:, None]


target = -14.0
for _ in range(3):
    L = lufs(mix)
    mix *= 10 ** ((target - L) / 20)
    mix = limit(mix)
L = lufs(mix)
peak = np.max(np.abs(mix))
print(f"integrated loudness {L:.2f} LUFS, peak {20*np.log10(peak):.2f} dBFS")
assert peak < 1.0, "clipping!"

out = ROOT / "public" / "audio" / "score.wav"
out.parent.mkdir(parents=True, exist_ok=True)
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"wrote {out.relative_to(ROOT)} ({DUR:.2f}s)")
sys.exit(0)
