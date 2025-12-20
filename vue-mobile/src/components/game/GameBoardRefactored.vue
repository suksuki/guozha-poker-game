<template>
  <div class="game-board">
    <!-- 发牌动画 -->
    <DealingAnimation
      :is-dealing="isDealing"
      :total-cards="216"
      :player-count="4"
      @complete="onDealingComplete"
      @skip="onDealingSkip"
    />
    
    <!-- 开始屏幕 -->
    <StartScreen
      v-if="gameStore.status === 'waiting' && !isDealing"
      @start="startGameWithAnimation"
      @training="showTrainingPanel = true"
    />
    
    <!-- 训练面板 -->
    <TrainingPanel
      v-if="showTrainingPanel"
      @close="showTrainingPanel = false"
    />
    
    <!-- 游戏结束 -->
    <GameResultScreen
      v-else-if="gameStore.status === 'finished'"
      :players="gameStore.players"
      :rounds="gameStore.rounds"
      :winner="gameWinner"
      @restart="startGameWithAnimation"
    />
    
    <!-- 游戏中 - 横屏布局 -->
    <div v-else-if="gameStore.status === 'playing'" class="game-container-landscape">
      <!-- 顶部工具栏 -->
      <GameToolbar
        :player-count="gameStore.players.length"
        :is-auto-play="gameStore.isAutoPlay"
        :show-chat="showChat"
        @open-settings="openSettings"
        @toggle-auto-play="toggleAutoPlay"
        @sort-hand="sortHand"
        @get-ai-recommendation="getAIRecommendation"
        @toggle-chat="showChat = !showChat"
      />
      
      <!-- 聊天面板 -->
      <ChatPanel
        v-if="showChat"
        :messages="chatStore.recentMessages"
        :human-player-id="gameStore.humanPlayer?.id"
        @get-player-name="getPlayerName"
        @get-intent-label="getIntentLabel"
      />
      
      <!-- 游戏区域 - 横屏布局 -->
      <div class="game-area-landscape">
        <!-- 上层区域：包含东西玩家和中间区域 -->
        <div class="top-area-landscape">
          <!-- 西侧玩家（左） -->
          <div class="player-left">
            <PlayerCard
              v-if="playerWest"
              :player="playerWest"
              position="left"
              :is-current="isCurrentPlayer(playerWest.id)"
              :active-bubble="getPlayerBubble(playerWest.id)"
            />
          </div>
          
          <!-- 中间区域 -->
          <div class="center-area-landscape">
            <!-- 北侧玩家（上） -->
            <div class="player-top">
              <PlayerCard
                v-if="playerNorth"
                :player="playerNorth"
                position="top"
                :is-current="isCurrentPlayer(playerNorth.id)"
                :active-bubble="getPlayerBubble(playerNorth.id)"
              />
            </div>
            
            <!-- 中央出牌桌面 (替换原来的PlayArea) -->
            <TableSurface
              :cards-north="getRoundPlay(playerNorth?.id)"
              :cards-south="getRoundPlay(playerSouth?.id)"
              :cards-east="getRoundPlay(playerEast?.id)"
              :cards-west="getRoundPlay(playerWest?.id)"
            />
          </div>
          
          <!-- 东侧玩家（右） -->
          <div class="player-right">
            <PlayerCard
              v-if="playerEast"
              :player="playerEast"
              position="right"
              :is-current="isCurrentPlayer(playerEast.id)"
              :active-bubble="getPlayerBubble(playerEast.id)"
            />
          </div>
        </div>
        
        <!-- 底部 - 南侧（你）- 全宽 -->
        <HandCards
          v-if="playerSouth"
          :hand="playerSouth.hand"
          :player-name="playerSouth.name"
          :score="playerSouth.score"
          :dun-count="playerSouth.dunCount"
          :finished-rank="playerSouth.finishedRank"
          :is-my-turn="isMyTurn"
          :can-pass="canPassValue"
          :is-auto-play="gameStore.isAutoPlay"
          :selected-card-ids="selectedCardIds"
          :sort-method="sortMethod"
          @play="playSelectedCards"
          @pass="passRound"
          @clear="clearSelection"
          @toggle-card="toggleCard"
        />
      </div>
      
      <!-- 设置面板 -->
      <SettingsPanel v-model="showSettings" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { showToast } from 'vant';
