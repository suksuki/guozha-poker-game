<template>
  <div class="game-board">
    <!-- 开始按钮 -->
    <div v-if="gameStore.status === 'waiting'" class="start-screen">
      <van-button 
        type="primary" 
        size="large"
        block 
        @click="startGame"
      >
        🚀 {{ $t('game.startNewGame') }}
      </van-button>
      <van-button 
        type="warning" 
        size="large"
        block 
        style="margin-top: 16px;"
        @click="showTrainingPanel = true"
      >
        🧠 {{ $t('game.intelligentTraining') }}
      </van-button>
    </div>
    
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
      :winner="gameStore.gameState?.winner !== null && gameStore.gameState?.winner !== undefined 
        ? gameStore.players[gameStore.gameState.winner] 
        : undefined"
      @restart="startGame"
    />
    
    <!-- 游戏中 - 横屏布局 -->
    <div v-else-if="gameStore.status === 'playing'" class="game-container-landscape">
      <!-- 顶部工具栏 -->
      <div class="toolbar-landscape">
        <van-tag 
          v-if="gameStore.players.length !== 4"
          type="warning"
          size="small"
        >
          ⚠️ {{ gameStore.players.length }}人
        </van-tag>
        <van-button 
          size="mini" 
          icon="setting"
          @click="openSettings"
          plain
        >
          {{ $t('common.settings') }}
        </van-button>
        <van-button 
          size="mini" 
          :type="gameStore.isAutoPlay ? 'warning' : 'default'"
          @click="toggleAutoPlay"
          plain
        >
          {{ gameStore.isAutoPlay ? '🤖' : '👆' }}
        </van-button>
        <van-button 
          size="mini" 
          @click="sortHand" 
          type="success"
          plain
        >
          📊
        </van-button>
        <van-button 
          size="mini" 
          @click="getAIRecommendation" 
          type="primary"
          plain
        >
          💡
        </van-button>
        <van-button 
          size="mini" 
          @click="showChat = !showChat" 
          :type="showChat ? 'primary' : 'default'"
          plain
        >
          💬
        </van-button>
      </div>
      
      <!-- 聊天消息显示 -->
      <div v-if="showChat" class="chat-panel-landscape">
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
              <van-tag size="mini" :type="isCurrentPlayer(playerWest.id) ? 'primary' : 'default'">
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
              <van-tag v-if="playerWest.finishedRank" size="mini" type="danger">
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
                  <van-tag size="small" :type="isCurrentPlayer(playerNorth.id) ? 'primary' : 'default'">
                    {{ playerNorth.name }}
                  </van-tag>
                  <van-tag size="small" type="primary">
                    🎴{{ playerNorth.hand.length }}
                  </van-tag>
                  <van-tag size="small" type="success" v-if="playerNorth.score && playerNorth.score !== 0">
                    💰{{ playerNorth.score }}
                  </van-tag>
                  <van-tag size="small" type="warning" v-if="playerNorth.dunCount && playerNorth.dunCount > 0">
                    🏆{{ playerNorth.dunCount }}墩
                  </van-tag>
                  <van-tag v-if="playerNorth.finishedRank" size="small" type="danger">
                    #{{ playerNorth.finishedRank }}
                  </van-tag>
                </div>
              </template>
            </div>
            
            <!-- 中央出牌区 -->
            <div class="play-area-center">
              <template v-if="!gameStore.currentRound?.lastPlay">
                <van-empty 
                  :description="$t('game.waitingFirstPlayer')"
                  image="search"
                  :image-size="80"
                />
              </template>
              <template v-else>
                <div class="last-play-center">
                  <div class="play-header">
                    <van-tag type="primary" size="medium">
                      {{ getLastPlayerName() }} {{ $t('game.playCards') }}
                    </van-tag>
                    <van-tag type="success" size="medium">
                      {{ getLastPlayType() }}
                    </van-tag>
                  </div>
                  <div class="played-cards-center">
                    <CardView
                      v-for="(card, idx) in gameStore.currentRound.lastPlay" 
                      :key="`${card.id || idx}-${card.rank}-${card.suit}`"
                      :card="card"
                      size="medium"
                      class="played-card-center"
                    />
                  </div>
                  <div class="play-info">
                    {{ $t('game.round') }}{{ gameStore.currentRound.plays.length }}{{ $t('game.playCards') }}
                  </div>
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
              <van-tag size="mini" :type="isCurrentPlayer(playerEast.id) ? 'primary' : 'default'">
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
              <van-tag v-if="playerEast.finishedRank" size="mini" type="danger">
                #{{ playerEast.finishedRank }}
              </van-tag>
            </div>
          </div>
        </div>
        
        <!-- 底部 - 南侧（你）- 全宽 -->
        <div class="your-hand-landscape" v-if="playerSouth" :class="{ 'auto-play-active': gameStore.isAutoPlay }">
          <div class="player-name-south">
              <van-tag type="success" size="small">🧑 {{ playerSouth.name }}</van-tag>
              <van-tag v-if="gameStore.isAutoPlay" type="warning" size="small">🤖托管</van-tag>
              <van-tag size="small" type="primary">🎴{{ playerSouth.hand.length }}</van-tag>
              <van-tag size="small" :type="(playerSouth.score || 0) >= 0 ? 'success' : 'danger'" v-if="playerSouth.score && playerSouth.score !== 0">
                💰{{ playerSouth.score }}
              </van-tag>
              <van-tag size="small" type="warning" v-if="playerSouth.dunCount && playerSouth.dunCount > 0">
                🏆{{ playerSouth.dunCount }}墩
              </van-tag>
              <van-tag v-if="playerSouth.finishedRank" size="small" type="danger">
                #{{ playerSouth.finishedRank }}
              </van-tag>
              
              <!-- 操作按钮 - 移到手牌上方 -->
              <div class="action-buttons-inline">
                <van-tag v-if="isMyTurn" type="primary" size="small">{{ $t('game.yourTurn') }}</van-tag>
                <van-tag v-else size="small">{{ $t('game.waiting') }}</van-tag>
                <van-tag type="warning" size="small">{{ $t('game.selected') }}: {{ selectedCardIds.length }}</van-tag>
                <van-button 
                  type="primary"
                  size="small"
                  :disabled="!isMyTurn || selectedCardIds.length === 0"
                  @click="playSelectedCards"
                >
                  {{ $t('game.playCards') }}
                </van-button>
                <van-button 
                  type="warning"
                  size="small"
                  :disabled="!isMyTurn || !canPass"
                  @click="passRound"
                >
                  {{ $t('game.pass') }}
                </van-button>
                <van-button 
                  size="small"
                  @click="clearSelection"
                >
                  {{ $t('common.clear') }}
                </van-button>
              </div>
          </div>
          <div class="hand-cards-landscape">
              <!-- 按点数分组叠放显示 -->
              <div 
                v-for="rank in sortedRanks" 
                :key="rank"
                class="rank-group"
              >
                <div 
                  class="rank-group-header"
                  @click="toggleRankExpand(rank)"
                >
                  <span class="rank-name">{{ getRankDisplayName(rank) }}</span>
                  <span class="rank-count">({{ groupedHand.get(rank)?.length || 0 }})</span>
                  <span class="expand-icon">{{ isRankExpanded(rank) ? '▼' : '▶' }}</span>
                </div>
                <div 
                  v-if="isRankExpanded(rank) || groupedHand.get(rank)?.length === 1"
                  class="rank-group-cards"
                >
                  <div 
                    v-for="card in groupedHand.get(rank)" 
                    :key="card.id"
                    :class="['card-item-landscape', { 'card-selected': isCardSelected(card.id) }]"
                    @click.stop="toggleCard(card.id)"
                  >
                    <CardView :card="card" size="small" />
                  </div>
                </div>
                <!-- 未展开时显示叠放效果 -->
                <div 
                  v-else
                  class="rank-group-stacked"
                  @click.stop="toggleRankExpand(rank)"
                >
                  <div 
                    v-for="(card, index) in groupedHand.get(rank)?.slice(0, 3)" 
                    :key="card.id"
                    class="stacked-card"
                    :style="{ zIndex: 3 - index, transform: `translateX(${index * 6}px) translateY(${-index * 3}px)` }"
                    @click.stop="toggleCard(card.id)"
                  >
                    <CardView :card="card" size="small" />
                  </div>
                  <div 
                    v-if="(groupedHand.get(rank)?.length || 0) > 3"
                    class="stacked-more"
                  >
                    +{{ (groupedHand.get(rank)?.length || 0) - 3 }}
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
      
      <!-- 设置面板 -->
      <SettingsPanel v-model="showSettings" />
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { showToast } from 'vant';
import { useI18n } from '../../i18n/composable';
import { useGameStore } from '../../stores/gameStore';
import { useChatStore } from '../../stores/chatStore';
import { sortCardsByRank, sortCardsByValue, groupCardsByRank } from '../../utils/cardUtils';
import { Rank } from '../../types/card';
import type { Card } from '../../types/card';
import GameResultScreen from './GameResultScreen.vue';
import SettingsPanel from '../settings/SettingsPanel.vue';
import ChatInput from '../chat/ChatInput.vue';
import ChatBubble from '../chat/ChatBubble.vue';
import CardView from '../card/CardView.vue';
import TrainingPanel from '../training/TrainingPanel.vue';

