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
    
    <!-- 训练面板 -->
    <TrainingPanel
      v-if="showTrainingPanel"
      @close="showTrainingPanel = false"
    />
    
    <!-- 游戏结束 (模态框形式) -->
    <van-overlay :show="gameStore.status === 'finished' && showResultModal" @click="showResultModal = false" z-index="100">
      <div class="result-modal-wrapper" @click.stop>
        <GameResultScreen
          v-if="gameStore.status === 'finished'"
          :players="(gameStore.players as any)"
          :rounds="(gameStore.rounds as any)"
          :winner="gameStore.gameState?.winner !== null && gameStore.gameState?.winner !== undefined 
            ? (gameStore.players[gameStore.gameState.winner] as any) 
            : undefined"
          @restart="startGameWithAnimation"
          @close="showResultModal = false"
        />
      </div>
    </van-overlay>

    <!-- 开始画面 -->
    <StartScreen
      v-if="gameStore.status === 'waiting' && !isDealing"
      @start="startGameWithAnimation"
      @training="showTrainingPanel = true"
      @settings="openSettings"
    />
    
    <!-- 游戏中 或 游戏结束（但查看桌面） - 横屏布局 -->
    <div v-else-if="gameStore.status === 'playing' || gameStore.status === 'finished'" class="game-container-landscape">
      <!-- 顶部工具栏 -->
      <div class="toolbar-landscape">
        <van-tag 
          v-if="gameStore.players.length !== 4"
          type="warning"
          size="medium"
        >
          ⚠️ {{ gameStore.players.length }}人
        </van-tag>
        <van-button 
          size="small" 
          icon="setting"
          @click="openSettings"
          plain
        >
          {{ $t('common.settings') }}
        </van-button>
        <van-button 
          size="small" 
          :type="gameStore.isAutoPlay ? 'warning' : 'default'"
          @click="toggleAutoPlay"
          plain
        >
          {{ gameStore.isAutoPlay ? '🤖' : '👆' }}
        </van-button>
        <van-button 
          size="small" 
          @click="sortHand" 
          type="success"
          plain
        >
          📊
        </van-button>
        <van-button 
          size="small" 
          @click="getAIRecommendation" 
          :loading="isAIQuerying"
          type="primary"
          plain
        >
          💡
        </van-button>
        <van-button 
          size="small" 
          @click="showChat = !showChat" 
          :type="showChat ? 'primary' : 'default'"
          plain
        >
          💬
        </van-button>
        <van-button 
          v-if="gameStore.status === 'finished'"
          size="small" 
          type="danger"
          @click="showResultModal = true"
        >
          🏆 战绩
        </van-button>
      </div>
      
      <!-- 聊天消息显示 -->
      <div v-if="showChat" class="chat-panel-landscape">
        <!-- 聊天窗口头部 -->
        <div class="chat-header">
          <span class="chat-title">{{ $t('chat.title') || '聊天' }}</span>
          <div class="close-btn" @click="showChat = false">✕</div>
        </div>

        <div class="chat-messages-landscape">
          <div 
            v-for="msg in chatStore.recentMessages" 
            :key="msg.id"
            class="chat-message"
            :class="{
              'chat-message-human': msg.playerId === gameStore.humanPlayer?.id,
              'chat-message-ai': msg.playerId !== gameStore.humanPlayer?.id
            }"
          >
            <span class="chat-player-name">{{ getPlayerName(msg.playerId) }}:</span>
            <span class="chat-content">{{ msg.content }}</span>
            <span class="chat-intent" v-if="msg.intent && msg.intent !== 'social_chat'">
              [{{ getIntentLabel(msg.intent) }}]
            </span>
          </div>
          <div v-if="chatStore.recentMessages.length === 0" class="chat-empty">
            {{ $t('chat.noMessages') }}
          </div>
        </div>
        
        <!-- 聊天输入框 -->
        <ChatInput />
      </div>
      
      <!-- 游戏区域 - 横屏布局 -->
      <div class="game-area-landscape">
        <!-- 装饰性扑克元素 -->
        <div class="poker-decorations">
          <!-- 四角花色 -->
          <div class="corner-suit corner-top-left">♠</div>
          <div class="corner-suit corner-top-right">♥</div>
          <div class="corner-suit corner-bottom-left">♦</div>
          <div class="corner-suit corner-bottom-right">♣</div>
          
          <!-- 漂浮卡牌装饰 -->
          <div class="floating-card floating-card-1">🃏</div>
          <div class="floating-card floating-card-2">🂡</div>
          <div class="floating-card floating-card-3">🂱</div>
        </div>
        
        <!-- 上层区域：包含东西玩家和中间区域 -->
        <div class="top-area-landscape">
          <!-- 西侧玩家（左） -->
          <div class="player-left">
            <div class="player-card-vertical" v-if="playerWest" style="position: relative;">
              <!-- 聊天气泡 -->
              <ChatBubble
                v-if="chatStore.activeBubbles.has(playerWest.id)"
                :content="chatStore.activeBubbles.get(playerWest.id)?.content || ''"
                :player-id="playerWest.id"
                :is-human="false"
                position="right"
                :offset-x="10"
                :offset-y="0"
              />
              <div class="player-avatar">🤖</div>
              <van-tag size="medium" :type="isCurrentPlayer(playerWest.id) ? 'primary' : 'default'">
                {{ $t('game.directions.west') }}{{ playerWest.id }}
              </van-tag>
              <div class="player-stats-vertical">
                <span>🎴{{ playerWest.hand.length }}</span>
                <span v-if="playerWest.score && playerWest.score !== 0" :class="playerWest.score > 0 ? 'score-positive' : 'score-negative'">
                  💰{{ playerWest.score }}
                </span>
                <span v-if="playerWest.dunCount && playerWest.dunCount > 0">
                  🏆{{ playerWest.dunCount }}墩
                </span>
              </div>
              <van-tag v-if="playerWest.finishedRank" size="medium" type="danger">
                #{{ playerWest.finishedRank }}
              </van-tag>
            </div>
          </div>
          
          <!-- 中间区域 -->
          <div class="center-area-landscape">
            <!-- 北侧玩家（上） -->
            <div class="player-top">
              <template v-if="playerNorth">
                <div class="player-info-horizontal" style="position: relative;">
                  <!-- 聊天气泡 -->
                  <ChatBubble
                    v-if="chatStore.activeBubbles.has(playerNorth.id)"
                    :content="chatStore.activeBubbles.get(playerNorth.id)?.content || ''"
                    :player-id="playerNorth.id"
                    :is-human="false"
                    position="bottom"
                    :offset-x="0"
                    :offset-y="10"
                  />
                  <div class="player-avatar-north">🤖</div>
                  <van-tag size="medium" :type="isCurrentPlayer(playerNorth.id) ? 'primary' : 'default'">
                    {{ playerNorth.name }}
                  </van-tag>
                  <van-tag size="medium" type="primary">
                    🎴{{ playerNorth.hand.length }}
                  </van-tag>
                  <van-tag size="medium" type="success" v-if="playerNorth.score && playerNorth.score !== 0">
                    💰{{ playerNorth.score }}
                  </van-tag>
                  <van-tag size="medium" type="warning" v-if="playerNorth.dunCount && playerNorth.dunCount > 0">
                    🏆{{ playerNorth.dunCount }}墩
                  </van-tag>
                  <van-tag v-if="playerNorth.finishedRank" size="medium" type="danger">
                    #{{ playerNorth.finishedRank }}
                  </van-tag>
                </div>
              </template>
            </div>
            
            <!-- 中央出牌区 - 真实牌桌布局 -->
            <div class="play-area-center">
              <!-- 北家 (Top) -->
                <div class="played-cards-slot slot-top">
                  <transition name="pop-in">
                    <div v-if="getPlayedCards(playerNorth?.id).length > 0">
                      <div class="multiple-plays-container">
                        <div v-for="(play, playIdx) in getPlayedCards(playerNorth?.id)" :key="playIdx" 
                             class="play-history-item" :style="getPlayStyle(playIdx, getPlayedCards(playerNorth?.id).length)">
                          <div class="card-stack-display">
                            <div v-for="(card, i) in play.cards" :key="card.id" 
                                 class="played-card-item" :style="{ zIndex: i, transform: `translateX(${i * 15}px) rotate(${(i - play.cards.length/2) * 2}deg)` }">
                              <CardView :card="card" size="small" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else-if="passStatus.get(playerNorth?.id || -1)" class="pass-indicator">
                      <span class="pass-text">不要</span>
                    </div>
                  </transition>
                </div>
              
              <!-- 西家 (Left) -->
                <div class="played-cards-slot slot-left">
                  <transition name="pop-in">
                    <div v-if="getPlayedCards(playerWest?.id).length > 0">
                      <div class="multiple-plays-container">
                        <div v-for="(play, playIdx) in getPlayedCards(playerWest?.id)" :key="playIdx" 
                             class="play-history-item" :style="getPlayStyle(playIdx, getPlayedCards(playerWest?.id).length)">
                          <div class="card-stack-display">
                            <div v-for="(card, i) in play.cards" :key="card.id" 
                                 class="played-card-item" :style="{ zIndex: i, transform: `translateX(${i * 15}px) rotate(${(i - play.cards.length/2) * 2}deg)` }">
                              <CardView :card="card" size="small" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else-if="passStatus.get(playerWest?.id || -1)" class="pass-indicator">
                      <span class="pass-text">不要</span>
                    </div>
                  </transition>
                </div>
              
              <!-- 东家 (Right) -->
                <div class="played-cards-slot slot-right">
                  <transition name="pop-in">
                    <div v-if="getPlayedCards(playerEast?.id).length > 0">
                      <div class="multiple-plays-container">
                        <div v-for="(play, playIdx) in getPlayedCards(playerEast?.id)" :key="playIdx" 
                             class="play-history-item" :style="getPlayStyle(playIdx, getPlayedCards(playerEast?.id).length)">
                          <div class="card-stack-display">
                            <div v-for="(card, i) in play.cards" :key="card.id" 
                                 class="played-card-item" :style="{ zIndex: i, transform: `translateX(${i * 15}px) rotate(${(i - play.cards.length/2) * 2}deg)` }">
                              <CardView :card="card" size="small" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else-if="passStatus.get(playerEast?.id || -1)" class="pass-indicator">
                      <span class="pass-text">不要</span>
                    </div>
                  </transition>
                </div>
              
              <!-- 南家/自己 (Bottom) -->
                <div class="played-cards-slot slot-bottom">
                  <transition name="pop-in">
                    <div v-if="getPlayedCards(playerSouth?.id).length > 0">
                      <div class="multiple-plays-container">
                        <div v-for="(play, playIdx) in getPlayedCards(playerSouth?.id)" :key="playIdx" 
                             class="play-history-item" :style="getPlayStyle(playIdx, getPlayedCards(playerSouth?.id).length)">
                          <div class="card-stack-display">
                            <div v-for="(card, i) in play.cards" :key="card.id" 
                                 class="played-card-item" :style="{ zIndex: i, transform: `translateX(${i * 15}px) rotate(${(i - play.cards.length/2) * 2}deg)` }">
                              <CardView :card="card" size="small" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else-if="passStatus.get(playerSouth?.id || -1)" class="pass-indicator">
                      <span class="pass-text">不要</span>
                    </div>
                  </transition>
                </div>
              
              <!-- 等待提示（仅当还没人出牌时显示） -->
              <template v-if="!gameStore.currentRound?.plays.length && gameStore.status === 'playing'">
                 <div class="waiting-tip">
                   {{ $t('game.waitingFirstPlayer') }}
                 </div>
              </template>
            </div>
          </div>
          
          <!-- 东侧玩家（右） -->
          <div class="player-right">
            <div class="player-card-vertical" v-if="playerEast" style="position: relative;">
              <!-- 聊天气泡 -->
              <ChatBubble
                v-if="chatStore.activeBubbles.has(playerEast.id)"
                :content="chatStore.activeBubbles.get(playerEast.id)?.content || ''"
                :player-id="playerEast.id"
                :is-human="false"
                position="left"
                :offset-x="10"
                :offset-y="0"
              />
              <div class="player-avatar">🤖</div>
              <van-tag size="medium" :type="isCurrentPlayer(playerEast.id) ? 'primary' : 'default'">
                东{{ playerEast.id }}
              </van-tag>
              <div class="player-stats-vertical">
                <span>🎴{{ playerEast.hand.length }}</span>
                <span v-if="playerEast.score && playerEast.score !== 0" :class="playerEast.score > 0 ? 'score-positive' : 'score-negative'">
                  💰{{ playerEast.score }}
                </span>
                <span v-if="playerEast.dunCount && playerEast.dunCount > 0">
                  🏆{{ playerEast.dunCount }}墩
                </span>
              </div>
              <van-tag v-if="playerEast.finishedRank" size="medium" type="danger">
                #{{ playerEast.finishedRank }}
              </van-tag>
            </div>
          </div>
        </div>
        
        <!-- 底部 - 南侧（你）- 使用新的 HandCards 组件 -->
        <div class="hand-cards-wrapper" v-if="playerSouth">
          <HandCards 
            :hand="playerSouth.hand"
            :player-name="playerSouth.name"
            :score="playerSouth.score"
            :dun-count="playerSouth.dunCount"
            :finished-rank="playerSouth.finishedRank"
            :is-my-turn="isMyTurn"
            :can-pass="canPass"
            :is-auto-play="gameStore.isAutoPlay"
            :selected-card-ids="selectedCardIds"
            :sort-method="sortMethod"
            @play="playSelectedCards"
            @pass="passRound"
            @clear="clearSelection"
            @toggleCard="toggleCard"
          />
        </div>
      </div>
      
    </div>

    <!-- 设置面板 -->
    <SettingsPanel v-model="showSettings" />
    
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useSettingsStore } from '../../stores/settingsStore';
import { showToast } from 'vant';
import { useI18n } from '../../i18n/composable';
import { useGameStore } from '../../stores/gameStore';
import { useChatStore } from '../../stores/chatStore';
import GameResultScreen from './GameResultScreen.vue';
import SettingsPanel from '../settings/SettingsPanel.vue';
import ChatInput from '../chat/ChatInput.vue';
import ChatBubble from '../chat/ChatBubble.vue';
import CardView from '../card/CardView.vue';
import TrainingPanel from '../training/TrainingPanel.vue';
import DealingAnimation from './DealingAnimation.vue';
import StartScreen from './StartScreen.vue';
import HandCards from './HandCards.vue';

