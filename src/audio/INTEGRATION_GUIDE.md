# 多声道音频系统集成指南

## 已完成的功能

### ✅ 1. 南昌话转换集成
- TTS 服务自动检测 `lang='nanchang'` 并转换文本
- 使用 `nanchang_rules.ts` 中的规则进行转换

### ✅ 2. 游戏事件集成
- `GameAudioIntegration` 服务处理所有游戏事件
- 支持：出牌、要不起、胜利、失败、挑衅、聊天等

### ✅ 3. TTS API 客户端
- `BrowserTTSClient`：浏览器 TTS（基础实现）
- `LocalTTSAPIClient`：本地 TTS API（支持 GPT-SoVITS、Coqui TTS 等）
- `EdgeTTSClient`：Edge TTS（需要后端代理）

### ✅ 4. 音频预加载
- `AudioPreloader` 预加载常用游戏台词
- 提高播放响应速度

### ✅ 5. 游戏组件集成
- `useGameAudio` Hook 整合所有功能
- 在 `MultiPlayerGameBoard` 中自动使用
- 在 `useChatBubbles` 中自动处理聊天消息

## 使用方式

### 基础使用（已自动集成）

游戏组件中已经自动集成了多声道音频系统：

```tsx
// MultiPlayerGameBoard.tsx 中已包含
const gameAudio = useGameAudio({
  enableAudio: true,
  maxConcurrent: 2,
  enableDucking: true,
  preloadCommon: true,
});
```

### 手动使用

如果需要手动控制音频播放：

```tsx
import { useGameAudio } from '@/hooks/useGameAudio';

function MyComponent() {
  const gameAudio = useGameAudio();
  
  // 处理出牌
  const handlePlayCard = async (player: Player, cards: Card[]) => {
    await gameAudio.handlePlayCard(player, cards);
  };
  
  // 处理聊天消息
  const handleChat = async (message: ChatMessage) => {
    await gameAudio.handleChatMessage(message);
  };
}
```

## 配置选项

### useGameAudio 配置

```tsx
const gameAudio = useGameAudio({
  enableAudio: true,        // 是否启用音频
  maxConcurrent: 2,         // 最大并发数
  enableDucking: true,      // 是否启用 ducking
  preloadCommon: true,      // 是否预加载常用音频
});
```

### 角色声线配置

```tsx
import { defaultSpeakerManager } from '@/tts/speakers';

// 添加角色
defaultSpeakerManager.setSpeaker({
  roleId: 'player0',
  name: '玩家0',
  lang: 'zh',
  voiceConfig: {
    lang: 'zh-CN',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
  pan: -0.35,  // 左声道
  volume: 1.0,
});
```

## TTS 后端配置

### 使用本地 TTS API

```tsx
import { setDefaultTTSClient, LocalTTSAPIClient } from '@/tts';

// 设置本地 TTS 客户端
const localTTS = new LocalTTSAPIClient({
  baseUrl: 'http://localhost:8000',
  timeout: 10000,
  retryCount: 2,
});

setDefaultTTSClient(localTTS);
```

### 使用 Edge TTS

```tsx
import { setDefaultTTSClient, EdgeTTSClient } from '@/tts';

// 设置 Edge TTS 客户端（需要后端代理）
const edgeTTS = new EdgeTTSClient();
setDefaultTTSClient(edgeTTS);
```

## 事件处理

游戏事件会自动触发音频播放：

- **出牌**：`handlePlayCard(player, cards, isBigDun)`
- **要不起**：`handlePass(player)`
- **胜利**：`handleWin(player)`
- **失败**：`handleLose(player)`
- **挑衅**：`handleTaunt(player, targetPlayer, text)`
- **聊天**：`handleChatMessage(message)`

## 性能优化

### 预加载常用音频

```tsx
import { preloadCommonAudio } from '@/audio/audioPreloader';

// 在游戏开始时预加载
await preloadCommonAudio();
```

### 缓存管理

TTS 结果自动缓存，相同文本不会重复生成。

## 故障排除

### 音频不播放

1. 检查浏览器是否支持 WebAudio API
2. 检查 AudioContext 是否已初始化
3. 检查用户是否已进行交互（浏览器自动播放限制）

### TTS 生成失败

1. 检查 TTS 服务是否可用
2. 检查网络连接（如果使用在线 TTS）
3. 查看控制台错误信息

### 多声道不工作

1. 检查 `maxConcurrent` 配置
2. 检查角色声线是否已配置
3. 检查音频数据是否已生成

## 下一步

1. **实现真正的 TTS 后端**：连接 GPT-SoVITS 或其他 TTS 服务
2. **优化音频质量**：使用更高质量的 TTS 模型
3. **添加更多语言支持**：扩展多语言 TTS
4. **性能监控**：添加音频播放性能监控

