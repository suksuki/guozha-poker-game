# AI中控系统故障排查指南

## 🔍 问题：启动监控没反应

### 错误信息
```
[InteractionService] 获取系统状态失败: TypeError: Cannot read properties of null (reading 'getResourceStatus')
[AIControlCenter] 系统未初始化，请先调用initialize()
```

### 原因分析

**问题根源**：AI中控系统未初始化

可能的原因：
1. SystemApplication未正确启动
2. AIControlModule未正确初始化
3. 初始化顺序问题
4. 初始化失败但未显示错误

### ✅ 已修复的问题

1. **空值检查**
   - `getResourceStatus()` 现在在未初始化时返回默认值
   - `getAnalysisResults()` 现在在未初始化时返回空数组
   - `getMonitorLayer()` 现在返回 `null` 而不是抛出错误

2. **错误处理**
   - `getSystemStatus()` 现在先检查初始化状态
   - `startMonitoring()` 现在检查初始化状态并给出明确错误

3. **UI改进**
   - 显示初始化状态
   - 未初始化时禁用按钮
   - 显示警告信息

### 🔧 检查步骤

#### 1. 检查控制台日志

打开浏览器控制台，查找以下日志：

**应该看到的日志**：
```
[App] 系统应用模块初始化完成
[AIControlModule] 初始化完成
[App] AI中控系统已初始化
```

**如果看到错误**：
- `[AIControlModule] 初始化失败` - 检查初始化配置
- `[AIControlCenter] 初始化失败` - 检查依赖项

#### 2. 检查初始化状态

在浏览器控制台运行：

```javascript
// 检查SystemApplication
const systemApp = window.__SYSTEM_APP__; // 如果暴露了
console.log('SystemApplication:', systemApp);

// 检查AI中控模块
const aiControlModule = systemApp?.getModule('ai-control');
console.log('AIControlModule:', aiControlModule);
console.log('状态:', aiControlModule?.getStatus());

// 检查AI中控系统
const aiControl = aiControlModule?.getAIControl();
console.log('AIControlCenter:', aiControl);
```

#### 3. 手动初始化（调试用）

如果系统未自动初始化，可以手动初始化：

```javascript
// 在浏览器控制台运行
import { AIControlCenter } from './services/ai/control/AIControlCenter';

const aiControl = AIControlCenter.getInstance();
await aiControl.initialize();
console.log('手动初始化完成');
```

### 🛠️ 解决方案

#### 方案1: 等待初始化完成

如果系统正在初始化，UI会显示"等待初始化..."，请稍候。

#### 方案2: 检查SystemApplication

确保SystemApplication正确启动：

```typescript
// 在App.tsx中
useEffect(() => {
  async function init() {
    const systemApp = SystemApplication.getInstance();
    await systemApp.initialize();
    await systemApp.start();
    
    // 检查AI中控模块
    const module = systemApp.getModule('ai-control');
    if (module) {
      console.log('AI中控模块状态:', module.getStatus());
    }
  }
  init();
}, []);
```

#### 方案3: 添加初始化监听

在AIControlDashboard中添加初始化监听：

```typescript
useEffect(() => {
  // 等待系统初始化
  const checkInitialization = setInterval(() => {
    const status = interactionService.getSystemStatus();
    if (status.initialized) {
      clearInterval(checkInitialization);
      loadSystemStatus();
    }
  }, 500);
  
  return () => clearInterval(checkInitialization);
}, []);
```

### 📋 验证清单

- [ ] SystemApplication已启动
- [ ] AIControlModule已注册
- [ ] AIControlModule已初始化
- [ ] AIControlCenter已初始化
- [ ] monitorLayer不为null
- [ ] analyzeLayer不为null
- [ ] UI显示"已初始化"

### 🎯 预期行为

**初始化成功后**：
1. UI显示"📊 已初始化"
2. "启动监控"按钮可用
3. 点击后显示"✅ 运行中"
4. 资源状态显示正常

**初始化失败时**：
1. UI显示"⏳ 未初始化"
2. 显示警告"⚠️ 系统正在初始化，请稍候..."
3. 按钮显示"等待初始化..."并禁用
4. 控制台显示错误信息

### 📝 调试技巧

1. **查看完整日志**
   - 打开浏览器控制台
   - 查看所有 `[AIControl*]` 开头的日志

2. **检查初始化顺序**
   - SystemApplication应该最先初始化
   - AIControlModule应该在SystemApplication之后初始化

3. **检查依赖**
   - 确保所有依赖的服务都已加载
   - 检查是否有循环依赖

### 🚀 快速修复

如果问题持续，尝试：

1. **刷新页面** - 重新初始化
2. **清除缓存** - 清除浏览器缓存
3. **检查网络** - 确保所有资源加载完成
4. **查看错误** - 查看控制台的完整错误堆栈

### 📞 获取帮助

如果问题仍未解决，请提供：
1. 完整的控制台错误信息
2. 浏览器版本
3. 操作系统版本
4. 初始化日志

