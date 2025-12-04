# MeLo TTS 远程连接配置指南

本指南说明如何让 APP 连接到远程服务器上的 MeLo TTS 服务。

## 📋 场景说明

- **TTS 服务器**: 192.168.0.13（已安装 MeLo TTS）
- **APP 客户端**: 另一台机器（需要连接到 TTS 服务器）
- **端口**: 7860

## 1️⃣ 在 TTS 服务器 (192.168.0.13) 上启动 MeLo TTS

### 方式一：使用项目脚本（推荐）

```bash
# 如果还没有安装，先运行设置脚本
bash docs/setup/setup-melo-tts-venv.sh

# 启动 MeLo TTS 服务
bash start-melo-tts.sh
```

### 方式二：手动启动

```bash
# 激活虚拟环境
source .venv-melo-tts/bin/activate

# 进入 API 服务器目录
cd docs/setup

# 启动服务器（监听所有网络接口）
python melo-tts-api-server.py
```

### 验证服务运行

```bash
# 在 192.168.0.13 上验证
curl http://localhost:7860/health

# 应该返回：
# {"status":"ok","service":"Melo TTS","version":"1.0.0"}
```

### 检查防火墙（如果需要）

如果其他机器无法访问，需要开放端口：

```bash
# Ubuntu/Debian
sudo ufw allow 7860/tcp

# CentOS/RHEL
sudo firewall-cmd --add-port=7860/tcp --permanent
sudo firewall-cmd --reload
```

## 2️⃣ 从 APP 客户端测试连接

在运行 APP 的机器上测试：

```bash
# 测试网络连接
curl http://192.168.0.13:7860/health

# 应该返回：
# {"status":"ok","service":"Melo TTS","version":"1.0.0"}

# 测试 TTS 功能
curl -X POST http://192.168.0.13:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "你好，世界", "lang": "ZH"}' \
  --output test.wav

# 如果成功，会生成 test.wav 文件
```

## 3️⃣ 配置 APP 连接到远程 MeLo TTS

有多种方式配置 APP 连接到远程 MeLo TTS 服务：

### 方式一：修改应用配置代码（推荐）

找到 `src/App.tsx` 文件，在 TTS 初始化部分添加 MeLo 配置：

```typescript
// 在 App.tsx 中找到 TTS 初始化代码
const config: TTSInitConfig = {
  enablePiper: true,
  enableBrowser: true,
  
  // 添加 MeLo TTS 配置
  enableMelo: true,
  meloConfig: {
    baseUrl: 'http://192.168.0.13:7860',  // 远程 MeLo TTS 服务器地址
    timeout: 30000,
    retryCount: 2,
    defaultSpeaker: 'ZH',  // 默认中文说话人
  },
};

initTTS(config).then(() => {
  console.log('✅ TTS 初始化完成');
}).catch((error) => {
  console.error('❌ TTS 初始化失败:', error);
});
```

### 方式二：通过环境变量配置

创建或修改项目根目录的 `.env` 文件：

```bash
# .env 文件
VITE_MELO_TTS_URL=http://192.168.0.13:7860
```

然后在 `src/App.tsx` 中读取环境变量：

```typescript
const config: TTSInitConfig = {
  enableMelo: true,
  meloConfig: {
    baseUrl: import.meta.env.VITE_MELO_TTS_URL || 'http://192.168.0.13:7860',
    timeout: 30000,
    retryCount: 2,
  },
};
```

### 方式三：通过浏览器控制台动态配置

在 APP 运行时，打开浏览器开发者工具（F12），在控制台中运行：

```javascript
// 导入 TTS 管理器
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const ttsManager = getTTSServiceManager();

// 获取 MeLo TTS 客户端并更新配置
const meloClient = ttsManager.getProvider('melo');
if (meloClient && 'updateConfig' in meloClient) {
  meloClient.updateConfig({
    baseUrl: 'http://192.168.0.13:7860'
  });
  console.log('✅ MeLo TTS 配置已更新');
}

// 重新检查健康状态
await ttsManager.checkProviderHealth('melo');

// 查看状态
const status = ttsManager.getProviderStatus();
console.log('TTS 服务状态:', status);
```

## 4️⃣ 验证配置

### 查看 TTS 状态

在 APP 中：

1. 打开浏览器开发者工具（F12）
2. 查看控制台输出
3. 应该看到：`[TTS] ✅ MeLo TTS 服务可用: http://192.168.0.13:7860`

或者在控制台运行：

```javascript
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const ttsManager = getTTSServiceManager();
const status = ttsManager.getProviderStatus();
console.log('TTS 服务状态:', status);

// 输出示例：
// {
//   melo: { enabled: true, healthy: true },    ✅ MeLo TTS 可用
//   azure: { enabled: false, healthy: false },
//   piper: { enabled: true, healthy: false },
//   browser: { enabled: true, healthy: true }
// }
```

### 测试语音合成

在控制台测试：

