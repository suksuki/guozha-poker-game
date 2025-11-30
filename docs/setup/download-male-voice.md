# 下载 Piper TTS 男声模型

报牌功能需要使用男声，需要下载男声模型。

## 快速下载

在项目根目录执行：

```bash
cd tts-services/models

# 下载男声模型（xiaoyi 是男声）
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyi/medium/xiaoyi-medium.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyi/medium/xiaoyi-medium.onnx.json
```

或者使用 curl：

```bash
cd tts-services/models

curl -L -o xiaoyi-medium.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyi/medium/xiaoyi-medium.onnx
curl -L -o xiaoyi-medium.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyi/medium/xiaoyi-medium.onnx.json
```

## 验证下载

下载完成后，检查文件：

```bash
ls -lh tts-services/models/xiaoyi-medium.onnx*
```

应该看到两个文件：
- `xiaoyi-medium.onnx` (模型文件，约几MB)
- `xiaoyi-medium.onnx.json` (配置文件)

## 重启 Piper TTS 服务

下载完成后，需要重启 Piper TTS 服务：

```bash
# 如果使用 Python 服务
python scripts/piper-tts-server.py

# 或者如果使用其他方式启动的服务，重启它
```

## 测试

重启服务后，报牌应该会使用男声。可以通过游戏中的报牌功能测试。

