"""CosyVoice 逐句合成（供 fix_voice.py 调用）。

输入 JSON：[{"out": wav 路径, "text": 句子, "seed": 随机种子}, ...]
"""
import json
import os
import random
import sys

COSYVOICE_DIR = os.environ.get("COSYVOICE_DIR", "/root/CosyVoice")
MODEL_DIR = os.environ.get("MODEL_DIR", "/root/models/CosyVoice-300M-SFT")
SPEAKER = os.environ.get("SPEAKER", "中文女")
SPEED = float(os.environ.get("SPEED", "1.25"))
sys.path += [COSYVOICE_DIR, os.path.join(COSYVOICE_DIR, "third_party", "Matcha-TTS")]
import numpy as np  # noqa: E402
import torch  # noqa: E402
import torchaudio  # noqa: E402
from cosyvoice.cli.cosyvoice import CosyVoice  # noqa: E402

torch.set_num_threads(os.cpu_count())
model = CosyVoice(MODEL_DIR, load_jit=False, load_trt=False, fp16=False)
for job in json.load(open(sys.argv[1])):
    random.seed(job["seed"])
    np.random.seed(job["seed"])
    torch.manual_seed(job["seed"])
    out = [o["tts_speech"] for o in model.inference_sft(job["text"], SPEAKER, stream=False, speed=SPEED)]
    torchaudio.save(job["out"], torch.cat(out, 1), model.sample_rate)
    print("done", job["out"], flush=True)
