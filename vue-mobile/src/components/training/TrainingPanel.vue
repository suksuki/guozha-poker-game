<template>
  <div class="training-panel">
    <van-nav-bar
      :title="$t('training.title')"
      left-arrow
      @click-left="$emit('close')"
    />
    
    <div class="training-content">
      <!-- 训练类型选择 -->
      <van-tabs v-model:active="activeTab" @change="onTabChange">
        <van-tab :title="$t('training.decisionTraining')" name="decision">
          <DecisionTrainingPanel
            :config="decisionConfig"
            @update:config="decisionConfig = $event"
          />
        </van-tab>
        <van-tab :title="$t('training.chatTraining')" name="chat">
          <ChatTrainingPanel
            :config="chatConfig"
            @update:config="chatConfig = $event"
          />
        </van-tab>
        <van-tab :title="$t('training.hybridTraining')" name="hybrid">
          <HybridTrainingPanel
            :config="hybridConfig"
            @update:config="hybridConfig = $event"
          />
        </van-tab>
      </van-tabs>
      
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
          {{ isTraining ? $t('training.training') : $t('training.startTraining') }}
        </van-button>
        
        <van-button
          v-if="isTraining"
          type="warning"
          size="large"
          block
          @click="pauseTraining"
        >
          {{ isPaused ? $t('training.resumeTraining') : $t('training.pauseTraining') }}
        </van-button>
        
        <van-button
          v-if="isTraining"
          type="danger"
          size="large"
          block
          @click="stopTraining"
        >
          {{ $t('training.stopTraining') }}
        </van-button>
      </div>
      
      <!-- 训练进度 -->
      <div v-if="isTraining || progress.currentRound > 0" class="training-progress">
        <van-progress
          :percentage="progress.percentage"
          :show-pivot="true"
          :pivot-text="`${progress.currentRound}/${progress.totalRounds}`"
        />
        <div class="progress-info">
          <div>{{ $t('training.currentRound') }}: {{ progress.currentRound }} / {{ progress.totalRounds }}</div>
          <div>{{ $t('training.elapsedTime') }}: {{ formatTime(progress.elapsedTime) }}</div>
          <div v-if="progress.estimatedTimeRemaining">
            {{ $t('training.estimatedTimeRemaining') }}: {{ formatTime(progress.estimatedTimeRemaining) }}
          </div>
        </div>
      </div>
      
      <!-- 训练指标 -->
      <div v-if="metrics.totalRounds > 0" class="training-metrics">
        <van-cell-group :title="$t('training.metrics')">
          <van-cell :title="$t('training.totalRounds')" :value="metrics.totalRounds" />
          <van-cell :title="$t('training.totalGames')" :value="metrics.totalGames" />
          <van-cell :title="$t('training.totalDecisions')" :value="metrics.totalDecisions" />
          <van-cell :title="$t('training.totalChats')" :value="metrics.totalChats" />
          
          <van-cell
            v-if="metrics.decisionMetrics"
            :title="$t('training.avgDecisionQuality')"
            :value="(metrics.decisionMetrics.avgQuality * 100).toFixed(1) + '%'"
          />
          <van-cell
            v-if="metrics.decisionMetrics"
            :title="$t('training.winRate')"
            :value="(metrics.decisionMetrics.winRate * 100).toFixed(1) + '%'"
          />
          <van-cell
            v-if="metrics.chatMetrics"
            :title="$t('training.avgChatQuality')"
            :value="(metrics.chatMetrics.avgQuality * 100).toFixed(1) + '%'"
          />
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '../../i18n/composable';
import { TrainingController } from '../../../../src/training/core/TrainingController';
import { TrainingConfig, TrainingProgress, TrainingMetrics } from '../../../../src/types/training';
import DecisionTrainingPanel from './DecisionTrainingPanel.vue';
import ChatTrainingPanel from './ChatTrainingPanel.vue';
import HybridTrainingPanel from './HybridTrainingPanel.vue';

const { t } = useI18n();

const emit = defineEmits<{
  close: [];
}>();

const activeTab = ref('decision');
const isTraining = ref(false);
const isPaused = ref(false);
const progress = ref<TrainingProgress>({
  currentRound: 0,
  totalRounds: 0,
  percentage: 0,
  elapsedTime: 0,
  status: 'idle'
});
const metrics = ref<TrainingMetrics>({
  totalRounds: 0,
  totalGames: 0,
  totalDecisions: 0,
  totalChats: 0,
  performance: {
    avgGameTime: 0,
    avgDecisionTime: 0,
    avgChatTime: 0
  }
});

const decisionConfig = ref<Partial<TrainingConfig>>({
  type: 'decision',
  rounds: 10,
  batchSize: 5,
  fastMode: {
    enabled: true,
    speedMultiplier: 10,
    skipUI: true,
    skipTTS: true
  }
});

const chatConfig = ref<Partial<TrainingConfig>>({
  type: 'chat',
  rounds: 10,
  batchSize: 5,
  fastMode: {
    enabled: true,
    speedMultiplier: 10,
    skipUI: true,
    skipTTS: true
  }
});

const hybridConfig = ref<Partial<TrainingConfig>>({
  type: 'hybrid',
  rounds: 10,
  batchSize: 5,
  fastMode: {
    enabled: true,
    speedMultiplier: 10,
    skipUI: true,
    skipTTS: true
  }
});

let controller: TrainingController | null = null;
let progressTimer: NodeJS.Timeout | null = null;

onMounted(() => {
  controller = new TrainingController();
  startProgressTimer();
});

onUnmounted(() => {
  stopProgressTimer();
  if (controller) {
    controller.stopTraining();
  }
});

const startProgressTimer = () => {
  progressTimer = setInterval(() => {
    if (controller) {
      progress.value = controller.getProgress();
      metrics.value = controller.getMetrics();
    }
  }, 1000);
};

const stopProgressTimer = () => {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
};

const onTabChange = (name: string) => {
  // 切换标签时更新配置
};

const startTraining = async () => {
  if (!controller) return;
  
  const config = getCurrentConfig();
  if (!config) {
    console.error('配置无效');
    return;
  }
  
  isTraining.value = true;
  isPaused.value = false;
  
  try {
    await controller.startTraining(config as TrainingConfig);
    isTraining.value = false;
  } catch (error) {
    console.error('训练失败:', error);
    isTraining.value = false;
  }
};

const pauseTraining = async () => {
  if (!controller) return;
  
  if (isPaused.value) {
    await controller.resumeTraining();
    isPaused.value = false;
  } else {
    controller.pauseTraining();
    isPaused.value = true;
  }
};

const stopTraining = () => {
  if (!controller) return;
  
  controller.stopTraining();
  isTraining.value = false;
  isPaused.value = false;
};

const getCurrentConfig = (): Partial<TrainingConfig> | null => {
  switch (activeTab.value) {
    case 'decision':
      return decisionConfig.value;
    case 'chat':
      return chatConfig.value;
    case 'hybrid':
      return hybridConfig.value;
    default:
      return null;
  }
};

const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
};
</script>

<style scoped>
.training-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f5f5f5;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.training-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.training-controls {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.training-progress {
  margin-top: 24px;
  padding: 16px;
  background: white;
  border-radius: 8px;
}

.progress-info {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.training-metrics {
  margin-top: 24px;
}
</style>

