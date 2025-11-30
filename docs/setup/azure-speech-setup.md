# Azure Speech Service 配置指南

## 快速开始

### 步骤 1：创建 Azure 账户和语音服务资源

1. **访问 Azure Portal**
   - 打开 [https://portal.azure.com/](https://portal.azure.com/)
   - 如果没有账户，先注册一个（有免费试用）

2. **创建语音服务资源**
   - 在 Azure 门户中，点击"创建资源"
   - 搜索"语音服务"（Speech Services）
   - 点击"创建"
   - 填写基本信息：
     - **订阅**：选择你的订阅
     - **资源组**：创建新资源组或使用现有
     - **区域**：选择离你最近的区域（如 `eastus`, `westus2`, `southeastasia` 等）
     - **名称**：给你的资源起个名字
     - **定价层**：选择"免费 F0"（每月 500 万字符免费）或"标准 S0"
   - 点击"查看 + 创建"，然后"创建"

3. **获取 Subscription Key 和 Region**
   - 等待资源创建完成（通常需要 1-2 分钟）
   - 点击"转到资源"
   - 在左侧菜单中找到"密钥和端点"（Keys and Endpoint）
   - 复制 `Key 1` 或 `Key 2`（两个都可以用）
   - 记录**区域**（Region），例如：`eastus`, `westus2` 等

### 步骤 2：配置项目

1. **编辑 `.env` 文件**
   - 在项目根目录找到 `.env` 文件
   - 如果没有，创建一个新文件

2. **添加以下配置**：
   ```bash
   # Azure Speech Service 配置
   VITE_AZURE_SPEECH_KEY=你的Subscription-Key
   VITE_AZURE_SPEECH_REGION=eastus
   ```

   **示例**：
   ```bash
   # Azure Speech Service 配置
   VITE_AZURE_SPEECH_KEY=1234567890abcdef1234567890abcdef
   VITE_AZURE_SPEECH_REGION=eastus
   ```

3. **保存文件**

### 步骤 3：重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

### 步骤 4：验证配置

1. **打开应用**
   - 在浏览器中打开应用
   - 打开开发者工具（F12）

2. **检查控制台**
   - 应该看到类似这样的日志：
     ```
     [initTTS] 🔑 找到 Azure Speech Service Subscription Key，长度: 32
     [initTTS] 🌍 Azure 区域: eastus
     [initTTS] 🔍 开始 Azure Speech Service 健康检查...
     [initTTS] Azure Speech Service 健康检查结果: ✅ 可用
     [initTTS] ✅ Azure Speech Service 已启用（最高优先级）
     ```

3. **检查 TTS 配置页面**
   - 打开 TTS 配置页面
   - 应该看到 Azure Speech Service 显示为"✅ 健康"

## 常见问题

### Q: 如何找到我的 Region？

**A:** 在 Azure Portal 中：
1. 进入你的语音服务资源
2. 在"概览"页面，可以看到"位置"（Location）
3. 或者在"密钥和端点"页面，可以看到"区域"（Region）

常见的区域代码：
- `eastus` - 美国东部
- `westus2` - 美国西部 2
- `southeastasia` - 东南亚
- `japaneast` - 日本东部
- `koreacentral` - 韩国中部

### Q: Subscription Key 无效？

**A:** 检查以下几点：
1. 确保复制的是完整的 Key（通常是 32 个字符）
2. 确保没有多余的空格
3. 确保使用的是 `Key 1` 或 `Key 2`，不是其他字段
4. 确保资源已创建完成（等待 1-2 分钟）

### Q: 健康检查失败？

**A:** 可能的原因：
1. Subscription Key 错误
2. Region 配置错误
3. 网络连接问题
4. 资源已被删除或禁用

**解决方法**：
1. 检查 `.env` 文件中的配置是否正确
2. 在 Azure Portal 中确认资源状态为"已启用"
3. 尝试重新创建资源

### Q: 免费额度是多少？

**A:** 
- **免费层（F0）**：每月 500 万字符
- **标准层（S0）**：按使用量计费，前 500 万字符免费

### Q: 支持哪些语言？

**A:** Azure Speech Service 支持 140+ 种语言和方言，包括：
- 中文（简体、繁体）
- 英语
- 日语
- 韩语
- 以及更多...

## 定价信息

- **免费层（F0）**：
  - 每月 500 万字符免费
  - 适合个人项目和小型应用

- **标准层（S0）**：
  - 前 500 万字符免费
  - 超出部分按使用量计费
  - 适合生产环境

详细定价：https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/

## 更多资源

- [Azure Speech Service 官方文档](https://learn.microsoft.com/azure/ai-services/speech-service/)
- [支持的语音列表](https://learn.microsoft.com/azure/ai-services/speech-service/language-support)
- [Azure Portal](https://portal.azure.com/)

---

**提示**：`.env` 文件包含敏感信息，不要提交到 Git 仓库（已在 `.gitignore` 中）。

