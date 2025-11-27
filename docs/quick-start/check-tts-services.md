# 快速检查TTS服务

## 在浏览器控制台快速检查

### 方法1：使用检查工具（推荐）

```javascript
// 1. 导入检查工具（如果已暴露）
window.checkLocalTTS.printStatus();

// 2. 获取所有服务状态
const status = await window.checkLocalTTS.checkAll();
status.forEach(s => {
  console.log(`${s.status} ${s.name} - ${s.defaultUrl}`);
});

// 3. 获取可用的服务
const available = await window.checkLocalTTS.getAvailable();
console.log('可用的服务:', available.map(s => s.name));
```

### 方法2：使用TTS服务管理器

```javascript
// 获取TTS服务商状态
const { getTTSServiceManager } = await import('./tts/ttsServiceManager');
const ttsManager = getTTSServiceManager();
const status = ttsManager.getProviderStatus();
console.table(status);
```

### 方法3：使用multiChannelVoiceService

```javascript
// 获取TTS服务商状态
const { multiChannelVoiceService } = await import('./services/multiChannelVoiceService');
const status = await multiChannelVoiceService.getTTSProviderStatus();
console.table(status);
```

## 快速切换到可用的TTS服务

### 如果GPT-SoVITS可用

```javascript
const { multiChannelVoiceService } = await import('./services/multiChannelVoiceService');
multiChannelVoiceService.setTTSProvider('gpt_sovits');
console.log('✅ 已切换到 GPT-SoVITS');
```

### 如果Coqui TTS可用

```javascript
multiChannelVoiceService.setTTSProvider('coqui');
console.log('✅ 已切换到 Coqui TTS');
```

### 如果Edge TTS可用

```javascript
multiChannelVoiceService.setTTSProvider('edge');
console.log('✅ 已切换到 Edge TTS');
```

### 如果只有浏览器TTS可用

```javascript
multiChannelVoiceService.setTTSProvider('browser');
console.log('✅ 已切换到浏览器TTS（功能受限）');
```

### 自动选择最佳服务

```javascript
multiChannelVoiceService.setTTSProvider('auto');
console.log('✅ 已设置为自动选择');
```

## 一键检查脚本

在浏览器控制台运行：

```javascript
(async () => {
  console.log('🔍 检查所有TTS服务...\n');
  
  // 检查本地TTS服务
  if (window.checkLocalTTS) {
    await window.checkLocalTTS.printStatus();
  }
  
  // 检查TTS服务管理器状态
  const { getTTSServiceManager } = await import('./tts/ttsServiceManager');
  const ttsManager = getTTSServiceManager();
  const status = ttsManager.getProviderStatus();
  
  console.log('\n📊 TTS服务管理器状态:');
  console.table(status);
  
  // 找到可用的服务
  const available = Object.entries(status)
    .filter(([_, s]) => s.enabled && s.healthy)
    .map(([name]) => name);
  
  if (available.length > 0) {
    console.log(`\n✅ 找到 ${available.length} 个可用的服务:`, available);
    console.log('💡 建议使用:', available[0]);
  } else {
    console.log('\n⚠️ 没有可用的TTS服务！');
    console.log('💡 建议：');
    console.log('  1. 启动 GPT-SoVITS (http://localhost:9880)');
    console.log('  2. 启动 Coqui TTS (http://localhost:5002)');
    console.log('  3. 配置 Edge TTS 后端代理');
    console.log('  4. 或使用浏览器TTS（功能受限）');
  }
})();
```

---

**最后更新**：2025-01-25  
**状态**：✅ 快速检查指南已完成

