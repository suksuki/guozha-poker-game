# 发牌动画效果说明

## 概述

发牌动画是一个全屏覆盖层组件，在游戏开始时展示精美的发牌过程，增强用户体验。

## 动画阶段

### 1. 洗牌阶段 (1.5秒)
- 牌堆显示摇晃动画
- 显示"洗牌中..."文字

### 2. 发牌阶段 (~10秒)
- 牌从中央牌堆飞向四个方向的玩家
- 每50ms发一张牌
- 卡牌带有旋转和缩放动画
- 玩家头像在接收牌时有脉冲效果
- 进度条实时显示发牌进度

### 3. 完成阶段
- 显示"发牌完成！"
- 1秒后自动进入游戏

## 视觉效果

### 牌堆
- 3D 堆叠效果（多层卡牌）
- 深蓝色卡背设计
- 菱形花纹装饰
- 底部显示剩余牌数

### 飞行卡牌
- 从中心向四周飞出
- 360度旋转动画
- 渐变透明效果
- 缩小效果

### 玩家位置
- 四个方向展示（东南西北）
- Emoji 头像（🧑 / 🤖）
- 接收的牌叠放显示
- 紫色渐变计数徽章

### 进度条
- 底部中央位置
- 紫色渐变填充
- 百分比文字显示

## 交互功能

### 跳过按钮
- 位于右下角
- 点击后立即完成发牌
- 直接进入游戏

## 使用方法

```vue
<template>
  <DealingAnimation
    :is-dealing="isDealing"
    :total-cards="216"
    :player-count="4"
    @complete="onDealingComplete"
    @skip="onDealingSkip"
  />
</template>

<script setup>
import { ref } from 'vue';
import DealingAnimation from './DealingAnimation.vue';

const isDealing = ref(false);

const startGameWithAnimation = () => {
  isDealing.value = true;
};

const onDealingComplete = () => {
  isDealing.value = false;
  // 开始游戏逻辑
};

const onDealingSkip = () => {
  isDealing.value = false;
  // 开始游戏逻辑
};
</script>
```

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isDealing | boolean | 是 | 是否正在发牌 |
| totalCards | number | 是 | 总牌数 |
| playerCount | number | 是 | 玩家数量 |

## Events

| 事件 | 参数 | 说明 |
|------|------|------|
| complete | - | 发牌动画完成 |
| skip | - | 用户跳过动画 |

## 响应式设计

### 移动端 (< 500px)
- 玩家位置更紧凑
- 头像和文字缩小
- 跳过按钮更小

### 横屏模式 (高度 < 400px)
- 整体布局压缩
- 适应窄屏显示

## 动画时间线

```
T=0s      : 开始洗牌动画
T=1.5s    : 开始发牌
T=1.55s   : 第1张牌飞向南
T=1.6s    : 第2张牌飞向东
T=1.65s   : 第3张牌飞向北
T=1.7s    : 第4张牌飞向西
...（循环）
T≈11.5s   : 所有牌发完
T≈12s     : 显示完成，提示进入游戏
T≈13s     : 关闭动画层，游戏开始
```

## 技术实现

### CSS 动画
- `shuffle`: 洗牌摇晃
- `fadeIn`: 淡入效果
- `receivePulse`: 接收脉冲
- `cardReceive`: 卡牌接收

### Vue TransitionGroup
- 用于飞行卡牌的进入/离开动画

### 定时器
- `setInterval`: 控制发牌节奏
- `setTimeout`: 控制阶段切换

## 文件位置

```
vue-mobile/src/components/game/DealingAnimation.vue
```

---

*让每一局游戏都从精彩的发牌开始！ 🃏✨*
