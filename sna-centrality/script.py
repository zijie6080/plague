"""SNA 教学动画：中心性（课堂讲解版）。

生成步骤：
  1. 用 gTTS 为每一步旁白合成中文语音（缓存到 build/audio/）
  2. 按语音时长逐帧渲染 matplotlib 画面，通过管道交给 ffmpeg
  3. 合成音轨并封装为 MP4

用法：python3 script.py  → 输出 sna_centrality.mp4
"""
import copy
import os
import re
import subprocess
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
from matplotlib import font_manager
from matplotlib.colors import to_rgb
from matplotlib.patches import FancyBboxPatch

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
AUDIO_DIR = os.path.join(BUILD, "audio")
OUT = os.path.join(HERE, "sna_centrality.mp4")
FPS = 25
W, H = 1920, 1080
SR = 24000
VOICE = os.environ.get("VOICE", "cosyvoice")
VOICE_DIR = os.path.join(BUILD, "voice")
TEMPO = 1.18          # gTTS 普通话语速偏慢，适当加速
TEMPO_CV = 1.0        # CosyVoice 已在合成时加速（gen_voice.py 的 SPEED），这里只做微调
GAP = 0.5             # 每步旁白结束后的停顿（秒）
TRANS = 0.5           # 状态过渡时长（秒）

FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
font_manager.fontManager.addfont(FONT)
plt.rcParams["font.family"] = font_manager.FontProperties(fname=FONT).get_name()
plt.rcParams["mathtext.fontset"] = "dejavusans"
plt.rcParams["axes.unicode_minus"] = False

# ---------------------------------------------------------------- 配色
BG = "#F7F6F1"
INK = "#1F2933"
MUTED = "#6B7280"
BASE = "#B8C2CC"
EDGE = "#9AA5B1"
C_DEG = "#2F6FDE"
C_CLO = "#E07A1F"
C_BTW = "#C0392B"
C_EIG = "#7B4FBF"
C_OK = "#2E9E5B"

# ---------------------------------------------------------------- 网络：Krackhardt 风筝网络
G = nx.krackhardt_kite_graph()
NAMES = "ABCDEFGHIJ"
N = len(NAMES)
idx = {c: i for i, c in enumerate(NAMES)}
EDGES = [tuple(sorted(e)) for e in G.edges()]
POS = {  # 横向布局：风筝尾巴朝右
    0: (-1.2, -1.0), 1: (-1.2, 1.0), 2: (0.0, -2.0), 3: (0.0, 0.0), 4: (0.0, 2.0),
    5: (1.2, -1.0), 6: (1.2, 1.0), 7: (2.4, 0.0), 8: (3.6, 0.0), 9: (4.8, 0.0),
}

DEG = dict(G.degree())
DSUM = {v: sum(nx.shortest_path_length(G, v).values()) for v in G}
CLO = nx.closeness_centrality(G)
BTW = nx.betweenness_centrality(G, normalized=False)
_e = nx.eigenvector_centrality(G, max_iter=5000, tol=1e-12)
EIG = {v: _e[v] / max(_e.values()) for v in G}

# 讲解中引用的数值必须与计算一致
assert DEG[3] == 6 and DEG[9] == 1 and max(DEG, key=DEG.get) == 3
assert DSUM[5] == 14 and abs(CLO[5] - 9 / 14) < 1e-9 and abs(CLO[3] - 0.6) < 1e-9
assert BTW[7] == 14 and max(BTW, key=BTW.get) == 7 and abs(BTW[3] - 11 / 3) < 1e-9
assert max(EIG, key=EIG.get) == 3 and DEG[7] == DEG[2] == DEG[4] == 3 and EIG[7] < EIG[2]
assert nx.shortest_path(G, 9, 0) == [9, 8, 7, 5, 0] and len(list(nx.all_shortest_paths(G, 9, 0))) == 1
dist_F = nx.shortest_path_length(G, 5)
assert sorted(v for v, d in dist_F.items() if d == 1) == [0, 2, 3, 6, 7]
assert sorted(v for v, d in dist_F.items() if d == 2) == [1, 4, 8]
assert [v for v, d in dist_F.items() if d == 3] == [9]


def e(a, b):
    return tuple(sorted((idx[a], idx[b])))


def power_iter(k):
    A = nx.to_numpy_array(G, nodelist=range(N))
    x = np.ones(N)
    for _ in range(k):
        x = A @ x
        x = x / x.max()
    return x


def mix(c1, c2, t):
    a, b = np.array(to_rgb(c1)), np.array(to_rgb(c2))
    return tuple(a + (b - a) * t)


def scale_nodes(values, color, lo=None, hi=None):
    vals = np.array([values[i] for i in range(N)], dtype=float)
    lo = vals.min() if lo is None else lo
    hi = vals.max() if hi is None else hi
    t = (vals - lo) / (hi - lo) if hi > lo else np.zeros(N)
    return ({i: 700 + 2300 * t[i] for i in range(N)},
            {i: mix("#E6EAEE", color, 0.25 + 0.75 * t[i]) for i in range(N)})