const { t } = useI18n();

const gameStore = useGameStore();
const chatStore = useChatStore();
const selectedCardIds = ref<string[]>([]);
const sortMethod = ref<'rank' | 'value'>('rank'); // 默认按点数排序
const showSettings = ref(false);
const showChat = ref(false);
const showTrainingPanel = ref(false);
const expandedRanks = ref<Set<number>>(new Set()); // 展开的点数组

const openSettings = () => {
  console.log('openSettings 被调用，当前 showSettings:', showSettings.value);
  showSettings.value = true;
  console.log('设置后 showSettings:', showSettings.value);
};

// 按东南西北方位排列玩家
const playerEast = computed(() => {
  const player = gameStore.players[1];
  console.log('东侧玩家(index 1):', player);
  return player;
}); // 东 - 右侧

const playerNorth = computed(() => {
  const player = gameStore.players[2];
  console.log('北侧玩家(index 2):', player);
  return player;
}); // 北 - 顶部  

const playerWest = computed(() => {
  const player = gameStore.players[3];
  console.log('西侧玩家(index 3):', player);
  return player;
}); // 西 - 左侧

const playerSouth = computed(() => {
  const player = gameStore.humanPlayer;
  console.log('南侧玩家(你):', player);
  return player;
}); // 南 - 底部（你）

