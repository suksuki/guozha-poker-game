# 多声道音频系统

实现真正的多声道并发混音，支持多个 AI 同时说话/抢话/插嘴。

## 架构

### AudioMixer（WebAudio 混音器）
- 使用 WebAudio API 实现真正的并发混音
- 每个角色一个 `roleGainNode + StereoPanner`
- 支持 ducking 效果（突出当前角色，降低其他角色音量）

### DialogueScheduler（对话调度器）
- 管理多个 AI 的语音播放队列
- 支持优先级：`MAIN_FIGHT` > `QUICK_JAB` > `NORMAL_CHAT`
- 最大并发数：2（可配置）
- QUICK_JAB 最大时长：1.5 秒（可配置）

### useAudioRoom（React Hook）
- 整合 AudioMixer 和 DialogueScheduler
- 提供便捷的 React API

## 使用示例

### 基础使用

```tsx
import { useAudioRoom } from '@/audio';

function GameComponent() {
  const audioRoom = useAudioRoom({
    maxConcurrent: 2,
    enableDucking: true,
    duckingLevel: 0.25,
  });

  const handleAISpeak = async (roleId: string, text: string) => {
    // 1. 生成音频（需要 TTS 服务）
    const audioBuffer = await generateTTS(text);
    
    // 2. 提交话语
    audioRoom.submitUtter({
      roleId,
      text,
      priority: 'MAIN_FIGHT',
      civility: 2,
      lang: 'zh',
      audioBuffer,
      pan: -0.35,  // 左声道
      volume: 1.0,
    });
  };

  return <div>...</div>;
}
```

### 多角色同时说话

```tsx
// 角色1：主吵架
audioRoom.submitUtter({
  roleId: 'player1',
  text: '我跟一手，你莫急咧！',
  priority: 'MAIN_FIGHT',
  audioBuffer: await generateTTS('我跟一手，你莫急咧！'),
  pan: -0.35,  // 左
});

// 角色2：插嘴
audioRoom.submitUtter({
  roleId: 'player2',
  text: '你这一手打得不行！',
  priority: 'QUICK_JAB',  // 短插一句
  audioBuffer: await generateTTS('你这一手打得不行！'),
  pan: 0.35,  // 右
});

// 角色3：正常聊天
audioRoom.submitUtter({
  roleId: 'player3',
  text: '这局我拿下了！',
  priority: 'NORMAL_CHAT',
  audioBuffer: await generateTTS('这局我拿下了！'),
  pan: 0.0,  // 中央
});
```

### 声像位置推荐

- 主吵架左右：`pan: -0.35` / `+0.35`
- 其他人随机分布：`pan: [-0.6, 0.6]`（制造一桌人围吵感）

### 配置参数

```tsx
const audioRoom = useAudioRoom({
  maxConcurrent: 2,           // 最大并发数
  quickJabMaxDuration: 1.5,   // QUICK_JAB 最大时长（秒）
  enableDucking: true,        // 启用 ducking
  duckingLevel: 0.25,         // ducking 时其他角色音量
  autoInit: true,             // 自动初始化
});
```

## 注意事项

1. **音频数据格式**：需要预先生成音频数据（ArrayBuffer），不能直接使用 `speechSynthesis`
2. **并发限制**：默认最多 2 个角色同时说话
3. **Ducking 效果**：启用后会自动降低其他角色音量，突出当前角色
4. **优先级**：`MAIN_FIGHT` > `QUICK_JAB` > `NORMAL_CHAT`

## 下一步

需要实现 TTS 服务来生成音频数据，然后才能完整使用多声道功能。

