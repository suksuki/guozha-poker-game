<template>
  <div class="card" :class="[sizeClass, suitClass]">
    <div class="card-content">
      <div class="card-rank">{{ rankDisplay }}</div>
      <div class="card-suit">{{ suitDisplay }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Card, Suit, Rank } from '../../../src/types/card';

interface Props {
  card: Card;
  size?: 'small' | 'medium' | 'large';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium'
});

const sizeClass = computed(() => `card-${props.size}`);

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
  if (suit === Suit.JOKER) return '★';
  return '';
});
</script>

<style scoped>
.card {
  background: #fff;
  border: 2px solid #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
}

.card-small {
  width: 40px;
  height: 56px;
  font-size: 14px;
}

.card-medium {
  width: 50px;
  height: 70px;
  font-size: 16px;
}

.card-large {
  width: 60px;
  height: 84px;
  font-size: 18px;
}

.card-red {
  color: #e74c3c;
}

.card-black {
  color: #2c3e50;
}

.card-content {
  text-align: center;
}

.card-rank {
  font-weight: bold;
  line-height: 1;
}

.card-suit {
  font-size: 1.2em;
  line-height: 1;
  margin-top: 4px;
}
</style>

