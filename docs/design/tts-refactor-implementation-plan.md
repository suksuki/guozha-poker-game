# TTS配置重构 - 实施计划

## 📅 实施时间线

### 阶段一：核心架构（预计2-3小时）
**目标**：建立基础架构，支持多服务器管理

1. **数据模型层** (30分钟)
   - [ ] 创建 `src/tts/models/TTSServerConfig.ts`
   - [ ] 创建 `src/tts/models/TTSSceneConfig.ts`
   - [ ] 创建 `src/tts/models/TTSGlobalSettings.ts`
   - [ ] 添加类型定义和默认值

2. **服务器管理层** (60分钟)
   - [ ] 实现 `src/tts/manager/TTSServerManager.ts`
     - 服务器CRUD操作
     - 优先级管理
     - 状态管理
   - [ ] 实现持久化功能 `src/tts/utils/storage.ts`
   - [ ] 实现配置验证 `src/tts/utils/validation.ts`

3. **服务管理层重构** (60分钟)
   - [ ] 重构 `src/tts/ttsServiceManager.ts`
     - 集成 TTSServerManager
     - 实现场景化合成
     - 实现自动回退
   - [ ] 创建 `src/tts/manager/TTSClientFactory.ts`

4. **健康检查优化** (30分钟)
   - [ ] 实现 `src/tts/utils/healthCheck.ts`
   - [ ] 修改健康检查逻辑：禁用服务器不检查
   - [ ] 添加指数退避策略

### 阶段二：UI组件（预计2-3小时）
**目标**：提供友好的配置界面

5. **基础组件** (60分钟)
   - [ ] 创建 `src/components/tts/TTSConfigPanel.tsx`
   - [ ] 创建 `src/components/tts/StatusIndicator.tsx`
   - [ ] 创建基础样式 `TTSConfigPanel.css`

6. **服务器管理UI** (90分钟)
   - [ ] 创建 `src/components/tts/TTSServerList.tsx`
   - [ ] 创建 `src/components/tts/TTSServerItem.tsx`
   - [ ] 创建 `src/components/tts/TTSServerEditor.tsx`
   - [ ] 支持本地/局域网/自定义输入模式

7. **提供者配置UI** (30分钟)
   - [ ] 创建 `src/components/tts/AzureTTSConfig.tsx`
   - [ ] 创建 `src/components/tts/PiperTTSConfig.tsx`
   - [ ] 创建 `src/components/tts/BrowserTTSConfig.tsx`

### 阶段三：高级功能（预计2小时）
**目标**：场景化配置和测试功能

8. **场景配置** (60分钟)
   - [ ] 创建 `src/components/tts/TTSSceneConfigPanel.tsx`
   - [ ] 实现场景选择器组件
   - [ ] 集成到配置面板

9. **测试功能** (60分钟)
   - [ ] 实现连接测试（健康检查）
   - [ ] 实现语音合成测试（实际生成音频）
   - [ ] 添加测试结果显示

### 阶段四：集成和优化（预计1-2小时）
**目标**：集成到现有系统，优化用户体验

10. **系统集成** (30分钟)
    - [ ] 集成到 `GameConfigPanel.tsx`
    - [ ] 添加新的配置标签页
    - [ ] 更新应用初始化逻辑

11. **样式和UX** (30分钟)
    - [ ] 完善所有组件样式
    - [ ] 添加响应式设计
    - [ ] 添加动画和过渡效果

12. **测试和文档** (30分钟)
    - [ ] 编写单元测试
    - [ ] 更新使用文档
    - [ ] 测试完整流程

## 🎯 关键里程碑

### ✅ Milestone 1: 核心架构完成
- TTSServerManager 可以管理多个服务器
- 配置可以持久化和恢复
- 禁用的服务器不被检查

### ✅ Milestone 2: 基础UI完成
- 可以添加、编辑、删除服务器
- 可以启用/禁用服务器
- 可以测试服务器连接

### ✅ Milestone 3: 场景配置完成
- 可以为不同场景配置不同TTS
- 自动回退机制工作
- 语音合成测试可用

### ✅ Milestone 4: 生产就绪
- 集成到 GameConfigPanel
- 样式完善
- 文档完整

## 🔧 技术要点

### 1. 状态管理
使用 React Hook 管理配置状态：
```typescript
// src/hooks/useTTSConfig.ts
export function useTTSConfig() {
  const [servers, setServers] = useState<TTSServerConfig[]>([]);
  const [sceneConfig, setSceneConfig] = useState<TTSSceneConfig>(...);
  const [globalSettings, setGlobalSettings] = useState<TTSGlobalSettings>(...);
  
  // 加载配置
  useEffect(() => {
    const loaded = loadConfiguration();
    setServers(loaded.servers);
    setSceneConfig(loaded.sceneConfig);
    setGlobalSettings(loaded.globalSettings);
  }, []);
  
  // 自动保存
  useEffect(() => {
    saveConfiguration({ servers, sceneConfig, globalSettings });
  }, [servers, sceneConfig, globalSettings]);
  
  return {
    servers,
    sceneConfig,
    globalSettings,
    addServer,
    updateServer,
    removeServer,
    testServer,
    // ...
  };
}
```

