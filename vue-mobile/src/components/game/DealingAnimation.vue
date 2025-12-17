<template>
  <div v-if="isDealing" class="dealing-overlay">
    <!-- 背景遮罩 -->
    <div class="dealing-backdrop"></div>
    
    <!-- 发牌台 -->
    <div class="dealing-table">
      <!-- 牌堆 -->
      <div class="card-deck" :class="{ 'deck-active': isDeckActive }">
        <div 
          v-for="i in deckVisibleCards" 
          :key="`deck-${i}`"
          class="deck-card"
          :style="getDeckCardStyle(i)"
        >
          <div class="card-back">
            <div class="card-back-pattern"></div>
          </div>
        </div>
        <div class="deck-count">{{ remainingCards }}</div>
      </div>
      
      <!-- 飞行中的牌 -->
      <TransitionGroup name="fly-card">
        <div
          v-for="flyingCard in flyingCards"
          :key="flyingCard.id"
          class="flying-card"
          :class="{ 'flying-to-human': flyingCard.targetPlayer === 0 }"
          :style="getFlyingCardStyle(flyingCard)"
        >
          <!-- 发给人类玩家的牌显示正面 -->
          <template v-if="flyingCard.targetPlayer === 0 && flyingCard.card">
            <div class="card-face" :class="getCardColorClass(flyingCard.card)">
              <div class="card-corner top-left">
                <span class="card-rank">{{ getRankDisplay(flyingCard.card.rank) }}</span>
                <span class="card-suit">{{ getSuitSymbol(flyingCard.card.suit) }}</span>
              </div>
              <div class="card-center">
                {{ getSuitSymbol(flyingCard.card.suit) }}
              </div>
              <div class="card-corner bottom-right">
                <span class="card-rank">{{ getRankDisplay(flyingCard.card.rank) }}</span>
                <span class="card-suit">{{ getSuitSymbol(flyingCard.card.suit) }}</span>
              </div>
            </div>
          </template>
          <!-- AI玩家的牌显示背面 -->
          <template v-else>
            <div class="card-back">
              <div class="card-back-pattern"></div>
            </div>
          </template>
        </div>
      </TransitionGroup>
      
      <!-- 四个玩家位置 -->
      <div class="player-positions">
        <!-- 南（你）- 显示实际牌面 -->
        <div class="player-spot player-south" :class="{ 'receiving': currentReceiver === 0 }">
          <div class="spot-header">
            <div class="spot-avatar">🧑</div>
            <div class="spot-label">你的手牌</div>
            <div class="card-count-badge">{{ playerCardCounts[0] }}</div>
          </div>
          <div class="human-cards-area">
            <div class="human-cards-scroll">
              <!-- 按点数分组展示 -->
              <div 
                v-for="group in groupedHumanCards" 
                :key="`group-${group.rank}`"
                class="card-group"
              >
                <!-- 分组标签 -->
                <div class="group-header">
                  <span class="group-rank">{{ getRankDisplay(group.rank) }}</span>
                  <span class="group-count">×{{ group.cards.length }}</span>
                </div>
                <!-- 叠放的卡牌 -->
                <div class="stacked-cards">
                  <div 
                    v-for="(card, idx) in group.cards.slice(0, 4)" 
                    :key="card.id"
                    class="stacked-card"
                    :style="getStackedCardStyle(idx)"
                  >
                    <div class="mini-card" :class="getCardColorClass(card)">
                      <span class="mini-suit">{{ getSuitSymbol(card.suit) }}</span>
                    </div>
                  </div>
                  <!-- 超过4张时显示+N -->
                  <div v-if="group.cards.length > 4" class="more-cards">
                    +{{ group.cards.length - 4 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 东 -->
        <div class="player-spot player-east">
          <div class="spot-avatar">🤖</div>
          <div class="spot-label">东</div>
          <div class="card-count-badge">{{ playerCardCounts[1] }}</div>
        </div>
        
        <!-- 北 -->
        <div class="player-spot player-north">
          <div class="spot-avatar">🤖</div>
          <div class="spot-label">北</div>
          <div class="card-count-badge">{{ playerCardCounts[2] }}</div>
        </div>
        
        <!-- 西 -->
        <div class="player-spot player-west">
          <div class="spot-avatar">🤖</div>
          <div class="spot-label">西</div>
          <div class="card-count-badge">{{ playerCardCounts[3] }}</div>
        </div>
      </div>
      
      <!-- 最新发牌提示 -->
      <div v-if="latestHumanCard" class="latest-card-toast">
        <span class="toast-text">你获得了</span>
        <div class="toast-card" :class="getCardColorClass(latestHumanCard)">
          <span>{{ getRankDisplay(latestHumanCard.rank) }}</span>
          <span>{{ getSuitSymbol(latestHumanCard.suit) }}</span>
        </div>
      </div>
      
      <!-- 发牌进度 -->
      <div class="dealing-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${dealProgress}%` }"></div>
        </div>
        <div class="progress-text">{{ dealingPhaseText }}</div>
      </div>
    </div>
    
    <!-- 跳过按钮 -->
    <button class="skip-button" @click="skipAnimation">
      跳过动画 ⏭️
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { Suit, Rank } from '../../types/card';
import type { Card } from '../../types/card';

// Props
const props = defineProps<{
  isDealing: boolean;
  totalCards: number;
  playerCount: number;
}>();

// Emits
const emit = defineEmits<{
  complete: [];
  skip: [];
}>();

// 状态
const isDeckActive = ref(false);
const currentReceiver = ref(0);
const playerCardCounts = ref([0, 0, 0, 0]);
const flyingCards = ref<Array<{ id: number; targetPlayer: number; progress: number; card?: Card }>>([]);
const dealProgress = ref(0);
const dealingPhase = ref<'shuffle' | 'dealing' | 'complete'>('shuffle');
const humanPlayerCards = ref<Card[]>([]);
const latestHumanCard = ref<Card | null>(null);

let dealingTimer: ReturnType<typeof setInterval> | null = null;
let flyingCardId = 0;
let latestCardTimer: ReturnType<typeof setTimeout> | null = null;

// 生成模拟牌组
const generateDeck = (): Card[] => {
  const deck: Card[] = [];
  const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  const ranks = [
    Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
    Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN,
    Rank.KING, Rank.ACE, Rank.TWO
  ];
  
  // 4副牌
  for (let deckNum = 0; deckNum < 4; deckNum++) {
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          id: `${suit}-${rank}-${deckNum}-${Math.random().toString(36).substr(2, 5)}`,
          suit,
          rank,
        });
      }
    }
    // 大小王
    deck.push({ id: `joker-small-${deckNum}`, suit: Suit.JOKER, rank: Rank.JOKER_SMALL });
    deck.push({ id: `joker-big-${deckNum}`, suit: Suit.JOKER, rank: Rank.JOKER_BIG });
  }
  
  // 洗牌
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
};

