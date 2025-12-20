<template>
  <div class="play-area">
    <!-- 无出牌时 -->
    <template v-if="!lastPlay || lastPlay.length === 0">
      <div class="empty-state">
        <div class="empty-icon">🃏</div>
        <div class="empty-text">{{ $t('game.waitingFirstPlayer') }}</div>
        <div class="empty-hint">等待玩家出牌...</div>
      </div>
    </template>
    
    <!-- 有出牌时 -->
    <template v-else>
      <div class="last-play-container">
        <!-- 出牌信息头部 -->
        <div class="play-header">
          <div class="player-badge">
            <span class="badge-icon">👤</span>
            <span class="badge-text">{{ lastPlayerName }}</span>
          </div>
          <div class="type-badge" :class="getTypeClass(playType)">
            <span class="type-icon">{{ getTypeIcon(playType) }}</span>
            <span class="type-text">{{ playType }}</span>
          </div>
        </div>
        
        <!-- 出牌卡牌展示 -->
        <div class="cards-display">
          <div class="cards-wrapper" :class="{ 'cards-large': lastPlay.length <= 3 }">
            <CardView
              v-for="(card, idx) in lastPlay" 
              :key="`${card.id || idx}-${card.rank}-${card.suit}`"
              :card="card"
              :size="lastPlay.length <= 3 ? 'medium' : 'small'"
              class="played-card"
              :style="getCardStyle(idx, lastPlay.length)"
            />
          </div>
        </div>
        
        <!-- 轮次信息 -->
        <div class="round-info">
          <span class="round-label">第</span>
          <span class="round-number">{{ playCount }}</span>
          <span class="round-label">手</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n/composable';
import CardView from '../card/CardView.vue';
import type { Card } from '@/core/types/card';

// Props
const props = defineProps<{
  lastPlay: Card[] | null;
  lastPlayerName: string;
  playCount: number;
}>();

const { t } = useI18n();

// 计算牌型
const playType = computed(() => {
  if (!props.lastPlay || props.lastPlay.length === 0) {
    return '无';
  }
  
  const cards = props.lastPlay;
  const cardCount = cards.length;
  
  if (cardCount === 1) return t('game.playTypes.single') || '单张';
  if (cardCount === 2) {
    if (cards[0].rank === cards[1].rank) return t('game.playTypes.pair') || '对子';
    return t('game.playTypes.combination') || '组合';
  }
  if (cardCount === 3) return t('game.playTypes.triple') || '三张';
  if (cardCount === 4) {
    const ranks = cards.map(c => c.rank);
    if (ranks.every(r => r === ranks[0])) return t('game.playTypes.bomb') || '炸弹';
    return t('game.playTypes.fourWithTwo') || '四带二';
  }
  if (cardCount >= 7) {
    const ranks = cards.map(c => c.rank);
    if (ranks.every(r => r === ranks[0])) return t('game.playTypes.dun') || '墩';
  }
  
  return `${cardCount}张组合`;
});

// 获取牌型样式类
const getTypeClass = (type: string): string => {
  if (type.includes('炸弹') || type.includes('bomb')) return 'type-bomb';
  if (type.includes('墩') || type.includes('dun')) return 'type-dun';
  if (type.includes('对') || type.includes('pair')) return 'type-pair';
  if (type.includes('三') || type.includes('triple')) return 'type-triple';
  return 'type-normal';
};

// 获取牌型图标
const getTypeIcon = (type: string): string => {
  if (type.includes('炸弹') || type.includes('bomb')) return '💥';
  if (type.includes('墩') || type.includes('dun')) return '🏆';
  if (type.includes('对') || type.includes('pair')) return '👥';
  if (type.includes('三') || type.includes('triple')) return '🔺';
  return '🎴';
};

// 获取卡牌位置样式
const getCardStyle = (index: number, total: number) => {
  if (total <= 3) {
    return {
      transform: `translateX(${(index - (total - 1) / 2) * 10}px)`,
      zIndex: index,
    };
  }
  // 扇形排列
  const angle = ((index - (total - 1) / 2) * 8);
  const offset = Math.abs(index - (total - 1) / 2) * 2;
  return {
    transform: `rotate(${angle}deg) translateY(${offset}px)`,
    zIndex: index,
  };
};
</script>

<style scoped>
.play-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  padding: 16px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, transparent 70%);
  border-radius: 24px;
  position: relative;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  color: rgba(255,255,255,0.7);
  font-weight: 500;
}

.empty-hint {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
}

/* 出牌展示 */
.last-play-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* 头部信息 */
.play-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.player-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.badge-icon {
  font-size: 14px;
}

.badge-text {
  font-size: 13px;
  color: white;
  font-weight: 500;
}

.type-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 600;
}

.type-icon {
  font-size: 16px;
}

.type-text {
  font-size: 13px;
}

.type-normal {
  background: linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.1) 100%);
  color: #93c5fd;
}

.type-pair {
  background: linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0.1) 100%);
  color: #86efac;
}

.type-triple {
  background: linear-gradient(135deg, rgba(251,191,36,0.3) 0%, rgba(251,191,36,0.1) 100%);
  color: #fde047;
}

.type-bomb {
  background: linear-gradient(135deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,0.2) 100%);
  color: #fca5a5;
  animation: bombPulse 0.5s ease-in-out;
}

@keyframes bombPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.type-dun {
  background: linear-gradient(135deg, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.2) 100%);
  color: #d8b4fe;
  animation: dunGlow 1s ease-in-out infinite;
}

@keyframes dunGlow {
  0%, 100% { box-shadow: 0 0 10px rgba(168,85,247,0.3); }
  50% { box-shadow: 0 0 20px rgba(168,85,247,0.6); }
}

/* 卡牌展示区 */
.cards-display {
  padding: 16px 0;
}

.cards-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.cards-large .played-card {
  margin: 0 -5px;
}

.played-card {
  transition: transform 0.3s ease;
  margin: 0 -8px;
}

.played-card:hover {
  transform: translateY(-8px) !important;
  z-index: 100 !important;
}

/* 轮次信息 */
.round-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 4px 16px;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
}

.round-label {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
}

.round-number {
  font-size: 16px;
  font-weight: 700;
  color: white;
}

/* 响应式 */
@media screen and (max-width: 900px) {
  .play-area {
    min-height: 120px;
    padding: 12px;
  }
  
  .empty-icon {
    font-size: 36px;
  }
  
  .empty-text {
    font-size: 14px;
  }
  
  .player-badge,
  .type-badge {
    padding: 4px 10px;
    font-size: 12px;
  }
}
</style>
