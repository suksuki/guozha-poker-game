<template>
  <div class="play-area">
    <!-- 无出牌时 -->
    <template v-if="!lastPlay || lastPlay.length === 0">
      <van-empty 
        :description="$t('game.waitingFirstPlayer')"
        image="search"
        :image-size="80"
      />
    </template>
    
    <!-- 有出牌时 -->
    <template v-else>
      <div class="last-play-container">
        <!-- 出牌信息头部 -->
        <div class="play-header">
          <van-tag type="primary" size="medium">
            {{ lastPlayerName }} {{ $t('game.playCards') }}
          </van-tag>
          <van-tag type="success" size="medium">
            {{ playType }}
          </van-tag>
        </div>
        
        <!-- 出牌卡牌 -->
        <div class="played-cards">
          <CardView
            v-for="(card, idx) in lastPlay" 
            :key="`${card.id || idx}-${card.rank}-${card.suit}`"
            :card="card"
            size="medium"
            class="played-card"
          />
        </div>
        
        <!-- 轮次信息 -->
        <div class="play-info">
          {{ $t('game.round') }}{{ playCount }}{{ $t('game.playCards') }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n/composable';
import CardView from '../card/CardView.vue';
import type { Card } from '../../types/card';

// Props
const props = defineProps<{
  lastPlay: Card[] | null;
  lastPlayerName: string;
  playCount: number;
}>();

const { t } = useI18n();

// 计算牌型
const playType = computed(() => {
  if (!props.lastPlay || props.lastPlay.length === 0) {
    return '无';
  }
  
  const cards = props.lastPlay;
  const cardCount = cards.length;
  
  if (cardCount === 1) return t('game.playTypes.single');
  if (cardCount === 2) {
    if (cards[0].rank === cards[1].rank) return t('game.playTypes.pair');
    return t('game.playTypes.combination');
  }
  if (cardCount === 3) return t('game.playTypes.triple');
  if (cardCount === 4) {
    const ranks = cards.map(c => c.rank);
    if (ranks.every(r => r === ranks[0])) return t('game.playTypes.bomb');
    return t('game.playTypes.fourWithTwo');
  }
  if (cardCount >= 7) {
    const ranks = cards.map(c => c.rank);
    if (ranks.every(r => r === ranks[0])) return t('game.playTypes.dun');
  }
  
  return `${cardCount}张组合`;
});
</script>

<style scoped>
.play-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  padding: 12px;
}

.last-play-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.play-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.played-cards {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 100%;
}

.played-card {
  flex-shrink: 0;
}

.play-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* 响应式 */
@media screen and (max-width: 900px) {
  .play-area {
    min-height: 100px;
    padding: 8px;
  }
  
  .played-cards {
    gap: 2px;
  }
}
</style>
