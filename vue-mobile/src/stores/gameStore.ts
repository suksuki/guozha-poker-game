/**
 * Pinia游戏状态Store
 * 连接到GameEngine
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { GameState, StateManager } from '../../../src/game-engine';
import { GameStatus, PlayerType, Card } from '../../../src/types/card';

export const useGameStore = defineStore('game', () => {
  // 状态管理器
  const stateManager = ref<StateManager | null>(null);
  
  // 初始化
  const initialize = () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false
    };
    stateManager.value = new StateManager(config);
  };
  
  // 计算属性
  const status = computed(() => 
    stateManager.value?.getState().status || GameStatus.WAITING
  );
  
  const currentPlayerIndex = computed(() =>
    stateManager.value?.getState().currentPlayerIndex || 0
  );
  
  const players = computed(() =>
    stateManager.value?.getState().players || []
  );
  
  // 获取当前状态
  const getState = () => stateManager.value?.getState() || null;
  
  // 动作
  const startGame = async () => {
    if (!stateManager.value) {
      initialize();
    }
    
    const players = [0, 1, 2, 3].map(id => ({
      id,
      name: `玩家${id}`,
      type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
      hand: [],
      score: 0,
      isHuman: id === 0
    }));
    
    await stateManager.value!.executeAction({
      type: 'INIT_GAME',
      payload: { players }
    });
  };
  
  const playCards = async (cards: Card[]) => {
    if (!stateManager.value) throw new Error('游戏未初始化');
    
    await stateManager.value.executeAction({
      type: 'PLAY_CARDS',
      payload: { cards }
    });
  };
  
  const pass = async () => {
    if (!stateManager.value) throw new Error('游戏未初始化');
    
    await stateManager.value.executeAction({
      type: 'PASS',
      payload: {}
    });
  };
  
  // 初始化
  initialize();
  
  return {
    status,
    currentPlayerIndex,
    players,
    getState,
    startGame,
    playCards,
    pass
  };
});