# ---------------------------------------------------------------- 画面状态
def base_state():
    return {
        "layout": "graph",
        "header": "",
        "sub": "",
        "panel": [],
        "node_alpha": {i: 1.0 for i in range(N)},
        "node_size": {i: 1100.0 for i in range(N)},
        "node_color": {i: to_rgb(BASE) for i in range(N)},
        "ring": {},            # 节点外圈高亮颜色
        "edge_alpha": {ed: 1.0 for ed in EDGES},
        "edge_color": {ed: to_rgb(EDGE) for ed in EDGES},
        "edge_width": {ed: 2.2 for ed in EDGES},
        "tag": {},             # 节点旁的数值标签
        "tag_color": INK,
        "note": "",            # 图下方说明
        "big": "",             # 图中大号计数
        "big_color": INK,
        "groups": [],          # 背景分组框 (x0,y0,x1,y1,color,label)
    }


class Step:
    def __init__(self, text, frames):
        self.text = text
        self.frames = frames  # list of state


STEPS = []


def step(text, *states):
    STEPS.append(Step(text, [copy.deepcopy(s) for s in states]))


def hl_edges(s, edges, color, width=5.0):
    for ed in edges:
        s["edge_color"][ed] = to_rgb(color)
        s["edge_width"][ed] = width


def dim_all(s, a=0.25):
    for ed in EDGES:
        s["edge_alpha"][ed] = a


# ---------------------------------------------------------------- 讲稿与分镜
TOC = [("h", "本节内容"),
       ("b", "① 什么是中心性"),
       ("b", "② 度中心性  Degree"),
       ("b", "③ 接近中心性  Closeness"),
       ("b", "④ 中介中心性  Betweenness"),
       ("b", "⑤ 特征向量中心性  Eigenvector"),
       ("b", "⑥ 对比与总结")]

# —— 0 片头
s = base_state()
s["layout"] = "title"
s["node_alpha"] = {i: 0.0 for i in range(N)}
s["edge_alpha"] = {ed: 0.0 for ed in EDGES}
s["panel"] = TOC
step("同学们好！今天这节课，我们来学习社会网络分析中最核心的概念之一：中心性。", s)
step("中心性回答的是一个很朴素的问题：在一个网络里，谁的位置最重要？"
     "不过，“重要”可以有很多种含义，所以就有了不同的中心性指标。", s)

# —— 1 认识网络
s = base_state()
s["header"] = "① 认识我们的例子网络"
s["sub"] = "Krackhardt 风筝网络（n = 10，m = 18）"
s["edge_alpha"] = {ed: 0.0 for ed in EDGES}
s["panel"] = [("h", "基本概念"),
              ("b", "节点（node）：行动者，例如一个人"),
              ("b", "连线（edge）：行动者之间的关系"),
              ("b", "本例为无向、无权网络")]
frames = []
for k in range(N + 1):
    t = copy.deepcopy(s)
    t["node_alpha"] = {i: (1.0 if i < k else 0.0) for i in range(N)}
    frames.append(t)
step("先来认识我们今天的例子。这是一个由十个人组成的小型网络。"
     "每个圆点代表一个行动者，也叫节点。我们用字母A到J来标记他们。", *frames)
s = frames[-1]
frames = []
order = sorted(EDGES)
for k in range(0, len(order) + 1, 3):
    t = copy.deepcopy(s)
    t["edge_alpha"] = {ed: (1.0 if j < k else 0.0) for j, ed in enumerate(order)}
    frames.append(t)
frames[-1]["note"] = "共 10 个节点、18 条连线"
step("两个人之间的连线，代表他们之间存在某种关系，比如经常交流。"
     "这里的关系没有方向，整个网络一共有十八条连线。", *frames)
s = frames[-1]
s["panel"] = s["panel"] + [("gap", ""), ("h", "为什么选这个网络？"),
                           ("t", "用不同的中心性指标衡量，"),
                           ("t", "“最重要的人”各不相同。")]
step("这个网络在社会网络分析里很有名，叫做“风筝网络”，由学者克拉克哈特提出。"
     "它的妙处在于：用不同的中心性指标去衡量，会得出不同的“最重要的人”。", s)
NET = copy.deepcopy(s)
NET["panel"], NET["note"] = [], ""

# —— 2 度中心性
s = copy.deepcopy(NET)
s["header"] = "② 度中心性  Degree Centrality"
s["sub"] = "直接连接了多少人？"
DEG_PANEL = [("h", "定义"),
             ("f", r"$C_D(i)=\deg(i)=\sum_{j} a_{ij}$"),
             ("t", r"$a_{ij}=1$ 表示 i 与 j 之间有连线")]
s["panel"] = DEG_PANEL
step("第一种，度中心性。它的定义最简单：一个节点直接连接了几个其他节点，它的度就是几。", s)
frames = []
nbrs = sorted(G[3])
t = copy.deepcopy(s)
dim_all(t, 0.3)
t["ring"] = {3: C_DEG}
frames.append(copy.deepcopy(t))
for k, v in enumerate(nbrs, 1):
    hl_edges(t, [tuple(sorted((3, v)))], C_DEG, 6)
    t["edge_alpha"][tuple(sorted((3, v)))] = 1.0
    t["node_color"][v] = to_rgb("#A9C4F5")
    t["big"] = f"deg(D) = {k}"
    t["big_color"] = C_DEG
    frames.append(copy.deepcopy(t))
