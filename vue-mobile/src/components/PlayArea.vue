<template>
  <div class="play-area">
    <van-cell-group v-if="lastPlay" title="当前出牌">
      <!-- 玩家信息 -->
      <div class="player-info">
        <span class="player-avatar">{{ playerAvatar }}</span>
        <span class="player-name">{{ lastPlayPlayerName }}</span>
      </div>
      
      <!-- 出牌卡片 -->
      <div class="play-cards">
        <CardView
          v-for="card in lastPlay.cards"
          :key="card.id"
          :card="card"
          size="medium"
        />
      </div>
      
      <!-- 牌型信息 -->
      <van-tag type="primary" size="large">
        {{ playTypeText }}
      </van-tag>
    </van-cell-group>
    
    <van-empty
      v-else
      description="等待出牌"
      image="search"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Play, Player, PlayType } from '../../../src/types/card';
import { CellGroup, Tag, Empty } from 'vant';
import CardView from './CardView.vue';

interface Props {
  lastPlay: Play | null;
  lastPlayPlayerName?: string;
  lastPlayPlayerIndex?: number | null;
  players?: Player[];
  roundScore?: number;
}

const props = withDefaults(defineProps<Props>(), {
  lastPlayPlayerName: '',
  players: () => [],
  roundScore: 0
});

// 获取玩家头像
const playerAvatar = computed(() => {
  const index = props.lastPlayPlayerIndex;
  if (index === null || index === undefined) return '🤖';
  
  const player = props.players.find(p => p.id === index);
  if (player?.isHuman) return '🐱';
  
  const emojis = ['🤖', '👾', '🤖', '👽', '🤖', '👻', '🤖', '🦾'];
  return emojis[index % 8];
});

// 牌型文字
const playTypeText = computed(() => {
  if (!props.lastPlay) return '';
  
  const typeMap: Record<PlayType, string> = {
    [PlayType.SINGLE]: '单张',
    [PlayType.PAIR]: '对子',
    [PlayType.TRIPLE]: '三张',
    [PlayType.STRAIGHT]: '顺子',
    [PlayType.FLUSH]: '同花',
    [PlayType.FULL_HOUSE]: '葫芦',
    [PlayType.BOMB]: '炸弹',
    [PlayType.STRAIGHT_FLUSH]: '同花顺'
  };
  
  return typeMap[props.lastPlay.type] || '未知';
});
</script>

<style scoped>
.play-area {
  padding: 16px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  justify-content: center;
}

.player-avatar {
  font-size: 24px;
}

.player-name {
  font-size: 14px;
  color: #666;
}

.play-cards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 16px 0;
}
</style>

