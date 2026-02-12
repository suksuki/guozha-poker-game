<template>
  <div class="team-mcts-training-panel">

    <div class="training-content">
      <!-- 训练配置 -->
      <van-cell-group title="训练配置">
        <van-field
          v-model.number="trainingConfig.gamesPerConfig"
          label="每配置游戏数"
          type="number"
          placeholder="10"
        />
        <van-field
          v-model.number="trainingConfig.iterations"
          label="MCTS迭代次数"
          type="number"
          placeholder="100"
        />
        <van-switch
          v-model="trainingConfig.selfPlay"
          label="自对弈训练（所有AI使用相同配置）"
        />
        <van-switch
          v-model="trainingConfig.autoSaveBestConfig"
          label="训练完成后自动保存最佳配置"
        />
      </van-cell-group>

      <!-- 参数搜索范围 -->
      <van-cell-group title="参数搜索范围">
        <van-field
          v-model.number="paramRange.cooperationWeight.min"
          label="团队配合权重（最小）"
          type="number"
        />
        <van-field
          v-model.number="paramRange.cooperationWeight.max"
          label="团队配合权重（最大）"
          type="number"
        />
        <van-field
          v-model.number="paramRange.strategicPassWeight.min"
          label="主动要不起权重（最小）"
          type="number"
        />
        <van-field
          v-model.number="paramRange.strategicPassWeight.max"
          label="主动要不起权重（最大）"
          type="number"
        />
        <van-field
          v-model.number="paramRange.roleWeight.min"
          label="角色定位权重（最小）"
          type="number"
        />
        <van-field
          v-model.number="paramRange.roleWeight.max"
          label="角色定位权重（最大）"
          type="number"
        />
      </van-cell-group>

      <!-- 训练控制 -->
      <div class="training-controls">
        <van-button
          type="primary"
          size="large"
          block
          :loading="isTraining"
          :disabled="isTraining"
          @click="startTraining"
        >
          {{ isTraining ? '训练中...' : '开始训练' }}
        </van-button>

        <div v-if="isTraining" class="training-controls-row">
          <van-button
            type="warning"
            size="large"
            :style="{ flex: 1, marginRight: '8px' }"
            @click="pauseTraining"
          >
            {{ isPaused ? '继续训练' : '暂停训练' }}
          </van-button>

          <van-button
            type="danger"
            size="large"
            :style="{ flex: 1 }"
            @click="stopTraining"
          >
            停止训练
          </van-button>
        </div>
      </div>

      <!-- 训练进度 - 始终显示，即使训练未开始也显示初始状态 -->
      <div class="training-progress" :class="{ 'training-active': isTraining }">
        <div class="progress-header">
          <h3>训练进度</h3>
          <span class="progress-percentage">{{ progressPercentage }}%</span>
        </div>
        <van-progress
          :percentage="progressPercentage"
          :show-pivot="true"
          :pivot-text="`${progress.currentGame}/${progress.totalGames}`"
          :stroke-width="12"
        />
        <div class="progress-info">
          <div class="progress-item">
            <span class="progress-label">当前游戏:</span>
            <span class="progress-value">{{ progress.currentGame }} / {{ progress.totalGames }}</span>
          </div>
          <div class="progress-item">
            <span class="progress-label">当前配置:</span>
            <span class="progress-value">{{ progress.currentConfig }} / {{ progress.totalConfigs }}</span>
          </div>
          <div v-if="progress.bestConfig" class="progress-item">
            <span class="progress-label">最佳配置得分:</span>
            <span class="progress-value highlight">{{ progress.bestScore.toFixed(3) }}</span>
          </div>
        </div>
      </div>

      <!-- 训练指标 -->
      <div v-if="progress.metrics && progress.metrics.totalGames > 0" class="training-metrics">
        <van-cell-group title="训练指标">
          <van-cell title="团队胜率" :value="(progress.metrics.teamWinRate * 100).toFixed(1) + '%'" />
          <van-cell title="平均团队得分" :value="progress.metrics.avgTeamScore.toFixed(1)" />
          <van-cell
            title="平均主动要不起/局"
            :value="progress.metrics.avgStrategicPassPerGame.toFixed(2)"
          />
          <van-cell
            title="主动要不起成功率"
            :value="(progress.metrics.strategicPassSuccessRate * 100).toFixed(1) + '%'"
          />
          <van-cell
            title="平均团队配合得分"
            :value="progress.metrics.avgCooperationScore.toFixed(1)"
          />
          <van-cell title="平均回合数" :value="progress.metrics.avgTurns.toFixed(1)" />
          <van-cell title="平均轮次数" :value="progress.metrics.avgRounds.toFixed(1)" />
        </van-cell-group>
      </div>

      <!-- 最佳配置 -->
      <div v-if="progress.bestConfig" class="best-config">
        <van-cell-group title="最佳配置">
          <van-cell
            title="团队配合权重"
            :value="progress.bestConfig.cooperationWeight?.toFixed(2)"
          />
          <van-cell
            title="主动要不起权重"
            :value="progress.bestConfig.strategicPassWeight?.toFixed(2)"
          />
          <van-cell
            title="角色定位权重"
            :value="progress.bestConfig.roleWeight?.toFixed(2)"
          />
          <van-button
            type="success"
            size="large"
            block
            @click="saveBestConfig"
          >
            保存最佳配置
          </van-button>
        </van-cell-group>
      </div>

      <!-- 训练日志 -->
      <div class="training-logs">
        <van-cell-group title="训练日志">
          <div class="log-container">
            <div
              v-for="(log, index) in logs"
              :key="index"
              :class="['log-item', `log-${log.type}`]"
            >
              {{ log.message }}
            </div>
          </div>
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { TeamMCTSTrainer, TrainingProgress } from '@/core/training/teamMCTSTraining/TeamMCTSTrainer';
import { MCTSTeamConfig } from '@/core/ai/types';
import { TeamConfig } from '@/core/types/team';
import { AIConfigStore } from '@/core/ai/config/AIConfigStore';

