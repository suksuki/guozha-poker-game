<template>
  <div class="hand-cards-container" :class="{ 'auto-play-active': isAutoPlay }">
    <!-- 玩家信息栏 -->
    <div class="player-info-bar">
      <div class="player-identity">
        <span class="player-avatar">🧑</span>
        <span class="player-name">{{ playerName }}</span>
        <span v-if="isAutoPlay" class="auto-play-badge">🤖 托管中</span>
      </div>
      
      <div class="player-stats">
        <div class="stat-chip stat-cards">
          <span class="stat-icon">🎴</span>
          <span class="stat-value">{{ handSize }}</span>
        </div>
        <div 
          v-if="score && score !== 0" 
          class="stat-chip"
          :class="score >= 0 ? 'stat-positive' : 'stat-negative'"
        >
          <span class="stat-icon">💰</span>
          <span class="stat-value">{{ score > 0 ? '+' : '' }}{{ score }}</span>
        </div>
        <div v-if="dunCount && dunCount > 0" class="stat-chip stat-dun">
          <span class="stat-icon">🏆</span>
          <span class="stat-value">{{ dunCount }}</span>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <div class="turn-status" :class="{ 'is-my-turn': isMyTurn }">
          {{ isMyTurn ? '你的回合' : '等待中...' }}
        </div>
        <div class="selected-count">
          已选 <span class="count-number">{{ selectedCount }}</span> 张
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
        >
          清空
        </button>
      </div>
    </div>
    
    <!-- 手牌分组显示 -->
    <div class="hand-cards-grid">
      <div 
        v-for="rank in sortedRanks" 
        :key="rank"
        class="rank-group"
        :class="{ 'has-selection': hasSelectionInRank(rank) }"
      >
        <!-- 点数组头部 -->
        <div class="rank-group-header" @click="toggleRankExpand(rank)">
          <span class="rank-name">{{ getRankDisplayName(rank) }}</span>
          <span class="rank-count">×{{ getCardsOfRank(rank).length }}</span>
          <span class="expand-icon">{{ isRankExpanded(rank) ? '▼' : '▶' }}</span>
        </div>
        
        <!-- 展开显示 -->
        <div 
          v-if="isRankExpanded(rank) || getCardsOfRank(rank).length === 1"
          class="rank-group-cards"
        >
          <div 
            v-for="card in getCardsOfRank(rank)" 
            :key="card.id"
            :class="['card-wrapper', { 'card-selected': isCardSelected(card.id) }]"
            @click.stop="toggleCard(card.id)"
          >
            <CardView :card="card" size="small" />
            <div class="selection-indicator"></div>
          </div>
        </div>
        
        <!-- 叠放显示 -->
        <div 
          v-else
          class="rank-group-stacked"
          @click.stop="toggleRankExpand(rank)"
        >
          <div 
            v-for="(card, index) in getCardsOfRank(rank).slice(0, 3)" 
            :key="card.id"
            class="stacked-card"
            :style="{ 
              zIndex: 3 - index, 
              transform: `translateX(${index * 8}px) translateY(${-index * 4}px)` 
            }"
          >
            <CardView :card="card" size="small" />
          </div>
          <div 
            v-if="getCardsOfRank(rank).length > 3"
            class="stacked-more"
          >
            +{{ getCardsOfRank(rank).length - 3 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '../../i18n/composable';
import CardView from '../card/CardView.vue';
import { sortCardsByRank, sortCardsByValue, groupCardsByRank } from '../../utils/cardUtils';
import { Rank } from '../../types/card';
import type { Card } from '../../types/card';

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
  toggleRankExpand: [rank: Rank];
}>();

const { t } = useI18n();

// 本地状态
const expandedRanks = ref<Set<number>>(new Set());

// 计算属性
const handSize = computed(() => props.hand.length);
const selectedCount = computed(() => props.selectedCardIds.length);

const groupedHand = computed(() => {
  let sorted: Card[];
  if (props.sortMethod === 'rank') {
    sorted = sortCardsByRank(props.hand);
  } else {
    sorted = sortCardsByValue(props.hand);
  }
  return groupCardsByRank(sorted);
});

const sortedRanks = computed(() => {
  const ranks = Array.from(groupedHand.value.keys());
  if (props.sortMethod === 'rank') {
    return ranks.sort((a, b) => a - b);
  } else {
    return ranks.sort((a, b) => {
      const getValue = (rank: Rank): number => {
        if (rank === Rank.JOKER_BIG) return 1000;
        if (rank === Rank.JOKER_SMALL) return 999;
        if (rank === Rank.TWO) return 998;
        if (rank === Rank.ACE) return 14;
        return rank;
      };
      return getValue(b) - getValue(a);
    });
  }
});

// 方法
const getCardsOfRank = (rank: Rank): Card[] => {
  return groupedHand.value.get(rank) || [];
};

const isCardSelected = (cardId: string): boolean => {
  return props.selectedCardIds.includes(cardId);
};

const hasSelectionInRank = (rank: Rank): boolean => {
  const cards = getCardsOfRank(rank);
  return cards.some(card => isCardSelected(card.id));
};

const toggleCard = (cardId: string) => {
  emit('toggleCard', cardId);
};

const isRankExpanded = (rank: Rank): boolean => {
  return expandedRanks.value.has(rank);
};

const toggleRankExpand = (rank: Rank) => {
  if (expandedRanks.value.has(rank)) {
    expandedRanks.value.delete(rank);
  } else {
    expandedRanks.value.add(rank);
  }
};

const getRankDisplayName = (rank: Rank): string => {
  if (rank === Rank.JACK) return 'J';
  if (rank === Rank.QUEEN) return 'Q';
  if (rank === Rank.KING) return 'K';
  if (rank === Rank.ACE) return 'A';
  if (rank === Rank.TWO) return '2';
  if (rank === Rank.JOKER_SMALL) return '小王';
  if (rank === Rank.JOKER_BIG) return '大王';
  return rank.toString();
};
</script>

<style scoped>
.hand-cards-container {
  background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%);
  border-radius: 20px 20px 0 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255,255,255,0.1);
}