let gameDeck: Card[] = [];

// 计算属性
const remainingCards = computed(() => {
  const dealt = playerCardCounts.value.reduce((a, b) => a + b, 0);
  return props.totalCards - dealt;
});

const deckVisibleCards = computed(() => {
  return Math.min(Math.max(5, Math.ceil(remainingCards.value / 30)), 8);
});

const dealingPhaseText = computed(() => {
  switch (dealingPhase.value) {
    case 'shuffle': return '洗牌中...';
    case 'dealing': return `发牌中... ${Math.floor(dealProgress.value)}%`;
    case 'complete': return '发牌完成！';
    default: return '';
  }
});

// 牌的排序优先级
const getCardSortValue = (card: Card): number => {
  // 点数优先级：大王 > 小王 > 2 > A > K > Q > J > 10 > ... > 3
  let rankValue = 0;
  switch (card.rank) {
    case Rank.JOKER_BIG: rankValue = 1000; break;
    case Rank.JOKER_SMALL: rankValue = 999; break;
    case Rank.TWO: rankValue = 15; break;
    case Rank.ACE: rankValue = 14; break;
    default: rankValue = card.rank;
  }
  
  // 花色优先级：黑桃 > 红心 > 梅花 > 方块
  let suitValue = 0;
  switch (card.suit) {
    case Suit.SPADES: suitValue = 4; break;
    case Suit.HEARTS: suitValue = 3; break;
    case Suit.CLUBS: suitValue = 2; break;
    case Suit.DIAMONDS: suitValue = 1; break;
    case Suit.JOKER: suitValue = 5; break;
  }
  
  // 返回综合排序值：点数 * 10 + 花色
  return rankValue * 10 + suitValue;
};

// 排序后的手牌
const sortedHumanCards = computed(() => {
  return [...humanPlayerCards.value].sort((a, b) => {
    return getCardSortValue(b) - getCardSortValue(a);
  });
});

