# MeLo TTS 完整配置指南

本文档记录了在 192.168.0.13 服务器上部署 MeLo TTS 服务，并配置游戏 APP 连接的完整过程。

## 📋 环境说明

- **TTS 服务器**: 192.168.0.13 (Ubuntu)
- **APP 客户端**: Windows 机器
- **MeLo TTS 端口**: 7860
- **虚拟环境**: ~/melotts/.venv

## 第一部分：在 192.168.0.13 服务器上部署 MeLo TTS

### 1. 安装基础依赖

```bash
# 进入 MeLo TTS 目录
cd ~/melotts/MeloTTS

# 激活虚拟环境
source ../venv/bin/activate
# 或
source .venv/bin/activate
```

### 2. 安装 Python 包

#### 2.1 安装 FastAPI 和相关依赖

```bash
pip install fastapi uvicorn pydantic
```

#### 2.2 安装 PyTorch

```bash
# CPU 版本（推荐，更快）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 或使用清华镜像（如果上面的慢）
pip install torch torchvision torchaudio -i https://pypi.tuna.tsinghua.edu.cn/simple
```

#### 2.3 安装 MeLo TTS

```bash
pip install git+https://github.com/myshell-ai/MeloTTS.git
```

#### 2.4 下载 unidic 字典

```bash
python3 -m unidic download
```

### 3. 验证安装

```bash
# 测试 PyTorch
python3 -c "import torch; print('✅ PyTorch 版本:', torch.__version__)"

# 测试 MeLo TTS（首次运行会下载模型，约 208MB）
python3 << 'EOF'
from melo.api import TTS
print("✅ MeLo TTS 导入成功")
model = TTS(language='ZH', device='auto')
print("✅ 模型加载成功")
EOF
```

**预期输出**：
- 会下载各种模型和字典文件
- 最后显示 `✅ 模型加载成功`

### 4. 创建 TTS API 服务器脚本

```bash
cd ~/melotts/MeloTTS
nano tts-server.py
```

粘贴以下内容：

```python
#!/usr/bin/env python3
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn, logging, io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_tts_model = None
def get_tts_model():
    global _tts_model
    if not _tts_model:
        from melo.api import TTS
        logger.info("加载 MeLo TTS 模型...")
        _tts_model = TTS(language='ZH', device='auto')
        logger.info("✅ 模型加载完成")
    return _tts_model

class TTSRequest(BaseModel):
    text: str
    lang: str = "ZH"

@app.get("/health")
def health():
    get_tts_model()
    return {"status": "ok", "service": "Melo TTS"}

@app.post("/tts")
def tts(req: TTSRequest):
    if not req.text:
        raise HTTPException(400, "文本不能为空")
    model = get_tts_model()
    sid = model.hps.data.spk2id.get(req.lang, list(model.hps.data.spk2id.values())[0])
    logger.info(f"合成: {req.text[:30]}...")
    out = io.BytesIO()
    model.tts_to_file(req.text, sid, out, format='wav', speed=1.0)
    logger.info("✅ 成功")
    return Response(content=out.getvalue(), media_type="audio/wav")

if __name__ == "__main__":
    print("启动 MeLo TTS 服务器: http://0.0.0.0:7860")
    uvicorn.run(app, host="0.0.0.0", port=7860)
```

**保存**: Ctrl+X, Y, Enter

### 5. 启动服务器

#### 5.1 前台运行（用于测试）

```bash
python3 tts-server.py
```

**预期输出**：
```
启动 MeLo TTS 服务器: http://0.0.0.0:7860
INFO:     Started server process [xxxxx]
INFO:     Uvicorn running on http://0.0.0.0:7860
```

#### 5.2 后台运行（推荐生产环境）

```bash
# 使用 nohup 后台运行
nohup python3 tts-server.py > tts.log 2>&1 &

# 查看日志
tail -f tts.log

# 查看进程
ps aux | grep tts-server

# 停止服务
pkill -f tts-server.py
```

#### 5.3 使用 screen（推荐）

```bash
# 创建 screen 会话
screen -S melotts

# 启动服务
python3 tts-server.py

# 分离会话：按 Ctrl+A, 然后按 D

# 重新连接
screen -r melotts

# 列出会话
screen -ls
```

### 6. 测试服务

#### 6.1 本地测试

打开新终端：

```bash
# 健康检查
curl http://localhost:7860/health
# 返回: {"status":"ok","service":"Melo TTS"}

# 测试 TTS
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好世界", "lang": "ZH"}' \
  --output test.wav

# 检查文件
ls -lh test.wav
```

#### 6.2 开放防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 7860/tcp
sudo ufw status

# CentOS/RHEL
sudo firewall-cmd --add-port=7860/tcp --permanent
sudo firewall-cmd --reload
```

#### 6.3 远程测试

在 **客户端机器**上：

```bash
# Windows PowerShell
Invoke-WebRequest http://192.168.0.13:7860/health