const { t } = useI18n();

const gameStore = useGameStore();
const chatStore = useChatStore();
const selectedCardIds = ref<string[]>([]);
const sortMethod = ref<'rank' | 'value'>('rank'); // 默认按点数排序
const showSettings = ref(false);
const showChat = ref(false);
const showTrainingPanel = ref(false);
// const expandedRanks = ref<Set<number>>(new Set()); // Removed unused
const isDealing = ref(false); // 发牌动画状态
const pendingGameConfig = ref<{ teamMode: boolean } | undefined>(undefined); // 待处理的游戏配置
const showResultModal = ref(false); // 游戏结果模态框

const passStatus = reactive(new Map<number, boolean>()); // 记录玩家是否不要
const isAIQuerying = ref(false); // AI请求状态

const openSettings = () => {
  showSettings.value = true;
};

// 按东南西北方位排列玩家
const playerEast = computed(() => {
  // Logic: Player 3 is East (Team B)
  const player = gameStore.players[3];
  //
  return player;
}); // 东 - 右侧

const playerNorth = computed(() => {
  const player = gameStore.players[2];
  //
  return player;
}); // 北 - 顶部  

const playerWest = computed(() => {
  // Logic: Player 1 is West (Team B)
  const player = gameStore.players[1];
  //
  return player;
}); // 西 - 左侧

