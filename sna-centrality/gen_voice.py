"""用 CosyVoice（阿里通义实验室开源语音合成）为每一步旁白合成真人风格语音。

需在装有 CosyVoice 依赖的 Python 3.10 环境中运行（CPU 即可，约为音频时长的 9 倍耗时）：
    python3 script.py texts                       # 导出讲稿 build/narration.json
    COSYVOICE_DIR=... MODEL_DIR=... <cv>/python gen_voice.py
已合成且讲稿未变的段落会跳过。
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
COSYVOICE_DIR = os.environ.get("COSYVOICE_DIR", "/root/CosyVoice")
MODEL_DIR = os.environ.get("MODEL_DIR", "/root/models/CosyVoice-300M-SFT")
SPEAKER = os.environ.get("SPEAKER", "中文女")
SPEED = float(os.environ.get("SPEED", "1.25"))   # 相对模型默认语速
OUT = os.path.join(HERE, "build", "voice")

sys.path += [COSYVOICE_DIR, os.path.join(COSYVOICE_DIR, "third_party", "Matcha-TTS")]
import torch  # noqa: E402
import torchaudio  # noqa: E402
from cosyvoice.cli.cosyvoice import CosyVoice  # noqa: E402


def main():
    texts = json.load(open(os.path.join(HERE, "build", "narration.json")))
    os.makedirs(OUT, exist_ok=True)
    torch.set_num_threads(os.cpu_count())
    model = None
    for i, text in enumerate(texts):
        wav, txt = os.path.join(OUT, f"{i:02d}.wav"), os.path.join(OUT, f"{i:02d}.txt")
        if os.path.exists(wav) and os.path.exists(txt) and open(txt).read() == text:
            continue
        if model is None:
            model = CosyVoice(MODEL_DIR, load_jit=False, load_trt=False, fp16=False)
        t0 = time.time()
        spoken = text.replace("“", "").replace("”", "")
        out = [o["tts_speech"] for o in model.inference_sft(spoken, SPEAKER, stream=False, speed=SPEED)]
        torchaudio.save(wav, torch.cat(out, 1), model.sample_rate)
        open(txt, "w").write(text)
        print(f"[{i:02d}] {time.time() - t0:.0f}s  {text[:24]}", flush=True)


if __name__ == "__main__":
    main()