# Linux/Mac
curl http://192.168.0.13:7860/health
```

**预期返回**: `{"status":"ok","service":"Melo TTS"}`

---

## 第二部分：配置游戏 APP 连接 MeLo TTS

### 1. 修改游戏项目代码

#### 1.1 已完成的代码更新

项目中已经添加了 MeLo TTS 支持：

- ✅ `src/tts/meloTTSClient.ts` - MeLo TTS 客户端
- ✅ `src/tts/ttsServiceManager.ts` - 添加了 'melo' 提供者
- ✅ `src/tts/initTTS.ts` - 添加了 MeLo 初始化配置
- ✅ `src/App.tsx` - 配置了远程 MeLo TTS 连接

#### 1.2 App.tsx 配置说明

在 `src/App.tsx` 中已添加：

```typescript
// 配置 MeLo TTS（远程服务器）
config.enableMelo = true;
config.meloConfig = {
  baseUrl: 'http://192.168.0.13:7860',  // MeLo TTS 服务器地址
  timeout: 30000,
  retryCount: 2,
  defaultSpeaker: 'ZH',  // 默认中文说话人
};
```

### 2. 启动游戏 APP

```bash
# 在游戏项目目录
cd /Ubuntu/home/jin/guozha_poker_game

# 启动开发服务器
npm run dev
```

### 3. 验证连接

#### 3.1 查看浏览器控制台

打开浏览器开发者工具（F12），查看控制台输出：

**成功标志**：
```
✅ TTS 系统初始化完成
[TTS] ✅ MeLo TTS 服务可用: http://192.168.0.13:7860
```

#### 3.2 手动验证（浏览器控制台）

```javascript
// 查看 TTS 状态
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const ttsManager = getTTSServiceManager();
const status = ttsManager.getProviderStatus();
console.table(status);

// 预期输出：
// melo: { enabled: true, healthy: true }  ✅
```

#### 3.3 测试语音合成

```javascript
// 测试 MeLo TTS
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const ttsManager = getTTSServiceManager();

try {
  const result = await ttsManager.synthesizeWithProvider('melo', '你好，这是测试语音');
  console.log('✅ MeLo TTS 测试成功:', result);
} catch (error) {
  console.error('❌ MeLo TTS 测试失败:', error);
}
```

---

## 常见问题排查

### Q1: 首次测试非常慢或看起来卡住

**现象**：
- 第一次调用 `/tts` 接口时等待很久（1-2分钟）
- curl 请求显示 0% 进度，看起来卡住了

**原因**：
- MeLo TTS 首次运行时需要加载模型（约 10-15 秒）
- 需要下载和初始化 jieba 分词器（首次）
- 模型加载到内存需要时间（约 4GB）

**解决**：
- **耐心等待**，第一次加载后会快很多
- 查看服务器日志确认正在处理：
  ```bash
  tail -f ~/melotts/MeloTTS/server.log
  ```
- 应该看到：
  ```
  🔄 开始加载 MeLo TTS 模型...
  ✅ 模型加载完成
  📋 可用的说话人: ['ZH']
  🎵 开始合成语音...
  Building prefix dict from the default dictionary ...
  ✅ 合成成功！音频大小: 69990 字节
  ```

**验证成功**：
- 生成的 `.wav` 文件应该 > 50KB
- 使用 `file` 命令确认：
  ```bash
  file test.wav
  # 应该显示: RIFF WAVE audio, Microsoft PCM, 16 bit, mono 44100 Hz
  ```

### Q2: 返回 "Internal Server Error" (21 字节)

**现象**：
```bash
curl http://192.168.0.13:7860/tts ...
# 生成的文件只有 21 字节，内容是 "Internal Server Error"
```

**原因**：
- 服务器端处理请求时出错
- 可能是模型加载失败或 API 调用问题

**解决**：
1. **查看服务器日志**（最重要）：
   ```bash
   tail -50 ~/melotts/MeloTTS/server.log
   ```

2. **使用调试版本重启服务器**：
   ```bash
   pkill -f tts-server
   cd ~/melotts/MeloTTS
   source ../.venv/bin/activate
   python3 tts-server-debug.py 2>&1 | tee server.log &
   ```

3. **重新测试并观察日志**：
   ```bash
   curl -X POST http://localhost:7860/tts \
     -H "Content-Type: application/json" \
     -d '{"text":"你好", "lang":"ZH"}' \
     --output test.wav
   
   # 立即查看日志
   tail -20 server.log
   ```

### Q3: NNPACK 警告

**现象**：
```
[W] Could not initialize NNPACK! Reason: Unsupported hardware.
```

**解决**：
- **可以忽略**！这只是 PyTorch 的 CPU 优化警告
- 不影响功能，只是某些 CPU 优化不可用
- 语音合成仍然正常工作

### Q4: ModuleNotFoundError: No module named 'torch'

**解决**：
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Q5: MeCab 初始化失败

**解决**：
```bash
python3 -m unidic download
```

### Q6: 端口 7860 已被占用

**解决**：
```bash
# 查找占用端口的进程
lsof -i :7860

