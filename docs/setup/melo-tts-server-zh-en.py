#!/usr/bin/env python3
"""
MeLo TTS API 服务器 - 中英文双语版本
仅支持中文和英文（最稳定、最常用）

使用方法:
    python3 melo-tts-server-zh-en.py
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uvicorn, logging, io, traceback

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Melo TTS API Server - ZH/EN")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# 双语模型缓存
_tts_models: Dict[str, any] = {}

def get_tts_model(language: str = 'ZH'):
    """获取或加载 TTS 模型（仅支持 ZH 和 EN）"""
    global _tts_models
    
    # 标准化为大写
    lang = language.upper()
    
    # 仅支持中文和英文
    if lang not in ['ZH', 'EN']:
        lang = 'ZH'  # 默认中文
    
    if lang not in _tts_models:
        try:
            from melo.api import TTS
            logger.info(f"🔄 加载 {lang} 语言模型...")
            _tts_models[lang] = TTS(language=lang, device='auto')
            logger.info(f"✅ {lang} 模型加载完成")
            
            spk2id = _tts_models[lang].hps.data.spk2id
            logger.info(f"📋 {lang} 说话人: {list(spk2id.keys())}")
        except Exception as e:
            logger.error(f"❌ {lang} 模型加载失败: {e}")
            traceback.print_exc()
            raise
    
    return _tts_models[lang]

class TTSRequest(BaseModel):
    text: str
    lang: str = "ZH"
    speed: Optional[float] = 1.0

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    supported_languages: list

@app.get("/health")
def health():
    try:
        # 预加载中文模型
        get_tts_model('ZH')
        return HealthResponse(
            status="ok",
            service="Melo TTS ZH/EN",
            version="1.0.0",
            supported_languages=["ZH", "EN"]
        )
    except Exception as e:
        logger.error(f"❌ 健康检查失败: {e}")
        raise HTTPException(500, str(e))

@app.get("/languages")
def list_languages():
    """列出支持的语言"""
    return {
        "supported_languages": [
            {"code": "ZH", "name": "中文", "description": "普通话"},
            {"code": "EN", "name": "English", "description": "美式英语"}
        ]
    }

@app.post("/tts")
def tts(req: TTSRequest):
    try:
        logger.info(f"📝 收到请求 - 文本: '{req.text[:50]}...', 语言: {req.lang}")
        
        if not req.text:
            raise HTTPException(400, "文本不能为空")
        
        if len(req.text) > 1000:
            raise HTTPException(400, "文本长度不能超过 1000 字符")
        
        # 标准化语言代码
        lang = req.lang.upper()
        if lang not in ['ZH', 'EN']:
            logger.warning(f"⚠️  不支持的语言 {lang}，使用中文")
            lang = 'ZH'
        
        # 获取模型
        model = get_tts_model(lang)
        
        # 获取说话人 ID
        spk2id = model.hps.data.spk2id
        if lang in spk2id:
            sid = spk2id[lang]
        else:
            sid = list(spk2id.values())[0]
        
        logger.info(f"🎤 使用 {lang} 说话人 (ID: {sid})")
        logger.info(f"🎵 开始合成...")
        
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
        
        logger.info(f"✅ 合成成功！大小: {len(audio_data)} 字节")
        
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=speech.wav",
                "X-Language": lang
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ TTS 失败: {e}")
        traceback.print_exc()
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("🎤 MeLo TTS API 服务器 - 中英文双语版")
    logger.info("=" * 60)
    logger.info("📡 监听: http://0.0.0.0:7860")
    logger.info("🇨🇳 支持中文（ZH）")
    logger.info("🇺🇸 支持英文（EN）")
    logger.info("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=7860, log_level="info")