step("以D为例，我们来看和它直接相连的人：A、B、C、E、F、G，一共六个人，所以D的度是六。", *frames)
s = copy.deepcopy(NET)
s["header"], s["sub"] = "② 度中心性  Degree Centrality", "直接连接了多少人？"
s["panel"] = DEG_PANEL
s["node_size"], s["node_color"] = scale_nodes(DEG, C_DEG)
s["tag"] = {i: str(DEG[i]) for i in range(N)}
s["tag_color"] = C_DEG
s["note"] = "节点大小与颜色深浅 ∝ 度"
step("用同样的方法，可以算出每个人的度。我们让节点的大小和颜色深浅随度变化："
     "D最大，度是六；而J只和I一个人相连，度只有一。", s)
s["panel"] = DEG_PANEL + [("gap", ""), ("h", "标准化"),
                          ("f", r"$C_D'(i)=\dfrac{\deg(i)}{n-1}$"),
                          ("f", r"$C_D'(D)=6/9\approx 0.67$")]
s["ring"] = {3: C_DEG}
step("为了在不同规模的网络之间进行比较，通常要做标准化：用度除以n减一，也就是一个人最多可能连接的人数。"
     "D的标准化度中心性就是六除以九，约等于零点六七。", s)
s["panel"] = DEG_PANEL + [("gap", ""), ("h", "含义与局限"),
                          ("b", "衡量直接联系、活跃程度"),
                          ("b", "只看“邻居”，属于局部指标"),
                          ("b", "看不到节点在全网中的位置")]
s["ring"] = {}
step("度中心性衡量的是直接联系的多少和活跃程度。但它只看邻居，是一个局部指标，"
     "看不到一个人在整个网络中的位置。", s)

# —— 3 接近中心性
s = copy.deepcopy(NET)
s["header"] = "③ 接近中心性  Closeness Centrality"
s["sub"] = "离所有人有多近？"
CLO_PANEL = [("h", "定义"),
             ("f", r"$C_C(i)=\dfrac{n-1}{\sum_{j\neq i} d(i,j)}$"),
             ("t", r"$d(i,j)$：i 到 j 的最短路径步数")]
s["panel"] = CLO_PANEL
step("第二种，接近中心性。它关注的是：一个人到网络中其他所有人，平均有多近。"
     "这里的距离，用最短路径的步数来衡量。", s)
t = copy.deepcopy(s)
dim_all(t, 0.25)
t["ring"] = {5: C_CLO}
t["node_color"][5] = to_rgb(C_CLO)
t["tag"] = {5: "起点"}
t["tag_color"] = C_CLO
DIST_COL = {1: "#F2A65A", 2: "#F6C995", 3: "#FBE5CC"}
frames = [copy.deepcopy(t)]
for v in [0, 2, 3, 6, 7]:
    t["edge_alpha"][tuple(sorted((5, v)))] = 1.0
    hl_edges(t, [tuple(sorted((5, v)))], C_CLO, 5)
    t["node_color"][v] = to_rgb(DIST_COL[1])
    t["tag"][v] = "1"
t["big"], t["big_color"] = "距离 1：5 人", C_CLO
frames.append(copy.deepcopy(t))
step("我们从F出发。一步就能到达的，是A、C、D、G、H，一共五个人。", *frames)
for a, b in [("A", "B"), ("D", "E"), ("H", "I")]:
    t["edge_alpha"][e(a, b)] = 1.0
    hl_edges(t, [e(a, b)], "#F6C995", 5)
for v in [1, 4, 8]:
    t["node_color"][v] = to_rgb(DIST_COL[2])
    t["tag"][v] = "2"
t["big"] = "距离 2：3 人"
step("走两步才能到达的，是B、E和I，一共三个人。", t)
t["edge_alpha"][e("I", "J")] = 1.0
hl_edges(t, [e("I", "J")], "#FBE5CC", 5)
t["node_color"][9] = to_rgb(DIST_COL[3])
t["tag"][9] = "3"
t["big"] = "距离 3：1 人"
step("而J离得最远，需要三步才能到达。", t)
t["big"] = ""
t["panel"] = CLO_PANEL + [("gap", ""), ("h", "以 F 为例"),
                          ("f", r"$\sum_j d(F,j)=5\times1+3\times2+1\times3=14$")]
step("把这些距离加起来：五个一，加上三个二，再加上一个三，总和是十四。", t)
t["panel"] = t["panel"] + [("f", r"$C_C(F)=9/14\approx 0.64$")]
step("接近中心性等于n减一除以这个距离总和，也就是九除以十四，约等于零点六四。"
     "可见，距离总和越小，接近中心性就越高。", t)
s = copy.deepcopy(NET)
s["header"], s["sub"] = "③ 接近中心性  Closeness Centrality", "离所有人有多近？"
s["node_size"], s["node_color"] = scale_nodes(CLO, C_CLO)
s["tag"] = {i: f"{CLO[i]:.2f}" for i in range(N)}
s["tag_color"] = C_CLO
s["ring"] = {5: C_CLO, 6: C_CLO}
s["note"] = "节点大小与颜色深浅 ∝ 接近中心性"
s["panel"] = CLO_PANEL + [("gap", ""), ("h", "全网结果"),
                          ("b", "F、G 最高：9/14 ≈ 0.64"),
                          ("b", "D、H 其次：9/15 = 0.60"),
                          ("b", "J 最低：9/29 ≈ 0.31")]