### 2. 健康检查优化
```typescript
// 只检查启用的服务器
async checkAllEnabledServers() {
  const enabled = this.servers.filter(s => s.enabled);
  
  if (enabled.length === 0) {
    return; // 没有启用的服务器，不检查
  }
  
  await Promise.allSettled(
    enabled.map(s => this.checkServer(s.id))
  );
}

// 定时器只在有启用的服务器时运行
startHealthCheck(interval: number) {
  this.stopHealthCheck(); // 清除旧定时器
  
  const checkIfNeeded = () => {
    const hasEnabled = this.servers.some(s => s.enabled);
    if (hasEnabled) {
      this.checkAllEnabledServers();
    }
  };
  
  checkIfNeeded(); // 立即检查
  this.healthCheckTimer = window.setInterval(checkIfNeeded, interval);
}
```

### 3. 场景化合成
```typescript
async synthesizeForScene(scene: string, text: string) {
  const config = this.sceneConfig[`${scene}Sound`];
  const serverIds = config.serverIds;
  
  // 按优先级尝试
  for (const id of serverIds) {
    const server = this.getServer(id);
    
    // 跳过禁用和不健康的
    if (!server?.enabled || server.status?.health !== 'available') {
      continue;
    }
    
    try {
      return await this.synthesizeWithServer(id, text);
    } catch (err) {
      // 失败，尝试下一个
      continue;
    }
  }
  
  // 回退到浏览器
  if (config.fallbackToBrowser) {
    return await this.synthesizeWithBrowser(text);
  }
  
  throw new Error('No TTS server available');
}
```

### 4. 持久化策略
```typescript
// 自动保存（防抖）
const debouncedSave = debounce(() => {
  localStorage.setItem('tts_servers', JSON.stringify(servers));
  localStorage.setItem('tts_scene_config', JSON.stringify(sceneConfig));
}, 500);

// 在状态变化时保存
useEffect(() => {
  debouncedSave();
}, [servers, sceneConfig]);
```

## 🚨 风险和注意事项

### 1. 向后兼容
- **问题**：现有代码依赖旧的 TTS 初始化方式
- **解决**：保留 `initTTS()` API，内部转换为新系统
- **迁移**：提供自动迁移工具

### 2. 性能影响
- **问题**：频繁的健康检查可能影响性能
- **解决**：
  - 只检查启用的服务器
  - 使用指数退避
  - 可配置检查间隔

### 3. 用户体验
- **问题**：配置界面复杂，用户可能困惑
- **解决**：
  - 提供合理的默认配置
  - 添加帮助提示
  - 提供一键配置预设

### 4. 错误处理
- **问题**：网络错误、超时等异常情况
- **解决**：
  - 优雅降级
  - 清晰的错误提示
  - 自动重试机制

## 📊 测试检查清单

### 功能测试
- [ ] 添加服务器（本地/局域网/自定义）
- [ ] 编辑服务器配置
- [ ] 删除服务器
- [ ] 启用/禁用服务器
- [ ] 测试连接
- [ ] 测试语音合成
- [ ] 场景配置
- [ ] 自动回退
- [ ] 配置持久化

### 性能测试
- [ ] 健康检查不影响主线程
- [ ] 禁用服务器不被检查
- [ ] 并发语音合成正常
- [ ] 页面加载速度正常

### 兼容性测试
- [ ] 从旧配置迁移
- [ ] 不同浏览器兼容
- [ ] 移动端适配

## 🎉 完成标准

当满足以下所有条件时，重构完成：

1. ✅ 所有 TODO 任务完成
2. ✅ 所有测试通过
3. ✅ 文档更新完成
4. ✅ 代码审查通过
5. ✅ 用户可以：
   - 添加和管理多个TTS服务器
   - 为不同场景配置不同TTS
   - 测试服务器连接和语音合成
   - 启用/禁用服务器
   - 配置自动保存和恢复
6. ✅ 禁用的服务器不再被健康检查轮询
7. ✅ 自动回退机制正常工作

## 📞 相关资源

- **设计文档**: `docs/design/tts-config-refactor.md`
- **LLM配置参考**: `src/components/llm/ServerSelector.tsx`
- **现有TTS代码**: `src/tts/ttsServiceManager.ts`
- **游戏配置面板**: `src/components/game/GameConfigPanel.tsx`

