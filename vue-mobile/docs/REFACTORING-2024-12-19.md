# 项目重构记录 - 2024-12-19

## 重构目标
重新整理项目文件结构，使其更加清晰、有序，便于维护和扩展。

## 重构内容

### 1. 组件目录重组

**之前**: 所有组件都在 `src/components/` 根目录下

**之后**: 按功能分组
```
src/components/
├── game/              # 游戏相关组件
│   ├── GameBoard.vue
│   ├── GameResultScreen.vue
│   ├── HandCards.vue
│   ├── PlayArea.vue
│   └── PlayerInfo.vue
├── card/              # 卡牌相关组件
│   └── CardView.vue
├── chat/              # 聊天相关组件
│   ├── ChatBubble.vue
│   └── ChatInput.vue
├── settings/          # 设置相关组件
│   ├── SettingsPanel.vue
│   └── TTSServerDialog.vue
└── common/            # 通用组件
    └── ActionButtons.vue
```

### 2. 服务目录重组

**之前**: 所有服务都在 `src/services/` 根目录下

**之后**: 按功能分组
```
src/services/
├── audio/             # 音频服务
│   ├── channelScheduler.ts
│   └── multiChannelAudioService.ts
├── tts/               # TTS服务（保持不变）
│   ├── browserTTSClient.ts
│   ├── meloTTSClient.ts
│   ├── piperTTSClient.ts
│   ├── ttsPlaybackService.ts
│   ├── ttsService.ts
│   ├── types.ts
│   └── init.ts
├── ai/                # AI服务
│   └── aiBrainIntegration.ts
└── llm/               # LLM服务
    └── ollamaServerManager.ts
```

### 3. 清理工作

- ✅ 删除备份文件 `gameStore.ts.backup`
- ✅ 更新所有导入路径
- ✅ 确保所有文件引用正确

### 4. 更新的导入路径

#### 组件导入
```typescript
// 之前
import GameBoard from './components/GameBoard.vue';

// 之后
import GameBoard from './components/game/GameBoard.vue';
```

#### 服务导入
```typescript
// 之前
import { aiBrainIntegration } from '../services/aiBrainIntegration';
import { getMultiChannelAudioService } from '../services/multiChannelAudioService';

// 之后
import { aiBrainIntegration } from '../services/ai/aiBrainIntegration';
import { getMultiChannelAudioService } from '../services/audio/multiChannelAudioService';
```

## 更新的文件列表

### 组件文件
- `src/App.vue` - 更新GameBoard导入
- `src/components/game/GameBoard.vue` - 更新所有子组件导入

### Store文件
- `src/stores/chatStore.ts` - 更新服务导入
- `src/stores/gameStore.ts` - 更新服务导入
- `src/stores/settingsStore.ts` - 更新服务导入

### 服务文件
- `src/services/audio/multiChannelAudioService.ts` - 更新TTS服务导入
- `src/services/tts/ttsPlaybackService.ts` - 更新音频服务导入
- `src/services/tts/init.ts` - 更新音频服务导入

### 组件设置文件
- `src/components/settings/SettingsPanel.vue` - 更新服务导入
- `src/components/settings/TTSServerDialog.vue` - 更新类型导入

## 目录结构优势

1. **按功能分组**: 相关文件集中在一起，便于查找和维护
2. **清晰的层次**: 每个目录职责明确
3. **易于扩展**: 新增功能时只需在对应目录添加文件
4. **减少冲突**: 不同功能的文件分开，减少合并冲突

## 注意事项

1. **测试文件**: 测试文件的导入路径可能需要更新（如果引用移动的文件）
2. **构建配置**: 确保构建工具能正确解析新的路径
3. **IDE支持**: 某些IDE可能需要重新索引项目

## 后续工作

- [ ] 更新测试文件的导入路径（如果需要）
- [ ] 验证所有功能正常工作
- [ ] 更新项目文档中的路径引用

## 验证步骤

1. 运行 `npm run build` 确保构建成功
2. 运行 `npm test` 确保测试通过
3. 运行 `npm run dev` 确保开发服务器正常启动
4. 检查所有功能是否正常工作

