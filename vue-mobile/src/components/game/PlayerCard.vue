<template>
  <div class="player-card" :class="[`position-${position}`, { 'is-current': isCurrent }]" style="position: relative;">
    <!-- 聊天气泡 -->
    <ChatBubble
      v-if="activeBubble"
      :content="activeBubble.content"
      :player-id="player.id"
      :is-human="isHuman"
      :position="bubblePosition"
      :offset-x="position === 'left' || position === 'right' ? 10 : 0"
      :offset-y="position === 'top' || position === 'bottom' ? 10 : 0"
    />
    
    <!-- 玩家头像 -->
    <div class="player-avatar">{{ isHuman ? '🧑' : '🤖' }}</div>
    
    <!-- 玩家名称标签 -->
    <van-tag 
      :size="position === 'top' ? 'small' : 'mini'" 
      :type="isCurrent ? 'primary' : 'default'"
    >
      {{ directionLabel }}{{ player.id }}
    </van-tag>
    
    <!-- 玩家统计信息 -->
    <div :class="['player-stats', `player-stats-${layout}`]">
      <span>🎴{{ player.hand.length }}</span>
      <span 
        v-if="player.score && player.score !== 0" 
        :class="player.score > 0 ? 'score-positive' : 'score-negative'"
      >
        💰{{ player.score }}
      </span>
      <span v-if="player.dunCount && player.dunCount > 0">
        🏆{{ player.dunCount }}墩
      </span>
    </div>
    
    <!-- 完成排名 -->
    <van-tag 
      v-if="player.finishedRank" 
      :size="position === 'top' ? 'small' : 'mini'" 
      type="danger"
    >
      #{{ player.finishedRank }}
    </van-tag>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n/composable';
import ChatBubble from '../chat/ChatBubble.vue';
import type { Player } from '../../types/card';
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
</script>

<style scoped>
.player-card {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 6px;
  backdrop-filter: blur(4px);
}

/* 垂直布局（左右玩家） */
.position-left,
.position-right {
  flex-direction: column;
  justify-content: center;
}

/* 水平布局（上下玩家） */
.position-top,
.position-bottom {
  flex-direction: row;
  justify-content: center;
}

/* 当前玩家高亮 */
.is-current {
  box-shadow: 0 0 12px rgba(25, 137, 250, 0.6);
  border: 2px solid #1989fa;
}

.player-avatar {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-stats-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  color: white;
}

.player-stats-horizontal {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: white;
}

.score-positive {
  color: #07c160;
}

.score-negative {
  color: #ee0a24;
}

/* 响应式 */
@media screen and (max-width: 900px) {
  .player-card {
    padding: 4px;
    gap: 3px;
  }
  
  .player-avatar {
    font-size: 20px;
  }
  
  .player-stats-vertical,
  .player-stats-horizontal {
    font-size: 10px;
  }
}
</style>