const emit = defineEmits(['close']);

// 训练状态
const isTraining = ref(false);
const isPaused = ref(false);
const trainer = ref<TeamMCTSTrainer | null>(null);

// 训练配置
const trainingConfig = ref({
  gamesPerConfig: 10,
  iterations: 100,
  selfPlay: true,
  autoSaveBestConfig: true // 训练完成后自动保存最佳配置
});

// 参数搜索范围
const paramRange = ref({
  cooperationWeight: { min: 0.5, max: 2.0 },
  strategicPassWeight: { min: 0.5, max: 2.0 },
  roleWeight: { min: 0.5, max: 2.0 }
});

// 训练进度
const progress = ref<TrainingProgress>({
  currentGame: 0,
  totalGames: 0,
  currentConfig: 0,
  totalConfigs: 0,
  metrics: {
    totalGames: 0,
    teamWinRate: 0,
    avgTeamScore: 0,
    avgStrategicPassPerGame: 0,
    strategicPassSuccessRate: 0,
    avgCooperationScore: 0,
    avgTurns: 0,
    avgRounds: 0
  },
  bestScore: -Infinity
});

const progressPercentage = computed(() => {
  if (progress.value.totalGames === 0) return 0;
  return Math.round((progress.value.currentGame / progress.value.totalGames) * 100);
});

// 训练日志
const logs = ref<Array<{ type: 'info' | 'success' | 'warning' | 'error'; message: string }>>([]);

const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  // 完全禁用日志输出，避免页面卡顿
  // requestAnimationFrame(() => {
  //   logs.value.push({ type, message });
  //   // 限制日志数量，减少到30条以避免页面卡顿
  //   if (logs.value.length > 30) {
  //     logs.value.shift();
  //   }
  // });
};

