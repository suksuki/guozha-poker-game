# 游戏动画系统

## 概述

游戏动画系统采用事件驱动架构，统一管理所有游戏动画效果，包括：
- 系统信息（报牌、要不起）
- 动画效果（出墩爆炸、炸弹特效）
- 音效播放
- 视觉特效（屏幕震动、闪光等）

## 架构设计

```
GameEventService (事件服务)
├── SystemAnnouncementService (系统报牌)
├── AnimationService (动画服务)
└── SoundService (音效服务)
```

## 使用方法

### 1. 触发出墩爆炸动画

```typescript
import { animationService } from '../services/animationService';

// 在出墩时触发
animationService.triggerDunExplosion({
  playerId: 0,
  playerName: '玩家1',
  dunSize: 8,  // 墩的大小（张数）
  intensity: 'medium',  // 自动根据大小计算
  position: { x: 500, y: 300 }  // 动画位置
});
```

### 2. 在组件中使用动画容器

```tsx
import { AnimationContainer } from './animations/AnimationContainer';

function GameBoard() {
  return (
    <div>
      <AnimationContainer />
      {/* 其他组件 */}
    </div>
  );
}
```

## 动画强度分级

- **small**: 3-5张，轻微爆炸
- **medium**: 6-8张，中等爆炸
- **large**: 9-12张，大爆炸
- **huge**: 13+张，超级爆炸

## 音效文件

需要在 `public/sounds/` 目录下放置以下音效文件：
- `dun-small.mp3` - 小墩音效
- `dun-medium.mp3` - 中墩音效
- `dun-large.mp3` - 大墩音效
- `dun-huge.mp3` - 超大墩音效
- `bomb.mp3` - 炸弹音效
- `explosion.mp3` - 爆炸音效

## 技术实现

- **CSS 动画**: 基础动画效果（缩放、旋转、弹跳）
- **Canvas**: 粒子系统（爆炸粒子、火花效果）
- **HTML5 Audio**: 音效播放

## 配置

动画参数可在 `src/config/animationConfig.ts` 中调整。