step("对所有节点做同样的计算，F和G并列最高，约为零点六四；D和H次之，是零点六。"
     "D直接联系的人虽然最多，但F和G离所有人更近。", s)
s["panel"] = CLO_PANEL + [("gap", ""), ("h", "含义与注意"),
                          ("b", "获取、传播信息的效率"),
                          ("b", "适合识别信息的快速扩散者"),
                          ("b", "经典公式要求网络连通")]
s["ring"] = {}
step("接近中心性高的人，获取和传播信息的效率更高，适合用来寻找信息的快速扩散者。"
     "需要注意，这个经典公式要求网络是连通的。", s)

# —— 4 中介中心性
s = copy.deepcopy(NET)
s["header"] = "④ 中介中心性  Betweenness Centrality"
s["sub"] = "有多少最短路径要经过你？"
BTW_PANEL = [("h", "定义"),
             ("f", r"$C_B(i)=\sum_{s<t,\ s,t\neq i}\dfrac{\sigma_{st}(i)}{\sigma_{st}}$"),
             ("t", r"$\sigma_{st}$：s 到 t 的最短路径条数"),
             ("t", r"$\sigma_{st}(i)$：其中经过 i 的条数")]
s["panel"] = BTW_PANEL
step("第三种，中介中心性，也叫中间中心性。它衡量的是：一个人有多少次位于其他两人之间的最短路径上。", s)
step("公式中，分母是从s到t的最短路径的总条数，分子是其中经过节点i的条数。"
     "把所有节点对的这个比例加起来，就得到i的中介中心性。", s)
t = copy.deepcopy(s)
dim_all(t, 0.25)
t["ring"] = {7: C_BTW}
frames = [copy.deepcopy(t)]
path = [9, 8, 7, 5, 0]
for k in range(1, len(path)):
    ed = tuple(sorted((path[k - 1], path[k])))
    t["edge_alpha"][ed] = 1.0
    hl_edges(t, [ed], C_BTW, 6)
    t["node_color"][path[k - 1]] = to_rgb("#E8A49B")
    t["node_color"][path[k]] = to_rgb("#E8A49B")
    frames.append(copy.deepcopy(t))
t["node_color"][7] = to_rgb(C_BTW)
t["big"], t["big_color"] = "J → I → H → F → A", C_BTW
frames.append(copy.deepcopy(t))
step("我们来看H。比如J要联系A，唯一的最短路径是J、I、H、F、A，必须经过H。", *frames)
s2 = copy.deepcopy(s)
s2["ring"] = {7: C_BTW}
s2["node_color"][7] = to_rgb(C_BTW)
for v in range(7):
    s2["node_color"][v] = to_rgb("#F3D3CE")
for v in (8, 9):
    s2["node_color"][v] = to_rgb("#D6E4F5")
hl_edges(s2, [e("F", "H"), e("G", "H"), e("H", "I")], C_BTW, 6)
s2["groups"] = [(-1.75, -2.55, 1.75, 2.55, "#C0392B", "左侧 7 人"),
                (3.15, -0.75, 5.3, 0.75, "#2F6FDE", "I、J")]
s2["big"], s2["big_color"] = "7 × 2 = 14 对", C_BTW
s2["panel"] = BTW_PANEL + [("gap", ""), ("h", "以 H 为例"),
                           ("t", "I、J 与另外 7 人之间的 14 对"),
                           ("t", "最短路径全部经过 H，比例均为 1"),
                           ("f", r"$C_B(H)=14\times 1=14$")]
step("事实上，I和J与左边这七个人之间的所有联系，都必须穿过H。"
     "这样的节点对一共有七乘二，等于十四对，而且每一对的比例都是一，所以H的中介中心性是十四。", s2)
s2["big"] = ""
s2["panel"] = BTW_PANEL + [("gap", ""), ("h", "标准化（无向网络）"),
                           ("f", r"$C_B'(i)=\dfrac{C_B(i)}{(n-1)(n-2)/2}$"),
                           ("f", r"$C_B'(H)=14/36\approx 0.39$")]
step("标准化时，要除以不包含H的节点对总数，也就是九乘八再除以二，等于三十六。"
     "H的标准化中介中心性约为零点三九，是全网最高的。", s2)
s = copy.deepcopy(NET)
s["header"], s["sub"] = "④ 中介中心性  Betweenness Centrality", "有多少最短路径要经过你？"
s["node_size"], s["node_color"] = scale_nodes(BTW, C_BTW)
s["tag"] = {i: (f"{BTW[i]:.2f}".rstrip("0").rstrip(".") if BTW[i] else "0") for i in range(N)}
s["tag_color"] = C_BTW
s["ring"] = {7: C_BTW}
s["note"] = "节点大小与颜色深浅 ∝ 中介中心性（未标准化）"
s["panel"] = BTW_PANEL + [("gap", ""), ("h", "全网结果（未标准化）"),
                          ("b", "H = 14（最高）"),
                          ("b", "F、G ≈ 8.33，I = 8"),
                          ("b", "D ≈ 3.67，A、B ≈ 0.83"),
                          ("b", "C、E、J = 0")]
