# 快速启动 MeLo TTS 服务器

## 当前情况

你在 MeLo TTS 目录：`~/melotts/MeloTTS`（在 192.168.0.13 服务器上）

## 🚀 快速启动步骤

### 步骤 1：确认 MeLo TTS 已安装

```bash
# 检查是否已安装 MeLo TTS
python3 -c "from melo.api import TTS; print('✅ MeLo TTS 已安装')"
```

如果报错，先安装：

```bash
# 激活你的虚拟环境（如果有）
source .venv/bin/activate

# 或者使用系统 Python
pip install git+https://github.com/myshell-ai/MeloTTS.git
pip install fastapi uvicorn pydantic
```

### 步骤 2：复制 API 服务器脚本

有两种方式：

#### 方式 A：从游戏项目复制（推荐）

```bash
# 假设游戏项目在 /Ubuntu/home/jin/guozha_poker_game
cp /Ubuntu/home/jin/guozha_poker_game/docs/setup/melo-tts-server-standalone.py ~/melotts/MeloTTS/

# 或者使用相对路径（根据实际情况调整）
# cp /path/to/guozha_poker_game/docs/setup/melo-tts-server-standalone.py .
```

#### 方式 B：手动创建文件

在当前目录创建文件 `melo-server.py`：

```bash
nano melo-server.py
# 或
vi melo-server.py
```

然后粘贴以下内容：

```python
#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import logging
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Melo TTS API Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_tts_model = None

def get_tts_model():
    global _tts_model
    if _tts_model is None:
        from melo.api import TTS
        logger.info("正在加载 MeLo TTS 模型...")
        _tts_model = TTS(language='ZH', device='auto')
        logger.info("✅ MeLo TTS 模型加载完成")
    return _tts_model

class TTSRequest(BaseModel):
    text: str
    lang: str = "ZH"
    speaker: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str = "1.0.0"

@app.get("/health")
async def health_check():
    try:
        model = get_tts_model()
        return HealthResponse(status="ok", service="Melo TTS")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")

@app.post("/tts")
async def synthesize_speech(request: TTSRequest):
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="文本不能为空")
        
        model = get_tts_model()
        speaker_id = model.hps.data.spk2id.get(request.lang, list(model.hps.data.spk2id.values())[0])
        
        logger.info(f"合成语音: {request.text[:50]}...")
        
        output = io.BytesIO()
        model.tts_to_file(request.text, speaker_id, output, format='wav', speed=1.0)
        audio_data = output.getvalue()
        
        logger.info(f"✅ 成功，大小={len(audio_data)} 字节")
        
        return Response(
            content=audio_data,
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=speech.wav"}
        )
    except Exception as e:
        logger.error(f"失败: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {
        "service": "Melo TTS API Server",
        "version": "1.0.0",
        "endpoints": {"health": "/health", "tts": "/tts (POST)"}
    }

if __name__ == "__main__":
    logger.info("启动 Melo TTS API 服务器: http://0.0.0.0:7860")
    uvicorn.run(app, host="0.0.0.0", port=7860, log_level="info")
```

保存文件（nano: Ctrl+X, Y, Enter；vi: ESC, :wq）

### 步骤 3：启动服务器

```bash
# 如果使用虚拟环境，先激活
source .venv/bin/activate

# 启动服务器
python3 melo-server.py

# 或者（如果复制了完整脚本）
python3 melo-tts-server-standalone.py
```

你应该看到：

```
==================================================
启动 Melo TTS API 服务器
==================================================
监听地址: http://0.0.0.0:7860
本地访问: http://localhost:7860
网络访问: http://192.168.0.13:7860
==================================================
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:7860
```

### 步骤 4：测试服务

**在 192.168.0.13 服务器上测试：**

```bash
# 打开新的终端窗口
# 健康检查
curl http://localhost:7860/health

# 测试 TTS
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，世界", "lang": "ZH"}' \
  --output test.wav

# 检查文件
ls -lh test.wav
```

**从 APP 客户端机器测试：**

```bash
curl http://192.168.0.13:7860/health
```

## 🔧 常见问题

### Q: ImportError: No module named 'melo'

**解决**：

```bash
# 安装 MeLo TTS
pip install git+https://github.com/myshell-ai/MeloTTS.git

# 或在虚拟环境中
source .venv/bin/activate
pip install git+https://github.com/myshell-ai/MeloTTS.git
```

### Q: ModuleNotFoundError: No module named 'fastapi'

**解决**：

```bash
pip install fastapi uvicorn pydantic
```

### Q: 如何开放防火墙端口？

**Ubuntu/Debian**：

```bash
sudo ufw allow 7860/tcp
sudo ufw status
```

**CentOS/RHEL**：

```bash
sudo firewall-cmd --add-port=7860/tcp --permanent
sudo firewall-cmd --reload
```

### Q: 如何后台运行？

**使用 nohup**：

```bash
nohup python3 melo-server.py > melo-tts.log 2>&1 &

# 查看日志
tail -f melo-tts.log

# 查看进程
ps aux | grep melo-server

# 停止服务
pkill -f melo-server.py
```

**使用 screen**：

```bash
# 创建新的 screen 会话
screen -S melotts

# 启动服务
python3 melo-server.py

# 按 Ctrl+A, 然后按 D 分离会话

# 重新连接
screen -r melotts

# 列出所有会话
screen -ls
```

**使用 systemd**（推荐生产环境）：

创建服务文件 `/etc/systemd/system/melotts.service`：

```ini
[Unit]
Description=MeLo TTS API Server
After=network.target

[Service]
Type=simple
User=hlsystem
WorkingDirectory=/home/hlsystem/melotts/MeloTTS
ExecStart=/usr/bin/python3 /home/hlsystem/melotts/MeloTTS/melo-server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start melotts
sudo systemctl enable melotts
sudo systemctl status melotts
```

## ✅ 验证清单

- [ ] MeLo TTS 已安装
- [ ] FastAPI、Uvicorn 已安装
- [ ] API 服务器脚本已创建
- [ ] 服务器已启动（端口 7860）
- [ ] 本地健康检查通过：`curl http://localhost:7860/health`
- [ ] 本地 TTS 测试通过
- [ ] 防火墙已开放 7860 端口
- [ ] 远程访问测试通过：`curl http://192.168.0.13:7860/health`

完成！🎉

## 📝 下一步

服务器启动后，返回游戏项目配置 APP 连接：

参考文档：`docs/setup/melo-tts-remote-connection.md`