.hand-cards-container.auto-play-active {
  opacity: 0.6;
  pointer-events: none;
}

/* 玩家信息栏 */
.player-info-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.player-identity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-avatar {
  font-size: 24px;
}

.player-name {
  font-size: 15px;
  font-weight: 600;
  color: white;
}

.auto-play-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(251,191,36,0.3) 0%, rgba(251,191,36,0.1) 100%);
  border-radius: 12px;
  font-size: 11px;
  color: #fbbf24;
}

/* 统计数据 */
.player-stats {
  display: flex;
  gap: 8px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.stat-cards {
  background: rgba(59,130,246,0.2);
  color: #93c5fd;
}

.stat-positive {
  background: rgba(34,197,94,0.2);
  color: #86efac;
}

.stat-negative {
  background: rgba(239,68,68,0.2);
  color: #fca5a5;
}

.stat-dun {
  background: rgba(251,191,36,0.2);
  color: #fde047;
}

.stat-icon {
  font-size: 12px;
}

.stat-value {
  font-weight: 600;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.turn-status {
  padding: 6px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6);
  font-size: 12px;
}

.turn-status.is-my-turn {
  background: linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0.1) 100%);
  color: #86efac;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.selected-count {
  padding: 6px 12px;
  background: rgba(251,191,36,0.2);
  border-radius: 12px;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}

.count-number {
  font-weight: 700;
  color: #fbbf24;
}

.btn-action {
  padding: 8px 16px;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-play {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102,126,234,0.3);
}

.btn-play:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102,126,234,0.4);
}

.btn-play:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-pass {
  background: rgba(251,191,36,0.2);
  color: #fbbf24;
}

.btn-pass:hover:not(:disabled) {
  background: rgba(251,191,36,0.3);
}

.btn-pass:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-clear {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
}

.btn-clear:hover {
  background: rgba(255,255,255,0.2);
}

/* 手牌网格 */
.hand-cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-start;
  padding: 8px 0;
}

.rank-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  transition: all 0.2s ease;
}

.rank-group.has-selection {
  background: rgba(102,126,234,0.15);
  box-shadow: 0 0 12px rgba(102,126,234,0.2);
}

.rank-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 10px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.rank-group-header:hover {
  background: rgba(255,255,255,0.2);
}

.rank-name {
  font-weight: 700;
  font-size: 13px;
  color: white;
}

.rank-count {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
}

.expand-icon {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
}

/* 卡牌展示 */
.rank-group-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.card-wrapper {
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.card-wrapper:hover {
  transform: translateY(-6px);
}

.card-wrapper.card-selected {
  transform: translateY(-10px);
}

.card-wrapper.card-selected .selection-indicator {
  opacity: 1;
}

.selection-indicator {
  position: absolute;
  inset: -4px;
  border: 2px solid #667eea;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
  box-shadow: 0 0 12px rgba(102,126,234,0.5);
}

/* 叠放效果 */
.rank-group-stacked {
  position: relative;
  cursor: pointer;
  padding: 8px;
  min-height: 60px;
}

.stacked-card {
  position: relative;
  transition: transform 0.2s ease;
}

.stacked-more {
  position: absolute;
  bottom: 0;
  right: -4px;
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
}

/* 响应式 */
@media screen and (max-width: 900px) {
  .hand-cards-container {
    padding: 8px;
    gap: 8px;
  }
  
  .player-info-bar {
    gap: 8px;
  }
  
  .action-buttons {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  
  .btn-action {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .hand-cards-grid {
    gap: 6px;
  }
}
</style>
