# 国炸扑克游戏 - Vue Mobile 版本

## 项目简介

这是一个基于 Vue 3 + TypeScript + Vite 开发的移动端扑克游戏应用，支持多声道语音播报、AI聊天、TTS语音合成等功能。

## 项目结构

```
vue-mobile/
├── docs/                    # 文档目录（所有文档都在这里）
│   ├── INDEX.md            # 文档索引
│   ├── README.md           # 项目完整文档（本文件）
│   ├── CHANGELOG.md        # 更新日志
│   ├── PROJECT_STRUCTURE.md # 项目结构说明
│   ├── REFACTORING-2024-12-19.md # 重构记录
│   ├── tests/              # 测试文档
│   │   └── README.md
│   └── daily-updates/      # 每日更新记录
│
├── src/                     # 源代码
│   ├── components/         # Vue组件（按功能分组）
│   │   ├── game/           # 游戏相关组件
│   │   ├── card/           # 卡牌相关组件
│   │   ├── chat/          # 聊天相关组件
│   │   ├── settings/      # 设置相关组件
│   │   └── common/        # 通用组件
│   │
│   ├── services/           # 服务层（按功能分组）
│   │   ├── audio/         # 音频服务
│   │   ├── tts/           # TTS服务
│   │   ├── ai/            # AI服务
│   │   └── llm/           # LLM服务
│   │
│   ├── stores/             # Pinia状态管理
│   ├── types/              # TypeScript类型定义
│   ├── utils/              # 工具函数
│   └── styles/             # 样式文件
│
├── tests/                   # 测试目录
│   ├── unit/               # 单元测试
│   └── integration/        # 集成测试
│
└── dist/                    # 构建输出
```

详细结构说明请参考 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

## 主要功能

- 🎮 **游戏核心**: 完整的扑克游戏逻辑，支持多人游戏
- 🎨 **真实卡牌UI**: 精美的扑克牌样式显示
- 🔊 **多声道语音**: 支持最多8个玩家同时语音播报
- 🗣️ **TTS语音合成**: 支持多种TTS服务（Piper、Melo、Browser）
- 💬 **AI聊天**: 集成AI Brain，支持智能聊天
- ⚙️ **丰富设置**: 游戏、UI、AI、TTS等全方位配置

## 技术栈

- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI组件**: Vant 4
- **状态管理**: Pinia
- **测试**: Vitest
- **音频**: Web Audio API

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 测试

```bash
# 运行所有测试
npm test

# 运行测试（单次）
npm test -- --run

# 运行特定测试
npm test -- comprehensive.test.ts
```

## 核心特性

### 多声道音频系统

- **报牌**: 独占 `ANNOUNCEMENT` 声道（中央声道），优先级4
- **聊天**: 使用 `PLAYER_0` 到 `PLAYER_7` 玩家声道，动态分配
- **并发播放**: 报牌和聊天可以同时播放，互不干扰

### TTS服务支持

- **Piper TTS**: 本地TTS服务
- **Melo TTS**: 远程TTS服务
- **Browser TTS**: 浏览器内置TTS（降级方案）

### AI Brain集成

- 智能聊天生成
- 游戏状态感知
- 多玩家并发聊天

## 文档导航

📖 **查看 [文档索引](./INDEX.md) 获取完整文档列表**

### 主要文档

- [文档索引](./INDEX.md) - 所有文档的导航
- [项目结构说明](./PROJECT_STRUCTURE.md) - 详细的项目结构
- [更新日志](./CHANGELOG.md) - 版本更新记录
- [重构记录](./REFACTORING-2024-12-19.md) - 项目重构历史
- [测试文档](./tests/README.md) - 测试套件说明

### 开发文档

- [TTS播放实现](./tts-playback-implementation.md) - TTS系统实现细节
- [每日更新记录](./daily-updates/) - 历史更新记录

## 开发规范

### 文件命名

- **组件**: PascalCase (如 `GameBoard.vue`)
- **服务/工具**: camelCase (如 `gameStore.ts`)
- **类型定义**: camelCase (如 `card.ts`)
- **测试文件**: kebab-case (如 `game-store.test.ts`)

### 目录组织

- 组件按功能分组（game、card、chat、settings、common）
- 服务按功能分组（audio、tts、ai、llm）
- 测试按类型分组（unit、integration）
- **所有文档统一放在 `docs/` 目录**

## 更新记录

最新更新请查看 [CHANGELOG.md](./CHANGELOG.md)

## 许可证

[待定]
