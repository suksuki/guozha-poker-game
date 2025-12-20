<template>
  <div class="hand-cards-container" :class="{ 'auto-play-active': isAutoPlay }">
    <!-- 玩家信息栏 -->
    <div class="player-info-bar">
      <div class="player-identity">
        <span class="player-avatar">🧑</span>
        <span class="player-name">{{ playerName }}</span>
        <span v-if="isAutoPlay" class="auto-play-badge">🤖 托管</span>
      </div>
      
      <div class="player-stats">
        <div class="stat-chip stat-cards">
          <span class="stat-value">{{ handSize }}张</span>
        </div>
        <div 
          v-if="score !== undefined" 
          class="stat-chip"
          :class="score > 0 ? 'stat-positive' : (score < 0 ? 'stat-negative' : 'stat-neutral')"
        >
          <span class="stat-value">💰{{ score > 0 ? '+' : '' }}{{ score }}</span>
        </div>
        <div 
          v-if="dunCount !== undefined && dunCount > 0" 
          class="stat-chip stat-neutral"
        >
          <span class="stat-value">🏆{{ dunCount }}墩</span>
        </div>
      </div>
      
      <div class="action-buttons">
        <div class="turn-status" :class="{ 'is-my-turn': isMyTurn }" v-if="isMyTurn">
          你的回合
        </div>
        <button 
          class="btn-action btn-play"
          :disabled="!isMyTurn || selectedCount === 0"
          @click="$emit('play')"
        >
          出牌
        </button>
        <button 
          class="btn-action btn-pass"
          :disabled="!isMyTurn || !canPass"
          @click="$emit('pass')"
        >
          不要
        </button>
        <button 
          class="btn-action btn-clear"
          @click="$emit('clear')"
          v-if="selectedCount > 0"
        >
          重选
        </button>
      </div>
    </div>
    
    <!-- 手牌展示区域：Flex Squeeze 布局 -->
    <div class="hand-cards-stage">
      <div class="cards-flex-container">
        <!-- 扁平化渲染所有卡牌，利用 CSS 实现自动挤压 -->
        <div 
          v-for="(item, index) in displayCards" 
          :key="item.card.id"
          class="card-anchor"
          :class="{ 'is-new-rank': item.isNewRank && index > 0 }"
          :style="{ zIndex: index }"
        >
          <!-- 实际卡牌视图 -->
          <div 
            class="card-visual"
            :class="{ 'card-selected': isCardSelected(item.card.id) }"
            @click.stop="toggleCard(item.card.id)"
          >
            <CardView :card="item.card" size="medium" />
            <div class="selection-glow"></div>
            <!-- 选中时的遮罩，增强对比 (可选) -->
            <!-- <div class="card-overlay" v-if="isCardSelected(item.card.id)"></div> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CardView from '../card/CardView.vue';
import { sortCardsByRank, sortCardsByValue } from '@/core/utils/cardUtils';
import { Rank } from '@/core/types/card';
import type { Card } from '@/core/types/card';

// Props
const props = defineProps<{
  hand: Card[];
  playerName: string;
  score?: number;
  dunCount?: number;
  finishedRank?: number | null;
  isMyTurn: boolean;
  canPass: boolean;
  isAutoPlay: boolean;
  selectedCardIds: string[];
  sortMethod: 'rank' | 'value';
}>();

// Emits
const emit = defineEmits<{
  play: [];
  pass: [];
  clear: [];
  toggleCard: [cardId: string];
}>();

// 计算属性
const handSize = computed(() => props.hand.length);
const selectedCount = computed(() => props.selectedCardIds.length);

// 准备用于显示的扁平化卡牌列表
// 预计算 isNewRank 属性用于视觉分组
const displayCards = computed(() => {
  let sorted: Card[];
  if (props.sortMethod === 'rank') {
    sorted = sortCardsByRank(props.hand);
  } else {
    // 按大小排序
    sorted = sortCardsByValue(props.hand);
  }

  // 构造带元数据的列表
  if (sorted.length === 0) return [];

  const list = [];
  let lastRank: Rank | null = null;
  
  // Rank 排序需要特殊处理：从小到大排列时，通常我们希望视觉上 3,4,5...
  // 但为了与 `sortCardsByRank` 保持一致 (它似乎是从小到大)，我们按顺序遍历
  // 如果需要保持“大牌在右”或“大牌在左”，取决于 sort 函数。
  // 假设 display order 与 sorted order 一致。

  for (let i = 0; i < sorted.length; i++) {
    const card = sorted[i];
    const isNewRank = lastRank !== null && card.rank !== lastRank;
    
    list.push({
      card,
      isNewRank
    });
    
    lastRank = card.rank;
  }
  
  return list;
});

