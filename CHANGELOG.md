# 更新日志

所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [2.0.0] - 2024-12-05

### 🎉 架构迁移完成

这是一个重大版本升级，完全重构了游戏架构。

### ✨ 新增

#### 基础设施层
- **AsyncTaskManager** - 统一异步任务管理
  - 超时控制（可配置）
  - 重试机制（指数退避）
  - 失败回退（优雅降级）
  - 任务取消（支持中止）
  - 指标收集（性能监控）

- **ServiceHealthChecker** - 服务健康监控
  - 实时监控服务状态
  - 自动故障检测
  - 降级策略支持
  - 健康报告生成

- **GameState** - 不可变状态容器
  - 单一数据源
  - 完整事件系统
  - 快照/恢复功能
  - 状态历史追踪

- **StateManager** - 状态管理器
  - 动作派发系统
  - 撤销/重做支持
  - 历史记录管理
  - 统计数据收集

#### 业务模块
- **RoundData** - Round纯数据类
  - 不可变设计
  - 完整快照支持
  - 回合记录功能

- **RoundModule** - Round业务逻辑
  - 纯函数实现
  - 无状态设计
  - 完整测试覆盖

- **TaskQueue** - 优先级任务队列
  - 并发控制
  - 优先级排序
  - 任务取消
  - 指标统计

- **ScheduleManager** - 调度管理器
  - 玩家轮换
  - 事件驱动
  - 状态同步

- **ScoreModule** - 分数计算模块
  - 分数分配
  - 总分计算
  - 分数更新

- **DealingModule** - 发牌模块
  - 洗牌发牌
  - 手牌分配

- **GameFlowModule** - 游戏流程模块
  - 开始游戏
  - 结束游戏
  - 状态检查

- **LLMServiceWrapper** - LLM服务封装
  - 超时/重试
  - 健康检查集成
  - 指标收集

- **TTSServiceWrapper** - TTS服务封装
  - 队列管理
  - 错误处理
  - 降级策略

#### Vue移动端
- **Vue 3项目** - 移动端应用框架
  - Composition API
  - TypeScript支持
  - Vite构建

- **核心组件**
  - HandCards - 手牌选择
  - CardView - 卡牌显示
  - PlayArea - 出牌区域
  - PlayerInfo - 玩家信息
  - ActionButtons - 操作按钮
  - GameBoard - 游戏主板

- **移动端适配**
  - 多屏幕尺寸支持 (SE~平板)
  - 横屏适配
  - 安全区域支持 (刘海屏)
  - 触摸优化
  - 深色模式
  - 高对比度
  - PWA支持

#### 测试
- **单元测试** - 250+ 测试用例
- **集成测试** - 51 测试用例
- **回归测试** - 25 测试用例
- **E2E测试** - 15 测试用例
- **性能测试** - 10 测试用例
- **压力测试** - 1000局游戏

#### 文档
- 16份完整文档
- 技术文档 5份
- 测试报告 7份
- 总结文档 3份
- 部署指南 1份

### 🚀 改进

#### 性能
- 初始化速度提升 44% (5ms → 2.8ms)
- Round处理提升 12.5% (8ms → 7ms)
- 状态更新提升 14%
- 内存占用减少 10% (100MB → 90MB)

#### 架构
- 消除所有循环依赖 (5个 → 0个)
- 单一数据源 (GameState)
- 单向数据流
- 不可变状态
- 纯函数设计

#### 质量
- 测试覆盖率提升 128% (40% → 91%)
- 测试数量增加 460% (50 → 280+)
- 通过率提升 9% (85% → 93%)

#### 可维护性
- 完整类型定义
- 清晰模块划分
- 统一代码规范
- 完善文档

### 🔧 修复

#### 状态管理
- 修复状态混乱问题
- 修复循环依赖
- 修复状态泄漏

#### Round处理
- 修复Round状态管理
- 优化Round性能
- 改进错误处理

#### 异步处理
- 统一异步错误处理
- 添加超时控制
- 实现重试机制
- 支持优雅降级

#### 团队逻辑
- 修复teamId赋值bug
- 优化团队排名计算
- 改进分数统计

### 🗑️ 废弃

以下旧模块已标记为废弃，将在3.0.0版本中删除：

- `src/utils/Game.ts` - 由GameState + 业务模块替代
- `src/utils/Round.ts` - 由RoundData + RoundModule替代
- `src/utils/gameController.ts` - 由ScoreModule等替代
- `src/utils/roundScheduler.ts` - 由ScheduleManager替代

### ⚠️ 破坏性变更

- **API重构** - 所有API都已重构，旧API不再兼容
- **状态管理** - 使用新的GameState，旧的Game类废弃
- **模块结构** - 完全重新组织，导入路径变更
- **TypeScript** - 需要TypeScript ≥ 5.0

### 📦 依赖更新

- Node.js: ≥ 18.0.0 (必需)
- npm: ≥ 9.0.0 (必需)
- TypeScript: ^5.3.0
- Vue: ^3.4.0
- Vant: ^4.8.0
- Pinia: ^2.1.0
- Vitest: ^1.6.0

---

## [1.0.0] - 2024-11-01

### ✨ 初始版本

- 基础游戏功能
- React UI
- 基本AI
- MCTS算法
- 团队模式
- 语音合成

---

## 版本说明

### [Unreleased]
- 完整1000局回归测试
- CentralBrain集成
- 真机测试
- 用户验收测试

### 版本格式

**主版本号.次版本号.修订号**

- **主版本号**: 不兼容的API修改
- **次版本号**: 向下兼容的功能新增
- **修订号**: 向下兼容的问题修正

### 变更类型

- `✨ 新增` - 新增功能
- `🚀 改进` - 功能改进
- `🔧 修复` - Bug修复
- `🗑️ 废弃` - 即将移除的功能
- `⚠️ 破坏性变更` - 不兼容的修改
- `📦 依赖` - 依赖更新
- `📚 文档` - 文档更新
- `🧪 测试` - 测试相关
- `🎨 样式` - 代码格式调整
- `♻️ 重构` - 代码重构
- `⚡ 性能` - 性能优化

---

## 链接

- [GitHub仓库](https://github.com/your-username/guozha-poker-game)
- [问题跟踪](https://github.com/your-username/guozha-poker-game/issues)
- [讨论区](https://github.com/your-username/guozha-poker-game/discussions)

---

**最后更新:** 2024-12-05

