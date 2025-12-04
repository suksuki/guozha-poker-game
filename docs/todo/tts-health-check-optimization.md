# TTS 健康检查优化计划

## 当前状态

### 工作方式
- ✅ TTS 服务器配置可以正确保存和加载
- ✅ 场景配置（系统音效、聊天语音、报牌语音、AI对话音）可以正确保存
- ✅ 启用的服务器都能在界面上选择

### 已知问题
- ⚠️ 刷新页面后，服务器的健康状态（`health`）是 `undefined`
- ⚠️ 健康检查是异步的，完成后不会自动更新界面
- ⚠️ 用户看不到服务器的实时健康状态

### 当前解决方案
```typescript
// src/components/tts/TTSSceneConfigPanel.tsx
const enabledServers = servers
  .filter(s => s.enabled) // 只检查启用状态，不检查健康状态
  .sort((a, b) => a.priority - b.priority);
```

**权衡：**
- ✅ 配置能正确保存和恢复
- ✅ 不会因为健康检查未完成而过滤掉服务器
- ⚠️ 但看不到服务器的实时健康状态

---

## 未来优化方案

### 目标
- 健康检查完成后，自动更新界面显示
- 用户能看到每个服务器的实时健康状态
- 不影响配置的保存和加载

### 实现方案

#### 方案 1：事件订阅机制（推荐）

**核心思路：**
- `TTSServerManager` 维护一个订阅者列表
- 当健康状态更新时，通知所有订阅者
- `useTTSConfig` 订阅状态变化，自动刷新

**代码结构：**

```typescript
// src/tts/manager/TTSServerManager.ts

class TTSServerManager {
  private subscribers: Set<() => void> = new Set();
  
  // 订阅状态变化
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback); // 返回取消订阅函数
  }
  
  // 通知订阅者
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }
  
  // 更新服务器状态时通知
  updateServerHealth(serverId: string, health: ServerHealth): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.status = { ...server.status, health };
      this.servers.set(serverId, server);
      this.notifySubscribers(); // ← 通知订阅者
    }
  }
}
```

```typescript
// src/hooks/useTTSConfig.ts

export function useTTSConfig() {
  const [servers, setServers] = useState<TTSServerConfig[]>([]);
  
  useEffect(() => {
    // 订阅服务器状态变化
    const unsubscribe = serverManager.subscribe(() => {
      // 状态变化时，重新获取服务器列表
      const updated = serverManager.getAllServers();
      setServers([...updated]);
    });
    
    return unsubscribe; // 组件卸载时取消订阅
  }, [serverManager]);
  
  // ... 其他代码
}
```

#### 方案 2：轮询机制（简单但不优雅）

```typescript
// src/hooks/useTTSConfig.ts

useEffect(() => {
  // 每 5 秒刷新一次服务器状态
  const interval = setInterval(() => {
    const updated = serverManager.getAllServers();
    setServers([...updated]);
  }, 5000);
  
  return () => clearInterval(interval);
}, [serverManager]);
```

**优点：** 简单直接  
**缺点：** 即使没有变化也会刷新，浪费资源

#### 方案 3：手动刷新按钮

```typescript
// 在 TTSConfigPanel 中添加刷新按钮
<button onClick={() => refreshServers()}>
  🔄 刷新服务器状态
</button>
```

**优点：** 用户可控  
**缺点：** 需要用户手动操作

---

## 推荐方案

**使用方案 1（事件订阅）**，因为：
- ✅ 自动响应状态变化
- ✅ 不浪费资源（只在真正变化时更新）
- ✅ 用户体验最好
- ✅ 符合 React 最佳实践

---

## 实施步骤

1. **在 `TTSServerManager` 中添加订阅机制**
   - 添加 `subscribe()` 方法
   - 在状态更新时调用 `notifySubscribers()`

2. **在 `useTTSConfig` 中订阅状态变化**
   - 使用 `useEffect` 订阅
   - 状态变化时更新 `servers` state
   - 组件卸载时取消订阅

3. **测试验证**
   - 刷新页面，观察健康检查完成后界面是否自动更新
   - 确认配置保存和加载仍然正常

---

## 优先级

- **优先级：** 低（当前方案已满足基本需求）
- **预计工作量：** 2-3 小时
- **收益：** 提升用户体验，显示实时健康状态

---

## 相关文件

- `src/tts/manager/TTSServerManager.ts` - 服务器管理器
- `src/hooks/useTTSConfig.ts` - TTS 配置 Hook
- `src/components/tts/TTSSceneConfigPanel.tsx` - 场景配置面板
- `src/tts/utils/storage.ts` - 配置持久化