// 按点数分组的手牌
const groupedHand = computed(() => {
  if (!gameStore.humanPlayer) return new Map();
  const hand = gameStore.humanPlayer.hand;
  
  // 根据排序方式排序手牌
  let sorted: Card[];
  if (sortMethod.value === 'rank') {
    sorted = sortCardsByRank(hand);
  } else {
    sorted = sortCardsByValue(hand);
  }
  
  // 按点数分组
  return groupCardsByRank(sorted);
});

// 获取排序后的点数列表（用于显示顺序）
const sortedRanks = computed(() => {
  const ranks = Array.from(groupedHand.value.keys());
  if (sortMethod.value === 'rank') {
    return ranks.sort((a, b) => a - b);
  } else {
    // 按牌大小排序：大王>小王>2>A>K>...>3
    return ranks.sort((a, b) => {
      const getValue = (rank: Rank): number => {
        if (rank === Rank.JOKER_BIG) return 1000;
        if (rank === Rank.JOKER_SMALL) return 999;
        if (rank === Rank.TWO) return 998;
        if (rank === Rank.ACE) return 14;
        return rank;
      };
      return getValue(b) - getValue(a); // 从大到小
    });
  }
});

const isMyTurn = computed(() => {
  return gameStore.humanPlayer 
    && gameStore.currentPlayerIndex === gameStore.humanPlayer.id;
});

const canPass = computed(() => {
  return gameStore.currentRound?.lastPlay !== null;
});


const isCardSelected = (cardId: string) => {
  return selectedCardIds.value.includes(cardId);
};

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