step("再看其他人：F和G约为八点三三，I是八；度最高的D反倒只有三点六七左右；C、E和J都是零。", s)
t = copy.deepcopy(s)
t["node_alpha"][7] = 0.12
for ed in EDGES:
    if 7 in ed:
        t["edge_alpha"][ed] = 0.0
t["groups"] = [(3.15, -0.75, 5.3, 0.75, "#C0392B", "与网络断开！")]
t["panel"] = BTW_PANEL + [("gap", ""), ("h", "含义"),
                          ("b", "“桥”/“经纪人”（broker）"),
                          ("b", "控制信息与资源的流动"),
                          ("b", "移除 H，网络即断开")]
step("H的度只有三，却掌握着网络两部分之间的唯一通道。这种位置叫做“桥”，或者“经纪人”。"
     "如果H离开，I和J就和其他人断开了。所以，中介中心性高的人，往往能控制信息的流动。", s, t)

# —— 5 特征向量中心性
s = copy.deepcopy(NET)
s["header"] = "⑤ 特征向量中心性  Eigenvector Centrality"
s["sub"] = "你的朋友有多重要？"
EIG_PANEL = [("h", "定义"),
             ("f", r"$x_i=\dfrac{1}{\lambda}\sum_{j} a_{ij}\,x_j$"),
             ("f", r"$A\mathbf{x}=\lambda\mathbf{x}$"),
             ("t", "λ 取邻接矩阵 A 的最大特征值")]
s["panel"] = EIG_PANEL
step("第四种，特征向量中心性。它的思想是：一个人重不重要，不仅取决于他认识多少人，"
     "还取决于他认识的人重不重要。", s)


def eig_state(k, label):
    t = copy.deepcopy(s)
    x = power_iter(k)
    vals = {i: x[i] for i in range(N)}
    t["node_size"], t["node_color"] = scale_nodes(vals, C_EIG, lo=0.0, hi=1.0)
    t["tag"] = {i: f"{x[i]:.2f}" for i in range(N)}
    t["tag_color"] = C_EIG
    t["big"], t["big_color"] = label, C_EIG
    t["panel"] = EIG_PANEL + [("gap", ""), ("h", "幂迭代计算"),
                              ("t", "① 初始：所有人得分为 1"),
                              ("t", "② 新得分 = 邻居得分之和"),
                              ("t", "③ 缩放（本例令最大值 = 1）"),
                              ("t", "④ 重复直到稳定")]
    return t


step("计算时，可以先给每个人相同的初始分数一，然后反复做同一个操作："
     "每个人的新分数，等于他所有邻居的分数之和，再整体缩放。", eig_state(0, "第 0 轮"))
step("第一轮之后，每个人的分数正好与他的度成正比。", eig_state(1, "第 1 轮（∝ 度）"))
step("继续迭代，分数会逐渐稳定下来。稳定后的结果，就是邻接矩阵最大特征值所对应的特征向量。",
     eig_state(2, "第 2 轮"), eig_state(3, "第 3 轮"), eig_state(5, "第 5 轮"),
     eig_state(10, "第 10 轮"), eig_state(60, "收敛"))
assert np.allclose(power_iter(60), [EIG[i] for i in range(N)], atol=1e-3)
t = eig_state(60, "")
t["ring"] = {3: C_EIG, 7: C_EIG, 2: MUTED, 4: MUTED}
t["note"] = "节点大小与颜色深浅 ∝ 特征向量中心性（最大值 = 1）"
t["panel"] = EIG_PANEL + [("gap", ""), ("h", "全网结果"),
                          ("b", "D 最高（1.00），F、G 其次（0.83）"),
                          ("b", "H、C、E 的度都是 3，"),
                          ("t", "    但 H 只有 0.41，C、E 为 0.59"),
                          ("t", "    —— 邻居的质量很重要")]
step("结果中，D最高，F和G其次。值得注意的是，H和C、E的度都是三，但H的得分明显更低。"
     "因为C和E的邻居全都位于核心，而H的邻居中有位于边缘的I。", t)
t["ring"] = {}
t["panel"] = EIG_PANEL + [("gap", ""), ("h", "含义与应用"),
                          ("b", "衡量“影响力的来源”"),
                          ("b", "谷歌 PageRank 是其思想的变体")]
step("特征向量中心性衡量的是影响力的来源。谷歌早期用于网页排序的PageRank算法，就是这一思想的变体。", t)

# —— 6 对比总结
s = copy.deepcopy(NET)
s["layout"] = "table"
s["header"] = "⑥ 对比与总结"
s["sub"] = "同一个网络，四种答案"
for v, c in [(3, C_DEG), (5, C_CLO), (6, C_CLO), (7, C_BTW)]:
    s["node_color"][v] = to_rgb(c)
    s["node_size"][v] = 2000
s["ring"] = {3: C_EIG}
s["note"] = "D：度、特征向量最高   F/G：接近最高   H：中介最高"
step("最后，把四种指标放在一起对比。度中心性最高的是D；接近中心性最高的是F和G；"
     "中介中心性最高的是H；特征向量中心性最高的又是D。", s)
