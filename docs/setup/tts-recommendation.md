# TTS 服务推荐方案

## 🎯 根据你的系统选择

### 如果你的系统是 Python 3.12（推荐）

**✅ 使用 Piper TTS**（项目已集成）

**优点**：
- ✅ 支持 Python 3.12
- ✅ 极轻量（模型只有几MB）
- ✅ 速度快，延迟低
- ✅ 音质好（基于 VITS）
- ✅ 完全免费
- ✅ 已完全集成到项目中

**快速开始**：
```bash
# 安装和启动
./scripts/setup-piper-tts.sh
./start-piper-tts.sh
```

详细文档：`docs/setup/piper-tts-quick-start.md`

---

### 如果你的系统是 Python 3.9-3.11

可以选择以下方案：

#### 方案 1：Piper TTS（轻量级本地，推荐）

**优点**：
- ✅ 支持 Python 3.12
- ✅ 极轻量（模型只有几MB）
- ✅ 速度快
- ✅ 完全免费

**缺点**：
- ⚠️ 多语言支持有限

**安装**：
```bash
# 使用项目提供的脚本
./scripts/setup-piper-tts.sh
./start-piper-tts.sh
```

详细文档：`docs/setup/piper-tts-quick-start.md`

#### 方案 2：Google TTS（高质量云端）

**优点**：
- ✅ 音质优秀（基于 WaveNet）
- ✅ 中文支持好
- ✅ 稳定可靠

**缺点**：
- ⚠️ 需要 API Key
- ⚠️ 需要付费（有免费额度）
- ⚠️ 需要网络连接

**配置**：
```typescript
await initTTS({
  enableGoogle: true,
  googleConfig: {
    apiKey: 'your-api-key-here',
    voiceName: 'zh-CN-Wavenet-A',
  },
});
```

详细文档：`docs/setup/coqui-google-tts-guide.md`

---

## 📊 对比表

| 特性 | Piper TTS | Google TTS |
|------|----------|------------|
| **Python 3.12 支持** | ✅ | ✅ |
| **音质** | 良好 | 优秀 |
| **中文支持** | 好 | 优秀 |
| **费用** | 免费 | 付费 |
| **离线使用** | ✅ | ❌ |
| **资源消耗** | 低 | 低（云端） |
| **速度** | 快 | 快 |
| **多语言** | 有限 | 50+ |

---

## 🎯 推荐方案

### 对于 Python 3.12 用户（大多数情况）

**首选：Piper TTS**
- 开箱即用
- 性能优秀
- 完全免费

### 对于需要高质量音质的用户

**首选：Google TTS**
- 音质最佳
- 稳定可靠
- 需要 API Key

### 对于需要多语言支持的用户

**首选：Google TTS**
- 支持 50+ 种语言
- 高质量音质

---

## 🚀 快速开始

### 使用 Piper TTS（推荐）

```bash
# 1. 安装
./scripts/setup-piper-tts.sh

# 2. 启动
./start-piper-tts.sh

# 3. 在项目中使用（自动检测）
# 项目会自动使用可用的 TTS 服务
```

### 使用 Google TTS

```bash
# 1. 获取 API Key
# 访问 https://console.cloud.google.com/

# 2. 配置环境变量
export GOOGLE_TTS_API_KEY="your-api-key"

# 3. 在项目中启用
# 项目会自动检测并启用
```

---

## 💡 提示

1. **项目支持自动降级**：如果首选 TTS 不可用，会自动使用其他可用的 TTS
2. **可以同时启用多个 TTS**：系统会按优先级自动选择
3. **所有 TTS 都支持缓存**：提高响应速度

---

## 📚 更多文档

- Piper TTS: `docs/setup/piper-tts-quick-start.md`
- Google TTS: `docs/setup/coqui-google-tts-guide.md`
- 所有 TTS 服务: `docs/setup/tts-services.md`

