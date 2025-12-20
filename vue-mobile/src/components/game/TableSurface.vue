<template>
  <div class="table-surface">
    <!-- 北家出牌 -->
    <PlayedCards 
      v-if="cardsNorth && cardsNorth.length > 0"
      :cards="cardsNorth"
      position="top"
    />

    <!-- 西家出牌 (在左侧) -->
    <PlayedCards 
      v-if="cardsWest && cardsWest.length > 0"
      :cards="cardsWest"
      position="left"
    />

    <!-- 东家出牌 (在右侧) -->
    <PlayedCards 
      v-if="cardsEast && cardsEast.length > 0"
      :cards="cardsEast"
      position="right"
    />

    <!-- 南家出牌 -->
    <PlayedCards 
      v-if="cardsSouth && cardsSouth.length > 0"
      :cards="cardsSouth"
      position="bottom"
    />
    
    <!-- 中央提示信息 (如：谁的回合，或者特殊状态) -->
    <div class="center-info" v-if="centerMessage">
      {{ centerMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import PlayedCards from './PlayedCards.vue';
import type { Card } from '../../types/card';

defineProps<{
  cardsNorth?: Card[];
  cardsSouth?: Card[];
  cardsEast?: Card[];
  cardsWest?: Card[];
  centerMessage?: string;
}>();
</script>

<style scoped>
.table-surface {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 150px;
  /* 调试背景，实际应该是透明的 */
  /* background: rgba(255, 255, 255, 0.05); */
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.center-info {
  background: rgba(0, 0, 0, 0.4);
  padding: 8px 16px;
  border-radius: 20px;
  color: white;
  font-size: 14px;
}
</style>
