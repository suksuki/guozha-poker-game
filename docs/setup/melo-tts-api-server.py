#!/usr/bin/env python3
"""
Melo TTS API 服务器
提供 HTTP API 接口供前端应用调用

使用方法:
    python melo-tts-api-server.py

或者使用 uvicorn:
    uvicorn melo-tts-api-server:app --host 0.0.0.0 --port 7860

环境要求:
    - Python 3.10+
    - 已安装 Melo TTS: pip install git+https://github.com/myshell-ai/MeloTTS.git
    - 已下载语言资源: python -m unidic download
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Melo TTS API Server")

# 配置 CORS（允许前端跨域请求）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局变量存储 TTS 模型（延迟加载）
_tts_model = None
_model_lock = None


def get_tts_model():
    """获取 TTS 模型（延迟加载）"""
    global _tts_model
    if _tts_model is None:
        try:
            from melotts import MeloTTS
            logger.info("正在加载 Melo TTS 模型...")
            _tts_model = MeloTTS(language='ZH', device='auto')
            logger.info("✅ Melo TTS 模型加载完成")
        except ImportError:
            logger.error("❌ 未安装 Melo TTS，请运行: pip install git+https://github.com/myshell-ai/MeloTTS.git")
            raise
        except Exception as e:
            logger.error(f"❌ 加载 Melo TTS 模型失败: {e}")
            raise
    return _tts_model


class TTSRequest(BaseModel):
    """TTS 请求模型"""
    text: str
    lang: str = "ZH"  # 语言代码: ZH, EN, JP 等
    speaker: Optional[str] = None  # 说话人ID（可选）


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    service: str
    version: str = "1.0.0"


@app.get("/health")
async def health_check():
    """健康检查端点"""
    try:
        # 尝试加载模型以检查服务是否正常
        model = get_tts_model()
        return HealthResponse(status="ok", service="Melo TTS")
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")


@app.post("/tts")
async def synthesize_speech(request: TTSRequest):
    """
    文本转语音
    
    Args:
        request: TTS 请求，包含文本和语言代码
        
    Returns:
        音频文件（WAV 格式）
    """
    try:
        # 验证输入
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="文本不能为空")
        
        if len(request.text) > 500:  # 限制文本长度
            raise HTTPException(status_code=400, detail="文本长度不能超过 500 字符")
        
        # 获取 TTS 模型
        model = get_tts_model()
        
        # 确定说话人
        speaker = request.speaker or request.lang  # 默认使用语言代码作为说话人
        
        logger.info(f"正在合成语音: 文本长度={len(request.text)}, 语言={request.lang}, 说话人={speaker}")
        
        # 生成语音
        audio_data = model.synthesize(
            text=request.text,
            language=request.lang,
            speaker=speaker
        )
        
        logger.info(f"✅ 语音合成成功，音频长度={len(audio_data)} 字节")
        
        # 返回音频文件
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=speech.wav",
                "X-Audio-Duration": str(estimate_duration(request.text))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"语音合成失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"语音合成失败: {str(e)}")


def estimate_duration(text: str) -> float:
    """估算音频时长（秒）"""
    # 假设语速 150 字/分钟
    return (len(text) / 150) * 60


@app.get("/")
async def root():
    """根路径，返回 API 信息"""
    return {
        "service": "Melo TTS API Server",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "tts": "/tts (POST)"
        },
        "usage": {
            "health": "GET /health",
            "tts": "POST /tts with JSON body: {text: '你好', lang: 'ZH', speaker: 'ZH'}"
        }
    }


if __name__ == "__main__":
    logger.info("启动 Melo TTS API 服务器...")
    logger.info("服务地址: http://0.0.0.0:7860")
    logger.info("API 文档: http://localhost:7860/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=7860,
        log_level="info"
    )

