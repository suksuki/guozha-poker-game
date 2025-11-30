# Gemini-TTS 配置按钮不可见问题排查

## 问题描述
在 TTS 配置页面看不到 Gemini-TTS 配置选项。

## 排查步骤

### 1. 确认 Google TTS 是否在列表中

打开浏览器开发者工具（F12），在控制台运行：

```javascript
// 检查 TTS 服务状态
const { getTTSServiceManager } = await import('./src/tts/ttsServiceManager');
const manager = getTTSServiceManager();
console.log('TTS 服务状态:', manager.getProviderStatus());
```

应该能看到 `google` 提供者的状态。

### 2. 检查配置按钮是否渲染

在浏览器开发者工具中：
1. 打开 Elements/元素 面板
2. 找到 TTS 配置面板
3. 搜索 "配置" 或 "btn-config"
4. 确认按钮是否存在

### 3. 手动触发配置面板

在浏览器控制台运行：

```javascript
// 手动显示配置面板
const event = new CustomEvent('showGoogleConfig');
window.dispatchEvent(event);
```

### 4. 检查 localStorage

```javascript
// 检查保存的配置
console.log('保存的模型:', localStorage.getItem('google_tts_model'));
```

### 5. 强制刷新

1. 清除浏览器缓存（Ctrl+Shift+Delete）
2. 硬刷新页面（Ctrl+F5 或 Cmd+Shift+R）
3. 重启开发服务器

## 如果仍然不可见

请检查：
1. 浏览器控制台是否有错误信息
2. React DevTools 中组件状态是否正确
3. 网络请求是否成功加载了组件

## 临时解决方案

如果配置按钮不可见，可以直接在浏览器控制台配置：

```javascript
// 设置 Gemini-TTS 模型
localStorage.setItem('google_tts_model', 'gemini-2.5-flash-tts'); // 或 'gemini-2.5-pro-tts'

// 重新初始化 TTS
const { initTTS } = await import('./src/tts/initTTS');
const apiKey = import.meta.env.VITE_GOOGLE_TTS_API_KEY;
await initTTS({
  enableGoogle: true,
  googleConfig: {
    apiKey: apiKey,
    voiceName: 'zh-CN-Wavenet-A',
    model: localStorage.getItem('google_tts_model') || undefined,
  },
});

console.log('✅ Google TTS 已重新配置');
```