const startGame = () => {
  gameStore.startGame();
  showToast('🎮 新架构游戏已开始！');
};

const playSelectedCards = () => {
  console.log('🎴 点击出牌按钮');
  console.log('已选择卡片数:', selectedCardIds.value.length);
  console.log('已选择卡片IDs:', selectedCardIds.value);
  
  if (selectedCardIds.value.length === 0) {
    showToast('请先选择要出的牌');
    return;
  }
  
  const cards = gameStore.humanPlayer!.hand.filter(c => 
    selectedCardIds.value.includes(c.id)
  );
  
  console.log('准备出的牌:', cards);
  console.log('当前玩家索引:', gameStore.currentPlayerIndex);
  console.log('是否我的回合:', isMyTurn.value);
  
  const result = gameStore.playCards(cards);
  console.log('出牌结果:', result);
  
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
  // 切换排序方式：按点数 或 按牌大小
  sortMethod.value = sortMethod.value === 'rank' ? 'value' : 'rank';
  const methodNames = { rank: '按点数', value: '按牌大小' };
  showToast(`已切换至${methodNames[sortMethod.value]}排序`);
};

// 切换展开/收起某个点数的牌组
const toggleRankExpand = (rank: Rank) => {
  if (expandedRanks.value.has(rank)) {
    expandedRanks.value.delete(rank);
  } else {
    expandedRanks.value.add(rank);
  }
};

// 检查某个点数是否展开
const isRankExpanded = (rank: Rank) => {
  return expandedRanks.value.has(rank);
};

// 选择某个点数的所有牌
const selectAllOfRank = (rank: Rank) => {
  const cards = groupedHand.value.get(rank) || [];
  cards.forEach(card => {
    if (!selectedCardIds.value.includes(card.id)) {
      selectedCardIds.value.push(card.id);
    }
  });
};

// 初始化聊天Store
onMounted(() => {
  chatStore.initializeAIBrainListener();
});

// 获取玩家名称
const getPlayerName = (playerId: number) => {
  const player = gameStore.players.find(p => p.id === playerId);
  return player?.name || `${t('game.currentPlayer')}${playerId}`;
};

