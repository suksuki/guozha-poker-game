# Piper TTS 安装和使用指南

## 为什么选择 Piper TTS？

**Piper TTS** 是最适合你的需求的本地TTS解决方案：

✅ **极轻量** - 模型只有几MB，内存占用小  
✅ **速度快** - 实时合成，延迟低  
✅ **音质好** - 基于VITS架构，自然度高  
✅ **支持中文** - 有专门的中文模型  
✅ **免费开源** - 完全免费，无限制  
✅ **易于部署** - 有预编译版本和Docker镜像  

## 安装方式

### 方式1：使用预编译版本（推荐，最简单）

**Windows/WSL:**

1. **下载预编译版本：**
   ```bash
   # 在项目根目录创建 tts-services 目录
   mkdir -p tts-services
   cd tts-services
   
   # 下载 Piper TTS（选择适合你系统的版本）
   # Linux x64:
   wget https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz
   tar -xzf piper_amd64.tar.gz
   
   # 或者 Windows:
   # 下载 https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_windows_amd64.zip
   # 解压到 tts-services/piper 目录
   ```

2. **下载中文语音模型：**
   ```bash
   # 创建模型目录
   mkdir -p models
   cd models
   
   # 下载中文模型（选择你喜欢的音色）
   # 女声（推荐）:
   wget https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx
   wget https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyan/medium/xiaoyan-medium.onnx.json
   
   # 或男声:
   wget https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyi/medium/xiaoyi-medium.onnx
   wget https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/xiaoyi/medium/xiaoyi-medium.onnx.json
   ```

3. **测试运行：**
   ```bash
   # 回到 piper 目录
   cd ..
   
   # 测试合成（Linux）:
   echo "你好，这是测试" | ./piper --model models/xiaoyan-medium.onnx --output_file test.wav
   
   # 测试合成（Windows）:
   echo "你好，这是测试" | .\piper.exe --model models\xiaoyan-medium.onnx --output_file test.wav
   
   # 如果生成了 test.wav 文件，说明安装成功！
   ```

### 方式2：使用 Docker（最简单，推荐）

1. **拉取 Docker 镜像：**
   ```bash
   docker pull rhasspy/piper:latest
   ```

2. **运行 Piper TTS 服务：**
   ```bash
   docker run -d \
     --name piper-tts \
     -p 5000:5000 \
     -v $(pwd)/models:/app/models \
     rhasspy/piper:latest \
     --model /app/models/xiaoyan-medium.onnx \
     --port 5000
   ```

3. **测试服务：**
   ```bash
   curl -X POST http://localhost:5000/api/tts \
     -H "Content-Type: application/json" \
     -d '{"text":"你好，这是测试"}' \
     --output test.wav
   ```

### 方式3：使用 Python 包（适合开发）

1. **安装 piper-tts Python 包：**
   ```bash
   pip install piper-tts
   ```

2. **创建简单的 HTTP 服务：**
   ```python
   # 创建 scripts/piper-tts-server.py（见下方）
   ```

## 创建 Piper TTS HTTP 服务

为了让游戏能够调用 Piper TTS，我们需要创建一个简单的 HTTP 服务：

```python
# scripts/piper-tts-server.py
from flask import Flask, request, send_file
from piper import PiperVoice
import io
import os

app = Flask(__name__)

# 加载模型（根据你的模型路径修改）
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'tts-services', 'models', 'xiaoyan-medium.onnx')
voice = None

def load_voice():
    global voice
    if voice is None:
        voice = PiperVoice.load(MODEL_PATH)
    return voice

@app.route('/api/tts', methods=['POST'])
def synthesize():
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return {'error': '缺少 text 参数'}, 400
        
        # 加载语音模型
        voice = load_voice()
        
        # 合成语音
        audio_data = voice.synthesize(text)
        
        # 返回音频数据
        return send_file(
            io.BytesIO(audio_data),
            mimetype='audio/wav',
            as_attachment=False
        )
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'ok', 'service': 'piper-tts'}

if __name__ == '__main__':
    print(f'[Piper TTS] 启动服务: http://localhost:5000')
    print(f'[Piper TTS] 模型路径: {MODEL_PATH}')
    app.run(host='0.0.0.0', port=5000, debug=False)
```

