# 调试指南

## 概述

本文档介绍如何使用调试工具来监控和调试 QuarrelVoiceService。

## 快速开始

### 1. 暴露调试工具到浏览器控制台

在应用初始化时调用：

```typescript
import { exposeQuarrelVoiceDebugTools } from './utils/quarrelVoiceDebug';

// 在应用启动时
exposeQuarrelVoiceDebugTools();
```

然后在浏览器控制台就可以使用：

```javascript
// 查看当前状态
window.quarrelVoiceDebug.printInfo();

// 测试服务连接
await window.quarrelVoiceDebug.test();

// 开始监控（每5秒打印一次）
const stop = window.quarrelVoiceDebug.startMonitoring(5000);
// 停止监控
stop();
```

### 2. 在代码中使用调试工具

```typescript
import { 
  getQuarrelVoiceDebugInfo, 
  printQuarrelVoiceDebugInfo,
  testQuarrelVoiceService 
} from './utils/quarrelVoiceDebug';

// 获取调试信息
const info = getQuarrelVoiceDebugInfo();
console.log('服务状态:', info.serviceStatus);
console.log('音频服务状态:', info.audioServiceStatus);
console.log('配置:', info.config);

// 打印到控制台（格式化输出）
printQuarrelVoiceDebugInfo();

// 测试服务
const testResult = await testQuarrelVoiceService();
if (!testResult.success) {
  console.error('测试失败:', testResult.errors);
}
if (testResult.warnings.length > 0) {
  console.warn('警告:', testResult.warnings);
}
```

## 调试信息说明

### 服务状态 (serviceStatus)

- `initialized`: 服务是否已初始化
- `playingRoles`: 当前正在播放的角色ID列表
- `queueLength`: 队列中等待播放的话语数量
- `hasLLM`: LLM服务是否可用（用于长吵架分段）

### 音频服务状态 (audioServiceStatus)

- `enabled`: 音频服务是否启用
- `currentConcurrent`: 当前并发播放数
- `maxConcurrent`: 最大并发播放数
- `activeChannels`: 当前活动的声道列表

### 配置 (config)

- `maxConcurrent`: 最大并发数（默认2）
- `quickJabMaxDuration`: QUICK_JAB最大时长（默认1.5s）
- `enableDucking`: 是否启用ducking
- `duckingLevel`: ducking时其他角色的音量级别（默认0.25）
- `longTextThreshold`: 长文本阈值（默认40字）

## 常见问题排查

### 问题1：没有听到声音

**检查步骤：**

```typescript
const info = getQuarrelVoiceDebugInfo();

// 1. 检查服务是否初始化
if (!info.serviceStatus.initialized) {
  console.error('❌ 服务未初始化');
}

// 2. 检查音频服务是否启用
if (!info.audioServiceStatus.enabled) {
  console.error('❌ 音频服务未启用');
}

// 3. 检查是否有话语在队列中
if (info.serviceStatus.queueLength > 0) {
  console.warn('⚠️ 有话语在队列中等待播放');
}

// 4. 检查并发限制
if (info.audioServiceStatus.currentConcurrent >= info.audioServiceStatus.maxConcurrent) {
  console.warn('⚠️ 已达到最大并发数，新话语将排队');
}
```

### 问题2：只有一个人说话

**检查步骤：**

```typescript
const info = getQuarrelVoiceDebugInfo();

// 检查最大并发数
if (info.config.maxConcurrent === 1) {
  console.warn('⚠️ 最大并发数设置为1，只能一个人说话');
}

// 检查当前并发数
console.log(`当前并发: ${info.audioServiceStatus.currentConcurrent}/${info.audioServiceStatus.maxConcurrent}`);
```

### 问题3：队列积压

**检查步骤：**

```typescript
const info = getQuarrelVoiceDebugInfo();

if (info.serviceStatus.queueLength > 10) {
  console.warn('⚠️ 队列积压严重，可能需要优化');
  console.log('正在播放:', info.serviceStatus.playingRoles);
  console.log('队列长度:', info.serviceStatus.queueLength);
}
```

### 问题4：LLM生成segments失败

**检查步骤：**

```typescript
const info = getQuarrelVoiceDebugInfo();

if (!info.serviceStatus.hasLLM) {
  console.warn('⚠️ LLM不可用，长吵架将使用标点符号分段');
  // 这是正常的，系统会自动回退
}
```

## 实时监控

### 启动监控

```typescript
import { startQuarrelVoiceMonitoring } from './utils/quarrelVoiceDebug';

// 每5秒打印一次状态（只在有活动时）
const stopMonitoring = startQuarrelVoiceMonitoring(5000);

// 停止监控
stopMonitoring();
```

### 自定义监控

```typescript
import { getQuarrelVoiceDebugInfo } from './utils/quarrelVoiceDebug';

setInterval(() => {
  const info = getQuarrelVoiceDebugInfo();
  
  // 自定义监控逻辑
  if (info.serviceStatus.queueLength > 5) {
    console.warn('队列积压警告');
  }
  
  if (info.audioServiceStatus.currentConcurrent === 0 && 
      info.serviceStatus.queueLength > 0) {
    console.error('有队列但无播放，可能有问题');
  }
}, 2000);
```

## 测试服务连接

```typescript
import { testQuarrelVoiceService } from './utils/quarrelVoiceDebug';

const result = await testQuarrelVoiceService();

if (result.success) {
  console.log('✅ 服务测试通过');
} else {
  console.error('❌ 服务测试失败:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('⚠️ 警告:', result.warnings);
}
```

## 在React组件中使用

```typescript
import { useEffect, useState } from 'react';
import { getQuarrelVoiceDebugInfo } from './utils/quarrelVoiceDebug';

function QuarrelVoiceDebugPanel() {
  const [debugInfo, setDebugInfo] = useState(getQuarrelVoiceDebugInfo());

  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo(getQuarrelVoiceDebugInfo());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>QuarrelVoice 调试信息</h3>
      <p>已初始化: {debugInfo.serviceStatus.initialized ? '✅' : '❌'}</p>
      <p>正在播放: {debugInfo.serviceStatus.playingRoles.length}</p>
      <p>队列长度: {debugInfo.serviceStatus.queueLength}</p>
      <p>当前并发: {debugInfo.audioServiceStatus.currentConcurrent}/{debugInfo.audioServiceStatus.maxConcurrent}</p>
    </div>
  );
}
```

## 调试技巧

### 1. 使用浏览器控制台

```javascript
// 在浏览器控制台
window.quarrelVoiceDebug.printInfo();

// 持续监控
const stop = window.quarrelVoiceDebug.startMonitoring(2000);
// 5秒后停止
setTimeout(stop, 5000);
```

### 2. 添加断点

在关键位置添加断点：

```typescript
import { printQuarrelVoiceDebugInfo } from './utils/quarrelVoiceDebug';

// 在提交话语前
printQuarrelVoiceDebugInfo();
await service.submitUtter(utter);
```

### 3. 日志记录

```typescript
import { getQuarrelVoiceDebugInfo } from './utils/quarrelVoiceDebug';

// 记录状态变化
const previousInfo = getQuarrelVoiceDebugInfo();
// ... 执行操作 ...
const currentInfo = getQuarrelVoiceDebugInfo();

if (currentInfo.serviceStatus.queueLength !== previousInfo.serviceStatus.queueLength) {
  console.log('队列长度变化:', {
    before: previousInfo.serviceStatus.queueLength,
    after: currentInfo.serviceStatus.queueLength,
  });
}
```

---

**最后更新**：2025-01-25  
**状态**：✅ 调试工具已完成

