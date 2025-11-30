# TTS 服务配置指南

## 概述

游戏支持多个 TTS（文本转语音）服务提供者，按优先级自动选择：

1. **Azure Speech Service** - 云端服务，高质量，支持多语言（需要 Subscription Key）
2. **Piper TTS** (端口 5000) - 本地服务，轻量级
3. **浏览器 TTS** - 浏览器内置，总是可用（后备）

## 当前状态

如果你看到这些错误：
```
POST http://localhost:9880/tts net::ERR_CONNECTION_REFUSED
POST http://localhost:5000/api/tts net::ERR_CONNECTION_REFUSED
```

**这是正常的！** 这些服务是可选的，如果未启动，系统会自动使用其他可用的 TTS 提供者（通常是浏览器 TTS）。

## 选项 1：忽略这些错误（推荐）

如果你不需要高质量的语音合成，可以忽略这些错误。系统会自动使用浏览器 TTS，这是最简单的方式，无需任何配置。

**优点：**
- 无需安装任何服务
- 开箱即用
- 不占用额外资源

**缺点：**
- 音质可能不如专业 TTS 服务
- 不支持声音克隆

## 选项 2：禁用这些服务

如果你想完全禁用这些服务的健康检查，可以修改代码（但这通常不需要，因为系统会自动降级）。

## 选项 3：配置 TTS 服务（高级）

如果你需要更好的音质，可以配置这些服务：

### Azure Speech Service（推荐，云端高质量TTS）

**特点：**
- 支持 140+ 种语言和方言
- 400+ 种神经网络语音
- 高质量语音合成
- 支持中文、英文、日文、韩文等多种语言

**配置步骤：**

1. **创建 Azure 账户并订阅：**
   - 访问 [Azure Portal](https://portal.azure.com/)
   - 注册账户并选择适合的订阅计划

2. **创建语音服务资源：**
   - 在 Azure 门户中，搜索"语音服务"（Speech Services）
   - 创建新的语音服务资源
   - 选择适当的区域（如 `eastus`, `westus2` 等）和定价层

3. **获取密钥和区域：**
   - 在创建的语音服务资源中，导航至"密钥和端点"选项卡
   - 复制 `Key 1` 或 `Key 2`（Subscription Key）
   - 记录资源所在的区域（Region）

4. **配置环境变量：**
   - 在项目根目录创建或编辑 `.env` 文件：
   ```bash
   VITE_AZURE_SPEECH_KEY=你的Subscription-Key
   VITE_AZURE_SPEECH_REGION=你的区域（如eastus）
   ```

5. **重启开发服务器：**
   ```bash
   npm run dev
   ```

6. **验证配置：**
   - 打开 TTS 配置页面
   - 查看 Azure Speech Service 状态
   - 如果显示"✅ 健康"，说明配置成功

**定价：**
- 免费层：每月 500 万字符
- 标准层：按使用量计费

**文档：**
- [Azure Speech Service 官方文档](https://learn.microsoft.com/azure/ai-services/speech-service/)

### Piper TTS（本地轻量级TTS）

**特点：**
- 轻量级本地 TTS 服务
- 支持多种语言
- 速度快，资源占用少

**安装和启动：**

1. **使用项目提供的脚本：**
   ```bash
   ./scripts/setup-piper-tts.sh
   ./start-piper-tts.sh
   ```

2. **或手动安装：**
   ```bash
   # 安装依赖
   pip install flask flask-cors piper-tts
   
   # 启动服务
   python scripts/piper-tts-server.py
   ```

3. **验证服务：**
   ```bash
   curl http://localhost:5000/health
   ```

**配置游戏：**

游戏会自动检测 Piper TTS 服务。如果服务运行在默认端口（5000），无需额外配置。

详细文档：`docs/setup/piper-tts-quick-start.md`

## 检查 TTS 服务状态

在游戏界面中：

1. 打开游戏配置面板
2. 查看 TTS 服务状态
3. 应该看到：
   - ✅ 浏览器 TTS - 健康（总是可用）
   - ❌ Azure Speech Service - 不健康（如果未配置 Subscription Key）
   - ❌ Piper TTS - 不健康（如果未启动）

## 常见问题

### Q: 这些错误会影响游戏吗？

**A:** 不会。系统会自动降级到可用的 TTS 提供者（通常是浏览器 TTS）。游戏可以正常使用。

### Q: 如何完全禁用这些服务的检查？

**A:** 通常不需要。系统会自动处理服务不可用的情况。如果你真的想禁用，可以修改 `src/tts/ttsServiceManager.ts` 中的配置。

### Q: 启动服务后还是连接失败？

**检查：**
1. 服务是否真的在运行：`curl http://localhost:9880/health`
2. 端口是否正确
3. CORS 设置是否正确（服务需要允许跨域请求）
4. 防火墙是否阻止了端口

### Q: 如何选择使用哪个 TTS 服务？

**A:** 系统按优先级自动选择：
1. 检查 Azure Speech Service（如果已配置 Subscription Key）
2. 检查 Piper TTS（如果已启动）
3. 使用浏览器 TTS（总是可用，作为后备）

## 推荐配置

### 最小配置（推荐新手）

- **不启动任何本地服务**
- 使用浏览器 TTS
- 优点：简单，无需配置

### 标准配置

- **配置 Azure Speech Service**（推荐，云端高质量，支持多语言）
- 或启动 **Piper TTS**（本地轻量级）
- 优点：更好的音质

### 完整配置

- **配置 Azure Speech Service** + **启动 Piper TTS**
- 优点：最佳音质和功能，自动降级
- 缺点：Azure 需要 Subscription Key（有免费额度）

## 总结

**对于大多数用户：**
- ✅ 忽略这些错误
- ✅ 使用浏览器 TTS（自动）
- ✅ 无需任何配置

**对于高级用户：**
- 如果需要更好的音质，配置 Azure Speech Service 或启动 Piper TTS
- 参考上面的安装步骤

这些错误信息只是告诉你某些可选服务未启动，不会影响游戏的正常使用。

