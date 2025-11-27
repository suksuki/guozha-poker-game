# 长吵架节拍化系统

## 概述

实现了 Phase 2：长吵架节拍化功能，支持：
- Beats 生成器：根据场景生成节拍结构
- 分段生成与播放：按节拍分段生成台词，边生成边播放
- 插嘴机制：支持在长吵架中插入短句（QUICK_JAB）

## 核心组件

### 1. BeatsGenerator (`src/ai/beatsGenerator.ts`)
- 生成节拍结构（反讽开场、反击、升级、收尾）
- 生成 LLM Prompt
- 解析 LLM 响应

### 2. SegmentedPlayback (`src/audio/SegmentedPlayback.ts`)
- 管理分段播放
- 支持边生成边播放
- 处理段间隔，允许插嘴

### 3. InterruptionManager (`src/audio/InterruptionManager.ts`)
- 管理插嘴逻辑
- 控制插嘴次数和冷却时间
- 检查插嘴窗口

### 4. QuarrelService (`src/ai/quarrelService.ts`)
- 整合 Beats 生成、LLM 调用和分段播放
- 提供高级 API

## 使用方式

### 基础使用

```tsx
import { useGameAudio } from '@/hooks/useGameAudio';

function GameComponent() {
  const gameAudio = useGameAudio();

  // 触发长吵架
  const handleQuarrel = async (player: Player, targetPlayer: Player) => {
    await gameAudio.handleLongQuarrel(
      player,
      targetPlayer,
      '你这一手打得不行！'  // 对手上一句话
    );
  };

  return <button onClick={() => handleQuarrel(player1, player2)}>开始吵架</button>;
}
```

### 直接使用 QuarrelService

```tsx
import { getQuarrelService } from '@/ai/quarrelService';
import { useAudioRoom } from '@/audio';

function Component() {
  const audioRoom = useAudioRoom();
  const quarrelService = getQuarrelService();
  quarrelService.setAudioRoom(audioRoom);

  const startQuarrel = async () => {
    await quarrelService.startQuarrel({
      roleId: 'player0',
      player: player0,
      opponentLastUtterance: '你这一手打得不行！',
      scene: 'quarrel',
      targetLength: 60,
      civility: 2,
      lang: 'zh',
      priority: 'MAIN_FIGHT',
    });
  };
}
```

## 工作流程

1. **触发长吵架**：调用 `handleLongQuarrel` 或 `startQuarrel`
2. **生成 Beats**：根据场景和对手的话生成节拍结构
3. **调用 LLM**：使用 Beats Prompt 调用 LLM 生成分段内容
4. **分段播放**：按节拍分段生成 TTS 并播放
5. **允许插嘴**：在段间隔中允许其他角色插嘴（QUICK_JAB）

## 插嘴机制

- **插嘴窗口**：每段播放完成后 500ms 内
- **插嘴限制**：每个长吵架最多允许 2 次插嘴
- **冷却时间**：插嘴后 1 秒冷却
- **优先级**：插嘴使用 QUICK_JAB 优先级

## 配置选项

### QuarrelConfig

```tsx
{
  roleId: string;
  player: Player;
  opponentLastUtterance?: string;  // 对手上一句话
  scene?: string;  // 场景：card_game, quarrel, chat
  targetLength?: number;  // 目标长度（字），默认 60
  civility?: number;  // 文明等级，默认 2
  lang?: TTSLanguage;  // 语言，默认 'zh'
  priority?: Priority;  // 优先级，默认 'MAIN_FIGHT'
}
```

### InterruptionConfig

```tsx
{
  maxInterruptionsPerQuarrel?: number;  // 最多插嘴次数，默认 2
  interruptionCooldown?: number;  // 冷却时间（毫秒），默认 1000
  minSegmentGap?: number;  // 最小段间隔（毫秒），默认 500
}
```

## LLM 配置

默认使用 Ollama API (`http://localhost:11434/api/chat`)，模型 `qwen2.5:latest`。

可以在 `quarrelService.ts` 中修改：
- API 地址
- 模型名称
- 超时时间

## 下一步

1. **优化 LLM Prompt**：根据实际效果调整 Prompt
2. **添加更多节拍类型**：扩展节拍库
3. **优化插嘴时机**：更智能的插嘴窗口检测
4. **性能优化**：并行生成 TTS，减少延迟

