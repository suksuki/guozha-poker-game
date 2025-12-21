<template>
  <div 
    class="player-card" 
    :class="[
      `position-${position}`, 
      { 'is-current': isCurrent, 'is-finished': player.finishedRank }
    ]" 
  >
    <!-- 聊天气泡 -->
    <ChatBubble
      v-if="activeBubble"
      :content="activeBubble.content"
      :player-id="player.id"
      :is-human="isHuman"
      :position="bubblePosition as any"
      :offset-x="position === 'left' || position === 'right' ? 10 : 0"
      :offset-y="position === 'top' || position === 'bottom' ? 10 : 0"
    />
    
    <!-- 当前回合指示器 -->
    <div v-if="isCurrent" class="turn-indicator">
      <span class="turn-dot"></span>
    </div>
    
    <!-- 玩家头像 -->
    <div class="avatar-wrapper">
      <div class="avatar" :class="{ 'avatar-human': isHuman }">
        {{ isHuman ? '🧑' : '🤖' }}
      </div>
      <!-- 完成排名徽章 -->
      <div v-if="player.finishedRank" class="rank-badge">
        {{ getRankLabel(player.finishedRank) }}
      </div>
    </div>
    
    <!-- 玩家信息 -->
    <div :class="['player-info', `info-${layout}`]">
      <!-- 名称 -->
      <div class="player-name">
        {{ directionLabel }}
      </div>
      
      <!-- 统计数据 -->
      <div class="player-stats">
        <!-- 手牌数 -->
        <div class="stat-item stat-cards">
          <span class="stat-icon">🎴</span>
          <span class="stat-value">{{ player.hand.length }}</span>
        </div>
        
        <!-- 分数 -->
        <div 
          v-if="player.score && player.score !== 0" 
          class="stat-item"
          :class="player.score > 0 ? 'stat-positive' : 'stat-negative'"
        >
          <span class="stat-icon">💰</span>
          <span class="stat-value">{{ formatScore(player.score) }}</span>
        </div>
        
        <!-- 墩数 -->
        <div v-if="player.dunCount && player.dunCount > 0" class="stat-item stat-dun">
          <span class="stat-icon">🏆</span>
          <span class="stat-value">{{ player.dunCount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n/composable';
import ChatBubble from '../chat/ChatBubble.vue';
import type { Player } from '@/core/types/card';
import type { ChatMessage } from '../../stores/chatStore';

// Props
const props = defineProps<{
  player: Player;
  position: 'left' | 'right' | 'top' | 'bottom';
  isCurrent: boolean;
  isHuman?: boolean;
  activeBubble?: ChatMessage | null;
}>();

const { t } = useI18n();

// 计算属性
const layout = computed(() => {
  return props.position === 'left' || props.position === 'right' 
    ? 'vertical' 
    : 'horizontal';
});

const directionLabel = computed(() => {
  const labels: Record<string, string> = {
    left: t('game.directions.west'),
    right: t('game.directions.east'),
    top: t('game.directions.north'),
    bottom: t('game.directions.south'),
  };
  return labels[props.position] || '';
});

const bubblePosition = computed(() => {
  const positionMap: Record<string, string> = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top',
  };
  return positionMap[props.position] || 'right';
});

// 方法
const formatScore = (score: number): string => {
  if (score > 0) return `+${score}`;
  return score.toString();
};

const getRankLabel = (rank: number): string => {
  const labels = ['🥇', '🥈', '🥉', '4️⃣'];
  return labels[rank - 1] || `#${rank}`;
};
</script>

<style scoped>
.player-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  position: relative;
  transition: all 0.3s ease;
}

/* 位置布局 */
.position-left,
.position-right {
  flex-direction: column;
  padding: 12px 8px;
}

.position-top,
.position-bottom {
  flex-direction: row;
  padding: 8px 16px;
}

/* 当前玩家高亮 */
.is-current {
  background: linear-gradient(135deg, rgba(102,126,234,0.3) 0%, rgba(118,75,162,0.2) 100%);
  border-color: rgba(102,126,234,0.5);
  box-shadow: 0 0 20px rgba(102,126,234,0.3);
}

/* 已完成玩家 */
.is-finished {
  opacity: 0.7;
}

/* 回合指示器 */
.turn-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
}

.turn-dot {
  display: block;
  width: 12px;
  height: 12px;
  background: #4ade80;
  border-radius: 50%;
  box-shadow: 0 0 10px #4ade80;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.8); }
}

/* 头像区域 */
.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.avatar-human {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.rank-badge {
  position: absolute;
  bottom: -6px;
  right: -6px;
  font-size: 18px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

/* 玩家信息 */
.player-info {
  display: flex;
  gap: 4px;
}

.info-vertical {
  flex-direction: column;
  align-items: center;
}

.info-horizontal {
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.player-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

/* 统计数据 */
.player-stats {
  display: flex;
  gap: 6px;
}

.info-vertical .player-stats {
  flex-direction: column;
  align-items: center;
}

.info-horizontal .player-stats {
  flex-direction: row;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  font-size: 11px;
}

.stat-icon {
  font-size: 12px;
}

.stat-value {
  color: rgba(255,255,255,0.9);
  font-weight: 500;
}

.stat-cards {
  background: rgba(59,130,246,0.2);
}

.stat-positive {
  background: rgba(34,197,94,0.2);
}

.stat-positive .stat-value {
  color: #4ade80;
}

.stat-negative {
  background: rgba(239,68,68,0.2);
}

.stat-negative .stat-value {
  color: #f87171;
}

.stat-dun {
  background: rgba(251,191,36,0.2);
}

.stat-dun .stat-value {
  color: #fbbf24;
}

/* 响应式 */
@media screen and (max-width: 900px) {
  .player-card {
    padding: 6px;
    gap: 4px;
    border-radius: 12px;
  }
  
  .avatar {
    width: 36px;
    height: 36px;
    font-size: 20px;
  }
  
  .player-name {
    font-size: 11px;
  }
  
  .stat-item {
    padding: 1px 4px;
    font-size: 10px;
  }
}
</style>
