"""语音自动纠错：对识别结果与讲稿读音不一致的段落，逐句重新合成并择优。

流程：Whisper 转写每段 → 拼音级比对 → 有误的段落拆成句子 → 每句用不同随机种子
重新合成，直到读音与讲稿完全一致或达到重试上限（取误差最小的一版）→ 拼回整段。
用法：python3 fix_voice.py   （需先运行 gen_voice.py；CosyVoice 环境由 CV_PYTHON 指定）
"""
import json
import os
import re
import subprocess

import numpy as np
import soundfile as sf
from faster_whisper import WhisperModel

from check_voice import errors, norm, py

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.path.join(HERE, "build", "voice")
SENT = os.path.join(VOICE, "sentences")
CV_PYTHON = os.environ.get("CV_PYTHON", "/root/cv/bin/python")
ROUNDS = int(os.environ.get("ROUNDS", "4"))
PAUSE = 0.18  # 句间停顿（秒）

asr = WhisperModel("medium", device="cpu", compute_type="int8")


def transcribe(path):
    a, sr = sf.read(path, dtype="float32")
    if sr != 16000:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1",
                              "-ar", "16000", "-"], check=True, capture_output=True).stdout
        a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    segs, _ = asr.transcribe(a, language="zh", beam_size=5,
                             initial_prompt="以下是普通话课堂讲解：社会网络分析，中心性。")
    return "".join(s.text for s in segs)


def pinyin_err(ref, hyp):
    return errors(py(norm(ref)), py(norm(hyp)))[0]


def sentences(text):
    return [s for s in re.split(r"(?<=[。！？；])", text) if s.strip()]


def main():
    os.makedirs(SENT, exist_ok=True)
    state_path = os.path.join(SENT, "state.json")
    state = json.load(open(state_path)) if os.path.exists(state_path) else {}
    steps = sorted(f[:2] for f in os.listdir(VOICE) if f.endswith(".wav"))
    bad = []
    for k in steps:
        text = open(os.path.join(VOICE, f"{k}.txt")).read()
        if state.get(k, {}).get("text") == text and state[k].get("done"):
            continue
        e = pinyin_err(text, transcribe(os.path.join(VOICE, f"{k}.wav")))
        print(f"[{k}] 整段读音差异 {e}", flush=True)
        if e:
            bad.append(k)
            state[k] = {"text": text, "sents": [{"text": s, "best": None, "err": 99, "tries": 0}
                                                for s in sentences(text)]}
        else:
            state[k] = {"text": text, "done": True}
    json.dump(state, open(state_path, "w"), ensure_ascii=False, indent=1)

    for rnd in range(ROUNDS):
        jobs = []
        for k in bad:
            for j, s in enumerate(state[k]["sents"]):
                if s["err"] > 0 and s["tries"] < ROUNDS:
                    out = os.path.join(SENT, f"{k}_{j}_{s['tries']}.wav")
                    jobs.append({"out": out, "text": s["text"].replace("“", "").replace("”", ""),
                                 "seed": 1000 * rnd + 7 * j + int(k), "k": k, "j": j})
        if not jobs:
            break
        print(f"第 {rnd + 1} 轮：合成 {len(jobs)} 句", flush=True)
        jp = os.path.join(SENT, "jobs.json")
        json.dump(jobs, open(jp, "w"), ensure_ascii=False)
        subprocess.run([CV_PYTHON, os.path.join(HERE, "gen_sentences.py"), jp], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for job in jobs:
            s = state[job["k"]]["sents"][job["j"]]
            hyp = transcribe(job["out"])
            e = pinyin_err(s["text"], hyp)
            s["tries"] += 1
            print(f"  [{job['k']}.{job['j']}] 第 {s['tries']} 次 差异 {e}：{hyp}", flush=True)
            if e < s["err"]:
                s.update(err=e, best=job["out"], hyp=hyp)
        json.dump(state, open(state_path, "w"), ensure_ascii=False, indent=1)

    for k in bad:
        parts = []
        for s in state[k]["sents"]:
            a, sr = sf.read(s["best"], dtype="float32")
            parts += [a, np.zeros(int(sr * PAUSE), np.float32)]
        sf.write(os.path.join(VOICE, f"{k}.wav"), np.concatenate(parts[:-1]), sr)
        state[k]["done"] = True
        print(f"[{k}] 已重建，逐句残留差异 {[s['err'] for s in state[k]['sents']]}", flush=True)
    json.dump(state, open(state_path, "w"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
