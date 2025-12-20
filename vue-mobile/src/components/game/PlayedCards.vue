<template>
  <div class="played-cards" :class="position">
    <div v-if="cards && cards.length > 0" class="cards-wrapper">
      <CardView
        v-for="(card, idx) in cards" 
        :key="`${card.id || idx}-${card.rank}-${card.suit}`"
        :card="card"
        size="small"
        class="card-item"
        :style="getCardStyle(idx, cards.length)"
      />
      <div class="play-type-badge" v-if="playType">
        {{ playType }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import CardView from '../card/CardView.vue';
import type { Card } from '../../types/card';
import { useI18n } from '../../i18n/composable';

const props = defineProps<{
  cards: Card[] | null;
  position: 'top' | 'bottom' | 'left' | 'right';
}>();

const { t } = useI18n();

// 计算牌型名称 (简单版)
const playType = computed(() => {
  if (!props.cards || props.cards.length === 0) return '';
  
  const count = props.cards.length;
  // 这里可以复用更复杂的牌型判断逻辑，暂时用简单计数
  if (count === 1) return ''; // 单张不显示文字
  // 其他简单逻辑...
  return `${count}张`; 
});

const getCardStyle = (index: number, total: number) => {
  // 简单的堆叠效果
  const spacing = 15; // 卡牌间距
  const centerOffset = (total - 1) * spacing / 2;
  return {
    transform: `translateX(${(index * spacing) - centerOffset}px)`,
    zIndex: index,
  };
};
</script>

<style scoped>
.played-cards {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none; /* 让点击穿透 */
  z-index: 10;
}

.cards-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-item {
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.play-type-badge {
  position: absolute;
  bottom: -20px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  white-space: nowrap;
}

/* 位置特定样式 */
.played-cards.top {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.played-cards.bottom {
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.played-cards.left {
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.played-cards.right {
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}
</style>
