<template>
  <div class="game-board">
    <van-cell-group title="游戏状态">
      <van-cell title="状态" :value="gameStore.status" />
      <van-cell title="当前玩家" :value="`玩家${gameStore.currentPlayerIndex}`" />
    </van-cell-group>
    
    <van-button 
      type="primary" 
      size="large"
      block 
      @click="startGame"
    >
      开始游戏
    </van-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button, Tag, showToast } from 'vant';
import { useGameStore } from '../stores/gameStore';
// 简化版本 - 暂时不导入复杂组件
// import { Card, Play } from '../../../src/types/card';
// import PlayArea from './PlayArea.vue';
// import PlayerInfo from './PlayerInfo.vue';
// import HandCards from './HandCards.vue';
// import ActionButtons from './ActionButtons.vue';

const gameStore = useGameStore();

const startGame = () => {
  try {
    gameStore.startGame();
    showToast({ type: 'success', message: '游戏开始！' });
  } catch (error) {
    showToast({ type: 'fail', message: '开始游戏失败' });
  }
};
</script>

<style scoped>
.game-board {
  padding: 16px;
}
</style>

