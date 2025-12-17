<template>
  <div class="card" :class="[sizeClass, suitClass, { 'card-joker': isJoker }]">
    <!-- 左上角 -->
    <div class="card-corner card-corner-top">
      <div class="corner-rank">{{ rankDisplay }}</div>
      <div class="corner-suit">{{ suitDisplay }}</div>
    </div>
    
    <!-- 中间大花色（非Joker） -->
    <div v-if="!isJoker" class="card-center-suit">{{ suitDisplay }}</div>
    
    <!-- Joker特殊显示 -->
    <div v-else class="card-joker-content">
      <div class="joker-text">{{ jokerText }}</div>
      <div class="joker-icon">🃏</div>
    </div>
    
    <!-- 右下角（倒置） -->
    <div class="card-corner card-corner-bottom">
      <div class="corner-rank">{{ rankDisplay }}</div>
      <div class="corner-suit">{{ suitDisplay }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Card, Suit, Rank } from '../../types/card';

interface Props {
  card: Card;
  size?: 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium'
});

const sizeClass = computed(() => `card-${props.size}`);

const isJoker = computed(() => {
  return props.card.suit === Suit.JOKER || props.card.rank === Rank.SMALL_JOKER || props.card.rank === Rank.BIG_JOKER;
});

const suitClass = computed(() => {
  const suit = props.card.suit;
  if (suit === Suit.HEARTS || suit === Suit.DIAMONDS) {
    return 'card-red';
  }
  return 'card-black';
});

const rankDisplay = computed(() => {
  const rank = props.card.rank;
  if (rank === Rank.ACE) return 'A';
  if (rank === Rank.JACK) return 'J';
  if (rank === Rank.QUEEN) return 'Q';
  if (rank === Rank.KING) return 'K';
  if (rank === Rank.SMALL_JOKER) return '小';
  if (rank === Rank.BIG_JOKER) return '大';
  return rank.toString();
});

const suitDisplay = computed(() => {
  const suit = props.card.suit;
  if (suit === Suit.HEARTS) return '♥';
  if (suit === Suit.DIAMONDS) return '♦';
  if (suit === Suit.CLUBS) return '♣';
  if (suit === Suit.SPADES) return '♠';
  if (suit === Suit.JOKER) return '';
  return '';
});

const jokerText = computed(() => {
  if (props.card.rank === Rank.SMALL_JOKER) return '小王';
  if (props.card.rank === Rank.BIG_JOKER) return '大王';
  return 'JOKER';
});
</script>

<style scoped>
.card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  user-select: none;
  background-image: 
    linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%),
    linear-gradient(45deg, rgba(0,0,0,0.02) 0%, transparent 50%);
}

/* 尺寸 */
.card-small {
  width: 36px;
  height: 50px;
}

.card-medium {
  width: 48px;
  height: 68px;
}

.card-large {
  width: 60px;
  height: 85px;
}

/* 颜色 */
.card-red {
  color: #d32f2f;
}

.card-black {
  color: #212121;
}

/* 角落（左上角和右下角） */
.card-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.card-corner-top {
  top: 3px;
  left: 3px;
}

.card-corner-bottom {
  bottom: 3px;
  right: 3px;
  transform: rotate(180deg);
}

.corner-rank {
  font-weight: 700;
  font-family: 'Arial', sans-serif;
  letter-spacing: -0.5px;
}

.corner-suit {
  font-size: 1.1em;
  line-height: 0.8;
  margin-top: -2px;
}

/* 中间大花色 */
.card-center-suit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2.5em;
  opacity: 0.9;
  line-height: 1;
}

/* Joker样式 */
.card-joker {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #ffd700;
}

.card-joker-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.joker-text {
  font-size: 0.65em;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}

.joker-icon {
  font-size: 1.8em;
  line-height: 1;
}

/* 小尺寸调整 */
.card-small .corner-rank {
  font-size: 10px;
}

.card-small .corner-suit {
  font-size: 12px;
}

.card-small .card-center-suit {
  font-size: 20px;
}

.card-small .joker-text {
  font-size: 8px;
}

.card-small .joker-icon {
  font-size: 18px;
}

/* 中等尺寸 */
.card-medium .corner-rank {
  font-size: 13px;
}

.card-medium .corner-suit {
  font-size: 16px;
}

.card-medium .card-center-suit {
  font-size: 28px;
}

.card-medium .joker-text {
  font-size: 10px;
}

.card-medium .joker-icon {
  font-size: 24px;
}

/* 大尺寸 */
.card-large .corner-rank {
  font-size: 16px;
}

.card-large .corner-suit {
  font-size: 20px;
}

.card-large .card-center-suit {
  font-size: 36px;
}

.card-large .joker-text {
  font-size: 12px;
}

.card-large .joker-icon {
  font-size: 30px;
}
</style>