const playerSouth = computed(() => {
  const player = gameStore.humanPlayer;
  //
  return player;
}); // 南 - 底部（你）



const isMyTurn = computed(() => {
  return Boolean(gameStore.humanPlayer 
    && gameStore.currentPlayerIndex === gameStore.humanPlayer.id);
});

const canPass = computed(() => {
  // 1. 首家或者没有上家出牌时不能不要
  if (!gameStore.currentRound?.lastPlay) {
    return false;
  }
  
  // 2. 个人赛规则：如果有牌能打过上家，则不能不要（必须出牌）
  // 团队赛规则：允许战术过牌
  if (gameStore.game && gameStore.game.state.config) {
    const isTeamMode = gameStore.game.state.config.teamMode;
    if (!isTeamMode) {
      // 个人赛：检查是否有能管上的牌
      const myPlayerId = gameStore.humanPlayer?.id;
      if (myPlayerId !== undefined) {
        // hasPlayableCards 会检查手牌是否能管上 lastPlay
        const hasPlayable = gameStore.game.hasPlayableCards(myPlayerId);
        if (hasPlayable) {
          return false; // 有牌可出，禁止不要
        }
      }
    }
  }
  
  return true;
});


const toggleCard = (cardId: string) => {
  const index = selectedCardIds.value.indexOf(cardId);
  if (index > -1) {
    selectedCardIds.value.splice(index, 1);
  } else {
    selectedCardIds.value.push(cardId);
  }
};