// 开始训练
const startTraining = async () => {
  if (isTraining.value) return;

  isTraining.value = true;
  isPaused.value = false;
  logs.value = [];
  // addLog('🚀 开始团队MCTS训练...', 'info');

  try {
    // addLog('📋 加载配置...', 'info');
    // 加载基础配置
    const baseConfig = AIConfigStore.loadConfig(true) as Partial<MCTSTeamConfig>;

    // 创建团队配置
    const teamConfig: TeamConfig = {

      teams: [
        { id: 0, name: '团队A', players: [0, 2], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 },
        { id: 1, name: '团队B', players: [1, 3], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 }
      ],
      playerCount: 4,
      humanPlayerTeam: 0,
      humanPlayerDirection: 'south' as any
    };

    // 生成参数变体
    // addLog('🔧 生成参数变体...', 'info');
    const configs = generateConfigVariants(baseConfig);

    // addLog(`📊 生成了 ${configs.length} 个参数配置`, 'info');
    // addLog(`🎮 每个配置将运行 ${trainingConfig.value.gamesPerConfig} 局游戏`, 'info');

    // 创建训练器
    // addLog('🤖 创建训练器...', 'info');
    trainer.value = new TeamMCTSTrainer();

    // 开始训练
    // addLog('▶️ 开始训练循环...', 'info');
    const results = await trainer.value.trainConfigs(
      configs,
      trainingConfig.value.gamesPerConfig,
      teamConfig,
      (prog) => {
        if (!isPaused.value) {
          // 使用 requestAnimationFrame 来异步更新，避免阻塞主线程
          requestAnimationFrame(() => {
            progress.value = prog;
            // 完全禁用进度日志
            // if (prog.currentGame % 100 === 0 || prog.currentGame === prog.totalGames || prog.currentConfig !== progress.value.currentConfig) {
            //   addLog(
            //     `📈 进度: ${prog.currentGame}/${prog.totalGames} (配置 ${prog.currentConfig}/${prog.totalConfigs})`,
            //     'info'
            //   );
            // }
          });
        }
      }
    );

    // 找到最佳配置
    let bestConfig: MCTSTeamConfig | undefined;
    let bestScore = -Infinity;

    for (const [config, metrics] of results.entries()) {
      const score = evaluateConfig(metrics);
      if (score > bestScore) {
        bestScore = score;
        bestConfig = config;
      }
    }

    if (bestConfig) {
      progress.value.bestConfig = bestConfig;
      progress.value.bestScore = bestScore;
      // addLog(`✅ 训练完成！最佳配置得分: ${bestScore.toFixed(3)}`, 'success');
      // addLog(
      //   `最佳参数: 配合=${bestConfig.cooperationWeight?.toFixed(2)}, 要不起=${bestConfig.strategicPassWeight?.toFixed(2)}, 角色=${bestConfig.roleWeight?.toFixed(2)}`,
      //   'success'
      // );
      
      // 如果启用了自动保存，自动保存最佳配置
      if (trainingConfig.value.autoSaveBestConfig) {
        try {
          TeamMCTSTrainer.saveBestConfig(bestConfig);
          // addLog('💾 最佳配置已自动保存', 'success');
        } catch (error: any) {
          // addLog(`⚠️ 自动保存失败: ${error.message || error}`, 'warning');
          // addLog('💡 您可以手动点击"保存最佳配置"按钮', 'info');
        }
      } else {
        // addLog('💡 请点击"保存最佳配置"按钮以应用最佳参数', 'info');
      }
    }

    isTraining.value = false;
  } catch (error: any) {
    // console.error('训练出错:', error);
    // addLog(`❌ 训练出错: ${error.message || error}`, 'error');
    // if (error.stack) {
    //   addLog(`堆栈: ${error.stack}`, 'error');
    // }
    isTraining.value = false;
  }
};

// 生成参数变体
const generateConfigVariants = (baseConfig: Partial<MCTSTeamConfig>): MCTSTeamConfig[] => {
  const variants: MCTSTeamConfig[] = [];
  const range = paramRange.value;

  // 生成参数组合（简化版：每个参数取3个值）
  const cooperationWeights = [
    range.cooperationWeight.min,
    (range.cooperationWeight.min + range.cooperationWeight.max) / 2,
    range.cooperationWeight.max
  ];
  const strategicPassWeights = [
    range.strategicPassWeight.min,
    (range.strategicPassWeight.min + range.strategicPassWeight.max) / 2,
    range.strategicPassWeight.max
  ];
  const roleWeights = [
    range.roleWeight.min,
    (range.roleWeight.min + range.roleWeight.max) / 2,
    range.roleWeight.max
  ];

  for (const cw of cooperationWeights) {
    for (const spw of strategicPassWeights) {
      for (const rw of roleWeights) {
        variants.push({
          ...baseConfig,
          teamMode: true,
          strategicPassEnabled: true,
          cooperationWeight: cw,
          strategicPassWeight: spw,
          roleWeight: rw,
          iterations: trainingConfig.value.iterations,
          teamConfig: {

            teams: [
              { id: 0, name: '团队A', players: [0, 2], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 },
              { id: 1, name: '团队B', players: [1, 3], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 }
            ],
            playerCount: 4,
            humanPlayerTeam: 0,
            humanPlayerDirection: 'south' as any
          }
        } as MCTSTeamConfig);
      }
    }
  }

  return variants;
};

// 评估配置
const evaluateConfig = (metrics: TrainingProgress['metrics']): number => {
  let score = 0;
  score += metrics.teamWinRate * 0.4;
  const normalizedScore = Math.min(1, metrics.avgTeamScore / 200);
  score += normalizedScore * 0.3;
  score += metrics.strategicPassSuccessRate * 0.15;
  const normalizedCooperation = Math.min(1, metrics.avgCooperationScore / 100);
  score += normalizedCooperation * 0.1;
  const efficiency = 1 / (1 + metrics.avgTurns / 100);
  score += efficiency * 0.05;
  return score;
};

// 暂停训练
const pauseTraining = () => {
  isPaused.value = !isPaused.value;
  addLog(isPaused.value ? '⏸️ 训练已暂停' : '▶️ 训练已继续', 'warning');
};

