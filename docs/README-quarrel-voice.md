# QuarrelVoiceService 快速开始指南

## 🚀 5分钟快速上手

### 1. 基本使用（3行代码）

```typescript
import { getQuarrelVoiceService, updateMainFightRoles } from './services/quarrelVoiceService';

const service = getQuarrelVoiceService();
await service.init();
updateMainFightRoles(['player_1', 'player_2']);

await service.submitUtter({
  roleId: 'player_1',
  text: '你这一手打得不行！',
  priority: 'MAIN_FIGHT',
  civility: 2,
  lang: 'zh',
  volume: 1.0
});
```

### 2. 使用 React Hook

```typescript
import { useQuarrelVoice } from './hooks/useQuarrelVoice';

function MyComponent() {
  const quarrelVoice = useQuarrelVoice();
  
  const handleTaunt = async () => {
    await quarrelVoice.submitMainFight('player_1', '你这一手打得不行！');
  };
  
  return <button onClick={handleTaunt}>对骂</button>;
}
```

### 3. 使用辅助工具

```typescript
import { handleQuarrelScene } from './utils/quarrelVoiceHelper';

await handleQuarrelScene(player1, player2, text1, text2);
```

## 📚 完整文档

- [使用指南](./usage/quarrel-voice-service-usage.md) - 详细API文档
- [游戏集成示例](./integration/game-integration-example.md) - 游戏集成示例
- [ChatService集成指南](./integration/chat-service-integration.md) - 与ChatService集成
- [架构设计](./design/ai-quarrel-king-architecture.md) - 完整架构设计
- [错误处理](./development/error-handling.md) - 错误处理和重试机制
- [测试示例](./examples/test-quarrel-voice.ts) - 完整测试示例

## 🎯 核心特性

✅ **最多2人同时说话**（可配置）  
✅ **QUICK_JAB短插一句**（≤1.5s自动截断）  
✅ **主吵架左右声像分离**（-0.35 / +0.35）  
✅ **其他人随机pan分布**（[-0.6, 0.6]）  
✅ **Ducking机制**（降低其他角色音量）  
✅ **长吵架分段播放**（超过40字自动分段）  
✅ **错误处理和重试机制**

## 🔧 配置

```typescript
const service = getQuarrelVoiceService();
service.updateConfig({
  maxRetries: 3,           // 重试次数
  retryDelay: 1000,        // 重试延迟（毫秒）
  longTextThreshold: 40,  // 长文本阈值
});
```

## 📖 更多示例

查看 [测试示例](./examples/test-quarrel-voice.ts) 了解所有功能的使用方法。

---

**状态**：✅ 所有核心功能已完成，可以开始使用！

