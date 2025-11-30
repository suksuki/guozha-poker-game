# Google TTS 详细指南

> ⚠️ **注意**：Coqui TTS 已从项目中移除（不支持 Python 3.12）。推荐使用 Piper TTS 作为替代。

## 目录
1. [Google TTS 介绍](#google-tts-介绍)
2. [安装和配置](#安装和配置)
3. [使用指南](#使用指南)
4. [推荐选择](#推荐选择)

---

## Coqui TTS（已移除）

### 概述
**Coqui TTS** 是一个开源的多语言文本转语音（TTS）系统，由 Coqui AI 开发。它是一个功能强大的本地 TTS 解决方案，支持高质量语音合成和声音克隆。

### 主要特点

#### ✅ 优点
1. **完全开源免费**
   - 无需 API Key
   - 无使用限制
   - 可完全离线运行

2. **多语言支持**
   - 支持 100+ 种语言
   - 包括中文、英语、日语、韩语等
   - 每种语言有多个模型可选

3. **高质量语音合成**
   - 基于深度学习的神经网络模型
   - 支持多种模型架构（Tacotron2, FastSpeech, VITS 等）
   - 自然流畅的语音输出

4. **声音克隆功能**
   - 支持少样本声音克隆（Few-shot Voice Cloning）
   - 可以训练自定义音色
   - 支持多说话人模型

5. **灵活的部署方式**
   - 可以本地部署
   - 支持 Docker 容器化
   - 提供 RESTful API

6. **丰富的模型库**
   - 预训练模型可直接使用
   - 支持自定义模型训练
   - 社区贡献的模型

#### ⚠️ 缺点
1. **资源消耗较大**
   - 需要 GPU 才能获得最佳性能
   - CPU 模式速度较慢
   - 内存占用较高

2. **安装配置复杂**
   - 依赖较多
   - 需要 Python 环境
   - 模型下载可能较大

3. **中文支持有限**
   - 中文模型相对较少
   - 音质可能不如专门的中文 TTS

4. **实时性一般**
   - 首次推理需要加载模型
   - 批量处理更高效

### 技术架构

```
Coqui TTS 架构：
┌─────────────┐
│  文本输入    │
└──────┬──────┘
       │
┌──────▼──────────┐
│  文本预处理      │
│  (文本规范化)    │
└──────┬──────────┘
       │
┌──────▼──────────┐
│  声学模型        │
│  (Tacotron2/    │
│   FastSpeech)   │
└──────┬──────────┘
       │
┌──────▼──────────┐
│  声码器          │
│  (WaveNet/      │
│   MelGAN)       │
└──────┬──────────┘
       │
┌──────▼──────────┐
│  音频输出        │
└─────────────────┘
```

### 支持的模型类型

1. **Tacotron2-DDC-GST**
   - 适合中文
   - 支持情感控制
   - 音质较好

2. **FastSpeech2**
   - 速度快
   - 适合实时应用
   - 音质良好

3. **VITS**
   - 端到端模型
   - 音质优秀
   - 支持多说话人

4. **YourTTS**
   - 零样本声音克隆
   - 多语言支持
   - 无需训练

### 项目中的实现

在项目中，Coqui TTS 客户端位于 `src/tts/coquiTTSClient.ts`，主要特性：

- **默认配置**：
  - 服务地址：`http://localhost:5002`
  - 默认模型：`tts_models/zh-CN/baker/tacotron2-DDC-GST`
  - 超时时间：30 秒
  - 重试次数：2 次

- **支持的功能**：
  - 音频缓存
  - 健康检查
  - 模型列表查询
  - 多语言支持
  - 说话人选择

---

## Google TTS 介绍

### 概述
**Google Cloud Text-to-Speech** 是 Google 提供的云端 TTS 服务，基于 Google 的 WaveNet 技术，提供高质量的语音合成服务。

### 主要特点

#### ✅ 优点
1. **极高的音质**
   - 基于 WaveNet 神经网络
   - 接近真人语音
   - 自然流畅的语调

2. **丰富的音色选择**
   - 100+ 种语音
   - 支持多种语言和方言
   - 包括男声、女声、中性声音

3. **强大的多语言支持**
   - 支持 50+ 种语言
   - 包括中文（普通话、粤语、台湾国语）
   - 支持 SSML 标记语言

4. **稳定可靠**
   - Google 云服务基础设施
   - 高可用性
   - 全球 CDN 加速

5. **灵活的配置**
   - 可调节语速、音调、音量
   - 支持 SSML 控制
   - 多种音频格式（MP3, WAV, OGG）

6. **易于集成**
   - RESTful API
   - 官方 SDK 支持多种语言
   - 详细的文档和示例

#### ⚠️ 缺点
1. **需要付费**
   - 按使用量计费
   - 免费额度有限（每月 0-400 万字符）
   - 超出后按字符数收费

2. **需要网络连接**
   - 必须在线使用
   - 依赖网络稳定性
   - 可能有延迟

3. **需要 API Key**
   - 需要 Google Cloud 账号
   - 需要配置认证
   - 需要管理密钥安全

4. **隐私考虑**
   - 文本会发送到 Google 服务器
   - 需要遵守数据保护法规

### 技术架构

```
Google TTS 架构：
┌─────────────┐
│  文本输入    │
└──────┬──────┘
       │
┌──────▼──────────┐
│  Google Cloud   │
│  Text-to-Speech │
│  API            │
└──────┬──────────┘
       │
┌──────▼──────────┐
│  WaveNet 模型   │
│  (神经网络)     │
└──────┬──────────┘
       │
┌──────▼──────────┐
│  音频输出        │
│  (MP3/WAV/OGG)  │
└─────────────────┘
```

### 支持的语音类型

#### 中文语音
1. **zh-CN-Wavenet-A** - 女声，普通话
2. **zh-CN-Wavenet-B** - 男声，普通话
3. **zh-CN-Wavenet-C** - 女声，普通话
4. **zh-CN-Wavenet-D** - 男声，普通话
5. **zh-CN-Standard-A** - 标准女声
6. **zh-CN-Standard-B** - 标准男声
7. **zh-CN-Standard-C** - 标准女声
8. **zh-CN-Standard-D** - 标准男声

#### 其他语言
- 英语（美式、英式、澳式等）
- 日语
- 韩语
- 法语、德语、西班牙语等

### 定价信息

**免费额度**：
- 每月前 0-400 万字符免费（取决于账户类型）

**付费价格**（超出免费额度后）：
- Standard 语音：$4.00 / 100 万字符
- WaveNet 语音：$16.00 / 100 万字符
- Neural2 语音：$16.00 / 100 万字符

**注意**：价格可能因地区和时间而变化，请查看官方定价页面。

---

## 安装和配置

### Coqui TTS 安装

#### 方法 1：使用 pip 安装（推荐）

```bash
# 安装 Coqui TTS
pip install TTS

# 安装服务器组件
pip install TTS[server]
```

#### 方法 2：使用 Docker（推荐用于生产环境）

```bash
# 拉取 Docker 镜像
docker pull coqui/tts:latest

# 运行容器
docker run -it --rm \
  -p 5002:5002 \
  coqui/tts:latest \
  tts-server --port 5002
```

#### 方法 3：从源码安装

```bash
# 克隆仓库
git clone https://github.com/coqui-ai/TTS.git
cd TTS

# 安装依赖
pip install -r requirements.txt
pip install -e .
```

#### 启动服务器

```bash
# 启动 TTS 服务器（默认端口 5002）
tts-server --port 5002

# 或指定模型
tts-server --port 5002 \
  --model_name tts_models/zh-CN/baker/tacotron2-DDC-GST
```

#### 验证安装

```bash
# 测试 API
curl -X POST http://localhost:5002/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，世界", "model_name": "tts_models/zh-CN/baker/tacotron2-DDC-GST"}'
```

### Google TTS 配置

#### 步骤 1：创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Text-to-Speech API

#### 步骤 2：创建服务账号

1. 进入 "IAM & Admin" > "Service Accounts"
2. 点击 "Create Service Account"
3. 填写服务账号信息
4. 授予 "Cloud Text-to-Speech API User" 角色

#### 步骤 3：创建 API Key

1. 进入 "APIs & Services" > "Credentials"
2. 点击 "Create Credentials" > "API Key"
3. 复制 API Key（或下载 JSON 密钥文件）

#### 步骤 4：配置环境变量

```bash
# 设置 API Key
export GOOGLE_TTS_API_KEY="your-api-key-here"

# 或使用 JSON 密钥文件
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

#### 步骤 5：安装 Google TTS SDK

```bash
# 安装 Node.js SDK
npm install @google-cloud/text-to-speech

# 或使用 Python SDK
pip install google-cloud-text-to-speech
```

---

## 使用对比

### 功能对比表

| 特性 | Coqui TTS | Google TTS |
|------|-----------|------------|
| **部署方式** | 本地/云端 | 云端 |
| **费用** | 免费 | 付费（有免费额度） |
| **音质** | 良好 | 优秀 |
| **中文支持** | 中等 | 优秀 |
| **多语言** | 100+ 种 | 50+ 种 |
| **声音克隆** | ✅ 支持 | ❌ 不支持 |
| **离线使用** | ✅ 支持 | ❌ 不支持 |
| **API Key** | ❌ 不需要 | ✅ 需要 |
| **网络要求** | ❌ 不需要 | ✅ 需要 |
| **资源消耗** | 高（需要 GPU） | 低（云端处理） |
| **响应速度** | 中等 | 快 |
| **可定制性** | 高 | 中等 |
| **稳定性** | 中等 | 高 |

### 性能对比

#### Coqui TTS
- **首次响应**：2-5 秒（需要加载模型）
- **后续响应**：0.5-2 秒
- **并发处理**：中等（取决于硬件）
- **资源占用**：高（GPU 推荐）

#### Google TTS
- **首次响应**：0.5-1 秒
- **后续响应**：0.3-0.8 秒
- **并发处理**：高（云端处理）
- **资源占用**：低（本地无占用）

### 使用场景对比

#### 适合使用 Coqui TTS 的场景：
1. ✅ 需要完全离线运行
2. ✅ 需要声音克隆功能
3. ✅ 预算有限（免费）
4. ✅ 需要高度定制
5. ✅ 数据隐私要求高
6. ✅ 有 GPU 资源

#### 适合使用 Google TTS 的场景：
1. ✅ 需要最高音质
2. ✅ 需要稳定可靠的服务
3. ✅ 需要快速部署
4. ✅ 不需要离线功能
5. ✅ 预算充足
6. ✅ 需要多语言高质量支持

---

## 推荐选择

### 推荐方案 1：Coqui TTS（本地部署）

**适用场景**：
- 需要离线使用
- 预算有限
- 需要声音克隆
- 有 GPU 资源

**配置步骤**：
1. 安装 Coqui TTS 服务器
2. 启动服务（端口 5002）
3. 项目会自动检测并使用

### 推荐方案 2：Google TTS（云端服务）

**适用场景**：
- 需要最高音质
- 需要稳定服务
- 不需要离线功能
- 预算充足

**配置步骤**：
1. 创建 Google Cloud 项目
2. 获取 API Key
3. 在项目中配置 API Key
4. 项目会自动使用 Google TTS

### 推荐方案 3：混合使用（最佳方案）

**策略**：
- 主要使用 Coqui TTS（本地，免费）
- 备用 Google TTS（云端，高质量）
- 自动降级机制

**优点**：
- 兼顾成本和音质
- 提高可用性
- 灵活切换

---

## 项目集成

### Coqui TTS 已在项目中集成

项目已包含 Coqui TTS 客户端实现：
- 文件位置：`src/tts/coquiTTSClient.ts`
- 默认端口：5002
- 自动健康检查
- 支持音频缓存

### Google TTS 集成

项目已添加 Google TTS 客户端实现：
- 文件位置：`src/tts/googleTTSClient.ts`
- 需要配置 API Key
- 支持多种语音选择
- 自动降级机制

### 使用方法

```typescript
// 在项目初始化时配置
import { initTTS } from './tts/initTTS';

// 启用 Coqui TTS
await initTTS({
  enableCoqui: true,
  coquiConfig: {
    baseUrl: 'http://localhost:5002',
    modelName: 'tts_models/zh-CN/baker/tacotron2-DDC-GST',
  },
});

// 启用 Google TTS
await initTTS({
  enableGoogle: true,
  googleConfig: {
    apiKey: process.env.GOOGLE_TTS_API_KEY,
    voiceName: 'zh-CN-Wavenet-A',
  },
});
```

---

## 总结

### Coqui TTS
- ✅ 免费开源
- ✅ 支持离线使用
- ✅ 支持声音克隆
- ⚠️ 需要本地资源
- ⚠️ 中文支持有限

### Google TTS
- ✅ 音质优秀
- ✅ 稳定可靠
- ✅ 多语言支持好
- ⚠️ 需要付费
- ⚠️ 需要网络连接

**建议**：根据你的具体需求选择合适的方案，或者两者结合使用以获得最佳效果。