s2 = copy.deepcopy(s)
s2["layout"] = "graph"
s2["panel"] = [("h", "如何选择指标？"),
               ("b", "关心直接影响力 → 度中心性"),
               ("b", "关心传播效率 → 接近中心性"),
               ("b", "关心控制与中介 → 中介中心性"),
               ("b", "关心影响力来源 → 特征向量中心性"),
               ("gap", ""),
               ("h", "核心结论"),
               ("t", "中心性没有唯一标准，"),
               ("t", "要根据研究问题选择指标。")]
step("同一个网络，不同的指标给出了不同的答案。这说明，中心性没有唯一的标准，关键要看你的研究问题："
     "关心直接影响力，就选度中心性；关心传播效率，就选接近中心性；"
     "关心控制与中介，就选中介中心性；关心影响力的来源，就选特征向量中心性。", s2)
s3 = base_state()
s3["layout"] = "title"
s3["node_alpha"] = {i: 0.0 for i in range(N)}
s3["edge_alpha"] = {ed: 0.0 for ed in EDGES}
s3["panel"] = [("h", "课后思考"),
               ("b", "在你的班级或社交圈里，谁的度中心性最高？"),
               ("b", "谁又是那座关键的“桥”？")]
step("好，这节课就到这里。课后请大家想一想：在你的班级或者社交圈里，谁的度中心性最高？"
     "谁又是那座关键的“桥”？我们下节课再见。", s3)


# ---------------------------------------------------------------- 语音
def tts(i, text):
    """读取第 i 步的旁白音频，返回 SR 采样率的 int16 数组。

    VOICE=cosyvoice（默认）：读取 gen_voice.py 用 CosyVoice 合成的 build/voice/NN.wav；
    VOICE=gtts：在线调用 gTTS（机器音，仅作后备）。
    """
    if VOICE == "cosyvoice":
        src = os.path.join(VOICE_DIR, f"{i:02d}.wav")
        txt = os.path.join(VOICE_DIR, f"{i:02d}.txt")
        if not (os.path.exists(src) and os.path.exists(txt) and open(txt).read() == text):
            sys.exit(f"第 {i} 步语音缺失或与讲稿不一致，请先运行：python3 script.py texts && "
                     f"<cosyvoice 环境>/python gen_voice.py")
        tempo = TEMPO_CV
    else:
        os.makedirs(AUDIO_DIR, exist_ok=True)
        src = os.path.join(AUDIO_DIR, f"{i:02d}.mp3")
        txt = os.path.join(AUDIO_DIR, f"{i:02d}.txt")
        if not (os.path.exists(src) and os.path.exists(txt) and open(txt).read() == text):
            from gtts import gTTS
            gTTS(text.replace("“", "").replace("”", ""), lang="zh-CN").save(src)
            open(txt, "w").write(text)
        tempo = TEMPO
    af = ("silenceremove=start_periods=1:start_threshold=-50dB,"
          "areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse")
    if abs(tempo - 1) > 1e-6:
        af = f"atempo={tempo}," + af
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", src, "-af", af,
         "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16)


# ---------------------------------------------------------------- 渲染
fig = plt.figure(figsize=(W / 100, H / 100), dpi=100)


def wrap(text, width):
    if len(text) <= width:
        return [text]
    cut = (len(text) + 1) // 2
    while cut < len(text) - 1 and text[cut] in "，。！？；：、”）":
        cut += 1
    return [text[:cut], text[cut:]]


def draw_panel(ax, items, x0, y0, title_layout=False):
    y = y0
    for kind, txt in items:
        if kind == "h":
            ax.text(x0, y, txt, fontsize=30 if title_layout else 27, weight="bold", color=INK, va="top")
            y -= 0.075
        elif kind == "b":
            ax.plot([x0 + 0.016], [y - 0.017], "o", ms=7, color=INK)
            ax.text(x0 + 0.03, y, txt, fontsize=24, color=INK, va="top")
            y -= 0.062
        elif kind == "t":
            ax.text(x0 + 0.01, y, txt, fontsize=22, color=MUTED, va="top")
            y -= 0.056
        elif kind == "f":
            ax.text(x0 + 0.01, y, txt, fontsize=27, color=INK, va="top")
            y -= 0.135 if ("dfrac" in txt or "sum_" in txt) else 0.085
        elif kind == "gap":
            y -= 0.03


def draw_table(ax):
    cols = ["节点", "度", "接近", "中介", "特征向量"]
    colc = [INK, C_DEG, C_CLO, C_BTW, C_EIG]
    data = [DEG, CLO, BTW, EIG]
    fmt = [lambda v: str(v), lambda v: f"{v:.2f}",
           lambda v: f"{v:.2f}", lambda v: f"{v:.2f}"]
    xs = [0.62, 0.70, 0.77, 0.845, 0.925]
    y = 0.80
    ax.add_patch(FancyBboxPatch((0.595, 0.14), 0.37, 0.71, boxstyle="round,pad=0.005",
                                fc="white", ec="#D9DDE3", lw=1.5))
    for x, c, col in zip(xs, cols, colc):
        ax.text(x, y, c, fontsize=22, weight="bold", color=col, ha="center", va="center")
    y -= 0.06
    for i in range(N):
        if i % 2 == 0:
            ax.add_patch(plt.Rectangle((0.60, y - 0.027), 0.36, 0.054, fc="#F3F4F6", ec="none"))
        ax.text(xs[0], y, NAMES[i], fontsize=21, weight="bold", ha="center", va="center", color=INK)
        for j, d in enumerate(data):
            top = abs(d[i] - max(d.values())) < 1e-9
            ax.text(xs[j + 1], y, fmt[j](d[i]), fontsize=21, ha="center", va="center",
                    color=colc[j + 1] if top else INK, weight="bold" if top else "normal")
        y -= 0.06
    ax.text(0.78, 0.165, "接近、特征向量为标准化值（特征向量按最大值 = 1 缩放），中介为原始值",
            fontsize=14, color=MUTED, ha="center")