const isCurrentPlayer = (playerId: number) => {
  return gameStore.currentPlayerIndex === playerId;
};

// 获取玩家在当前轮出的所有牌（支持多手牌显示）
const getPlayedCards = (playerId: number | undefined) => {
  if (playerId === undefined || !gameStore.currentRound) return [];
  // 过滤出该玩家在该回合的所有出牌记录
  return gameStore.currentRound.plays.filter(p => p.playerId === playerId);
};

// 获取多手牌的样式（位移和缩放）
const getPlayStyle = (index: number, total: number) => {
  if (total <= 1) return {};
  
  // 如果有多手牌，越旧的牌（index越小）位移越多且缩放越小
  const reverseIndex = total - 1 - index; // 最新的是0
  const scale = Math.max(0.6, 1 - reverseIndex * 0.15);
  const translateY = reverseIndex * -40; // 向上偏移
  const opacity = Math.max(0.4, 1 - reverseIndex * 0.2);
  
  return {
    transform: `translateY(${translateY}px) scale(${scale})`,
    opacity,
    zIndex: index
  };
};

const startGame = () => {
  gameStore.startGame(pendingGameConfig.value);
  showToast('🎮 游戏开始！');
  pendingGameConfig.value = undefined;
};

// 带发牌动画的开始游戏
const startGameWithAnimation = (config?: { teamMode: boolean }) => {
  pendingGameConfig.value = config;
  
  // 检查是否跳过发牌动画
  const settingsStore = useSettingsStore();
  if (settingsStore.gameSettings.skipDealing) {
    isDealing.value = false;
    startGame();
  } else {
    isDealing.value = true;
  }
};

