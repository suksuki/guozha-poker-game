<template>
  <div class="played-cards-area" :class="[position, { 'has-plays': plays.length > 0, 'has-pass': isPassed }]">
    <transition-group name="play-stack" tag="div" class="stack-container">
      <!-- 出牌展示 (支持多手牌堆叠) -->
      <template v-if="plays.length > 0">
        <div 
          v-for="(play, index) in plays" 
          :key="`play-${index}-${play.cards.length}`"
          class="play-group"
          :style="getGroupStyle(index, plays.length)"
        >
          <!-- 单次出的牌 -->
          <div class="cards-row">
            <CardView
              v-for="(card, cardIdx) in play.cards"
              :key="card.id"
              :card="card"
              :size="cardSize"
              :style="getCardStyle(cardIdx, play.cards.length)"
              class="played-card-item"
            />
          </div>
          
          <!-- 牌型徽章 (只显示在最新一手牌上) -->
          <div v-if="index === plays.length - 1 && getPlayTypeBadge(play)" class="type-badge">
            {{ getPlayTypeBadge(play) }}
          </div>
          
          <!-- 炸弹爆炸动画 (只显示在最新一手牌上，且是炸弹) -->
          <BombExplosion 
            v-if="index === plays.length - 1 && isBomb(play)" 
            :key="`bomb-${play.cards.length}-${index}`"
            class="bomb-explosion"
          />
          
          <!-- 墩爆炸动画 (只显示在最新一手牌上，且是墩) -->
          <DunExplosion 
            v-if="index === plays.length - 1 && isDun(play)" 
            :key="`dun-${play.cards.length}-${index}`"
            :dunSize="play.cards.length"
            class="dun-explosion"
          />
        </div>
      </template>
      
      <!-- 不要/Pass 状态 (显示在出牌下方或旁边) -->
      <div v-if="isPassed && plays.length === 0" key="pass-indicator" class="pass-indicator">
        <span class="pass-text">{{ $t('game.pass') || '不要' }}</span>
      </div>
      
      <!-- 如果既有出牌又有"不要"状态，在出牌旁边显示 -->
      <div v-if="isPassed && plays.length > 0" key="pass-badge" class="pass-badge">
        <span class="pass-text-small">{{ $t('game.pass') || '不要' }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import CardView from '../card/CardView.vue';
import BombExplosion from './BombExplosion.vue';
import DunExplosion from './DunExplosion.vue';
import type { RoundPlayRecord, Card } from '@/core/types/card';
import { useI18n } from '../../i18n/composable';
import { CardType } from '@/core/types/card';
import { canPlayCards } from '@/core/utils/cardUtils';

const props = defineProps<{
  plays: RoundPlayRecord[];
  isPassed?: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}>();

const { t } = useI18n();

// 根据位置决定卡牌大小
const cardSize = computed((): 'small' | 'medium' | 'large' => {
  // 底部（自己）稍微大一点，或者统一 small
  return 'small';
});

// 检查是否是炸弹
const isBomb = (play: RoundPlayRecord): boolean => {
  const result = canPlayCards(play.cards);
  return result?.type === CardType.BOMB;
};

// 检查是否是墩
const isDun = (play: RoundPlayRecord): boolean => {
  const result = canPlayCards(play.cards);
  return result?.type === CardType.DUN;
};

// 获取牌型名称（炸弹不显示文字，只显示动画）
const getPlayTypeBadge = (play: RoundPlayRecord) => {
  const result = canPlayCards(play.cards);
  if (!result) return '';
  
  // 炸弹不显示文字，只显示动画
  if (result.type === CardType.BOMB) return '';
  if (result.type === CardType.DUN) return '🏆 墩';
  if (result.type === CardType.TRIPLE) return ''; // 三张不特别显示
  if (result.type === CardType.PAIR) return '';
  
  // 只有特殊牌型显示
  return '';
};

// 计算每组牌的样式 (不重叠排列)
const getGroupStyle = (index: number, total: number) => {
  if (total <= 1) return { zIndex: index };

  const isLatest = index === total - 1;
  const reverseIndex = total - 1 - index; // 0 = latest (最新的一手)
  
  // 缩放：最后出的尺寸最大 (scale = 1.0)，之前的逐渐缩小
  // reverseIndex=0 (最新) => scale=1.0
  // reverseIndex=1 => scale=0.85
  // reverseIndex=2 => scale=0.7
  // reverseIndex>=3 => scale=0.6 (最小)
  const scale = Math.max(0.6, 1.0 - reverseIndex * 0.15);
  
  // 透明度：最新的最清晰，之前的逐渐变淡
  const opacity = Math.max(0.4, 1.0 - reverseIndex * 0.25);
  
  // 根据位置决定偏移方向，确保不重叠
  const isVertical = props.position === 'left' || props.position === 'right'; // 东西玩家
  const isHorizontal = props.position === 'top' || props.position === 'bottom'; // 南北玩家
  
  // 基础间距：根据缩放后的实际尺寸计算，确保不重叠
  // 假设每手牌宽度约 120px（缩放后），高度约 80px
  const baseCardWidth = 120;
  const baseCardHeight = 80;
  const spacingMultiplier = 1.2; // 间距倍数，确保不重叠
  
  let xOffset = 0;
  let yOffset = 0;
  
  if (isVertical) {
    // 东西玩家：垂直排列（一列），每手牌垂直间距
    // 考虑缩放，实际高度 = baseCardHeight * scale
    // 为了不重叠，间距应该 >= 前一手牌的高度
    const prevScale = index < total - 1 ? Math.max(0.6, 1.0 - (reverseIndex + 1) * 0.15) : scale;
    const prevHeight = baseCardHeight * prevScale;
    // 累计偏移：每手牌都要在前一手的下方，加上间距
    let cumulativeOffset = 0;
    for (let i = index + 1; i < total; i++) {
      const iScale = Math.max(0.6, 1.0 - (total - 1 - i) * 0.15);
      cumulativeOffset += baseCardHeight * iScale * spacingMultiplier;
    }
    yOffset = cumulativeOffset; // 向下偏移（正数）
    
    // 水平方向稍微错开，增加层次感但不重叠
    if (props.position === 'left') xOffset = 20 * reverseIndex; // 向右偏移
    if (props.position === 'right') xOffset = -20 * reverseIndex; // 向左偏移
  } else {
    // 南北玩家：水平排列（一行），每手牌水平间距
    // 考虑缩放，实际宽度 = baseCardWidth * scale
    // 累计偏移：每手牌都要在前一手的旁边，加上间距
    let cumulativeOffset = 0;
    for (let i = index + 1; i < total; i++) {
      const iScale = Math.max(0.6, 1.0 - (total - 1 - i) * 0.15);
      cumulativeOffset += baseCardWidth * iScale * spacingMultiplier;
    }
    
    // 根据位置决定左右方向
    if (props.position === 'top') {
      xOffset = -cumulativeOffset; // 向左偏移（负数）
    } else {
      xOffset = cumulativeOffset; // 向右偏移（正数）
    }
    
    // 垂直方向稍微错开，增加层次感但不重叠
    yOffset = -10 * reverseIndex; // 稍微向上偏移
  }
  
  return {
    transform: `translate(${xOffset}px, ${yOffset}px) scale(${scale})`,
    opacity,
    zIndex: index + 10, // 确保最新的一手在最上层
    filter: isLatest ? 'none' : 'brightness(0.75)' // 旧牌变暗
  };
};

// 计算单张牌的样式 (扇形或线性展开)
const getCardStyle = (index: number, total: number) => {
  const spacing = 20; // 卡牌间距
  const centerOffset = (total - 1) * spacing / 2;
  const x = (index * spacing) - centerOffset;
  
  // 简单的扇形旋转
  const maxRotation = 10; // 最大旋转角度
  let rotate = 0;
  let y = 0;
  
  if (total > 3) {
    const progress = index / (total - 1 || 1); // 0 to 1
    rotate = (progress - 0.5) * maxRotation * 2;
    y = Math.abs(progress - 0.5) * 10; // 中间高，两边低
  }
  
  return {
    transform: `translateX(${x}px) translateY(${y}px) rotate(${rotate}deg)`,
    zIndex: index
  };
};
</script>

<style scoped>
.played-cards-area {
  position: relative;
  width: 160px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

/* 南北玩家：扩大宽度以容纳一行排列（多手牌不重叠） */
.played-cards-area.top,
.played-cards-area.bottom {
  width: 400px; /* 增加宽度以容纳多手牌 */
  min-width: 400px;
  max-width: 500px; /* 限制最大宽度 */
}

/* 东西玩家：扩大高度以容纳一列排列（多手牌不重叠） */
.played-cards-area.left,
.played-cards-area.right {
  height: 300px; /* 增加高度以容纳多手牌 */
  min-height: 300px;
  max-height: 400px; /* 限制最大高度 */
  width: 140px;
}

.stack-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pass-indicator {
  padding: 8px 24px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  backdrop-filter: blur(8px);
  animation: fadeIn 0.3s ease-out;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: absolute;
  z-index: 100;
}

.pass-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.pass-badge {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 12px;
  background: rgba(255, 100, 100, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease-out;
  box-shadow: 0 2px 8px rgba(255, 100, 100, 0.4);
  z-index: 101;
}

.pass-text-small {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

/* 东西玩家：pass-badge 显示在右侧 */
.played-cards-area.left .pass-badge {
  bottom: auto;
  right: -40px;
  top: 50%;
  transform: translateY(-50%);
  left: auto;
}

.played-cards-area.right .pass-badge {
  bottom: auto;
  left: -40px;
  top: 50%;
  transform: translateY(-50%);
  right: auto;
}

.play-group {
  position: absolute; /* 绝对定位，因为所有组都居中，靠transform移位 */
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* 弹性动画 */
  transform-origin: center center; /* 改为中心点，缩放更自然 */
  pointer-events: none; /* 避免遮挡 */
}

.cards-row {
  display: flex;
  justify-content: center;
  align-items: center;
  /* 使得子元素绝对定位的transform基准是这个容器中心 */
  position: relative; 
  height: 80px; /* 卡牌高度占位 */
  width: 100%;
}

/* 南北玩家：一行排列 */
.played-cards-area.top .cards-row,
.played-cards-area.bottom .cards-row {
  flex-direction: row;
  gap: 4px;
}

/* 东西玩家：一列排列 */
.played-cards-area.left .cards-row,
.played-cards-area.right .cards-row {
  flex-direction: column;
  gap: 4px;
  height: auto;
  min-height: 80px;
}

.played-card-item {
  position: absolute; /* 让所有卡牌基于中心叠加，通过transform展开 */
  box-shadow: -2px 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
  transform-origin: center bottom;
}

.type-badge {
  margin-top: 5px; /* 调整位置，不要挡住牌 */
  padding: 4px 12px;
  background: linear-gradient(135deg, #FF6B6B 0%, #EE5253 100%);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(238, 82, 83, 0.4);
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 100;
  white-space: nowrap;
  pointer-events: none;
  transform: translateY(20px); /* 稍微往下一点 */
}

.bomb-explosion,
.dun-explosion {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  pointer-events: none;
}

/* 动画定义 */
.play-stack-enter-active,
.play-stack-leave-active {
  transition: all 0.4s ease;
}

.play-stack-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.play-stack-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes popIn {
  0% { transform: translateY(20px) scale(0); opacity: 0; }
  100% { transform: translateY(20px) scale(1); opacity: 1; }
}

/* 针对不同方位的微调 */
/* .top 默认不用动 */
/* .bottom 默认不用动 */

.left .play-group {
  /* 左侧玩家出的牌，可以稍微向右倾斜一点 */
}

.right .play-group {
  /* 右侧玩家出了牌，稍微向左倾斜一点 */
}
</style>