// 获取玩家的最新消息
const getPlayerLatestMessage = (playerId: number) => {
  return chatStore.getLatestMessageByPlayer(playerId);
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

// 获取点数显示名称（使用导入的工具函数）
const getRankDisplayName = (rank: Rank): string => {
  if (rank === Rank.JACK) return 'J';
  if (rank === Rank.QUEEN) return 'Q';
  if (rank === Rank.KING) return 'K';
  if (rank === Rank.ACE) return 'A';
  if (rank === Rank.TWO) return '2';
  if (rank === Rank.JOKER_SMALL) return t('cards.rank.jokerSmall');
  if (rank === Rank.JOKER_BIG) return t('cards.rank.jokerBig');
  return rank.toString();
};

const getAIRecommendation = () => {
  const suggestion = gameStore.getAIRecommendation();
  if (suggestion && suggestion.cards.length > 0) {
    // 自动选中推荐的牌
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

const toggleAutoPlay = () => {
  gameStore.toggleAutoPlay();
  showToast(gameStore.isAutoPlay ? `🤖 ${t('game.autoPlay')}` : t('game.manualPlay'));
};

const getPlayTypeText = (play: any) => {
  if (!play) return '';
  const typeNames: Record<number, string> = {
    0: t('game.playTypes.single'),
    1: t('game.playTypes.pair'),
    2: t('game.playTypes.triple'),
    3: t('game.playTypes.bomb'),
    4: t('game.playTypes.straight'),
    5: t('game.playTypes.pairStraight'),
    6: t('game.playTypes.tripleStraight'),
    7: t('game.playTypes.fourWithTwo')
  };
  return typeNames[play.type] || t('game.playTypes.combination');
};

const getLastPlayerName = () => {
  if (!gameStore.currentRound?.plays || gameStore.currentRound.plays.length === 0) {
    return '无';
  }
  const lastPlay = gameStore.currentRound.plays[gameStore.currentRound.plays.length - 1];
  return lastPlay.playerName || `${t('game.currentPlayer')}${lastPlay.playerId}`;
};

const getLastPlayType = () => {
  if (!gameStore.currentRound?.lastPlay || gameStore.currentRound.lastPlay.length === 0) {
    return '无';
  }
  
  const cards = gameStore.currentRound.lastPlay;
  const cardCount = cards.length;
  
  // 根据牌数判断牌型
  if (cardCount === 1) return '单张';
  if (cardCount === 2) {
    // 检查是否是对子
    if (cards[0].rank === cards[1].rank) return '对子';
    return '组合牌';
  }
  if (cardCount === 3) return '三张';
  if (cardCount === 4) {
    // 可能是炸弹或四带二
    const ranks = cards.map(c => c.rank);
    if (ranks.every(r => r === ranks[0])) return '炸弹';
    return '四带二';
  }
  
  // 更多牌可能是顺子、连对、飞机等
  return `${cardCount}张组合`;
};
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

.start-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* 横屏布局 */
.game-container-landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.toolbar-landscape {
  position: absolute;
  top: 4px;
  left: 4px;
  display: flex;
  gap: 4px;
  z-index: 10;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-landscape .van-button {
  font-size: 11px;
  padding: 4px 8px;
  height: auto;
  min-height: 24px;
  line-height: 1.2;
  border-radius: 4px;
}

.toolbar-landscape .van-tag {
  font-size: 10px;
  padding: 2px 6px;
  height: 20px;
  line-height: 1.2;
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

/* 确保布局适应屏幕 */
@media screen and (max-width: 900px) {
  .game-area-landscape {
    padding: 2px;
    gap: 2px;
  }
}

/* 桌面/宽屏优化 */
@media screen and (min-width: 768px) {
  .game-area-landscape {
    max-width: 1400px;
    margin: 0 auto;
  }
  
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
}

@media screen and (max-width: 900px) {
  .player-left {
    width: 55px;
    min-width: 55px;
    max-width: 55px;
  }
}

.player-card-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 4px;
  border-radius: 8px;
  width: 100%;
  font-size: 10px;
}

.player-avatar {
  font-size: 24px;
  line-height: 1;
}

.player-stats-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.95);
  font-weight: bold;
}

.player-stats-vertical span {
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.score-positive {
  color: #52c41a !important;
}

.score-negative {
  color: #ff4d4f !important;
}

.player-hand-vertical {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow: hidden;
}

/* 右侧玩家 */
.player-right {
  width: 65px;
  min-width: 65px;
  max-width: 65px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  flex-shrink: 0 !important;
}

@media screen and (max-width: 900px) {
  .player-right {
    width: 55px;
    min-width: 55px;
    max-width: 55px;
  }
}

/* 中间区域 */
.center-area-landscape {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 200px;
  overflow: hidden;
}

@media screen and (max-width: 900px) {
  .center-area-landscape {
    gap: 2px;
  }
}

/* 顶部玩家 */
.player-top {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  padding: 10px 12px;
  border-radius: 8px;
  min-height: 70px;
  height: auto;
  flex-shrink: 0;
}

.player-info-horizontal {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.player-avatar-north {
  font-size: 32px;
  line-height: 1;
  margin-right: 4px;
}

.player-info-horizontal .van-tag {
  font-size: 10px;
  padding: 2px 6px;
  white-space: nowrap;
}

.player-hand-horizontal {
  display: flex;
  gap: 2px;
  max-width: 400px;
  overflow: hidden;
}

.card-back-small {
  width: 12px;
  height: 18px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 2px;
  flex-shrink: 0;
}

.player-stats-small {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: bold;
}

/* 中央出牌区 */
.play-area-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  min-height: 120px;
  overflow: visible;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.last-play-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  width: 100%;
}

.play-header {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.played-cards-center {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  min-height: 60px;
  align-items: center;
}

.play-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}

.played-card-center {
  animation: cardAppear 0.3s ease-out;
  flex-shrink: 0;
}

@keyframes cardAppear {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.play-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: bold;
}

/* 你的手牌 - 横屏 - 全宽 */
.your-hand-landscape {
  width: 100%;
  height: 120px;
  min-height: 120px;
  max-height: 120px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 4px;
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.your-hand-landscape.auto-play-active {
  background: rgba(255, 200, 0, 0.3);
  border: 2px solid rgba(255, 200, 0, 0.6);
  box-shadow: 0 0 15px rgba(255, 200, 0, 0.4);
  animation: autoPulse 2s ease-in-out infinite;
}

@keyframes autoPulse {
  0%, 100% {
    box-shadow: 0 0 15px rgba(255, 200, 0, 0.4);
  }
  50% {
    box-shadow: 0 0 25px rgba(255, 200, 0, 0.6);
  }
}

@media screen and (max-width: 900px) {
  .your-hand-landscape {
    height: 110px;
    min-height: 110px;
    max-height: 110px;
  }
}

.player-name-south {
  display: flex;
  align-items: center;
  padding: 0 4px;
  gap: 4px;
  flex-wrap: wrap;
}

.player-name-south .van-tag {
  font-size: 10px;
  padding: 2px 6px;
}

.action-buttons-inline {
  display: flex;
  gap: 3px;
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
}

.action-buttons-inline .van-button {
  padding: 2px 6px;
  font-size: 10px;
  height: 22px;
}

.hand-cards-landscape {
  display: flex;
  gap: 6px;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px;
  align-items: flex-end;
}

/* 点数分组样式 */
.rank-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.rank-group-header {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.rank-group-header:hover {
  background: rgba(255, 255, 255, 0.4);
}

.rank-name {
  font-weight: bold;
}

.rank-count {
  opacity: 0.8;
}

.expand-icon {
  font-size: 8px;
  opacity: 0.7;
}

.rank-group-cards {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}

.rank-group-stacked {
  position: relative;
  display: flex;
  align-items: flex-end;
  cursor: pointer;
  min-height: 50px;
}

.stacked-card {
  position: absolute;
  transition: transform 0.2s;
  cursor: pointer;
}

.stacked-card:hover {
  transform: translateY(-4px) !important;
  z-index: 10 !important;
}

.stacked-more {
  position: absolute;
  right: -16px;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: bold;
  z-index: 5;
}

.card-item-landscape {
  cursor: pointer;
  transition: all 0.2s;
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
  transform: translateY(-8px);
}

.card-item-landscape.card-selected .card {
  box-shadow: 0 6px 12px rgba(25, 137, 250, 0.4);
  border-color: #1989fa;
}

/* 聊天面板样式 */
.chat-panel-landscape {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 12px;
  z-index: 1000;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.chat-messages-landscape {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  max-height: 300px;
}

.chat-message {
  color: white;
  font-size: 13px;
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  line-height: 1.4;
  word-wrap: break-word;
}

.chat-message-human {
  /* 泡泡风格：更明显的半透明蓝色 */
  background: rgba(25, 137, 250, 0.35);
  border-left: 3px solid rgba(25, 137, 250, 0.5);
  border-radius: 12px;
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.25);
}

.chat-message-ai {
  /* 泡泡风格：更明显的半透明白色 */
  background: rgba(255, 255, 255, 0.25);
  border-left: 3px solid rgba(7, 193, 96, 0.5);
  border-radius: 12px;
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.chat-player-name {
  font-weight: bold;
  margin-right: 8px;
  color: #fff;
}

.chat-message-human .chat-player-name {
  color: #1989fa;
}

.chat-message-ai .chat-player-name {
  color: #07c160;
}

.chat-content {
  color: #e0e0e0;
}

.chat-intent {
  font-size: 10px;
  color: #999;
  margin-left: 6px;
  opacity: 0.7;
}

.chat-empty {
  color: #999;
  text-align: center;
  padding: 20px;
  font-size: 13px;
}

/* 聊天消息滚动条 */
.chat-messages-landscape::-webkit-scrollbar {
  width: 4px;
}

.chat-messages-landscape::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.chat-messages-landscape::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
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
  font-size: 24px;
  margin-bottom: 16px;
  color: white;
}

/* 滚动条样式 */
.hand-cards-landscape::-webkit-scrollbar {
  height: 4px;
}

.hand-cards-landscape::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.hand-cards-landscape::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}
</style>