const onDealingComplete = () => {
  isDealing.value = false;
  startGame();
};

const onDealingSkip = () => {
  isDealing.value = false;
  startGame();
};

const playSelectedCards = async () => {
  
  if (selectedCardIds.value.length === 0) {
    showToast('请先选择要出的牌');
    return;
  }
  
  const cards = gameStore.humanPlayer!.hand.filter(c => 
    selectedCardIds.value.includes(c.id)
  );
  
  const result = await gameStore.playCards(cards);
  
  if (result.success) {
    selectedCardIds.value = [];
    showToast({ type: 'success', message: `✅ ${t('game.playCards')}${t('common.success')}` });
    // 清除该玩家的pass状态
    if (gameStore.humanPlayer) {
      passStatus.set(gameStore.humanPlayer.id, false);
    }
  } else {
    showToast({ type: 'fail', message: (result as any).message || '出牌失败' });
  }
};

const passRound = async () => {
  const result = await gameStore.pass();
  if (result.success) {
    showToast({ type: 'success', message: '不要' });
    if (gameStore.humanPlayer) {
      passStatus.set(gameStore.humanPlayer.id, true);
    }
  } else {
    showToast({ type: 'fail', message: result.message || '操作失败' });
  }
};

const clearSelection = () => {
  selectedCardIds.value = [];
  showToast('已清除选择');
};

const sortHand = () => {
  // 切换排序方式：按点数 或 按牌大小
  sortMethod.value = sortMethod.value === 'rank' ? 'value' : 'rank';
  const methodNames = { rank: '按点数', value: '按牌大小' };
  showToast(`已切换至${methodNames[sortMethod.value]}排序`);
};



// 初始化聊天Store和聊天调度器
import { chatSchedulerService } from '../../services/chat/ChatSchedulerService';

onMounted(() => {
  chatStore.initializeAIBrainListener();
  
  // 初始化聊天调度器（传入获取游戏实例的回调）
  chatSchedulerService.initialize(() => gameStore.game as any);

  // 监听游戏事件
  window.addEventListener('guozha:player-played', onPlayerPlayed as any);
  window.addEventListener('guozha:player-passed', onPlayerPassed as any);
  window.addEventListener('guozha:round-started', onRoundStarted);
});

onUnmounted(() => {
  window.removeEventListener('guozha:player-played', onPlayerPlayed as any);
  window.removeEventListener('guozha:player-passed', onPlayerPassed as any);
  window.removeEventListener('guozha:round-started', onRoundStarted);
});

// 事件处理
const onPlayerPlayed = (event: CustomEvent) => {
  const { playerId } = event.detail;
  passStatus.set(playerId, false);
};

const onPlayerPassed = (event: CustomEvent) => {
  const { playerId } = event.detail;
  passStatus.set(playerId, true);
};

const onRoundStarted = () => {
  // 新回合开始，清除所有pass状态
  passStatus.clear();
};

// 获取玩家名称
const getPlayerName = (playerId: number) => {
  const player = gameStore.players.find(p => p.id === playerId);
  return player?.name || `${t('game.currentPlayer')}${playerId}`;
};



// 获取意图标签
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

const getAIRecommendation = async () => {
  if (isAIQuerying.value) return;
  
  isAIQuerying.value = true;
  try {
    const result = await gameStore.getAIRecommendation();
    
    if (result && result.cards && result.cards.length > 0) {
      // 选中推荐的牌
      selectedCardIds.value = result.cards.map((c: any) => c.id);
      showToast({
        type: 'success',
        message: `💡 ${t('game.aiRecommendation')}: ${result.cards.length}张`,
        duration: 1500
      });
    } else {
      // 推荐不要
      selectedCardIds.value = [];
      showToast({
        message: `💡 ${t('game.aiRecommendation')}: ${t('game.pass')}`,
        duration: 1500
      });
    }
  } catch (error) {
    showToast({ type: 'fail', message: '获取AI推荐失败' });
  } finally {
    isAIQuerying.value = false;
  }
};

const toggleAutoPlay = () => {
  gameStore.toggleAutoPlay();
  showToast(gameStore.isAutoPlay ? `🤖 ${t('game.autoPlay')}` : t('game.manualPlay'));
};


</script>

