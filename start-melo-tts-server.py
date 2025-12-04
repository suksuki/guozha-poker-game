#!/usr/bin/env python3
"""
MeLo TTS API 服务器
在 192.168.0.13 服务器上运行，为游戏 APP 提供 TTS 服务

使用方法：
    python3 start-melo-tts-server.py
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging
import io

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Melo TTS API Server", version="1.0.0")

# 配置 CORS - 允许所有来源访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局 TTS 模型
_tts_model = None

def get_tts_model():
    """加载 MeLo TTS 模型"""
    global _tts_model
    if _tts_model is None:
        try:
            from melo.api import TTS
            logger.info("🔄 正在加载 MeLo TTS 模型...")
            _tts_model = TTS(language='ZH', device='auto')
            logger.info("✅ MeLo TTS 模型加载成功！")
        except ImportError as e:
            logger.error(f"❌ 导入失败: {e}")
            logger.error("请安装: pip install git+https://github.com/myshell-ai/MeloTTS.git")
            raise
        except Exception as e:
            logger.error(f"❌ 加载模型失败: {e}")
            raise
    return _tts_model

class TTSRequest(BaseModel):
    """TTS 请求参数"""
    text: str
    lang: str = "ZH"
    speaker: Optional[str] = None

class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    service: str
    version: str

@app.get("/")
async def root():
    """API 信息"""
    return {
        "service": "Melo TTS API Server",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "GET /health",
            "tts": "POST /tts",
            "docs": "GET /docs"
        }
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    try:
        model = get_tts_model()
        return HealthResponse(
            status="ok",
            service="Melo TTS",
            version="1.0.0"
        )
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"服务不可用: {str(e)}"
        )

@app.post("/tts")
async def synthesize_speech(request: TTSRequest):
    """
    文本转语音
    
    参数:
        text: 要合成的文本
        lang: 语言代码 (ZH/EN/JP/ES/FR/KR)
        speaker: 说话人 (可选)
    """
    try:
        # 验证输入
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="文本不能为空")
        
        if len(request.text) > 500:
            raise HTTPException(status_code=400, detail="文本长度不能超过 500 字符")
        
        # 获取模型
        model = get_tts_model()
        
        # 获取说话人 ID
        speaker_id = model.hps.data.spk2id.get(
            request.lang,
            list(model.hps.data.spk2id.values())[0]
        )
        
        # 记录日志
        text_preview = request.text[:50] + "..." if len(request.text) > 50 else request.text
        logger.info(f"📝 合成请求: '{text_preview}' (语言={request.lang}, 说话人={speaker_id})")
        
        # 生成语音
        output = io.BytesIO()
        model.tts_to_file(
            request.text,
            speaker_id,
            output,
            format='wav',
            speed=1.0
        )
        audio_data = output.getvalue()
        
        logger.info(f"✅ 合成成功！音频大小: {len(audio_data)} 字节")
        
        # 返回音频
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=speech.wav",
                "X-Text-Length": str(len(request.text)),
                "X-Audio-Size": str(len(audio_data))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 语音合成失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"语音合成失败: {str(e)}"
        )

if __name__ == "__main__":
    print("=" * 60)
    print("🎤 MeLo TTS API 服务器")
    print("=" * 60)
    print()
    print("📡 监听地址: http://0.0.0.0:7860")
    print("🏠 本地访问: http://localhost:7860")
    print("🌐 网络访问: http://192.168.0.13:7860")
    print()
    print("📚 API 文档: http://localhost:7860/docs")
    print("❤️  健康检查: http://localhost:7860/health")
    print()
    print("=" * 60)
    print("按 Ctrl+C 停止服务器")
    print("=" * 60)
    print()
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=7860,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n👋 服务器已停止")