import { useI18n } from '../../i18n/composable';
import { useGameStore } from '../../stores/gameStore';
import { useChatStore } from '../../stores/chatStore';

// 子组件导入
import StartScreen from './StartScreen.vue';
import GameToolbar from './GameToolbar.vue';
import ChatPanel from './ChatPanel.vue';
import PlayerCard from './PlayerCard.vue';
import TableSurface from './TableSurface.vue'; // 新增组件
import HandCards from './HandCards.vue';
import GameResultScreen from './GameResultScreen.vue';
import SettingsPanel from '../settings/SettingsPanel.vue';
import TrainingPanel from '../training/TrainingPanel.vue';
import DealingAnimation from './DealingAnimation.vue';

const { t } = useI18n();
const gameStore = useGameStore();
const chatStore = useChatStore();

// ========== 状态 ==========
const selectedCardIds = ref<string[]>([]);
const sortMethod = ref<'rank' | 'value'>('rank');
const showSettings = ref(false);
const showChat = ref(false);
const showTrainingPanel = ref(false);
const isDealing = ref(false);
const pendingGameConfig = ref<{ teamMode: boolean } | undefined>(undefined);

// ========== 计算属性 - 玩家 ==========
const playerEast = computed(() => gameStore.players[1]);
const playerNorth = computed(() => gameStore.players[2]);
const playerWest = computed(() => gameStore.players[3]);
const playerSouth = computed(() => gameStore.humanPlayer);

const gameWinner = computed(() => {
  const winnerIndex = gameStore.gameState?.winner;
  if (winnerIndex !== null && winnerIndex !== undefined) {
    return gameStore.players[winnerIndex];
  }
  return undefined;
});

const isMyTurn = computed(() => {
  return gameStore.humanPlayer 
    && gameStore.currentPlayerIndex === gameStore.humanPlayer.id;
});

const canPassValue = computed(() => {
  // 如果当前轮次的lastPlay不为空（即不是首家），则可以不要
  return gameStore.currentRound?.lastPlay !== null && 
         gameStore.currentRound?.lastPlay !== undefined;
});

// ========== 方法 ==========
const isCurrentPlayer = (playerId: number) => {
  return gameStore.currentPlayerIndex === playerId;
};

const getPlayerBubble = (playerId: number) => {
  return chatStore.activeBubbles.get(playerId) || null;
};

// 获取玩家在当前轮次的最新出牌
const getRoundPlay = (playerId: number | undefined) => {
  if (playerId === undefined) return [];
  
  const plays = gameStore.currentRound?.plays;
  if (!plays || plays.length === 0) return [];

  // 获取该玩家在当前trick的所有出牌记录
  const playerPlays = plays.filter(p => p.playerId === playerId);
  
  // 返回最后一次出牌的卡牌
  if (playerPlays.length > 0) {
    return playerPlays[playerPlays.length - 1].cards;
  }
  
  return [];
};

const openSettings = () => {
  showSettings.value = true;
};

const startGame = (config?: { teamMode: boolean }) => {
  gameStore.startGame(config);
  showToast('🎮 游戏开始！');
};

// 带动画的开始游戏
const startGameWithAnimation = (config?: { teamMode: boolean }) => {
  pendingGameConfig.value = config;
  isDealing.value = true;
};

const onDealingComplete = () => {
  isDealing.value = false;
  startGame(pendingGameConfig.value);
};

const onDealingSkip = () => {
  isDealing.value = false;
  startGame(pendingGameConfig.value);
};

const toggleCard = (cardId: string) => {
  const index = selectedCardIds.value.indexOf(cardId);
  if (index > -1) {
    selectedCardIds.value.splice(index, 1);
  } else {
    selectedCardIds.value.push(cardId);
  }
};