```javascript
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const ttsManager = getTTSServiceManager();

// 测试 MeLo TTS
try {
  const result = await ttsManager.synthesizeWithProvider('melo', '你好，这是测试语音');
  console.log('✅ MeLo TTS 测试成功:', result);
} catch (error) {
  console.error('❌ MeLo TTS 测试失败:', error);
}
```

## 5️⃣ 优先级说明

MeLo TTS 已被设置为**最高优先级**（priority 0），意味着：

1. 当 APP 需要生成语音时，会首先尝试使用 MeLo TTS
2. 如果 MeLo TTS 不可用，自动降级到其他 TTS 服务（Piper TTS → Azure → Browser TTS）
3. 这样确保最佳音质，同时保证服务可用性

### 当前 TTS 优先级：

| TTS 服务 | 优先级 | 说明 |
|---------|-------|------|
| MeLo TTS | 0（最高） | 高质量多语言 TTS，本地或远程 |
| Azure Speech | 1 | 云端高质量 TTS，需要 API Key |
| Piper TTS | 2 | 轻量级本地 TTS |
| Browser TTS | 3（最低） | 浏览器内置，总是可用 |

## 🔧 常见问题

### Q1: 连接超时怎么办？

**A**: 增加超时时间：

```typescript
meloConfig: {
  baseUrl: 'http://192.168.0.13:7860',
  timeout: 60000,  // 增加到 60 秒
}
```

### Q2: 无法连接到远程服务器

**检查清单**:
1. ✅ TTS 服务器是否正在运行：`curl http://192.168.0.13:7860/health`
2. ✅ 防火墙是否开放 7860 端口
3. ✅ 网络连接是否正常：`ping 192.168.0.13`
4. ✅ APP 配置的地址是否正确

### Q3: 如何查看当前使用的 TTS 服务？

**A**: 在浏览器控制台运行：

```javascript
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const ttsManager = getTTSServiceManager();

// 查看统计信息
const stats = ttsManager.getStatistics();
console.log('TTS 统计:', stats);

// 查看所有提供者状态
const status = ttsManager.getProviderStatus();
console.table(status);
```

### Q4: 如何切换说话人？

**A**: MeLo TTS 支持多个说话人（ZH, EN, JP, ES, FR, KR 等）：

```typescript
// 在配置中指定默认说话人
meloConfig: {
  baseUrl: 'http://192.168.0.13:7860',
  defaultSpeaker: 'ZH',  // 中文
  // 或 'EN' (英文), 'JP' (日文), 'ES' (西班牙语) 等
}

// 或在合成时指定
await ttsManager.synthesize('Hello world', {
  voiceConfig: {
    speaker: 'EN'  // 使用英文说话人
  }
});
```

### Q5: 如何禁用 MeLo TTS？

**A**: 如果你想临时禁用 MeLo TTS：

```javascript
// 在浏览器控制台
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const ttsManager = getTTSServiceManager();

ttsManager.configureProvider('melo', {
  provider: 'melo',
  enabled: false
});
```

或在配置中：

```typescript
const config: TTSInitConfig = {
  enableMelo: false,  // 禁用 MeLo TTS
};
```

## 📝 配置示例总结

### 完整配置示例

在 `src/App.tsx` 中：

```typescript
import { initTTS, type TTSInitConfig } from './tts/initTTS';

// TTS 初始化
React.useEffect(() => {
  const config: TTSInitConfig = {
    // MeLo TTS（远程服务器）
    enableMelo: true,
    meloConfig: {
      baseUrl: 'http://192.168.0.13:7860',
      timeout: 30000,
      retryCount: 2,
      defaultSpeaker: 'ZH',
    },
    
    // Piper TTS（本地备用）
    enablePiper: true,
    piperConfig: {
      baseUrl: 'http://localhost:5000',
      timeout: 10000,
      retryCount: 2,
    },
    
    // Azure Speech（如果有 API Key）
    enableAzure: false,
    
    // 浏览器 TTS（总是启用作为后备）
    enableBrowser: true,
  };

  initTTS(config).then(() => {
    console.log('✅ TTS 系统初始化完成');
  }).catch((error) => {
    console.error('❌ TTS 系统初始化失败:', error);
  });
}, []);
```

## ✅ 验证清单

完成配置后，确认以下项目：

- [ ] MeLo TTS 服务在 192.168.0.13:7860 上运行
- [ ] 防火墙已开放 7860 端口
- [ ] 从 APP 机器可以访问 `http://192.168.0.13:7860/health`
- [ ] APP 配置中已添加 MeLo TTS 配置
- [ ] 重启 APP 开发服务器（`npm run dev`）
- [ ] 浏览器控制台显示 `✅ MeLo TTS 服务可用`
- [ ] TTS 状态显示 `melo: { enabled: true, healthy: true }`

完成！🎉

## 📚 相关文档

- [MeLo TTS 快速开始](./MELO_TTS_QUICKSTART.md)
- [MeLo TTS 详细部署](./melo-tts-setup.md)
- [TTS 服务配置指南](./tts-services.md)

