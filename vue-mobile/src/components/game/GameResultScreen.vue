<template>
  <div class="game-result-screen animate-fade-in">
    <div class="result-header">
      <h2 class="title-gradient">🎊 {{ $t('game.finished') }}</h2>
      <div class="round-badge">{{ $t('game.round') }} {{ totalRounds }}</div>
    </div>

    <!-- 团队模式：显示获胜团队 -->
    <template v-if="isTeamMode && teamRankings && teamRankings.length > 0">
      <div class="champion-section animate-scale-in">
        <div class="glow-effect"></div>
        <div class="champion-content">
          <div class="champion-avatar-container">
            <div class="crown-icon">👑</div>
            <div class="champion-avatar">
              {{ winningTeam?.team?.name?.charAt(0) || '?' }}
            </div>
            <div class="winner-label">WINNER</div>
          </div>
          <div class="champion-details">
            <h3 class="champion-name">{{ winningTeam?.team?.name || '未知' }}</h3>
            <div class="champion-stats">
              <div class="stat-pill">
                <span class="stat-label">团队分数</span>
                <span class="stat-value text-gold">{{ winningTeam?.finalScore || 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 团队排名列表 -->
      <div class="rank-section animate-slide-up">
        <div class="section-title">🏆 团队排名</div>
        <div class="rank-list">
          <div 
            v-for="(teamRanking, index) in teamRankings" 
            :key="teamRanking.team.id"
            class="rank-card glass"
            :class="`rank-${index + 1}`"
          >
            <div class="rank-number">{{ teamRanking.rank }}</div>
            <div class="player-info">
              <div class="player-avatar-mini" :class="`avatar-rank-${index + 1}`">
                {{ teamRanking.team.name?.charAt(0) || '?' }}
              </div>
              <div class="player-text">
                <div class="player-name">{{ teamRanking.team.name }}</div>
                <div class="player-sub">
                  成员: {{ teamRanking.team.players.map(id => players.find(p => p.id === id)?.name || `玩家${id}`).join(', ') }}
                </div>
              </div>
            </div>
            <div class="player-score" :class="getScoreClass(teamRanking.finalScore || 0)">
              {{ teamRanking.finalScore }} 分
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 个人模式：显示个人排名 -->
    <template v-else>
      <div class="champion-section animate-scale-in">
        <div class="glow-effect"></div>
        <div class="champion-content">
          <div class="champion-avatar-container">
            <div class="crown-icon">👑</div>
            <div class="champion-avatar">
              {{ winner?.name?.charAt(0) || '?' }}
            </div>
            <div class="winner-label">WINNER</div>
          </div>
          <div class="champion-details">
            <h3 class="champion-name">{{ winner?.name || '未知' }}</h3>
            <div class="champion-stats">
              <div class="stat-pill">
                <span class="stat-label">{{ $t('game.score') }}</span>
                <span class="stat-value text-gold">{{ (winner as any)?.finalScore ?? winner?.score ?? 0 }}</span>
              </div>
              <div class="stat-pill" v-if="winner?.dunCount">
                <span class="stat-label">{{ $t('game.dunCount') }}</span>
                <span class="stat-value">{{ winner.dunCount }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 排名列表 -->
      <div class="rank-section animate-slide-up">
        <div class="section-title">🏆 {{ $t('game.winner') }}</div>
        <div class="rank-list">
          <div 
            v-for="(player, index) in sortedPlayers" 
            :key="player.id"
            class="rank-card glass"
            :class="`rank-${index + 1}`"
          >
            <div class="rank-number">{{ index + 1 }}</div>
            <div class="player-info">
              <div class="player-avatar-mini" :class="`avatar-rank-${index + 1}`">
                {{ player.name?.charAt(0) || '?' }}
              </div>
              <div class="player-text">
                <div class="player-name">{{ player.name }}</div>
                <div class="player-sub">
                   {{ playerInfo(player) }}
                </div>
              </div>
            </div>
            <div class="player-score" :class="getScoreClass((player as any)?.finalScore ?? player.score ?? 0)">
              {{ (player as any)?.finalScore ?? player.score ?? 0 }} 分
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 详细数据 -->
    <div class="details-section animate-slide-up" style="animation-delay: 0.1s;">
      <van-collapse v-model="activeNames" :border="false" class="glass-collapse">
        <van-collapse-item name="details" :border="false">
          <template #title>
            <span class="collapse-title">📊 {{ $t('game.details') }}</span>
          </template>
          <div class="details-grid">
            <div
              v-for="player in sortedPlayers"
              :key="player.id"
              class="player-detail-card glass"
            >
              <div class="detail-header">
                <span class="detail-name">{{ player.name }}</span>
                <span class="detail-rank-badge" :class="`badge-rank-${player.finishedRank}`">
                  #{{ player.finishedRank || '-' }}
                </span>
              </div>
              <div class="detail-stats">
                <div class="d-item">
                  <span class="d-label">{{ $t('game.score') }}</span>
                  <span class="d-value" :class="((player as any)?.finalScore ?? player.score ?? 0) >= 0 ? 'text-success' : 'text-danger'">
                    {{ ((player as any)?.finalScore ?? player.score ?? 0) > 0 ? '+' : '' }}{{ (player as any)?.finalScore ?? player.score ?? 0 }}
                  </span>
                </div>
                <div class="d-item">
                  <span class="d-label">{{ $t('game.dunCount') }}</span>
                  <span class="d-value">{{ player.dunCount || 0 }}</span>
                </div>
                <div class="d-item">
                  <span class="d-label">{{ $t('game.remainingCards') }}</span>
                  <span class="d-value">{{ player.hand?.length || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </van-collapse-item>

        <van-collapse-item name="rounds" v-if="rounds.length > 0" :border="false">
          <template #title>
             <span class="collapse-title">📈 {{ $t('game.roundStats') }}</span>
          </template>
          <div class="rounds-list">
            <div
              v-for="(round, index) in rounds"
              :key="index"
              class="round-item glass"
            >
              <div class="round-left">
                <div class="round-idx">{{ round.roundNumber }}</div>
                <div class="round-desc">
                  <div class="round-winner" v-if="round.winnerName">{{ round.winnerName }} 胜</div>
                  <div class="round-tags">
                    <span class="mini-tag" v-if="round.isTakeoverRound">接风</span>
                    <span class="mini-tag" v-if="round.plays?.length">{{ round.plays.length }}手</span>
                  </div>
                </div>
              </div>
              <div class="round-right">
                <span class="round-score-text" v-if="round.roundScore > 0">+{{ round.roundScore }}</span>
                <span class="round-score-text" v-else-if="round.totalScore > 0">+{{ round.totalScore }}</span>
              </div>
            </div>
          </div>
        </van-collapse-item>
      </van-collapse>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons animate-slide-up" style="animation-delay: 0.2s;">
      <button class="btn btn-primary btn-block btn-lg" @click="$emit('restart')">
        <span class="icon">🔄</span>
        <span>{{ $t('game.restart') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from '../../i18n/composable';
import type { Player } from '@/core/types/card';
import type { RoundData } from '@/core/game-engine/round/RoundData';
import type { TeamConfig, TeamRanking } from '@/core/types/team';

const { t } = useI18n();

interface Props {
  players: Player[];
  rounds?: RoundData[];
  winner?: Player;
  isTeamMode?: boolean;
  teamConfig?: TeamConfig | null;
  teamRankings?: TeamRanking[] | null;
}

const props = withDefaults(defineProps<Props>(), {
  rounds: () => [],
  winner: undefined,
  isTeamMode: false,
  teamConfig: null,
  teamRankings: null
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

// 获胜团队（团队模式下）
const winningTeam = computed(() => {
  if (!props.isTeamMode || !props.teamRankings || props.teamRankings.length === 0) {
    return null;
  }
  return props.teamRankings[0]; // 排名第一的团队
});

const totalRounds = computed(() => {
  return props.rounds.length || 0;
});

const getScoreClass = (score: number) => {
  if (score > 0) return 'text-success';
  if (score < 0) return 'text-danger';
  return 'text-muted';
};

const playerInfo = (player: Player): string => {
  const parts: string[] = [];
  if (player.dunCount) {
    parts.push(`${player.dunCount}墩`);
  }
  if (player.hand?.length) {
    parts.push(`剩${player.hand.length}张`);
  }
  return parts.join(' · ') || '已完成';
};
</script>

<style scoped>
.game-result-screen {
  padding: 24px 16px;
  background: var(--bg-primary);
  min-height: fit-content;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
  color: var(--text-primary);
  box-sizing: border-box;
  padding-bottom: 40px;
}

/* Header */
.result-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
}

.title-gradient {
  font-size: 36px;
  margin: 0 0 8px 0;
  background: linear-gradient(to bottom, #ffffff, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.round-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Champion Section */
.champion-section {
  position: relative;
  margin-bottom: 32px;
  padding: 2px; /* For border gradient if needed */
}

.champion-content {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(255, 215, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.05);
}

.glow-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%);
  z-index: 1;
  pointer-events: none;
}

.champion-avatar-container {
  position: relative;
  margin-bottom: 16px;
}

.crown-icon {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%) rotate(-5deg);
  font-size: 42px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
  z-index: 10;
  animation: bounce 2s infinite ease-in-out;
}

.champion-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700 0%, #FDB931 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  font-weight: 800;
  color: #fff;
  border: 4px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.winner-label {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #FDB931, #FFD700);
  color: #8a6e00;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 10px;
  border: 2px solid #fff;
  white-space: nowrap;
}

.champion-name {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 16px 0;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.champion-stats {
  display: flex;
  gap: 12px;
}

.stat-pill {
  background: rgba(0, 0, 0, 0.3);
  padding: 6px 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
}

.stat-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.text-gold { color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }

.stat-value {
  font-size: 18px;
  font-weight: bold;
}

/* Rank List */
.section-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  padding-left: 8px;
  color: rgba(255, 255, 255, 0.9);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.rank-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.rank-number {
  font-size: 18px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.3);
  width: 24px;
  margin-right: 12px;
}

.rank-1 .rank-number { color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
.rank-2 .rank-number { color: #E0E0E0; }
.rank-3 .rank-number { color: #CD7F32; }

.player-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-avatar-mini {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #fff;
  flex-shrink: 0;
}

.avatar-rank-1 { background: linear-gradient(135deg, #FFD700, #FDB931); color: #8a6e00; }
.avatar-rank-2 { background: linear-gradient(135deg, #E0E0E0, #BDBDBD); color: #555; }
.avatar-rank-3 { background: linear-gradient(135deg, #CD7F32, #A16B47); color: #5a3a29; }

.player-text {
  display: flex;
  flex-direction: column;
}

.player-name {
  font-weight: bold;
  font-size: 16px;
  color: #fff;
}

.player-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.player-score {
  font-size: 18px;
  font-weight: 800;
}

.text-success { color: #4ade80; }
.text-danger { color: #f87171; }
.text-muted { color: rgba(255, 255, 255, 0.4); }

/* Details Section */
.glass-collapse {
  background: transparent !important;
}

:deep(.van-collapse-item__content) {
  background: transparent !important;
  padding: 16px 0 !important;
}

:deep(.van-cell) {
  background: var(--bg-card) !important;
  color: #fff !important;
  border-radius: 12px;
  margin-bottom: 0;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

:deep(.van-cell__title) {
  color: #fff;
}

:deep(.van-cell__right-icon) {
  color: rgba(255, 255, 255, 0.5);
}

.collapse-title {
  font-weight: bold;
  font-size: 16px;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.player-detail-card {
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-name {
  font-weight: bold;
  font-size: 14px;
}

.detail-rank-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.detail-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.d-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.d-label { color: rgba(255, 255, 255, 0.5); }
.d-value { font-weight: bold; }

/* Rounds List */
.rounds-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.round-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
}

.round-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.round-idx {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.round-desc {
  display: flex;
  flex-direction: column;
}

.round-winner {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
}

.round-tags {
  display: flex;
  gap: 4px;
  margin-top: 2px;
}

.mini-tag {
  font-size: 10px;
  background: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  padding: 1px 4px;
  border-radius: 4px;
}

.round-score-text {
  font-weight: bold;
  color: #4ade80;
}

/* Buttons */
.action-buttons {
  margin-top: 32px;
}

.btn-block {
  width: 100%;
  display: flex;
}

.btn-lg {
  height: 56px;
  font-size: 18px;
  border-radius: 28px;
}

.icon {
  margin-right: 8px;
}
</style>
