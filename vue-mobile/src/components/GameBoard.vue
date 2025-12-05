<template>
  <div class="game-board">
    <!-- 游戏状态栏 -->
    <div class="status-bar">
      <van-tag type="primary">{{ statusText }}</van-tag>
      <van-tag type="success">回合 {{ currentRound }}</van-tag>
    </div>
    
    <!-- 出牌区域 -->
    <PlayArea
      :lastPlay="lastPlay"
      :lastPlayPlayerName="lastPlayPlayerName"
      :lastPlayPlayerIndex="lastPlayPlayerIndex"
      :players="gameStore.players"
    />
    
    <!-- 玩家信息 -->
    <PlayerInfo
      v-if="humanPlayer"
      :player="humanPlayer"
      :isPlayerTurn="isHumanPlayerTurn"
      :allPlayers="gameStore.players"
    />
    
    <!-- 手牌区域 -->
    <HandCards
      v-if="humanPlayer"
      ref="handCardsRef"
      :hand="humanPlayer.hand"
      :disabled="!isHumanPlayerTurn"
      @selectionChange="handleCardSelection"
    />
    
    <!-- 操作按钮 -->
    <ActionButtons
      v-if="gameStore.status === 'PLAYING'"
      :canPlay="canPlay"
      :canPass="canPass"
      @play="handlePlay"
      @pass="handlePass"
      @clearSelection="handleClearSelection"
    />
    
    <!-- 开始游戏按钮 -->
    <van-button
      v-if="gameStore.status === 'WAITING'"
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
import { Card, Play } from '../../../src/types/card';
import PlayArea from './PlayArea.vue';
import PlayerInfo from './PlayerInfo.vue';
import HandCards from './HandCards.vue';
import ActionButtons from './ActionButtons.vue';

const gameStore = useGameStore();
const handCardsRef = ref<InstanceType<typeof HandCards>>();
const selectedCards = ref<Card[]>([]);

// 计算属性
const statusText = computed(() => {
  const status = gameStore.status;
  const map: Record<string, string> = {
    'WAITING': '等待中',
    'PLAYING': '游戏中',
    'FINISHED': '已结束'
  };
  return map[status] || status;
});

const currentRound = computed(() => {
  const state = gameStore.getState();
  return state ? state.currentRoundIndex + 1 : 0;
});

const humanPlayer = computed(() => {
  return gameStore.players.find(p => p.isHuman);
});

const isHumanPlayerTurn = computed(() => {
  return humanPlayer.value 
    && gameStore.currentPlayerIndex === humanPlayer.value.id;
});

const lastPlay = computed<Play | null>(() => {
  const state = gameStore.getState();
  if (!state) return null;
  const currentRound = state.rounds[state.currentRoundIndex];
  return currentRound?.lastPlay || null;
});

const lastPlayPlayerName = computed(() => {
  const state = gameStore.getState();
  if (!state) return '';
  const currentRound = state.rounds[state.currentRoundIndex];
  if (!currentRound) return '';
  const playerId = currentRound.lastPlayPlayerIndex;
  if (playerId === null) return '';
  const player = gameStore.players.find(p => p.id === playerId);
  return player?.name || '';
});

const lastPlayPlayerIndex = computed(() => {
  const state = gameStore.getState();
  if (!state) return null;
  const currentRound = state.rounds[state.currentRoundIndex];
  return currentRound?.lastPlayPlayerIndex ?? null;
});

const canPlay = computed(() => {
  return isHumanPlayerTurn.value && selectedCards.value.length > 0;
});

const canPass = computed(() => {
  return isHumanPlayerTurn.value && lastPlay.value !== null;
});

// 方法
const startGame = async () => {
  try {
    await gameStore.startGame();
    showToast({ type: 'success', message: '游戏开始！' });
  } catch (error) {
    showToast({ type: 'fail', message: '开始游戏失败' });
  }
};

const handleCardSelection = (cards: Card[]) => {
  selectedCards.value = cards;
};

const handlePlay = async () => {
  if (!canPlay.value) return;
  
  try {
    await gameStore.playCards(selectedCards.value);
    handleClearSelection();
    showToast({ type: 'success', message: '出牌成功' });
  } catch (error: any) {
    showToast({ type: 'fail', message: error.message || '出牌失败' });
  }
};

const handlePass = async () => {
  if (!canPass.value) return;
  
  try {
    await gameStore.pass();
    showToast({ type: 'success', message: '已过牌' });
  } catch (error) {
    showToast({ type: 'fail', message: '过牌失败' });
  }
};

const handleClearSelection = () => {
  handCardsRef.value?.clearSelection();
  selectedCards.value = [];
};
</script>

<style scoped>
.game-board {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
</style>

