# Google TTS 快速开始指南

> ⚠️ **注意**：Coqui TTS 已从项目中移除（不支持 Python 3.12）。推荐使用 Piper TTS 作为替代。

## 快速对比

| 特性 | Piper TTS（推荐替代） | Google TTS |
|------|---------------------|------------|
| **类型** | 本地开源 | 云端服务 |
| **费用** | 免费 | 付费（有免费额度） |
| **音质** | 良好 | 优秀 |
| **中文支持** | 好 | 优秀 |
| **离线使用** | ✅ | ❌ |
| **API Key** | ❌ 不需要 | ✅ 需要 |
| **Python 3.12** | ✅ 支持 | ✅ 支持 |

## Piper TTS 快速开始（推荐替代）

### 1. 安装

```bash
# 使用项目提供的脚本（推荐）
./scripts/setup-piper-tts.sh
```

### 2. 启动服务

```bash
# 使用启动脚本
# 使用整理后的脚本路径
./docs/root-docs/scripts/start/start-piper-tts.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./start-piper-tts.sh

# 或手动启动
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

### 3. 在项目中使用

项目已自动集成 Piper TTS，只需启动服务即可。

### 4. 验证

```bash
# 测试 API
curl -X POST http://localhost:5000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，世界"}'
```

详细文档：`docs/setup/piper-tts-quick-start.md`

## Google TTS 快速开始

### 1. 获取 API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目或选择现有项目
3. 启用 "Cloud Text-to-Speech API"
4. 创建 API Key（"APIs & Services" > "Credentials" > "Create Credentials" > "API Key"）

### 2. 配置环境变量

```bash
# 设置 API Key
export GOOGLE_TTS_API_KEY="your-api-key-here"
```

或在项目配置中：

```typescript
// 在项目初始化时配置
import { initTTS } from './tts/initTTS';

await initTTS({
  enableGoogle: true,
  googleConfig: {
    apiKey: 'your-api-key-here',
    voiceName: 'zh-CN-Wavenet-A',  // 女声
    // 或 'zh-CN-Wavenet-B'  // 男声
  },
});
```

### 3. 在项目中使用

项目已自动集成 Google TTS，配置 API Key 后即可使用。

### 4. 验证

```bash
# 测试 API（需要 API Key）
curl -X POST "https://texttospeech.googleapis.com/v1/text:synthesize?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"text": "你好，世界"},
    "voice": {"languageCode": "zh-CN", "name": "zh-CN-Wavenet-A"},
    "audioConfig": {"audioEncoding": "MP3"}
  }'
```

## 推荐配置

### 方案 1：仅使用 Coqui TTS（免费，离线）

```typescript
await initTTS({
  enableCoqui: true,
  coquiConfig: {
    baseUrl: 'http://localhost:5002',
  },
});
```

**优点**：
- 完全免费
- 可离线使用
- 支持声音克隆

**缺点**：
- 需要本地资源
- 中文音质一般

### 方案 2：仅使用 Google TTS（高质量，云端）

```typescript
await initTTS({
  enableGoogle: true,
  googleConfig: {
    apiKey: process.env.GOOGLE_TTS_API_KEY,
    voiceName: 'zh-CN-Wavenet-A',
  },
});
```

**优点**：
- 音质优秀
- 稳定可靠
- 中文支持好

**缺点**：
- 需要付费
- 需要网络连接

### 方案 3：混合使用（推荐）

```typescript
await initTTS({
  enableCoqui: true,  // 主要使用（免费）
  coquiConfig: {
    baseUrl: 'http://localhost:5002',
  },
  enableGoogle: true,  // 备用（高质量）
  googleConfig: {
    apiKey: process.env.GOOGLE_TTS_API_KEY,
    voiceName: 'zh-CN-Wavenet-A',
  },
});
```

**优点**：
- 兼顾成本和音质
- 自动降级机制
- 提高可用性

## 常见问题

### Q: Coqui TTS 启动失败？

**A:** 检查：
1. 端口 5002 是否被占用
2. 依赖是否安装完整
3. 模型是否下载（首次使用会自动下载）

### Q: Google TTS API Key 无效？

**A:** 检查：
1. API Key 是否正确
2. Text-to-Speech API 是否已启用
3. 是否有使用配额
4. 网络连接是否正常

### Q: 如何选择语音？

**Coqui TTS**：
- 通过 `modelName` 参数选择模型
- 通过 `speakerId` 参数选择说话人（如果模型支持）

**Google TTS**：
- 通过 `voiceName` 参数选择语音
- 中文语音：`zh-CN-Wavenet-A`（女声）、`zh-CN-Wavenet-B`（男声）

### Q: 如何调整语速、音调？

两种 TTS 都支持通过 `VoiceConfig` 调整：

```typescript
await synthesizeSpeech('你好，世界', {
  voiceConfig: {
    rate: 1.2,    // 语速（0.5-2.0）
    pitch: 1.1,   // 音调（0.5-2.0）
    volume: 1.0,  // 音量（0.0-2.0）
  },
});
```

## 更多信息

详细文档请参考：
- [Coqui TTS 和 Google TTS 详细指南](./coqui-google-tts-guide.md)
- [TTS 服务配置指南](./tts-services.md)