// 按点数分组的手牌
interface CardGroup {
  rank: Rank;
  cards: Card[];
}

const groupedHumanCards = computed((): CardGroup[] => {
  const groups = new Map<Rank, Card[]>();
  
  for (const card of sortedHumanCards.value) {
    if (!groups.has(card.rank)) {
      groups.set(card.rank, []);
    }
    groups.get(card.rank)!.push(card);
  }
  
  // 按点数排序（从大到小）
  const sortedRanks = Array.from(groups.keys()).sort((a, b) => {
    return getCardSortValue({ rank: b, suit: Suit.SPADES, id: '' }) - 
           getCardSortValue({ rank: a, suit: Suit.SPADES, id: '' });
  });
  
  return sortedRanks.map(rank => ({
    rank,
    cards: groups.get(rank)!,
  }));
});

// 叠放卡牌的样式
const getStackedCardStyle = (index: number) => {
  return {
    transform: `translateX(${index * 6}px)`,
    zIndex: index,
  };
};

// 花色和点数显示
const getSuitSymbol = (suit: Suit): string => {
  const symbols: Record<string, string> = {
    [Suit.SPADES]: '♠',
    [Suit.HEARTS]: '♥',
    [Suit.DIAMONDS]: '♦',
    [Suit.CLUBS]: '♣',
    [Suit.JOKER]: '🃏',
  };
  return symbols[suit] || '';
};

const getRankDisplay = (rank: Rank): string => {
  if (rank === Rank.JACK) return 'J';
  if (rank === Rank.QUEEN) return 'Q';
  if (rank === Rank.KING) return 'K';
  if (rank === Rank.ACE) return 'A';
  if (rank === Rank.TWO) return '2';
  if (rank === Rank.JOKER_SMALL) return '小';
  if (rank === Rank.JOKER_BIG) return '大';
  return rank.toString();
};

const getCardColorClass = (card: Card): string => {
  if (card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS) {
    return 'card-red';
  }
  if (card.suit === Suit.JOKER) {
    return card.rank === Rank.JOKER_BIG ? 'card-red' : 'card-black';
  }
  return 'card-black';
};

// 样式函数
const getDeckCardStyle = (index: number) => {
  return {
    transform: `translateZ(${index * 2}px) translateY(${-index * 1}px)`,
    zIndex: 10 - index,
  };
};

const getFlyingCardStyle = (card: { id: number; targetPlayer: number; progress: number }) => {
  const targets = [
    { x: 0, y: 150 },     // 南
    { x: 180, y: 0 },     // 东
    { x: 0, y: -120 },    // 北
    { x: -180, y: 0 },    // 西
  ];
  
  const target = targets[card.targetPlayer];
  const progress = card.progress / 100;
  
  // 人类玩家的牌有翻转效果
  if (card.targetPlayer === 0) {
    return {
      transform: `translate(${target.x * progress}px, ${target.y * progress}px) rotateY(${180 * progress}deg) scale(${1 + progress * 0.2})`,
      opacity: 1,
    };
  }
  
  // AI玩家的牌 - 简单平移，不旋转
  return {
    transform: `translate(${target.x * progress}px, ${target.y * progress}px) scale(${1 - progress * 0.5})`,
    opacity: 1 - progress * 0.8,
  };
};

const getReceivedCardStyle = (index: number, total: number) => {
  const offset = (index - total / 2) * 3;
  return {
    transform: `translateX(${offset}px)`,
    zIndex: index,
  };
};

const getHumanCardStyle = (index: number) => {
  return {
    zIndex: index,
    animationDelay: `${index * 0.02}s`,
  };
};

// 开始发牌动画
const startDealing = () => {
  dealingPhase.value = 'shuffle';
  isDeckActive.value = true;
  playerCardCounts.value = [0, 0, 0, 0];
  flyingCards.value = [];
  dealProgress.value = 0;
  humanPlayerCards.value = [];
  latestHumanCard.value = null;
  
  // 生成牌组
  gameDeck = generateDeck();
  
  // 洗牌动画
  setTimeout(() => {
    dealingPhase.value = 'dealing';
    startDealingCards();
  }, 1500);
};