// 方法
const isCardSelected = (cardId: string): boolean => {
  return props.selectedCardIds.includes(cardId);
};

const toggleCard = (cardId: string) => {
  emit('toggleCard', cardId);
};

</script>

<style scoped>
.hand-cards-container {
  /* 容器背景 - 略微透明黑色 */
  background: linear-gradient(to top, rgba(0,0,0,0.9), rgba(20,20,30,0.7));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
  
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
  z-index: 100;
  transition: all 0.3s ease;
}

.hand-cards-container.auto-play-active {
  filter: grayscale(0.8) opacity(0.7);
  pointer-events: none;
}

/* --- 信息栏 (保留原有设计) --- */
.player-info-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  /* background: rgba(0,0,0,0.2); */
}

.player-identity {
  display: flex;
  align-items: center;
  gap: 6px;
}
.player-avatar { font-size: 18px; }
.player-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
.auto-play-badge {
  padding: 2px 6px;
  background: rgba(251, 191, 36, 0.2);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 8px;
  font-size: 10px;
  color: #fbbf24;
}

.player-stats {
  display: flex;
  gap: 6px;
  margin-left: 8px;
}
.stat-chip {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}
.stat-positive { color: #86efac; background: rgba(34, 197, 94, 0.15); }
.stat-negative { color: #fca5a5; background: rgba(239, 68, 68, 0.15); }

/* --- 按钮 (紧凑版) --- */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
}
.turn-status {
  font-size: 11px;
  color: #86efac;
  animation: pulse 2s infinite;
  margin-right: 2px;
}

.btn-action {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.btn-play {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}
.btn-pass {
  background: rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
}
.btn-clear {
  padding: 0 8px;
  height: 26px;
  background: transparent;
  color: #94a3b8;
  font-size: 11px;
}

/* --- 核心: Flex Squeeze 布局 --- */
.hand-cards-stage {
  width: 100%;
  height: 85px; /* 卡牌展示区高度 */
  margin-top: 4px;
  padding: 0 8px 20px; /* 左右边距 + 底部更宽的间距 */
  
  display: flex;
  justify-content: center; /* 卡牌少时居中 */
  align-items: flex-end; /* 底部对齐 */
  
  /* 安全网：如果实在挤不下了（比如50张牌），允许滚动，但不显示滚动条 */
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none; /* Firefox */
  -webkit-overflow-scrolling: touch;
}

.hand-cards-stage::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.cards-flex-container {
  display: flex;
  width: fit-content; /* 让容器根据内容自适应，但受父容器约束 */
  min-width: 100%; /* 至少占满屏宽，保证居中逻辑 */
  max-width: 800px;
  /* 如果 min-width 100% 导致 justify-content: center 在少牌时失效？
     Fixed: use margin: auto if using flex on parent?
     实际上 flex parent + margin: auto 是居中好办法。
  */
  margin: 0 auto;
}

.card-anchor {
  /* 
   关键逻辑: Flex Squeeze
   flex-shrink: 10 让他非常愿意被压缩
   flex-basis: 35px 理想宽度
   min-width: 8px 极限压缩宽度 (几乎完全重叠)
  */
  flex: 0 1 35px; 
  min-width: 8px; /* 允许更极致的挤压，防止溢出 */
  max-width: 45px; 
  
  height: 68px; /* Medium card height */
  position: relative;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* 在不同点数之间增加微小间距 */
.card-anchor.is-new-rank {
  margin-left: 6px; 
}

/* 最后一个元素拥有完整宽度 */
.card-anchor:last-child {
  flex-basis: 48px;
  min-width: 48px;
  max-width: 48px;
  margin-right: 0;
  flex-shrink: 0; /* 也就是最后一张牌永远不被挤压，保证看清 */
}

/* --- 卡牌视觉实体 --- */
.card-visual {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 48px; /* Medium Card Width */
  height: 68px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center bottom;
  /* 即使 anchor 很窄，visual 依然是完整的，且 z-index 保证覆盖 */
}

/* 选中弹起 */
.card-visual.card-selected {
  transform: translateY(-16px) scale(1.05);
  z-index: 1000;
}

.selection-glow {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.card-visual.card-selected .selection-glow {
  opacity: 1;
}

@media screen and (max-width: 360px) {
  .card-anchor {
     min-width: 6px; /* 极小屏幕极限压缩 */
  }
  .card-anchor.is-new-rank {
    margin-left: 3px;
  }
}
</style>