<style scoped>
/* ===== 游戏主界面 - 豪华赌场版 ===== */

.game-board {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  /* 深红金色赌场风格背景 */
  background: 
    linear-gradient(135deg, #1a0a0a 0%, #2d1515 30%, #1a0f0f 50%, #2d1a15 70%, #1a0a0a 100%);
  overflow: hidden;
  position: relative;
}

/* 动态背景光效 - 金色光晕 */
.game-board::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: 
    radial-gradient(ellipse at 30% 20%, rgba(212, 175, 55, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(180, 130, 40, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(139, 69, 19, 0.05) 0%, transparent 60%);
  animation: ambientGlow 20s ease-in-out infinite alternate;
  pointer-events: none;
}

/* 边缘光效 - 仅顶部和两侧，不遮挡底部手牌区 */
.game-board::after {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, transparent 15%),
    linear-gradient(90deg, rgba(0, 0, 0, 0.15) 0%, transparent 8%),
    linear-gradient(270deg, rgba(0, 0, 0, 0.15) 0%, transparent 8%);
  pointer-events: none;
  z-index: 0;
}

@keyframes ambientGlow {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  50% { transform: translate(30px, -20px) rotate(3deg); opacity: 0.8; }
  100% { transform: translate(-10px, 10px) rotate(-2deg); opacity: 1; }
}

.start-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  flex-direction: column;
  gap: 20px;
}

/* ===== 横屏布局 ===== */
.game-container-landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

/* 工具栏 - 玻璃态 */
.toolbar-landscape {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 6px;
  z-index: 30;
  flex-wrap: wrap;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.toolbar-landscape .van-button {
  font-size: 11px;
  padding: 4px 10px;
  height: auto;
  min-height: 26px;
  line-height: 1.2;
  border-radius: 8px;
  background: rgba(212, 175, 55, 0.15) !important;
  border: 1px solid rgba(212, 175, 55, 0.3) !important;
  color: #f4d03f !important;
}

.toolbar-landscape .van-button:hover {
  background: rgba(212, 175, 55, 0.25) !important;
  border-color: rgba(212, 175, 55, 0.5) !important;
}

.toolbar-landscape .van-tag {
  font-size: 10px;
  padding: 3px 8px;
  height: 22px;
  line-height: 1.2;
  background: linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%);
  border: none;
  color: #1a0a0a;
  font-weight: 600;
}

.game-area-landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
  width: 100%;
  position: relative;
}

/* ===== 扑克装饰元素 ===== */
.poker-decorations {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

/* 四角花色 */
.corner-suit {
  position: absolute;
  font-size: 48px;
  opacity: 0.08;
  filter: blur(1px);
  transition: opacity 0.3s ease;
}

.corner-top-left {
  top: 20px;
  left: 20px;
  color: #000;
  transform: rotate(-15deg);
}

.corner-top-right {
  top: 20px;
  right: 20px;
  color: #dc2626;
  transform: rotate(15deg);
}

.corner-bottom-left {
  bottom: 140px;
  left: 20px;
  color: #dc2626;
  transform: rotate(-15deg);
}

.corner-bottom-right {
  bottom: 140px;
  right: 20px;
  color: #000;
  transform: rotate(15deg);
}

/* 漂浮卡牌装饰 */
.floating-card {
  position: absolute;
  font-size: 32px;
  opacity: 0.06;
  animation: floatCard 20s ease-in-out infinite;
}

.floating-card-1 {
  top: 30%;
  left: 5%;
  animation-delay: 0s;
}

.floating-card-2 {
  top: 50%;
  right: 8%;
  animation-delay: -7s;
}

/* 结果模态框 */
.result-modal-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* 不要提示 */
.pass-indicator {
  /* padding: 8px 16px; */
  /* background: rgba(0, 0, 0, 0.6); */
  /* border-radius: 20px; */
  /* border: 1px solid rgba(255, 255, 255, 0.2); */
  /* backdrop-filter: blur(4px); */
  animation: fadeIn 0.3s ease;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}

.pass-text {
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.floating-card-3 {
  top: 20%;
  right: 15%;
  animation-delay: -14s;
}

@keyframes floatCard {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.06;
  }
  25% {
    transform: translateY(-15px) rotate(5deg);
    opacity: 0.1;
  }
  50% {
    transform: translateY(-5px) rotate(-3deg);
    opacity: 0.08;
  }
  75% {
    transform: translateY(-20px) rotate(8deg);
    opacity: 0.12;
  }
}

/* ===== 上层区域 ===== */
.top-area-landscape {
  flex: 1;
  display: flex;
  gap: 6px;
  min-height: 0;
  overflow: hidden;
}

/* ===== 左右玩家卡片 - 玻璃态 ===== */
.player-left,
.player-right {
  width: 70px;
  min-width: 70px;
  max-width: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 20;
}

.player-card-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(12px);
  padding: 12px 8px;
  border-radius: 20px;
  width: 100%;
  font-size: 10px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
}

