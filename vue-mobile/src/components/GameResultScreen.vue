<template>
  <div class="game-result-screen">
    <div class="result-header">
      <h2>🎊 游戏结束</h2>
      <van-tag type="success" size="large">共 {{ totalRounds }} 轮</van-tag>
    </div>

    <!-- 冠军展示 -->
    <div class="champion-section">
      <div class="champion-avatar">
        <div class="crown">👑</div>
        <div class="avatar">{{ winner?.name?.charAt(0) || '?' }}</div>
      </div>
      <div class="champion-info">
        <h3>{{ winner?.name || '未知' }}</h3>
        <p class="champion-score">最终得分: {{ winner?.score || 0 }} 分</p>
      </div>
    </div>

    <!-- 排名列表 -->
    <van-cell-group title="🏆 最终排名">
      <van-cell
        v-for="(player, index) in sortedPlayers"
        :key="player.id"
        :title="getRankIcon(index + 1)"
        :label="playerInfo(player)"
        :value="`${player.score} 分`"
        :class="`rank-${index + 1}`"
      >
        <template #icon>
          <div class="player-avatar-mini">{{ player.name?.charAt(0) || '?' }}</div>
        </template>
        <template #right-icon>
          <van-tag :type="getRankTagType(index + 1)" size="medium">
            第 {{ index + 1 }} 名
          </van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 详细数据 -->
    <van-collapse v-model="activeNames">
      <van-collapse-item title="📊 详细数据" name="details">
        <div class="details-grid">
          <div
            v-for="player in sortedPlayers"
            :key="player.id"
            class="player-detail-card"
          >
            <h4>{{ player.name }}</h4>
            <div class="detail-item">
              <span class="label">排名:</span>
              <span class="value rank-value">{{ player.finishedRank || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">最终分数:</span>
              <span class="value" :class="player.score >= 0 ? 'positive' : 'negative'">
                {{ player.score }} 分
              </span>
            </div>
            <div class="detail-item">
              <span class="label">墩数:</span>
              <span class="value">{{ player.dunCount || 0 }} 墩</span>
            </div>
            <div class="detail-item">
              <span class="label">剩余手牌:</span>
              <span class="value">{{ player.hand?.length || 0 }} 张</span>
            </div>
            <div class="detail-item" v-if="player.finishedRank">
              <span class="label">完成顺序:</span>
              <span class="value">第 {{ player.finishedRank }} 个出完</span>
            </div>
          </div>
        </div>
      </van-collapse-item>

      <van-collapse-item title="📈 轮次统计" name="rounds" v-if="rounds.length > 0">
        <div class="rounds-list">
          <div
            v-for="(round, index) in rounds"
            :key="index"
            class="round-item"
          >
            <div class="round-header">
              <span class="round-number">第 {{ round.roundNumber }} 轮</span>
              <span class="round-score" v-if="round.roundScore > 0">
                +{{ round.roundScore }} 分
              </span>
              <span class="round-score" v-else-if="round.totalScore > 0">
                +{{ round.totalScore }} 分
              </span>
            </div>
            <div class="round-details" v-if="round.winnerName || round.winnerId !== undefined || round.plays?.length > 0">
              <van-tag size="mini" type="success" v-if="round.winnerName">
                {{ round.winnerName }} 获胜
              </van-tag>
              <span class="round-info" v-if="round.plays?.length">
                {{ round.plays.length }} 次出牌
              </span>
              <span class="round-info" v-if="round.isTakeoverRound">
                <van-tag size="mini" type="warning">接风轮</van-tag>
              </span>
              <span class="round-info" v-if="round.isFinished">
                <van-tag size="mini" type="default">已完成</van-tag>
              </span>
            </div>
          </div>
        </div>
      </van-collapse-item>
    </van-collapse>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <van-button
        type="primary"
        size="large"
        block
        @click="$emit('restart')"
      >
        🔄 再来一局
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Player } from '../../../src/types/card';
import type { RoundData } from '../../../src/game-engine/round/RoundData';

interface Props {
  players: Player[];
  rounds?: RoundData[];
  winner?: Player;
}

const props = withDefaults(defineProps<Props>(), {
  rounds: () => [],
  winner: undefined
});

defineEmits<{
  restart: [];
}>();

const activeNames = ref<string[]>([]);

// 计算属性
const sortedPlayers = computed(() => {
  return [...props.players].sort((a, b) => {
    // 按排名排序
    const rankA = a.finishedRank || 999;
    const rankB = b.finishedRank || 999;
    return rankA - rankB;
  });
});

const totalRounds = computed(() => {
  return props.rounds.length || 0;
});

// 方法
const getRankIcon = (rank: number): string => {
  const icons: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
    4: '4️⃣'
  };
  return icons[rank] || `${rank}️⃣`;
};

const getRankTagType = (rank: number): string => {
  if (rank === 1) return 'success';
  if (rank === 2) return 'warning';
  if (rank === 3) return 'default';
  return 'danger';
};

const playerInfo = (player: Player): string => {
  const parts: string[] = [];
  if (player.dunCount) {
    parts.push(`${player.dunCount}墩`);
  }
  if (player.hand?.length) {
    parts.push(`剩余${player.hand.length}张`);
  }
  return parts.join(' · ') || '-';
};
</script>

<style scoped>
.game-result-screen {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  color: #fff;
}

.result-header {
  text-align: center;
  margin-bottom: 24px;
}

.result-header h2 {
  margin: 0 0 12px 0;
  font-size: 28px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

/* 冠军展示 */
.champion-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.champion-avatar {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}

.champion-avatar .crown {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 32px;
  z-index: 2;
}

.champion-avatar .avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.champion-info {
  flex: 1;
}

.champion-info h3 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #333;
}

.champion-score {
  margin: 0;
  font-size: 18px;
  color: #f5576c;
  font-weight: bold;
}

/* 排名列表 */
:deep(.van-cell-group) {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
}

:deep(.van-cell-group__title) {
  font-size: 16px;
  font-weight: bold;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.05);
}

:deep(.van-cell) {
  padding: 12px 16px;
}

:deep(.rank-1 .van-cell__title) {
  color: #ffd700;
  font-weight: bold;
}

:deep(.rank-2 .van-cell__title) {
  color: #c0c0c0;
  font-weight: bold;
}

:deep(.rank-3 .van-cell__title) {
  color: #cd7f32;
  font-weight: bold;
}

.player-avatar-mini {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  margin-right: 12px;
}

/* 详细数据 */
.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 12px 0;
}

.player-detail-card {
  background: #f7f7f7;
  border-radius: 8px;
  padding: 12px;
}

.player-detail-card h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 12px;
}

.detail-item .label {
  color: #666;
}

.detail-item .value {
  font-weight: bold;
}

.detail-item .value.positive {
  color: #07c160;
}

.detail-item .value.negative {
  color: #ee0a24;
}

.detail-item .value.rank-value {
  color: #1989fa;
}

/* 轮次统计 */
.rounds-list {
  padding: 12px 0;
}

.round-item {
  background: #f7f7f7;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.round-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.round-number {
  font-weight: bold;
  color: #333;
}

.round-score {
  color: #07c160;
  font-weight: bold;
}

.round-details {
  display: flex;
  gap: 8px;
  align-items: center;
}

.round-info {
  font-size: 12px;
  color: #666;
}

/* 操作按钮 */
.action-buttons {
  margin-top: 24px;
}

/* 响应式 */
@media (max-width: 480px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
