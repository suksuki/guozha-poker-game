# TTS 系统测试指南

## 🚀 快速开始

### 1. 启动应用

开发服务器应该已经在运行，访问：**http://localhost:3000**

### 2. 检查 TTS 系统状态

1. 打开浏览器开发者工具（F12）
2. 查看控制台，应该看到：
   ```
   [initTTS] TTS 系统初始化完成
   [AudioCache] IndexedDB 初始化成功
   ```

3. 点击右下角的 **🔊** 按钮，打开 TTS 状态监控面板
4. 查看所有 TTS 提供者的状态：
   - 🌐 浏览器 TTS - 应该显示 ✅ 健康
   - 🌍 Edge TTS - 可能显示 ❌ 不健康（需要后端代理）
   - 💻 本地 TTS API - 可能显示 ❌ 不健康（需要本地服务）
   - 🤖 GPT-SoVITS - 可能显示 ❌ 不健康（需要本地服务）
   - 🎙️ Coqui TTS - 可能显示 ❌ 不健康（需要本地服务）

### 3. 测试浏览器 TTS

1. 在 TTS 状态监控面板中，找到"浏览器 TTS"
2. 点击 **🧪 测试** 按钮
3. 应该会听到"测试语音合成"的语音播放

### 4. 测试游戏中的语音

1. 开始一局游戏
2. 出牌时应该会触发语音
3. 查看控制台，应该看到 TTS 相关的日志

## 🔧 配置本地 TTS 服务（可选）

### GPT-SoVITS

1. **安装和启动 GPT-SoVITS 服务**：
   ```bash
   # 参考 GPT-SoVITS 官方文档
   # 默认端口：9880
   ```

2. **在浏览器控制台配置**：
   ```javascript
   import { saveTTSConfig, initTTS, getTTSConfigFromEnv } from './tts';
   
   saveTTSConfig({
     enableGPTSoVITS: true,
     gptSoVITSConfig: {
       baseUrl: 'http://localhost:9880',
       refAudioUrl: '/path/to/reference/audio.wav',  // 可选
       refText: '参考文本',  // 可选
     },
   });
   
   // 重新初始化
   await initTTS(getTTSConfigFromEnv());
   ```

3. **刷新页面**，在 TTS 状态监控中应该看到 GPT-SoVITS 显示 ✅ 健康

### Coqui TTS

1. **安装和启动 Coqui TTS 服务**：
   ```bash
   # 参考 Coqui TTS 官方文档
   # 默认端口：5002
   ```

2. **在浏览器控制台配置**：
   ```javascript
   saveTTSConfig({
     enableCoqui: true,
     coquiConfig: {
       baseUrl: 'http://localhost:5002',
       modelName: 'tts_models/zh-CN/baker/tacotron2-DDC-GST',
     },
   });
   
   await initTTS(getTTSConfigFromEnv());
   ```

## 📊 监控和调试

### 查看 TTS 缓存状态

在浏览器控制台运行：
```javascript
import { getAudioCache } from './tts';

const cache = getAudioCache();
const stats = await cache.getStats();
console.log('缓存统计:', stats);
```

### 查看 TTS 服务管理器状态

```javascript
import { getTTSServiceManager } from './tts';

const manager = getTTSServiceManager();
const status = manager.getProviderStatus();
console.log('提供者状态:', status);
```

### 手动测试 TTS

```javascript
import { getTTSServiceManager } from './tts';

const manager = getTTSServiceManager();

// 测试所有提供者
const result = await manager.synthesize('你好，世界！', {
  lang: 'zh',
  useCache: true,
});

console.log('TTS 结果:', result);
```

## 🐛 常见问题

### 1. 浏览器 TTS 不工作

- **检查浏览器权限**：确保允许音频播放
- **检查浏览器支持**：某些浏览器可能不支持 speechSynthesis
- **查看控制台错误**：检查是否有相关错误信息

### 2. IndexedDB 缓存失败

- **检查浏览器存储限制**：某些浏览器可能限制了存储空间
- **清理缓存**：在控制台运行 `indexedDB.deleteDatabase('tts_audio_cache')`

### 3. 本地 TTS 服务连接失败

- **检查服务是否运行**：`curl http://localhost:9880/health`
- **检查 CORS 设置**：确保服务允许跨域请求
- **检查端口**：确认端口号正确

### 4. 语音播放延迟

- **检查缓存**：确保 `useCache: true`
- **预加载常用短语**：在应用启动时预加载
- **检查网络**：如果使用在线 TTS，检查网络连接

## ✅ 测试清单

- [ ] 浏览器 TTS 可以正常播放
- [ ] TTS 状态监控面板可以打开
- [ ] 游戏中的语音可以正常触发
- [ ] 音频缓存正常工作（第二次播放应该更快）
- [ ] TTS 服务管理器自动降级正常工作
- [ ] 多个角色可以同时说话（如果配置了）

## 🎯 下一步

1. **测试游戏语音**：在游戏中触发各种事件，检查语音是否正常
2. **配置本地 TTS**：如果需要更好的音质，配置 GPT-SoVITS 或 Coqui TTS
3. **优化性能**：根据实际使用情况调整缓存策略和预加载

---

**提示**：如果遇到问题，查看浏览器控制台的错误信息，大部分问题都会有详细的错误提示。