const startDealingCards = () => {
  const cardsPerPlayer = Math.floor(props.totalCards / props.playerCount);
  const totalToDeal = cardsPerPlayer * props.playerCount;
  let dealtCount = 0;
  let deckIndex = 0;
  
  dealingTimer = setInterval(() => {
    if (dealtCount >= totalToDeal) {
      if (dealingTimer) clearInterval(dealingTimer);
      finishDealing();
      return;
    }
    
    // 发一张牌
    const targetPlayer = dealtCount % props.playerCount;
    currentReceiver.value = targetPlayer;
    
    // 获取当前牌
    const currentCard = gameDeck[deckIndex];
    deckIndex++;
    
    // 创建飞行卡牌
    const flyingCard = {
      id: flyingCardId++,
      targetPlayer,
      progress: 0,
      card: targetPlayer === 0 ? currentCard : undefined,
    };
    flyingCards.value.push(flyingCard);
    
    // 动画卡牌飞行
    const flyInterval = setInterval(() => {
      flyingCard.progress += 10;
      if (flyingCard.progress >= 100) {
        clearInterval(flyInterval);
        playerCardCounts.value[targetPlayer]++;
        
        // 如果是人类玩家，添加到手牌列表
        if (targetPlayer === 0 && currentCard) {
          humanPlayerCards.value.push(currentCard);
          latestHumanCard.value = currentCard;
          
          // 清除上一个定时器
          if (latestCardTimer) clearTimeout(latestCardTimer);
          latestCardTimer = setTimeout(() => {
            latestHumanCard.value = null;
          }, 500);
        }
        
        flyingCards.value = flyingCards.value.filter(c => c.id !== flyingCard.id);
      }
    }, 20);
    
    dealtCount++;
    dealProgress.value = (dealtCount / totalToDeal) * 100;
  }, 80); // 每80ms发一张牌
};

const finishDealing = () => {
  dealingPhase.value = 'complete';
  isDeckActive.value = false;
  latestHumanCard.value = null;
  
  setTimeout(() => {
    emit('complete');
  }, 1500);
};

const skipAnimation = () => {
  if (dealingTimer) clearInterval(dealingTimer);
  if (latestCardTimer) clearTimeout(latestCardTimer);
  
  // 立即完成发牌
  const cardsPerPlayer = Math.floor(props.totalCards / props.playerCount);
  playerCardCounts.value = [cardsPerPlayer, cardsPerPlayer, cardsPerPlayer, cardsPerPlayer];
  dealProgress.value = 100;
  dealingPhase.value = 'complete';
  latestHumanCard.value = null;
  
  setTimeout(() => {
    emit('skip');
  }, 300);
};

// 监听 isDealing 变化
watch(() => props.isDealing, (newVal) => {
  if (newVal) {
    startDealing();
  }
});

onMounted(() => {
  if (props.isDealing) {
    startDealing();
  }
});

onUnmounted(() => {
  if (dealingTimer) clearInterval(dealingTimer);
  if (latestCardTimer) clearTimeout(latestCardTimer);
});
</script>