const playSelectedCards = () => {
  if (selectedCardIds.value.length === 0) {
    showToast('请先选择要出的牌');
    return;
  }
  
  const cards = gameStore.humanPlayer!.hand.filter(c => 
    selectedCardIds.value.includes(c.id)
  );
  
  const result = gameStore.playCards(cards);
  
  if (result.success) {
    selectedCardIds.value = [];
    showToast({ type: 'success', message: `✅ ${t('game.playCards')}${t('common.success')}` });
  } else {
    showToast({ type: 'fail', message: result.message });
  }
};

const passRound = () => {
  const result = gameStore.pass();
  if (result.success) {
    showToast({ type: 'success', message: '不要' });
  } else {
    showToast({ type: 'fail', message: result.message });
  }
};

const clearSelection = () => {
  selectedCardIds.value = [];
  showToast('已清除选择');
};

const sortHand = () => {
  sortMethod.value = sortMethod.value === 'rank' ? 'value' : 'rank';
  const methodNames = { rank: '按点数', value: '按牌大小' };
  showToast(`已切换至${methodNames[sortMethod.value]}排序`);
};

const toggleAutoPlay = () => {
  gameStore.toggleAutoPlay();
  showToast(gameStore.isAutoPlay ? `🤖 ${t('game.autoPlay')}` : t('game.manualPlay'));
};

const getAIRecommendation = () => {
  const suggestion = gameStore.getAIRecommendation();
  if (suggestion && suggestion.cards.length > 0) {
    selectedCardIds.value = suggestion.cards.map(c => c.id);
    showToast({ 
      type: 'success', 
      message: `💡 ${t('game.aiRecommendation')}: ${suggestion.cards.length}${t('game.selectCards')}` 
    });
  } else {
    showToast({ 
      type: 'warning', 
      message: `💡 ${t('game.aiRecommendation')}: ${t('game.pass')}` 
    });
  }
};

const getPlayerName = (playerId: number) => {
  const player = gameStore.players.find(p => p.id === playerId);
  return player?.name || `${t('game.currentPlayer')}${playerId}`;
};

const getIntentLabel = (intent: string) => {
  const labels: Record<string, string> = {
    'tactical_signal': t('chat.intent.tactical'),
    'strategic_discuss': t('chat.intent.strategic'),
    'emotional_express': t('chat.intent.emotional'),
    'social_chat': t('chat.intent.social'),
    'taunt': t('chat.intent.taunt'),
    'encourage': t('chat.intent.encourage'),
    'celebrate': t('chat.intent.celebrate')
  };
  return labels[intent] || intent;
};

// 初始化
onMounted(() => {
  chatStore.initializeAIBrainListener();
});
</script>

<style scoped>
.game-board {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%);
  overflow: hidden;
}

/* 横屏布局 */
.game-container-landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.game-area-landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 4px;
  gap: 4px;
  min-height: 0;
  overflow: hidden;
  width: 100%;
}

/* 上层区域：包含东西玩家和中间区域 */
.top-area-landscape {
  flex: 1;
  display: flex;
  gap: 4px;
  min-height: 0;
  overflow: hidden;
}

/* 左侧玩家 */
.player-left {
  width: 65px;
  min-width: 65px;
  max-width: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 20;
}

/* 中间区域 */
.center-area-landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  /* Ensure relative positioning context for children if needed */
  position: relative;
}

/* 北侧玩家 */
.player-top {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4px;
  position: relative;
  z-index: 20;
}

/* 右侧玩家 */
.player-right {
  width: 65px;
  min-width: 65px;
  max-width: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 20;
}

/* 响应式 */
@media screen and (max-width: 900px) {
  .game-area-landscape {
    padding: 2px;
    gap: 2px;
  }
  
  .player-left,
  .player-right {
    width: 55px;
    min-width: 55px;
    max-width: 55px;
  }
}

@media screen and (min-width: 768px) {
  .game-area-landscape {
    max-width: 1400px;
    margin: 0 auto;
  }
}
</style>
