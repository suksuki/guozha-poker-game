# 项目结构说明

## 目录结构

```
vue-mobile/
├── docs/                          # 文档目录
│   ├── CHANGELOG.md              # 更新日志
│   ├── PROJECT_STRUCTURE.md      # 项目结构说明（本文件）
│   ├── daily-updates/            # 每日更新记录
│   │   └── 2024-12-19-improvements.md
│   └── tts-playback-implementation.md  # TTS实现文档
│
├── src/                           # 源代码目录
│   ├── components/                # Vue组件
│   │   ├── game/                 # 游戏相关组件
│   │   │   ├── GameBoard.vue
│   │   │   ├── GameResultScreen.vue
│   │   │   ├── HandCards.vue
│   │   │   ├── PlayArea.vue
│   │   │   └── PlayerInfo.vue
│   │   ├── card/                 # 卡牌相关组件
│   │   │   └── CardView.vue
│   │   ├── chat/                 # 聊天相关组件
│   │   │   ├── ChatBubble.vue
│   │   │   └── ChatInput.vue
│   │   ├── settings/             # 设置相关组件
│   │   │   ├── SettingsPanel.vue
│   │   │   └── TTSServerDialog.vue
│   │   └── common/               # 通用组件
│   │       └── ActionButtons.vue
│   │
│   ├── services/                 # 服务层
│   │   ├── audio/                # 音频服务
│   │   │   ├── channelScheduler.ts
│   │   │   └── multiChannelAudioService.ts
│   │   ├── tts/                  # TTS服务
│   │   │   ├── browserTTSClient.ts
│   │   │   ├── meloTTSClient.ts
│   │   │   ├── piperTTSClient.ts
│   │   │   ├── ttsPlaybackService.ts
│   │   │   ├── ttsService.ts
│   │   │   ├── types.ts
│   │   │   └── init.ts
│   │   ├── ai/                   # AI服务
│   │   │   └── aiBrainIntegration.ts
│   │   └── llm/                  # LLM服务
│   │       └── ollamaServerManager.ts
│   │
│   ├── stores/                   # Pinia状态管理
│   │   ├── gameStore.ts
│   │   ├── chatStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── types/                    # TypeScript类型定义
│   │   ├── card.ts
│   │   ├── channel.ts
│   │   └── voice.ts
│   │
│   ├── utils/                    # 工具函数
│   │   ├── cardUtils.ts
│   │   └── playToSpeechText.ts
│   │
│   ├── styles/                   # 样式文件
│   │   └── mobile-adaptive.css
│   │
│   ├── App.vue                   # 根组件
│   └── main.ts                   # 入口文件
│
├── tests/                        # 测试目录
│   ├── unit/                     # 单元测试
│   │   ├── components/           # 组件测试
│   │   ├── services/             # 服务测试
│   │   ├── stores/               # Store测试
│   │   └── utils/                # 工具函数测试
│   ├── integration/              # 集成测试
│   │   ├── game/                 # 游戏流程测试
│   │   ├── tts/                  # TTS集成测试
│   │   └── chat/                 # 聊天集成测试
│   ├── setup.ts                  # 测试设置
│   └── docs/tests/README.md      # 测试文档
│
├── dist/                         # 构建输出目录
├── node_modules/                  # 依赖包
├── index.html                    # HTML入口
├── package.json                   # 项目配置
├── tsconfig.json                  # TypeScript配置
├── vite.config.ts                # Vite配置
└── docs/README.md                # 项目说明（完整文档）
```

## 目录说明

### src/components/
按功能分组：
- **game/**: 游戏相关组件（游戏板、结果屏幕、手牌等）
- **card/**: 卡牌相关组件
- **chat/**: 聊天相关组件
- **settings/**: 设置相关组件
- **common/**: 通用组件

### src/services/
按功能分组：
- **audio/**: 音频服务（多声道、声道调度）
- **tts/**: TTS服务（各种TTS客户端、播放服务）
- **ai/**: AI服务（AI Brain集成）
- **llm/**: LLM服务（Ollama服务器管理）

### tests/
按测试类型和功能分组：
- **unit/**: 单元测试，按模块分组
- **integration/**: 集成测试，按功能分组

## 文件命名规范

- **组件**: PascalCase (如 `GameBoard.vue`)
- **服务/工具**: camelCase (如 `gameStore.ts`)
- **类型定义**: camelCase (如 `card.ts`)
- **测试文件**: kebab-case (如 `game-store.test.ts`)

## 清理规则

- 删除所有 `.backup` 文件
- 删除临时文件
- 保持目录结构清晰
- 文档统一放在 `docs/` 目录

