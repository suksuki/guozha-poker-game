"""
Qwen3-TTS 服务端（Melo 同款 CORS）
- OPTIONS 预检 204 + CORS 头
- 所有响应（含 POST /tts 的 200 音频）都带 CORS 头，浏览器跨域 fetch 直接能用

部署：在服务器执行后
  source ~/venvs/qwen3-tts312/bin/activate
  uvicorn qwen_tts_server_melo_like:app --host 0.0.0.0 --port 8000
"""
import io
import os
import time
import wave
from typing import Optional

import torch
from fastapi import FastAPI, Body, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from qwen_tts import Qwen3TTSModel

MODEL_DIR = os.environ.get(
    "QWEN_TTS_MODEL_DIR",
    "/home/liujin/models/qwen3-tts/Qwen3-TTS-12Hz-0.6B-CustomVoice",
)
DEVICE = os.environ.get("QWEN_TTS_DEVICE", "cuda:0")
DTYPE = torch.bfloat16

API_KEY = os.environ.get("QWEN_TTS_API_KEY", "").strip()

app = FastAPI(title="Qwen3-TTS (Melo-like CORS)")


def cors_headers() -> dict:
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "X-Gen-Seconds,X-Sample-Rate",
        # Chrome 从 localhost 访问 192.168.x.x 时必须返回，否则 POST 会 Failed to fetch
        "Access-Control-Allow-Private-Network": "true",
    }


@app.options("/{path:path}")
def options_any(path: str):
    return Response(status_code=204, headers=cors_headers())


@app.middleware("http")
async def add_cors(request: Request, call_next):
    resp = await call_next(request)
    for k, v in cors_headers().items():
        resp.headers.setdefault(k, v)
    return resp


model = Qwen3TTSModel.from_pretrained(
    MODEL_DIR,
    device_map=DEVICE,
    dtype=DTYPE,
)


def float32_to_wav_bytes(audio_f32, sr: int) -> bytes:
    import numpy as np
    if hasattr(audio_f32, "numpy"):
        audio_f32 = audio_f32.numpy()
    audio_f32 = np.asarray(audio_f32, dtype=np.float32).flatten()
    pcm16 = (np.clip(audio_f32, -1, 1) * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()


def check_key(x_api_key: Optional[str]):
    if not API_KEY:
        return
    if (x_api_key or "").strip() != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
def health():
    return JSONResponse({"ok": True}, headers=cors_headers())


@app.post("/tts")
def tts(payload: dict = Body(...), x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")):
    check_key(x_api_key)

    text = (payload.get("text") or "").strip()
    if not text:
        return JSONResponse({"error": "text is required"}, status_code=400, headers=cors_headers())

    speaker = payload.get("speaker", "Vivian")
    instruct = payload.get("instruct", "语气自然")
    language = payload.get("language", "Chinese")

    t0 = time.time()
    with torch.inference_mode():
        wavs, sr = model.generate_custom_voice(
            text=text, language=language, speaker=speaker, instruct=instruct
        )
    if torch.cuda.is_available():
        torch.cuda.synchronize()
    t1 = time.time()

    wav_bytes = float32_to_wav_bytes(wavs[0], sr)

    headers = cors_headers()
    headers["X-Gen-Seconds"] = f"{t1 - t0:.3f}"
    headers["X-Sample-Rate"] = str(sr)
    return Response(content=wav_bytes, media_type="audio/wav", headers=headers)
