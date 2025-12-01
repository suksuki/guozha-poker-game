# AI中控系统UI组件

## 📦 组件列表

### 主组件
- **AIControlDashboard**: 主控制面板，包含所有标签页

### 功能组件
- **OptimizationCenter**: 优化中心
- **DataCenter**: 数据中心
- **KnowledgeBase**: 知识库
- **SettingsCenter**: 设置中心

## 🚀 快速开始

### 1. 导入组件

```typescript
import { AIControlDashboard } from './components/ai-control/AIControlDashboard';
```

### 2. 使用组件

```tsx
function App() {
  return (
    <div>
      <AIControlDashboard />
    </div>
  );
}
```

## 🧪 快速测试

### 手动测试

1. 启动应用: `npm run dev`
2. 打开浏览器，找到右下角的"🧠 AI中控"按钮
3. 点击打开控制面板
4. 测试各个标签页的功能

### 测试清单

- [x] 打开/关闭控制面板
- [x] 切换标签页
- [x] 查看系统状态
- [x] 查看分析结果
- [x] 生成优化方案
- [x] 查看游戏会话
- [x] 浏览知识库
- [x] 修改设置

## 📝 组件说明

### AIControlDashboard

主控制面板，包含7个标签页：
- 🏠 仪表盘：系统状态概览
- 📊 监控中心：实时监控
- 🔍 分析中心：分析结果管理
- ⚙️ 优化中心：优化方案管理
- 📚 数据中心：游戏数据管理
- 🧠 知识库：知识记录浏览
- ⚙️ 设置：系统配置

### OptimizationCenter

优化中心组件，功能包括：
- 优化方案列表
- 方案详情（代码预览、参数预览）
- 生成优化方案
- 执行优化

### DataCenter

数据中心组件，功能包括：
- 数据统计
- 游戏会话列表
- 会话详情
- 生成训练数据（JSON/CSV/JSONL）
- 导出会话数据

### KnowledgeBase

知识库组件，功能包括：
- 分类浏览
- 搜索功能
- 记录详情
- 导出功能

### SettingsCenter

设置中心组件，功能包括：
- 监控设置
- 分析设置
- 执行设置
- 演化设置

## 🎨 样式

所有组件使用独立的CSS文件：
- `AIControlDashboard.css`
- `OptimizationCenter.css`
- `DataCenter.css`
- `KnowledgeBase.css`
- `SettingsCenter.css`

## 🔧 依赖

- React
- TypeScript
- AI中控系统服务（InteractionService）
- AI中控中心（AIControlCenter）

## 📋 注意事项

1. **初始化**: 确保AI中控系统已初始化
2. **服务**: 确保InteractionService可用
3. **样式**: 确保CSS文件已正确导入
4. **响应式**: 组件支持响应式布局

## 🐛 常见问题

### 问题1: 组件不显示
- 检查是否在App.tsx中导入
- 检查CSS是否正确加载

### 问题2: 数据不显示
- 检查AI中控系统是否已初始化
- 查看浏览器控制台错误

### 问题3: 样式不正确
- 检查CSS文件是否正确导入
- 检查是否有样式冲突

## 📚 相关文档

- [设计文档](../../docs/design/ai-control-center-interaction-system.md)
- [实现状态](../../docs/design/ai-control-center-ui-complete.md)
- [快速测试指南](./quick-test.md)

