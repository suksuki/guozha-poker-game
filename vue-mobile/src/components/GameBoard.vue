<template>
  <div class="game-board">
    <van-cell-group title="游戏状态">
      <van-cell title="状态" :value="gameStore.status" />
      <van-cell title="当前玩家" :value="`玩家${gameStore.currentPlayerIndex}`" />
    </van-cell-group>
    
    <van-button type="primary" block @click="startGame">
      开始游戏
    </van-button>
  </div>
</template>

<script setup lang="ts">
import { Button, Cell, CellGroup } from 'vant';
import { useGameStore } from '../stores/gameStore';

const gameStore = useGameStore();

const startGame = () => {
  gameStore.startGame();
};
</script>

<style scoped>
.game-board {
  padding: 16px;
}
</style>

