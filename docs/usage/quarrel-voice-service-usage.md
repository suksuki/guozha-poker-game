# QuarrelVoiceService 使用指南

## 概述

`QuarrelVoiceService` 是集成 `DialogueScheduler` 和 `ttsAudioService` 的高级语音服务，专门用于实现"吵架王对轰"效果。

## 特性

1. **最多2人同时说话**（可配置）
2. **QUICK_JAB短插一句**（≤1.5s）
3. **主吵架左右声像分离**（-0.35 / +0.35）
4. **其他人随机pan分布**（[-0.6, 0.6]）
5. **Ducking机制**（降低其他角色音量）

## 基本使用

```typescript
import { getQuarrelVoiceService, updateMainFightRoles } from '../services/quarrelVoiceService';
import { Priority, Language } from '../audio/DialogueScheduler';

// 获取服务实例
const quarrelService = getQuarrelVoiceService();

// 初始化
await quarrelService.init();

// 提交话语
await quarrelService.submitUtter({
  roleId: 'player_1',
  text: '我跟一手，你莫急咧。',
  priority: 'MAIN_FIGHT',  // 主吵架
  civility: 2,  // 文明等级
  lang: 'zh',  // 语言
  volume: 1.0,
  onStart: () => console.log('开始播放'),
  onEnd: () => console.log('播放完成'),
  onError: (error) => console.error('播放失败', error)
});

// 短插一句（QUICK_JAB）
await quarrelService.submitUtter({
  roleId: 'player_2',
  text: '你急什么！',  // 会自动检查时长，超过1.5s会截断
  priority: 'QUICK_JAB',
  civility: 1,
  lang: 'zh',
  volume: 1.0
});
```

## 设置主吵架角色

```typescript
import { updateMainFightRoles } from '../services/quarrelVoiceService';

// 设置主吵架双方（最多2人）
updateMainFightRoles(['player_1', 'player_2']);

// 之后这两个角色的pan值会自动设置为 -0.35 和 +0.35
```

## 优先级说明

- **MAIN_FIGHT**：主吵架，优先级最高（数字优先级：3）
- **QUICK_JAB**：短插一句，可以抢话（数字优先级：2）
- **NORMAL_CHAT**：普通聊天（数字优先级：1）

## 文明等级（civility）

- **0**：文明（无粗口）
- **1**：轻微讽刺
- **2**：允许口头粗话（非侮辱性）
- **3**：强烈粗口（仍禁止歧视/仇恨）
- **4**：极限测试档（仍禁仇恨/群体攻击）

## 语言支持

- `'zh'`：中文
- `'ja'`：日语
- `'ko'`：韩语
- `'nanchang'`：南昌话

## 控制方法

```typescript
// 停止所有播放
quarrelService.stopAll();

// 停止指定角色
quarrelService.stopRole('player_1');

// 获取正在播放的角色列表
const playingRoles = quarrelService.getPlayingRoles();

// 获取队列长度
const queueLength = quarrelService.getQueueLength();
```

## 完整示例

```typescript
import { getQuarrelVoiceService, updateMainFightRoles } from '../services/quarrelVoiceService';
import { Priority, Language } from '../audio/DialogueScheduler';

async function example() {
  const service = getQuarrelVoiceService();
  await service.init();

  // 设置主吵架双方
  updateMainFightRoles(['player_1', 'player_2']);

  // 主吵架双方同时说话
  await service.submitUtter({
    roleId: 'player_1',
    text: '你这一手打得，我都替你着急！',
    priority: 'MAIN_FIGHT',
    civility: 2,
    lang: 'zh',
    volume: 1.0
  });

  await service.submitUtter({
    roleId: 'player_2',
    text: '你嘴巴跟漏斗一样，别在这儿放屁！',
    priority: 'MAIN_FIGHT',
    civility: 3,
    lang: 'zh',
    volume: 1.0
  });

  // 其他人短插一句
  await service.submitUtter({
    roleId: 'player_3',
    text: '你们别吵了！',
    priority: 'QUICK_JAB',
    civility: 0,
    lang: 'zh',
    volume: 0.8
  });
}
```

## 注意事项

1. **QUICK_JAB时长限制**：如果文本预估时长超过1.5秒，会自动截断
2. **主吵架pan值**：只有前2个主吵架角色会获得 -0.35 和 +0.35 的pan值
3. **随机pan值**：非主吵架角色的pan值会在初始化时随机分配，之后保持不变
4. **并发限制**：最多同时播放2个角色（可在DialogueScheduler配置中修改）

## 与现有系统的集成

`QuarrelVoiceService` 内部使用 `ttsAudioService` 进行实际播放，因此：

- 需要确保 `ttsAudioService` 已正确配置（启用多声道，使用TTS API服务）
- 如果TTS服务不可用，播放会失败（不会回退到speechSynthesis）

## 下一步

- 实现长吵架分段播放（BeatsGenerator集成）
- 优化pan值分配策略
- 添加更多控制选项