<style scoped>
.dealing-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dealing-backdrop {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(15, 12, 41, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%);
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dealing-table {
  position: relative;
  width: 100%;
  max-width: 600px;
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 牌堆 */
.card-deck {
  position: absolute;
  width: 60px;
  height: 84px;
  perspective: 1000px;
  transform-style: preserve-3d;
  z-index: 100;
}

.card-deck.deck-active {
  /* 移除洗牌动画，保持静止 */
}

.deck-card {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.card-back {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e3a5f 0%, #0d253f 100%);
  border-radius: 8px;
  border: 2px solid #2a4a7f;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-back-pattern {
  width: 80%;
  height: 80%;
  background: 
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 5px,
      rgba(255, 255, 255, 0.03) 5px,
      rgba(255, 255, 255, 0.03) 10px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 5px,
      rgba(255, 255, 255, 0.03) 5px,
      rgba(255, 255, 255, 0.03) 10px
    );
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.deck-count {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

/* 飞行卡牌 */
.flying-card {
  position: absolute;
  width: 50px;
  height: 70px;
  z-index: 200;
  transition: all 0.2s ease-out;
  perspective: 1000px;
}

.flying-card.flying-to-human {
  width: 60px;
  height: 84px;
}

/* 牌面样式 */
.card-face {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 8px;
  border: 2px solid #ddd;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-face.card-red {
  color: #dc2626;
}

.card-face.card-black {
  color: #1f2937;
}

.card-corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.card-corner.top-left {
  top: 4px;
  left: 4px;
}

.card-corner.bottom-right {
  bottom: 4px;
  right: 4px;
  transform: rotate(180deg);
}

.card-rank {
  font-size: 14px;
}

.card-suit {
  font-size: 12px;
}

.card-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 24px;
}

/* 玩家位置 */
.player-positions {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.player-spot {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* 移除接收动画，保持静止 */

/* 南玩家（你）- 特殊样式 */
.player-south {
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 500px;
}

.player-south .spot-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.human-cards-area {
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 12px;
  min-height: 80px;
  max-height: 120px;
  overflow-x: auto;
  overflow-y: hidden;
}

.human-cards-scroll {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  justify-content: flex-start;
  padding-bottom: 4px;
}

/* 卡牌分组 */
.card-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  min-width: 50px;
  flex-shrink: 0;
}

.group-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.group-rank {
  font-size: 16px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.group-count {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

/* 叠放卡牌 */
.stacked-cards {
  display: flex;
  position: relative;
  min-width: 28px;
  height: 28px;
}

.stacked-card {
  position: absolute;
  top: 0;
  left: 0;
  transition: transform 0.2s ease;
}

.stacked-card:hover {
  transform: translateY(-4px) !important;
}

.more-cards {
  position: absolute;
  right: -8px;
  bottom: -4px;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 4px;
  border-radius: 4px;
  z-index: 10;
}

.human-received-card {
  /* 移除出现动画，保持静止 */
}

.mini-card {
  width: 22px;
  height: 28px;
  background: white;
  border-radius: 3px;
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.mini-card.card-red {
  color: #dc2626;
}

.mini-card.card-black {
  color: #1f2937;
}

.mini-rank {
  font-size: 12px;
  line-height: 1;
}

.mini-suit {
  font-size: 14px;
  line-height: 1;
}

/* 其他玩家 */
.player-east {
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.player-north {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.player-west {
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.spot-avatar {
  font-size: 36px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
}

.spot-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.spot-cards {
  display: flex;
  height: 30px;
  min-width: 80px;
}

.spot-cards-vertical {
  flex-direction: column;
  height: auto;
  min-height: 60px;
  min-width: 30px;
}

.received-card {
  width: 20px;
  height: 28px;
  background: linear-gradient(135deg, #1e3a5f 0%, #0d253f 100%);
  border-radius: 3px;
  border: 1px solid #2a4a7f;
  margin-left: -12px;
  animation: cardReceive 0.2s ease-out;
}

.received-card:first-child {
  margin-left: 0;
}

.received-card-vertical {
  margin-left: 0;
  margin-top: -20px;
}

.received-card-vertical:first-child {
  margin-top: 0;
}

@keyframes cardReceive {
  from { opacity: 0; transform: scale(1.5); }
  to { opacity: 1; transform: scale(1); }
}

.card-count-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.5);
}

/* 最新牌提示 */
.latest-card-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 60px);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.8);
  padding: 8px 16px;
  border-radius: 20px;
  animation: toastPop 0.3s ease-out;
  z-index: 300;
}

@keyframes toastPop {
  from { opacity: 0; transform: translate(-50%, 60px) scale(0.8); }
  to { opacity: 1; transform: translate(-50%, 60px) scale(1); }
}

.toast-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.toast-card {
  background: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 16px;
  display: flex;
  gap: 2px;
}

.toast-card.card-red {
  color: #dc2626;
}

.toast-card.card-black {
  color: #1f2937;
}

/* 进度条 */
.dealing-progress {
  position: absolute;
  bottom: -70px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  text-align: center;
}

.progress-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
  transition: width 0.1s ease-out;
}

.progress-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* 跳过按钮 */
.skip-button {
  position: absolute;
  bottom: 40px;
  right: 40px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1001;
}

.skip-button:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* 响应式 */
@media (max-width: 500px) {
  .dealing-table {
    height: 450px;
  }
  
  .player-south {
    width: 95%;
  }
  
  .mini-card {
    width: 24px;
    height: 34px;
  }
  
  .mini-rank { font-size: 10px; }
  .mini-suit { font-size: 8px; }
  
  .spot-avatar { font-size: 28px; }
  .spot-label { font-size: 12px; }
  
  .skip-button {
    bottom: 20px;
    right: 20px;
    padding: 10px 20px;
    font-size: 12px;
  }
}

@media (orientation: landscape) and (max-height: 400px) {
  .dealing-table {
    height: 320px;
  }
  
  .human-cards-area {
    max-height: 70px;
  }
  
  .deck-count { bottom: -25px; }
  .dealing-progress { bottom: -50px; }
}
</style>