.player-card-vertical:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.25);
  box-shadow: 
    0 12px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

/* 头像光环效果 */
.player-avatar {
  font-size: 32px;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
  padding: 8px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
}

.player-stats-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.player-stats-vertical span {
  white-space: nowrap;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.score-positive {
  color: #86efac !important;
  background: rgba(34, 197, 94, 0.2) !important;
}

.score-negative {
  color: #fca5a5 !important;
  background: rgba(239, 68, 68, 0.2) !important;
}

.player-hand-vertical {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow: hidden;
}

/* ===== 中间区域 ===== */
.center-area-landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  overflow: hidden;
}

/* ===== 顶部玩家 - 玻璃态 ===== */
.player-top {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 16px;
  min-height: 70px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 20;
}

.player-info-horizontal {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.player-avatar-north {
  font-size: 32px;
  line-height: 1;
  margin-right: 6px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.player-info-horizontal .van-tag {
  font-size: 10px;
  padding: 3px 8px;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 8px;
}

.player-hand-horizontal {
  display: flex;
  gap: 2px;
  max-width: 400px;
  overflow: hidden;
}

.card-back-small {
  width: 14px;
  height: 20px;
  background: linear-gradient(135deg, #1e3a5f 0%, #0d253f 100%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  flex-shrink: 0;
}

.player-stats-small {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  padding: 3px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

/* ===== 中央出牌区 - 扑克桌风格 ===== */
/* ===== 中央出牌区布局 ===== */
.play-area-center {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  /* 绿色毛毡背景 */
  background: 
    radial-gradient(ellipse at center, rgba(34, 139, 34, 0.5) 0%, rgba(0, 80, 0, 0.65) 70%, rgba(0, 50, 0, 0.8) 100%),
    linear-gradient(135deg, #1a472a 0%, #0d2818 100%);
  border-radius: 24px;
  backdrop-filter: blur(10px);
  min-height: 140px;
  overflow: visible;
  /* 简洁边框 */
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 
    inset 0 0 40px rgba(0, 0, 0, 0.3),
    0 8px 24px rgba(0, 0, 0, 0.4);
  position: relative;
}

/* 出牌槽位 - 绝对定位 */
.played-cards-slot {
  position: absolute;
  pointer-events: none;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.slot-top {
  top: 15px;
  left: 50%;
  transform: translateX(-50%);
}

.slot-left {
  top: 50%;
  left: 45px;
  transform: translateY(-50%);
}

.slot-right {
  top: 50%;
  right: 45px;
  transform: translateY(-50%);
}

.slot-bottom {
  bottom: 25px; /* 距离底部稍远一点，避免挡住手牌标签 */
  left: 50%;
  transform: translateX(-50%);
}

/* 卡牌堆叠容器 */
.card-stack-display {
  position: relative;
  width: 40px; /* 基准宽度 */
  height: 50px; /* 基准高度 */
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 单张出牌 */
.played-card-item {
  position: absolute;
  top: 0;
  left: 0;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

/* 等待提示 */
.waiting-tip {
  color: rgba(255, 255, 255, 0.3);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 1px;
}

/* 进场动画 */
.pop-in-enter-active,
.pop-in-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pop-in-enter-from,
.pop-in-leave-to {
  opacity: 0;
  transform: scale(0.5) translateY(10px);
}

/* 移除旧样式 */
.play-area-center::before {
  content: '♠ ♥ ♦ ♣';
  opacity: 0.15;
  position: absolute; /* Keep position for ::before */
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: 8px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: bold;
}

.play-area-center::after {
  content: '♣ ♦ ♥ ♠';
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: 8px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: bold;
}

.last-play-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  width: 100%;
}

.play-header {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.play-header .van-tag {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
}

.played-cards-center {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  min-height: 60px;
  align-items: center;
}

.played-card-center {
  animation: cardSlideIn 0.3s ease-out;
  flex-shrink: 0;
}

@keyframes cardSlideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.play-info {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

/* ===== 你的手牌区 - 高级玻璃态 ===== */
/* ===== 你的手牌区 - 高级玻璃态 ===== */
.your-hand-landscape {
  width: 100%;
  height: 145px;
  min-height: 145px;
  max-height: 145px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.3) 100%);
  border-radius: 16px 16px 0 0;
  padding: 12px 12px 8px;
  backdrop-filter: blur(15px);
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  z-index: 10;
  position: relative;
  overflow: visible;
}

.your-hand-landscape.auto-play-active {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.1) 100%);
  border-top-color: rgba(251, 191, 36, 0.5);
}

.player-name-south {
  display: flex;
  align-items: center;
  padding: 0 4px;
  gap: 8px;
  flex-wrap: wrap;
}

.player-name-south .van-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 600;
}

.action-buttons-inline {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
}

.action-buttons-inline .van-button {
  padding: 4px 12px;
  font-size: 12px;
  height: 28px;
  border-radius: 10px;
  font-weight: 600;
}

/* 出牌按钮 - 渐变紫色 */
.action-buttons-inline .van-button--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.action-buttons-inline .van-button--primary:active {
  transform: scale(0.95);
}

/* 手牌卡片区 */
/* 手牌卡片区 */
.hand-cards-landscape {
  display: flex;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
  overflow-y: visible;
  padding: 4px;
  align-items: flex-end;
  scrollbar-width: none; /* Firefox */
}

/* 隐藏滚动条但保留功能 */
.hand-cards-landscape::-webkit-scrollbar {
  display: none;
}

/* ===== 点数分组样式 - 玻璃态 ===== */
.rank-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.rank-group:hover {
  background: rgba(255, 255, 255, 0.12);
}

.rank-group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  user-select: none;
}

.rank-name {
  font-weight: 700;
  font-size: 12px;
}

.rank-count {
  opacity: 0.7;
  font-size: 10px;
}

.expand-icon {
  font-size: 8px;
  opacity: 0.6;
}

.rank-group-cards {
  display: flex;
  gap: 3px;
  align-items: flex-end;
}

.rank-group-stacked {
  position: relative;
  display: flex;
  align-items: flex-end;
  cursor: pointer;
  min-height: 55px;
}

.stacked-card {
  position: absolute;
  transition: transform 0.2s;
  cursor: pointer;
}

.stacked-more {
  position: absolute;
  right: -18px;
  bottom: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  z-index: 5;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.4);
}

/* 卡牌选中效果 */
.card-item-landscape {
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-item-landscape:active {
  transform: scale(0.95);
}

.card-item-landscape.card-selected {
  transform: translateY(-12px);
}

.card-item-landscape.card-selected .card {
  box-shadow: 
    0 8px 20px rgba(102, 126, 234, 0.5),
    0 0 0 3px rgba(102, 126, 234, 0.8);
}

/* ===== 聊天面板 - 深色玻璃态 ===== */
.chat-panel-landscape {
  position: fixed;
  bottom: 140px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  max-height: 350px;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 20px;
  z-index: 1000;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden; /* 防止圆角被子元素遮挡 */
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  color: rgba(255, 255, 255, 0.6);
  font-size: 16px;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.chat-messages-landscape {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  max-height: 280px;
}

.chat-message {
  color: white;
  font-size: 13px;
  margin-bottom: 10px;
  padding: 10px 14px;
  border-radius: 16px;
  line-height: 1.5;
  word-wrap: break-word;
}

.chat-message-human {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(102, 126, 234, 0.15) 100%);
  border-left: 3px solid #667eea;
}

.chat-message-ai {
  background: rgba(255, 255, 255, 0.1);
  border-left: 3px solid #86efac;
}

.chat-player-name {
  font-weight: 700;
  margin-right: 8px;
}

.chat-message-human .chat-player-name {
  color: #a5b4fc;
}

.chat-message-ai .chat-player-name {
  color: #86efac;
}

.chat-content {
  color: rgba(255, 255, 255, 0.9);
}

.chat-intent {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 8px;
}

.chat-empty {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  padding: 30px;
  font-size: 14px;
}

/* 滚动条美化 */
.chat-messages-landscape::-webkit-scrollbar,
.hand-cards-landscape::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.chat-messages-landscape::-webkit-scrollbar-track,
.hand-cards-landscape::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.chat-messages-landscape::-webkit-scrollbar-thumb,
.hand-cards-landscape::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

/* ===== 响应式优化 ===== */
@media screen and (max-width: 900px) {
  .game-area-landscape {
    padding: 4px;
    gap: 4px;
  }
  
  .player-left,
  .player-right {
    width: 60px;
    min-width: 60px;
    max-width: 60px;
  }
  
  .your-hand-landscape {
    height: 120px;
    min-height: 120px;
    max-height: 120px;
  }
}

@media screen and (min-width: 768px) {
  .game-area-landscape {
    max-width: 1400px;
    margin: 0 auto;
  }
}

/* 游戏结束 */
.game-over {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  gap: 20px;
}

.game-result {
  text-align: center;
}

.game-result h3 {
  font-size: 28px;
  margin-bottom: 20px;
  color: white;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}
</style>