def render(st, caption):
    fig.clf()
    fig.patch.set_facecolor(BG)
    ov = fig.add_axes([0, 0, 1, 1])
    ov.set_xlim(0, 1)
    ov.set_ylim(0, 1)
    ov.axis("off")
    title_layout = st["layout"] == "title"

    # 顶栏
    ov.add_patch(plt.Rectangle((0, 0.915), 1, 0.085, fc="#20304A", ec="none"))
    ov.text(0.025, 0.957, "社会网络分析（SNA）· 中心性", fontsize=24, color="white",
            va="center", weight="bold")
    if st["header"]:
        ov.text(0.975, 0.957, st["header"], fontsize=24, color="#FFD58A", va="center", ha="right")

    if title_layout:
        ov.text(0.5, 0.74, "中心性 Centrality", fontsize=70, weight="bold", ha="center", color=INK)
        ov.text(0.5, 0.665, "谁在网络中最重要？", fontsize=34, ha="center", color=MUTED)
        draw_panel(ov, st["panel"], 0.36, 0.58, title_layout=True)
    else:
        if st["sub"]:
            ov.text(0.025, 0.87, st["sub"], fontsize=26, color=MUTED, va="center")
        gx = fig.add_axes([0.01, 0.20, 0.57, 0.63])
        gx.set_xlim(-1.9, 5.5)
        gx.set_ylim(-2.75, 2.75)
        gx.set_aspect("equal")
        gx.axis("off")
        for (x0, y0, x1, y1, col, lab) in st["groups"]:
            gx.add_patch(FancyBboxPatch((x0, y0), x1 - x0, y1 - y0, boxstyle="round,pad=0.05",
                                        fc=mix(col, "white", 0.9), ec=col, lw=2, ls="--", alpha=0.9))
            gx.text((x0 + x1) / 2, y0 - 0.12, lab, ha="center", va="top", fontsize=19, color=col)
        for ed in EDGES:
            a = st["edge_alpha"][ed] * min(st["node_alpha"][ed[0]], st["node_alpha"][ed[1]])
            if a <= 0.01:
                continue
            (x1, y1), (x2, y2) = POS[ed[0]], POS[ed[1]]
            gx.plot([x1, x2], [y1, y2], color=st["edge_color"][ed], lw=st["edge_width"][ed],
                    alpha=a, solid_capstyle="round", zorder=1)
        for i in range(N):
            a = st["node_alpha"][i]
            if a <= 0.01:
                continue
            x, y = POS[i]
            sz = st["node_size"][i]
            if i in st["ring"]:
                gx.scatter([x], [y], s=sz * 1.7, facecolor="none", edgecolor=st["ring"][i],
                           lw=4, alpha=a, zorder=2)
            gx.scatter([x], [y], s=sz, color=st["node_color"][i], edgecolor="white",
                       lw=2.5, alpha=a, zorder=3)
            lum = np.dot(st["node_color"][i], [0.299, 0.587, 0.114])
            gx.text(x, y, NAMES[i], ha="center", va="center", fontsize=22, weight="bold",
                    color="white" if lum < 0.55 else INK, alpha=a, zorder=4)
            if i in st["tag"]:
                r = np.sqrt(sz) / 2 + 6
                gx.annotate(st["tag"][i], (x, y), xytext=(0, -r - 4), textcoords="offset points",
                            ha="center", va="top", fontsize=19, color=st["tag_color"],
                            weight="bold", alpha=a, zorder=5,
                            bbox=dict(boxstyle="round,pad=0.15", fc=BG, ec="none", alpha=0.85))
        if st["big"]:
            ov.text(0.36, 0.865, st["big"], fontsize=34, weight="bold", color=st["big_color"],
                    ha="center", va="center")
        if st["note"]:
            ov.text(0.30, 0.165, st["note"], fontsize=19, color=MUTED, ha="center")
        if st["layout"] == "table":
            draw_table(ov)
        else:
            ov.plot([0.585, 0.585], [0.17, 0.85], color="#D9DDE3", lw=1.5)
            draw_panel(ov, st["panel"], 0.61, 0.83)

    # 字幕
    if caption:
        lines = wrap(caption, 40)
        hgt = 0.045 * len(lines) + 0.025
        ov.add_patch(plt.Rectangle((0, 0), 1, hgt + 0.015, fc="#111827", ec="none", alpha=0.88))
        for k, ln in enumerate(lines):
            ov.text(0.5, hgt - 0.005 - 0.045 * (k + 0.5), ln, fontsize=27, color="white",
                    ha="center", va="center")
    fig.canvas.draw()
    return np.asarray(fig.canvas.buffer_rgba())[:, :, :3].tobytes()