**安装依赖：**
```bash
pip install flask piper-tts
```

**启动服务：**
```bash
python scripts/piper-tts-server.py
```

## 集成到游戏

### 1. 创建 Piper TTS 客户端

创建 `src/tts/piperTTSClient.ts`：

```typescript
import { type ITTSClient, type TTSOptions, type TTSResult, type TTSLanguage } from './ttsClient';
import { VoiceConfig } from '../types/card';

export interface PiperTTSConfig {
  baseUrl?: string;  // Piper TTS 服务地址，默认 'http://localhost:5000'
  timeout?: number;  // 请求超时时间（毫秒），默认 10000
  retryCount?: number;  // 重试次数，默认 2
}

export class PiperTTSClient implements ITTSClient {
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;

  constructor(config: PiperTTSConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:5000';
    this.timeout = config.timeout || 10000;
    this.retryCount = config.retryCount || 2;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    const { useCache = true, lang = 'zh', voiceConfig } = options;

    // 调用 Piper TTS API
    let lastError: Error | null = null;
    for (let i = 0; i <= this.retryCount; i++) {
      try {
        const result = await this.callPiperTTS(text, lang, voiceConfig);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[PiperTTSClient] 第 ${i + 1} 次尝试失败:`, lastError);
        if (i < this.retryCount) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError || new Error('Piper TTS API 调用失败');
  }

  private async callPiperTTS(
    text: string,
    lang: TTSLanguage,
    voiceConfig?: VoiceConfig
  ): Promise<TTSResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Piper TTS API 错误: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const duration = this.estimateDuration(text);

      return {
        audioBuffer: arrayBuffer,
        duration,
        format: 'audio/wav',
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Piper TTS API 请求超时 (${this.timeout}ms)`);
      }
      throw error;
    }
  }

  private estimateDuration(text: string): number {
    // 假设语速 150 字/分钟
    return (text.length / 150) * 60;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### 2. 注册到 TTS 服务管理器

在 `src/tts/ttsServiceManager.ts` 中添加：

```typescript
import { PiperTTSClient } from './piperTTSClient';

// 在 initializeProviders 中添加：
this.providers.set('piper', new PiperTTSClient());

// 在 providerConfigs 中添加（设置高优先级，因为它是轻量级本地服务）：
{ provider: 'piper', priority: 1, enabled: true },  // 最高优先级
```

## 资源消耗对比

| TTS服务 | 内存占用 | CPU占用 | 启动时间 | 合成速度 |
|---------|---------|---------|---------|---------|
| **Piper TTS** | ~50MB | 低 | <1秒 | 实时 |
| Coqui TTS | ~500MB | 中 | ~5秒 | 较快 |
| GPT-SoVITS | ~2GB | 高 | ~10秒 | 较慢 |

## 推荐配置

对于你的需求（训练吵架功能，语音消耗小），推荐：

1. **使用方式2（Docker）** - 最简单，一键启动
2. **或使用方式3（Python服务）** - 适合开发，易于调试
3. **选择中文女声模型（xiaoyan）** - 音质好，自然度高

## 快速开始

1. **选择安装方式**（推荐Docker）
2. **启动服务**
3. **在游戏控制台测试：**
   ```javascript
   await window.checkLocalTTS.printStatus();
   // 如果Piper TTS可用，切换到它：
   const { setTTSProvider } = await import('./services/multiChannelVoiceService');
   setTTSProvider('piper');
   ```

## 常见问题

### Q: Piper TTS 支持多语言吗？
A: 支持，但需要下载对应的语言模型。中文模型已经很好用了。

### Q: 可以同时使用多个音色吗？
A: 可以，启动多个服务实例，使用不同端口和模型即可。

### Q: 音质如何？
A: 对于轻量级TTS来说，音质非常好，接近商业TTS的水平。

### Q: 资源消耗真的这么小吗？
A: 是的，Piper TTS 是专门为轻量级部署设计的，模型只有几MB，内存占用很小。

## 总结

**Piper TTS 是你的最佳选择：**
- ✅ 极轻量（几MB模型）
- ✅ 速度快（实时合成）
- ✅ 音质好（VITS架构）
- ✅ 免费开源
- ✅ 易于部署

**推荐使用 Docker 方式**，一键启动，无需复杂配置！