# 停止该进程
kill <PID>
```

### Q7: 客户端无法连接

**检查清单**：
1. ✅ 服务器是否运行：`curl http://localhost:7860/health`
2. ✅ 防火墙是否开放：`sudo ufw status`
3. ✅ 网络是否连通：`ping 192.168.0.13`
4. ✅ 服务器日志是否有错误：`tail -f server.log`

### Q8: 如何判断服务器正常工作

**标准**：
- 健康检查返回：`{"status":"ok","service":"Melo TTS"}`
- 生成的音频文件大小：**50KB - 200KB**（取决于文本长度）
- 文件类型：`RIFF WAVE audio, Microsoft PCM, 16 bit, mono 44100 Hz`
- 不是：`ASCII text` (21 字节的错误消息)

---

## TTS 优先级说明

当前 TTS 服务优先级：

| TTS 服务 | 优先级 | 说明 |
|---------|-------|------|
| **MeLo TTS** | 0（最高） | 高质量多语言 TTS，本地/远程 192.168.0.13:7860 |
| Azure Speech | 1 | 云端高质量 TTS，需要 API Key（未配置则跳过）|
| Piper TTS | 2 | 轻量级本地 TTS（未启动则跳过）|
| Browser TTS | 3（最低） | 浏览器内置，总是可用作为后备 |

**工作原理**：
1. APP 首先尝试使用 MeLo TTS (192.168.0.13:7860)
2. 如果 MeLo TTS 不可用，自动降级到下一个 TTS 服务
3. 最终会使用浏览器 TTS 作为后备

---

## 快速命令参考

### 服务器端操作

```bash
# 启动服务（前台）
cd ~/melotts/MeloTTS
python3 tts-server.py

# 启动服务（后台 screen）
screen -S melotts
python3 tts-server.py
# Ctrl+A, D 分离

# 重新连接
screen -r melotts

# 查看日志（如果用 nohup）
tail -f tts.log

# 停止服务
pkill -f tts-server.py

# 测试服务
curl http://localhost:7860/health
```

### 客户端操作

```bash
# 测试连接
curl http://192.168.0.13:7860/health

# 启动游戏 APP
cd /Ubuntu/home/jin/guozha_poker_game
npm run dev
```

### 浏览器控制台

```javascript
// 查看 TTS 状态
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const status = getTTSServiceManager().getProviderStatus();
console.table(status);

// 测试 MeLo TTS
await getTTSServiceManager().synthesizeWithProvider('melo', '测试语音');
```

---

## 文件清单

### 服务器端（192.168.0.13）

- `~/melotts/MeloTTS/tts-server.py` - API 服务器脚本
- `~/melotts/.venv/` - Python 虚拟环境

### 客户端（游戏项目）

- `src/tts/meloTTSClient.ts` - MeLo TTS 客户端
- `src/tts/ttsServiceManager.ts` - TTS 服务管理器
- `src/tts/initTTS.ts` - TTS 初始化配置
- `src/App.tsx` - 应用主文件（包含 MeLo 配置）
- `docs/setup/melo-tts-remote-connection.md` - 远程连接详细文档
- `MeLo-TTS完整配置指南.md` - 本文档

---

## ✅ 验证清单

### 服务器端
- [x] PyTorch 已安装
- [x] MeLo TTS 已安装
- [x] unidic 字典已下载
- [x] tts-server.py 已创建
- [x] 服务器已启动（端口 7860）
- [x] 本地健康检查通过
- [x] 本地 TTS 测试成功
- [x] 防火墙已开放 7860 端口
- [x] 远程连接测试通过

### 客户端
- [x] 代码已更新（MeLo TTS 客户端）
- [x] App.tsx 已配置（指向 192.168.0.13:7860）
- [ ] 开发服务器已启动
- [ ] 浏览器控制台显示 "✅ MeLo TTS 服务可用"
- [ ] TTS 状态显示 melo: healthy
- [ ] 游戏中语音功能正常

---

## 成功标志

### 服务器端
```
启动 MeLo TTS 服务器: http://0.0.0.0:7860
INFO:     Uvicorn running on http://0.0.0.0:7860
加载 MeLo TTS 模型...
✅ 模型加载完成
```

### 客户端（浏览器控制台）
```
✅ TTS 系统初始化完成
[TTS] ✅ MeLo TTS 服务可用: http://192.168.0.13:7860
```

### TTS 状态（浏览器控制台）
```javascript
{
  melo: { enabled: true, healthy: true },    // ✅ MeLo TTS 可用
  azure: { enabled: false, healthy: false },
  piper: { enabled: true, healthy: false },
  browser: { enabled: true, healthy: true }
}
```

---

## 🎉 完成！

现在你的游戏 APP 已经成功连接到远程 MeLo TTS 服务器！

**享受高质量的中文语音合成吧！** 🎤✨