def interp(a, b, t):
    """在两个状态之间插值；数值类字段平滑过渡，文字类字段直接采用新状态。"""
    t = t * t * (3 - 2 * t)
    out = copy.deepcopy(b)
    for key in ("node_alpha", "node_size", "edge_alpha", "edge_width"):
        out[key] = {k: a[key][k] + (b[key][k] - a[key][k]) * t for k in b[key]}
    for key in ("node_color", "edge_color"):
        out[key] = {k: tuple(np.array(a[key][k]) + (np.array(b[key][k]) - np.array(a[key][k])) * t)
                    for k in b[key]}
    return out


def split_caption(text, total):
    """把旁白切成不超过两行的字幕块，按字数比例分配时长。"""
    pieces = []
    for sent in [p for p in re.split(r"(?<=[。！？；])", text) if p.strip()]:
        if len(sent) <= 44:
            pieces.append(sent)
            continue
        cur = ""
        for clause in re.split(r"(?<=[，：])", sent):
            if cur and len(cur) + len(clause) > 44:
                pieces.append(cur)
                cur = ""
            cur += clause
        pieces.append(cur)
    merged = []
    for p in pieces:
        if merged and len(merged[-1]) + len(p) <= 44:
            merged[-1] += p
        else:
            merged.append(p)
    lens = np.array([len(p) for p in merged], float)
    bounds = np.concatenate([[0], np.cumsum(lens) / lens.sum() * total])
    return list(zip(bounds[:-1], merged))


def main():
    audio_parts, timeline = [], []
    for i, stp in enumerate(STEPS):
        a = tts(i, stp.text)
        audio_parts.append(a)
        timeline.append(len(a) / SR + GAP)
        print(f"[{i:02d}] {len(a) / SR:5.1f}s  {stp.text[:30]}", flush=True)

    os.makedirs(BUILD, exist_ok=True)
    silent = os.path.join(BUILD, "video.mp4")
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264",
         "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", silent],
        stdin=subprocess.PIPE)
    track, prev, frame_no = [], None, 0
    for i, stp in enumerate(STEPS):
        nfr = int(round(timeline[i] * FPS))
        start = frame_no
        track.append((start, audio_parts[i]))
        keys = stp.frames
        seg = nfr / len(keys)
        caps = split_caption(stp.text, len(audio_parts[i]) / SR)
        cache = {}
        for f in range(nfr):
            k = min(int(f / seg), len(keys) - 1)
            local = (f - k * seg) / FPS
            src = prev if k == 0 else keys[k - 1]
            if src is None:
                src = keys[k]
            tt = min(1.0, local / TRANS)
            now = f / FPS
            cap = [c for t0, c in caps if t0 <= now][-1]
            key = (k, cap) if tt >= 1.0 else None
            if key is not None and key in cache:
                buf = cache[key]
            else:
                buf = render(interp(src, keys[k], tt) if tt < 1 else keys[k], cap)
                if key is not None:
                    cache = {key: buf}
            enc.stdin.write(buf)
        prev = keys[-1]
        frame_no += nfr
        print(f"render step {i:02d} done ({frame_no / FPS:.1f}s)", flush=True)
    # 片尾留白 1 秒
    for _ in range(FPS):
        enc.stdin.write(buf)
    frame_no += FPS
    enc.stdin.close()
    enc.wait()

    total = int(frame_no / FPS * SR) + SR
    mixbuf = np.zeros(total, np.int32)
    for start, a in track:
        o = int(start / FPS * SR) + int(0.15 * SR)  # 画面切换后稍作停顿再开口
        mixbuf[o:o + len(a)] += a
    mixbuf = np.clip(mixbuf, -32768, 32767).astype(np.int16)
    wav = os.path.join(BUILD, "narration.wav")
    import wave
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(mixbuf.tobytes())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav,
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
                    "-af", "loudnorm=I=-16:TP=-1.5", "-shortest",
                    "-movflags", "+faststart", OUT], check=True)
    print("written", OUT)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "texts":
        # 导出讲稿，供 gen_voice.py 合成语音
        import json
        os.makedirs(BUILD, exist_ok=True)
        json.dump([stp.text for stp in STEPS], open(os.path.join(BUILD, "narration.json"), "w"),
                  ensure_ascii=False, indent=1)
        print(len(STEPS), "steps ->", os.path.join(BUILD, "narration.json"))
    elif len(sys.argv) > 1 and sys.argv[1] == "preview":
        # 每步渲染最终画面，用于检查版式
        os.makedirs(os.path.join(BUILD, "preview"), exist_ok=True)
        for i, stp in enumerate(STEPS):
            caps = split_caption(stp.text, 1.0)
            buf = render(stp.frames[-1], max((c for _, c in caps), key=len))
            plt.imsave(os.path.join(BUILD, "preview", f"{i:02d}.png"),
                       np.frombuffer(buf, np.uint8).reshape(H, W, 3))
        print(len(STEPS), "previews")
    else:
        main()
