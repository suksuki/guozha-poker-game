# TTS 配置指南

## 🎯 应用内配置 Edge TTS

### 方法1：自动配置（推荐，已默认启用）

应用已经自动配置好了 Edge TTS！默认配置：
- ✅ 启用网络 TTS（Edge TTS）
- ✅ 代理服务器地址：`http://localhost:3002/api/edge-tts`
- ✅ 自动降级：如果代理服务器不可用，自动使用浏览器 TTS

**无需任何操作**，只要代理服务器运行，就会自动使用 Edge TTS。

### 方法2：通过浏览器控制台配置

如果你想自定义配置，可以在浏览器控制台（F12）运行：

```javascript
// 导入配置函数（在控制台中）
const { saveTTSConfig } = await import('/src/tts/initTTS.ts');

// 配置 Edge TTS
saveTTSConfig({
  enableWebTTS: true,
  webTTSConfig: {
    provider: 'edge',
    baseUrl: 'http://localhost:3002/api/edge-tts',  // 代理服务器地址
  },
  enableBrowser: true,  // 保持浏览器 TTS 作为后备
});

// 刷新页面使配置生效
location.reload();
```

### 方法3：查看和修改配置

**查看当前配置**：
```javascript
const config = JSON.parse(localStorage.getItem('tts_config') || '{}');
console.log('当前 TTS 配置:', config);
```

**修改代理服务器地址**（如果代理服务器运行在其他端口）：
```javascript
const { saveTTSConfig, getTTSConfigFromEnv } = await import('/src/tts/initTTS.ts');

const config = getTTSConfigFromEnv();
config.webTTSConfig.baseUrl = 'http://localhost:3002/api/edge-tts';  // 修改为你自己的地址
saveTTSConfig(config);

// 刷新页面
location.reload();
```

## 📊 查看 TTS 状态

### 在应用中查看

1. **打开 TTS 状态监控面板**：
   - 点击应用右下角的 **🔊** 按钮
   - 或者查看 `TTSStatusMonitor` 组件

2. **查看状态**：
   - ✅ **绿色**：服务可用
   - ❌ **红色**：服务不可用
   - 🧪 **测试按钮**：可以测试每个 TTS 提供者

### 在浏览器控制台查看

```javascript
// 查看 TTS 服务管理器状态
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
const manager = getTTSServiceManager();
const status = manager.getProviderStatus();
console.log('TTS 提供者状态:', status);
```

## 🔧 常见配置场景

### 场景1：使用默认配置（推荐）

**无需任何操作**，应用已自动配置。

### 场景2：禁用 Edge TTS，只使用浏览器 TTS

```javascript
const { saveTTSConfig } = await import('/src/tts/initTTS.ts');
saveTTSConfig({
  enableWebTTS: false,
  enableBrowser: true,
});
location.reload();
```

### 场景3：使用其他端口

如果代理服务器运行在其他端口（比如 3003）：

```javascript
const { saveTTSConfig, getTTSConfigFromEnv } = await import('/src/tts/initTTS.ts');
const config = getTTSConfigFromEnv();
config.webTTSConfig.baseUrl = 'http://localhost:3003/api/edge-tts';
saveTTSConfig(config);
location.reload();
```

### 场景4：使用 Azure TTS（需要 API Key）

```javascript
const { saveTTSConfig } = await import('/src/tts/initTTS.ts');
saveTTSConfig({
  enableWebTTS: true,
  webTTSConfig: {
    provider: 'azure',
    apiKey: '你的Azure API Key',
    baseUrl: 'https://你的区域.tts.speech.microsoft.com',
  },
});
location.reload();
```

## ✅ 验证配置

配置后，在浏览器控制台应该看到：

```
[initTTS] 网络 TTS (Edge TTS) 已启用
[initTTS] 代理服务器地址: http://localhost:3002/api/edge-tts
[initTTS] TTS 系统初始化完成
```

## 🐛 故障排查

**问题**：仍然使用浏览器 TTS
- 检查代理服务器是否运行：访问 `http://localhost:3002/api/edge-tts/health`
- 查看浏览器控制台的错误信息
- 检查配置是否正确：`localStorage.getItem('tts_config')`

**问题**：配置不生效
- 确保刷新页面
- 检查配置格式是否正确（JSON）
- 查看控制台是否有错误

## 📝 配置存储

所有配置都保存在浏览器的 `localStorage` 中，键名为 `tts_config`。

清除配置（恢复默认）：
```javascript
localStorage.removeItem('tts_config');
location.reload();
```

