<template>
  <div class="hand-cards-container" :class="{ 'auto-play-active': isAutoPlay }">
    <!-- 玩家信息栏 -->
    <div class="player-info-bar">
      <van-tag type="success" size="small">🧑 {{ playerName }}</van-tag>
      <van-tag v-if="isAutoPlay" type="warning" size="small">🤖托管</van-tag>
      <van-tag size="small" type="primary">🎴{{ handSize }}</van-tag>
      <van-tag 
        size="small" 
        :type="(score || 0) >= 0 ? 'success' : 'danger'" 
        v-if="score && score !== 0"
      >
        💰{{ score }}
      </van-tag>
      <van-tag size="small" type="warning" v-if="dunCount && dunCount > 0">
        🏆{{ dunCount }}墩
      </van-tag>
      <van-tag v-if="finishedRank" size="small" type="danger">
        #{{ finishedRank }}
      </van-tag>
      
      <!-- 操作按钮 -->
      <div class="action-buttons">
        <van-tag v-if="isMyTurn" type="primary" size="small">{{ $t('game.yourTurn') }}</van-tag>
        <van-tag v-else size="small">{{ $t('game.waiting') }}</van-tag>
        <van-tag type="warning" size="small">{{ $t('game.selected') }}: {{ selectedCount }}</van-tag>
        <van-button 
          type="primary"
          size="small"
          :disabled="!isMyTurn || selectedCount === 0"
          @click="$emit('play')"
        >
          {{ $t('game.playCards') }}
        </van-button>
        <van-button 
          type="warning"
          size="small"
          :disabled="!isMyTurn || !canPass"
          @click="$emit('pass')"
        >
          {{ $t('game.pass') }}
        </van-button>
        <van-button 
          size="small"
          @click="$emit('clear')"
        >
          {{ $t('common.clear') }}
        </van-button>
      </div>
    </div>
    
    <!-- 手牌分组显示 -->
    <div class="hand-cards-grid">
      <div 
        v-for="rank in sortedRanks" 
        :key="rank"
        class="rank-group"
      >
        <!-- 点数组头部 -->
        <div class="rank-group-header" @click="toggleRankExpand(rank)">
          <span class="rank-name">{{ getRankDisplayName(rank) }}</span>
          <span class="rank-count">({{ getCardsOfRank(rank).length }})</span>
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
            :class="['card-item', { 'card-selected': isCardSelected(card.id) }]"
            @click.stop="toggleCard(card.id)"
          >
            <CardView :card="card" size="small" />
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
              transform: `translateX(${index * 6}px) translateY(${-index * 3}px)` 
            }"
            @click.stop="toggleCard(card.id)"
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
  if (rank === Rank.JOKER_SMALL) return t('cards.rank.jokerSmall');
  if (rank === Rank.JOKER_BIG) return t('cards.rank.jokerBig');
  return rank.toString();
};
</script>

<style scoped>
.hand-cards-container {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hand-cards-container.auto-play-active {
  opacity: 0.7;
  pointer-events: none;
}

.player-info-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.hand-cards-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  overflow-x: auto;
  padding: 4px 0;
}

.rank-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.rank-group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  font-size: 11px;
  color: white;
}

.rank-group-header:hover {
  background: rgba(255, 255, 255, 0.25);
}

.rank-name {
  font-weight: bold;
}

.rank-count {
  color: rgba(255, 255, 255, 0.7);
}

.expand-icon {
  font-size: 10px;
}

.rank-group-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.rank-group-stacked {
  position: relative;
  cursor: pointer;
  padding: 4px;
}

.stacked-card {
  position: relative;
}

.stacked-more {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.card-item {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border-radius: 4px;
}

.card-item:hover {
  transform: translateY(-4px);
}

.card-item.card-selected {
  transform: translateY(-8px);
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.5);
  border: 2px solid #1989fa;
  border-radius: 4px;
}

/* 响应式 */
@media screen and (max-width: 900px) {
  .hand-cards-container {
    padding: 4px;
  }
  
  .action-buttons {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  
  .hand-cards-grid {
    gap: 6px;
  }
}
</style>
