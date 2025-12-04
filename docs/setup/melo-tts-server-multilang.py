#!/usr/bin/env python3
"""
MeLo TTS API 服务器 - 多语言版本
支持中文、英文、日语、韩语、西班牙语、法语

使用方法:
    python3 melo-tts-server-multilang.py
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uvicorn, logging, io, traceback

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Melo TTS API Server - Multi-Language")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# 多语言模型缓存
_tts_models: Dict[str, any] = {}

# 语言映射
LANGUAGE_MAP = {
    'ZH': 'ZH',
    'EN': 'EN',
    'JP': 'JP',
    'ES': 'ES',
    'FR': 'FR',
    'KR': 'KR',
    # 兼容小写
    'zh': 'ZH',
    'en': 'EN',
    'jp': 'JP',
    'ja': 'JP',  # 日语别名
    'es': 'ES',
    'fr': 'FR',
    'kr': 'KR',
    'ko': 'KR',  # 韩语别名
}

def get_tts_model(language: str = 'ZH'):
    """获取或加载指定语言的 TTS 模型"""
    global _tts_models
    
    # 标准化语言代码
    lang = LANGUAGE_MAP.get(language, 'ZH')
    
    if lang not in _tts_models:
        try:
            from melo.api import TTS
            logger.info(f"🔄 加载 {lang} 语言模型...")
            _tts_models[lang] = TTS(language=lang, device='auto')
            logger.info(f"✅ {lang} 模型加载完成")
            
            # 打印可用的说话人
            spk2id = _tts_models[lang].hps.data.spk2id
            logger.info(f"📋 {lang} 可用说话人: {list(spk2id.keys())}")
        except Exception as e:
            logger.error(f"❌ {lang} 模型加载失败: {e}")
            traceback.print_exc()
            raise
    
    return _tts_models[lang]

class TTSRequest(BaseModel):
    text: str
    lang: str = "ZH"
    speaker: Optional[str] = None
    speed: Optional[float] = 1.0

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    supported_languages: list

@app.get("/health")
def health():
    try:
        return HealthResponse(
            status="ok",
            service="Melo TTS Multi-Language",
            version="1.0.0",
            supported_languages=["ZH", "EN", "JP", "ES", "FR", "KR"]
        )
    except Exception as e:
        logger.error(f"❌ 健康检查失败: {e}")
        traceback.print_exc()
        raise HTTPException(500, str(e))

@app.get("/languages")
def list_languages():
    """列出支持的语言"""
    return {
        "supported_languages": [
            {"code": "ZH", "name": "中文", "aliases": ["zh"]},
            {"code": "EN", "name": "English", "aliases": ["en"]},
            {"code": "JP", "name": "日本語", "aliases": ["jp", "ja"]},
            {"code": "ES", "name": "Español", "aliases": ["es"]},
            {"code": "FR", "name": "Français", "aliases": ["fr"]},
            {"code": "KR", "name": "한국어", "aliases": ["kr", "ko"]},
        ]
    }

@app.post("/tts")
def tts(req: TTSRequest):
    try:
        logger.info(f"📝 收到请求 - 文本: '{req.text[:50]}...', 语言: {req.lang}, 速度: {req.speed}")
        
        if not req.text:
            raise HTTPException(400, "文本不能为空")
        
        if len(req.text) > 1000:
            raise HTTPException(400, "文本长度不能超过 1000 字符")
        
        # 标准化语言代码
        lang = LANGUAGE_MAP.get(req.lang, 'ZH')
        logger.info(f"🌍 使用语言: {lang}")
        
        # 获取对应语言的模型
        model = get_tts_model(lang)
        
        # 获取说话人 ID
        spk2id = model.hps.data.spk2id
        logger.info(f"🔍 可用说话人: {list(spk2id.keys())}")
        
        # 使用指定的说话人或默认说话人
        if req.speaker and req.speaker in spk2id:
            sid = spk2id[req.speaker]
            logger.info(f"✅ 使用指定说话人: {req.speaker} -> {sid}")
        elif lang in spk2id:
            sid = spk2id[lang]
            logger.info(f"✅ 使用默认说话人: {lang} -> {sid}")
        else:
            sid = list(spk2id.values())[0]
            logger.info(f"⚠️  使用第一个可用说话人: {sid}")
        
        logger.info(f"🎵 开始合成语音...")
        
        # 生成语音
        out = io.BytesIO()
        model.tts_to_file(
            req.text,
            sid,
            out,
            format='wav',
            speed=req.speed or 1.0
        )
        audio_data = out.getvalue()
        
        logger.info(f"✅ 合成成功！音频大小: {len(audio_data)} 字节")
        
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=speech.wav",
                "X-Language": lang,
                "X-Speaker-ID": str(sid)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ TTS 合成失败: {e}")
        traceback.print_exc()
        raise HTTPException(500, f"TTS 失败: {str(e)}")

if __name__ == "__main__":
    logger.info("=" * 70)
    logger.info("🎤 MeLo TTS API 服务器 - 多语言版本")
    logger.info("=" * 70)
    logger.info("📡 监听: http://0.0.0.0:7860")
    logger.info("🌍 支持语言: ZH (中文), EN (英语), JP (日语), KR (韩语), ES (西语), FR (法语)")
    logger.info("=" * 70)
    
    uvicorn.run(app, host="0.0.0.0", port=7860, log_level="info")

