# 多声道音频系统使用示例

## 完整示例：在游戏中使用多声道音频

### 1. 基础使用（React 组件）

```tsx
import React from 'react';
import { useAudioRoom } from '@/audio';
import { synthesizeSpeech } from '@/tts';
import { defaultSpeakerManager } from '@/tts/speakers';

function GameComponent() {
  const audioRoom = useAudioRoom({
    maxConcurrent: 2,
    enableDucking: true,
    duckingLevel: 0.25,
  });

  // 让角色说话
  const handleAISpeak = async (roleId: string, text: string) => {
    try {
      // 1. 获取角色配置
      const speaker = defaultSpeakerManager.getSpeaker(roleId);
      
      // 2. 生成 TTS 音频
      const ttsResult = await synthesizeSpeech(text, {
        lang: speaker?.lang || 'zh',
        voiceConfig: speaker?.voiceConfig,
        useCache: true,
      });

      // 3. 提交到音频房间
      audioRoom.submitUtter({
        roleId,
        text,
        priority: 'MAIN_FIGHT',
        civility: 2,
        lang: speaker?.lang || 'zh',
        audioBuffer: ttsResult.audioBuffer,
        pan: speaker?.pan,
        volume: speaker?.volume,
      });
    } catch (error) {
      console.error('播放失败:', error);
    }
  };

  return (
    <div>
      <button onClick={() => handleAISpeak('player0', '我跟一手，你莫急咧！')}>
        玩家0说话
      </button>
      <button onClick={() => handleAISpeak('player1', '你这一手打得不行！')}>
        玩家1说话
      </button>
    </div>
  );
}
```

### 2. 多角色同时说话（吵架效果）

```tsx
function QuarrelExample() {
  const audioRoom = useAudioRoom({
    maxConcurrent: 2,
    enableDucking: true,
  });

  const startQuarrel = async () => {
    // 角色1：主吵架（左声道）
    await audioRoom.submitUtter({
      roleId: 'player0',
      text: '我跟一手，你莫急咧！',
      priority: 'MAIN_FIGHT',
      audioBuffer: await generateTTS('我跟一手，你莫急咧！'),
      pan: -0.35,
    });

    // 角色2：插嘴（右声道）
    await audioRoom.submitUtter({
      roleId: 'player1',
      text: '你这一手打得不行！',
      priority: 'QUICK_JAB',  // 快速插嘴
      audioBuffer: await generateTTS('你这一手打得不行！'),
      pan: 0.35,
    });

    // 角色3：正常聊天（中央）
    await audioRoom.submitUtter({
      roleId: 'player2',
      text: '这局我拿下了！',
      priority: 'NORMAL_CHAT',
      audioBuffer: await generateTTS('这局我拿下了！'),
      pan: 0.0,
    });
  };

  return <button onClick={startQuarrel}>开始吵架</button>;
}
```

### 3. 使用便捷 Hook（推荐）

```tsx
import { useAudioRoomService } from '@/audio/AudioRoomService';

function GameComponent() {
  const audioRoom = useAudioRoomService({
    maxConcurrent: 2,
    enableDucking: true,
  });

  // 直接说话，自动生成 TTS
  const handleAISpeak = async (roleId: string, text: string) => {
    await audioRoom.speak(roleId, text, {
      priority: 'MAIN_FIGHT',
      civility: 2,
      lang: 'zh',
    });
  };

  return (
    <div>
      <button onClick={() => handleAISpeak('player0', '我跟一手，你莫急咧！')}>
        玩家0说话
      </button>
    </div>
  );
}
```

### 4. 配置角色声线

```tsx
import { defaultSpeakerManager } from '@/tts/speakers';

// 添加新角色
defaultSpeakerManager.setSpeaker({
  roleId: 'player4',
  name: '玩家4',
  lang: 'zh',
  voiceConfig: {
    lang: 'zh-CN',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
  pan: -0.6,  // 左环绕
  volume: 1.0,
});

// 南昌话角色
defaultSpeakerManager.setSpeaker({
  roleId: 'nanchang_player',
  name: '南昌话玩家',
  lang: 'nanchang',
  voiceConfig: {
    lang: 'zh-CN',  // 使用普通话 TTS，文本会转换为南昌话
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  },
  pan: 0.0,
  volume: 1.0,
});
```

### 5. 优先级使用

```tsx
// 主吵架（最高优先级）
audioRoom.submitUtter({
  roleId: 'player0',
  text: '我跟一手，你莫急咧！',
  priority: 'MAIN_FIGHT',  // 最高优先级
  audioBuffer: await generateTTS('我跟一手，你莫急咧！'),
});

// 快速插嘴（中等优先级，短句）
audioRoom.submitUtter({
  roleId: 'player1',
  text: '你这一手打得不行！',
  priority: 'QUICK_JAB',  // 快速插嘴，≤1.5秒
  audioBuffer: await generateTTS('你这一手打得不行！'),
});

// 正常聊天（低优先级）
audioRoom.submitUtter({
  roleId: 'player2',
  text: '这局我拿下了！',
  priority: 'NORMAL_CHAT',  // 正常聊天
  audioBuffer: await generateTTS('这局我拿下了！'),
});
```

### 6. 控制播放

```tsx
function ControlExample() {
  const audioRoom = useAudioRoom();

  return (
    <div>
      <button onClick={() => audioRoom.stopAll()}>停止所有</button>
      <button onClick={() => audioRoom.stopRole('player0')}>停止玩家0</button>
      <button onClick={() => audioRoom.clearQueue()}>清空队列</button>
      
      <div>
        正在播放: {audioRoom.getPlayingRoles().join(', ')}
      </div>
      <div>
        队列长度: {audioRoom.getQueueLength()}
      </div>
      <div>
        是否有空闲槽位: {audioRoom.hasAvailableSlot() ? '是' : '否'}
      </div>
    </div>
  );
}
```

### 7. 声像位置推荐

```tsx
// 主吵架左右
const mainFightPan = {
  left: -0.35,   // 左
  right: 0.35,   // 右
};

// 其他人随机分布（制造一桌人围吵感）
const randomPan = () => {
  const min = -0.6;
  const max = 0.6;
  return Math.random() * (max - min) + min;
};
```

## 注意事项

1. **TTS 生成**：需要先调用 `synthesizeSpeech()` 生成音频数据
2. **缓存**：TTS 结果会自动缓存，相同文本不会重复生成
3. **并发限制**：默认最多 2 个角色同时说话
4. **Ducking 效果**：启用后会自动降低其他角色音量
5. **优先级**：`MAIN_FIGHT` > `QUICK_JAB` > `NORMAL_CHAT`

## 下一步

1. 集成到游戏事件系统
2. 实现真正的 TTS API（替换占位实现）
3. 添加南昌话文本转换
4. 优化音频质量和性能

