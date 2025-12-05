<template>
  <div class="player-info" :class="{ active: isPlayerTurn }">
    <div class="avatar-container">
      <!-- 名次徽章 -->
      <van-tag
        v-if="playerRank"
        class="rank-badge"
        :type="rankType"
        size="large"
      >
        {{ rankText }}
      </van-tag>
      
      <!-- 头像 -->
      <div class="avatar">
        <span class="avatar-emoji">{{ avatarEmoji }}</span>
      </div>
      
      <!-- 玩家名称 -->
      <div class="player-name">{{ player.name }}</div>
    </div>
    
    <!-- 状态面板 -->
    <div class="status-panel">
      <!-- 个人分数 -->
      <div class="status-card personal-score">
        <div class="status-title">个人</div>
        <div class="status-content">
          <span>手牌: {{ pickedScore }}</span>
          <span>墩: {{ dunScore }}</span>
          <span>总: {{ totalScore }}</span>
        </div>
        <div class="status-extra">墩数: {{ dunCount }}</div>
      </div>
      
      <!-- 团队分数 -->
      <div v-if="showTeamInfo" class="status-card team-score">
        <div class="status-title">团队</div>
        <div class="status-content">
          <span>总分: {{ teamScore }}</span>
          <span>总墩: {{ teamDunCount }}</span>
        </div>
      </div>
      
      <!-- 手牌数量 -->
      <van-cell title="手牌" :value="`${player.hand.length} 张`" />
      
      <!-- 回合提示 -->
      <van-notice-bar
        v-if="isPlayerTurn"
        text="你的回合"
        color="#1989fa"
        background="#ecf9ff"
        left-icon="volume-o"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Player } from '../../../src/types/card';
import { TeamConfig } from '../../../src/types/team';
import {
  calculatePlayerPickedScore,
  calculatePlayerDunScore,
  calculateTeamScore,
  calculateTeamDunCount
} from '../../../src/utils/teamScoring';
import { getPlayerTeamId } from '../../../src/utils/teamManager';
import { Tag, Cell, NoticeBar } from 'vant';

interface Props {
  player: Player;
  isPlayerTurn: boolean;
  teamConfig?: TeamConfig | null;
  allPlayers?: Player[];
}

const props = withDefaults(defineProps<Props>(), {
  teamConfig: null,
  allPlayers: () => []
});

// 头像
const avatarEmoji = computed(() => '🐱');

// 分数计算
const pickedScore = computed(() => calculatePlayerPickedScore(props.player));
const dunScore = computed(() => 
  props.allPlayers.length > 0 
    ? calculatePlayerDunScore(props.player, props.allPlayers) 
    : 0
);
const totalScore = computed(() => pickedScore.value + dunScore.value);
const dunCount = computed(() => props.player.dunCount || 0);

// 团队信息
const teamId = computed(() => 
  props.teamConfig 
    ? getPlayerTeamId(props.player.id, props.teamConfig) 
    : null
);

const showTeamInfo = computed(() => 
  teamId.value !== null && props.teamConfig && props.allPlayers.length > 0
);

const teamScore = computed(() => 
  showTeamInfo.value && props.teamConfig
    ? calculateTeamScore(teamId.value!, props.allPlayers, props.teamConfig)
    : 0
);

const teamDunCount = computed(() =>
  showTeamInfo.value && props.teamConfig
    ? calculateTeamDunCount(teamId.value!, props.allPlayers, props.teamConfig)
    : 0
);

// 名次
const playerRank = computed(() => props.player.finishedRank ?? null);

const rankType = computed(() => {
  if (playerRank.value === 1) return 'success';
  if (playerRank.value === 2) return 'warning';
  return 'default';
});

const rankText = computed(() => {
  if (playerRank.value === 1) return '🏆 第1名';
  if (playerRank.value === 2) return '🥈 第2名';
  return `第${playerRank.value}名`;
});
</script>

<style scoped>
.player-info {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s;
}

.player-info.active {
  box-shadow: 0 0 20px rgba(25, 137, 250, 0.3);
  border: 2px solid #1989fa;
}

.avatar-container {
  text-align: center;
  margin-bottom: 16px;
  position: relative;
}

.rank-badge {
  position: absolute;
  top: -10px;
  right: 50%;
  transform: translateX(50%);
  z-index: 1;
}

.avatar {
  width: 80px;
  height: 80px;
  margin: 0 auto 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-emoji {
  font-size: 40px;
}

.player-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-card {
  padding: 12px;
  border-radius: 8px;
  color: white;
}

.personal-score {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.team-score {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.status-title {
  font-size: 12px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.status-content {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: bold;
}

.status-extra {
  font-size: 12px;
  opacity: 0.9;
  margin-top: 4px;
}
</style>

