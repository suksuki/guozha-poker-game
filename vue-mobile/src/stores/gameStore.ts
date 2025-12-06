/**
 * Pinia游戏状态Store
 * 简化版本 - 用于演示
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  // 简化版状态
  const status = ref('WAITING');
  const currentPlayerIndex = ref(0);
  
  // 简化版动作
  const startGame = () => {
    status.value = 'PLAYING';
    console.log('游戏开始！');
  };
  
  return {
    status,
    currentPlayerIndex,
    startGame
  };
});

