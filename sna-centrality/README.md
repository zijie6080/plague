# SNA 教学动画：中心性（课堂讲解）

成片：`sna_centrality.mp4`（1920×1080，25 fps，约 4 分 41 秒，CosyVoice 真人风格中文配音 + 中文字幕）

## 内容结构

| 段落 | 内容 | 动画 |
|---|---|---|
| 片头 | 课程目录 | — |
| ① 例子网络 | Krackhardt 风筝网络（10 个节点、18 条连线） | 节点逐个出现、连线逐条画出 |
| ② 度中心性 | $C_D(i)=\deg(i)$，标准化 $\deg(i)/(n-1)$ | 逐条点亮 D 的 6 条连线并计数；全网按度着色 |
| ③ 接近中心性 | $C_C(i)=(n-1)/\sum_j d(i,j)$ | 从 F 出发按距离 1/2/3 逐层扩展，求和 14 → 9/14 |
| ④ 中介中心性 | $C_B(i)=\sum_{s<t}\sigma_{st}(i)/\sigma_{st}$ | 高亮 J→A 最短路径；7×2=14 对；移除 H 后网络断开 |
| ⑤ 特征向量中心性 | $A\mathbf{x}=\lambda\mathbf{x}$ | 幂迭代第 0、1、2、3、5、10 轮直到收敛 |
| ⑥ 对比总结 | 四种指标对照表、如何选择 | 各指标的最高者着色 |

讲解中提到的每个数值都由 networkx 计算，并在 `script.py` 中用 `assert` 核对（例如 deg(D)=6、Σd(F)=14、C_B(H)=14、特征向量中心性最高的是 D）。

## 配音

- 语音：阿里通义实验室开源模型 CosyVoice（CosyVoice-300M-SFT，内置音色“中文女”），离线 CPU 合成。
- 语速：约每秒 6.1 字，是第一版 gTTS 配音（约每秒 4.1 字）的 1.5 倍。
- 自动纠错：`fix_voice.py` 用 Whisper 转写每段配音，按拼音与讲稿比对；读音有误的段落拆成句子，换随机种子重新合成，直到读音与讲稿一致。
- 为避开模型的已知问题，改写了几句讲稿：以“度”或字母开头的句子，首字容易被吞掉；句末的“一”后面容易多出一个音。
- 最终校对：拼音级差异 0.44%（7/1609）。剩下的 7 处在逐句校验时都已通过，整段转写时才出现，判断为识别器误差。完整报告见 `voice_check.md`。
- 男声（“中文男”）测试时误读较多，没有采用。

## 重新生成

```bash
# 1. CosyVoice 环境（Python 3.10，CPU）
uv venv -p 3.10 /root/cv && VIRTUAL_ENV=/root/cv uv pip install --index-url https://download.pytorch.org/whl/cpu torch==2.3.1 torchaudio==2.3.1
#    再安装 CosyVoice 仓库 requirements.txt 里的其余依赖（GPU 相关包除外），
#    并下载 FunAudioLLM/CosyVoice-300M-SFT 到 /root/models/
# 2. 合成与纠错
python3 script.py texts                 # 导出讲稿
/root/cv/bin/python gen_voice.py        # 逐段合成（约为音频时长的 9 倍耗时）
python3 fix_voice.py                    # Whisper 校验，有误的句子自动重新合成
# 3. 渲染与校对
python3 script.py                       # → sna_centrality.mp4
python3 check_voice.py                  # → voice_check.md
VOICE=gtts python3 script.py            # 后备：使用 gTTS 机器音
```