// 停止训练
const stopTraining = () => {
  if (trainer.value) {
    trainer.value.stop();
  }
  isTraining.value = false;
  isPaused.value = false;
  addLog('🛑 训练已停止', 'warning');
};

// 保存最佳配置
const saveBestConfig = () => {
  if (progress.value.bestConfig) {
    TeamMCTSTrainer.saveBestConfig(progress.value.bestConfig);
    addLog('💾 最佳配置已保存', 'success');
  }
};
</script>

<style scoped>
.team-mcts-training-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}

.training-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background-image: 
    radial-gradient(circle at 10% 20%, rgba(0, 198, 255, 0.1) 0%, transparent 20%),
    radial-gradient(circle at 90% 80%, rgba(255, 0, 85, 0.1) 0%, transparent 20%);
}

.training-controls {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Buttons */
:deep(.van-button--primary) {
  background: linear-gradient(135deg, var(--evo-neon-blue), var(--evo-neon-purple));
  border: none;
  box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3);
}

:deep(.van-button--warning) {
  background: rgba(251, 191, 36, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(251, 191, 36, 0.5);
}

:deep(.van-button--danger) {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

:deep(.van-button--success) {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.5);
}

.training-progress {
  margin-top: 24px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-info {
  margin-top: 16px;
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: 'Roboto Mono', monospace;
}

.training-metrics {
  margin-top: 24px;
}

.best-config {
  margin-top: 24px;
}

.training-logs {
  margin-top: 24px;
}

/* Cell Groups */
:deep(.van-cell-group), :deep(.van-cell) {
  background: transparent;
}

:deep(.van-cell-group__title) {
  color: var(--evo-neon-blue);
  padding-left: 4px;
  margin-bottom: 8px;
}

:deep(.van-cell) {
  color: var(--text-primary);
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 1px;
}

:deep(.van-cell:first-child) {
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

:deep(.van-cell:last-child) {
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

:deep(.van-cell__value) {
  color: var(--evo-neon-blue);
  font-family: 'Roboto Mono', monospace;
  font-weight: bold;
}

:deep(.van-cell::after) {
  border-bottom: none;
}

:deep(.van-hairline--top-bottom::after) {
  border-width: 0;
}

/* Fields */
:deep(.van-field__label) {
  color: var(--text-primary);
}

:deep(.van-field__control) {
  color: var(--text-primary);
}

:deep(.van-field) {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 8px;
}

/* Switch */
:deep(.van-switch__node) {
  background: var(--evo-neon-blue);
}

:deep(.van-switch--on) {
  background-color: var(--evo-neon-blue);
}

.training-logs {
  margin-top: 20px;
}

.log-container {
  max-height: 200px; /* 减少高度，避免占用太多空间 */
  overflow-y: auto;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: 'Roboto Mono', monospace;
  /* 优化滚动性能 */
  will-change: scroll-position;
  contain: layout style paint;
}

/* 当训练未开始时，进度条显示为灰色 */
.training-progress:not(.training-active) {
  opacity: 0.5;
}

.training-progress.training-active {
  opacity: 1;
  border-color: var(--evo-neon-blue);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

.log-item {
  padding: 6px 0;
  font-size: 12px;
  line-height: 1.6;
}

.log-info {
  color: var(--text-secondary);
}

.log-success {
  color: #86efac;
}

.log-warning {
  color: #fbbf24;
}

.log-error {
  color: #f87171;
}

/* Training Controls */
.training-controls {
  margin-bottom: 20px; /* 确保有足够的下边距 */
  position: relative;
  z-index: 10;
}

.training-controls-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* Progress Bar */
.training-progress {
  margin-top: 20px;
  margin-bottom: 20px; /* 确保有足够的下边距 */
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  /* 确保进度条区域始终可见 */
  position: relative;
  z-index: 10;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.progress-percentage {
  font-size: 18px;
  font-weight: bold;
  color: var(--evo-neon-blue);
  font-family: 'Roboto Mono', monospace;
}

.progress-info {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.progress-item:last-child {
  border-bottom: none;
}

.progress-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.progress-value {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  font-family: 'Roboto Mono', monospace;
}

.progress-value.highlight {
  color: var(--evo-neon-blue);
  font-weight: 600;
}

:deep(.van-progress) {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  height: 12px;
}

:deep(.van-progress__portion) {
  background: linear-gradient(90deg, var(--evo-neon-blue), var(--evo-neon-purple));
  border-radius: 8px;
}

:deep(.van-progress__pivot) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.2);
  font-family: 'Roboto Mono', monospace;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}
</style>

