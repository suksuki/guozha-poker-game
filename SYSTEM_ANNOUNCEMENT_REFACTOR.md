# 系统报牌重构文档

## 重构目标

区分两个不同的语音场景：
1. **报牌（系统信息）**：出牌时必须报牌，报牌完成后才能继续游戏流程，属于牌局系统的一部分
2. **聊天（随机触发）**：随机或事件触发的聊天，属于聊天系统，不影响游戏流程

## 实现方案

### 1. 创建 SystemAnnouncementService

创建了独立的 `systemAnnouncementService.ts`，专门处理系统报牌：

- `announcePlay(play, voiceConfig)`: 报牌（出牌时）
- `announcePass(voiceConfig)`: 报"要不起"（要不起时）

**特点**：
- 必须等待语音播放完成（返回Promise）
- 与聊天系统（chatService）完全分离
- 属于游戏流程的一部分，阻塞游戏继续

### 2. 修改 useMultiPlayerGame

将所有出牌和"要不起"的语音播放改为使用 `systemAnnouncementService`：

**之前**：
```typescript
voiceService.speak(playToSpeechText(play), voiceConfig).then(() => {
  // 继续游戏
});
```

**现在**：
```typescript
announcePlay(play, voiceConfig).then(() => {
  // 报牌完成后，如果下一个玩家是AI，自动继续
  if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
    setTimeout(() => {
      playNextTurn();
    }, 300);
  }
});
```

### 3. 系统分离

- **SystemAnnouncementService（报牌系统）**：
  - 出牌时必须报牌
  - 必须等待完成才能继续
  - 属于游戏流程的一部分
  
- **ChatService（聊天系统）**：
  - 随机或事件触发
  - 不阻塞游戏流程
  - 属于游戏氛围的一部分

## 修改的文件

1. `src/services/systemAnnouncementService.ts` - 新建，系统报牌服务
2. `src/hooks/useMultiPlayerGame.ts` - 修改，所有出牌和"要不起"的语音播放改为使用systemAnnouncementService

## 测试要点

1. **报牌流程**：出牌 -> 报牌 -> 等待完成 -> 下家出牌
2. **要不起流程**：要不起 -> 报"要不起" -> 等待完成 -> 下家出牌
3. **聊天系统**：确保聊天不影响游戏流程，可以随时触发
4. **AI自动出牌**：确保AI出牌时等待报牌完成后再继续

## 注意事项

- 报牌失败时（catch），仍然继续游戏，避免卡住
- 人类玩家出牌时，报牌但不等待（因为人类已经手动操作了）
- AI玩家出牌时，必须等待报牌完成才能继续

