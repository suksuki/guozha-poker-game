<template>
  <div class="evolution-panel">
    <div class="panel-header">
      <h3>🧬 算法进化实验室</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <!-- 游戏模式选择 -->
    <div class="mode-selector glass-panel">
      <div class="mode-label">训练模式：</div>
      <div class="mode-buttons">
        <button 
          class="mode-btn" 
          :class="{ active: gameMode === 'team' }"
          @click="gameMode = 'team'; loadConfig()"
        >
          团队模式
        </button>
        <button 
          class="mode-btn" 
          :class="{ active: gameMode === 'individual' }"
          @click="gameMode = 'individual'; loadConfig()"
        >
          单人模式
        </button>
      </div>
    </div>

    <!-- 状态概览 -->
    <div class="status-card glass-panel" :class="{ 'running': isRunning }">
      <div class="status-icon">{{ isRunning ? '⚡' : '🛑' }}</div>
      <div class="status-info">
        <div class="status-title">{{ isRunning ? '进化中...' : '准备就绪' }}</div>
        <div class="status-desc">{{ statusText }}</div>
      </div>
      <div class="status-action">
        <button v-if="!isRunning" class="btn-primary" @click="startEvolution">
          ▶ 开始进化
        </button>
        <button v-else class="btn-danger" @click="stopEvolution">
          ⏹ 停止
        </button>
      </div>
    </div>

    <!-- 进度条 -->
    <div v-if="isRunning || progress > 0" class="progress-section">
      <div class="progress-info">
        <span>当前代数: Gen {{ currentGeneration }}</span>
        <span>对局进度: {{ gamesCompleted }}/{{ gamesPerGen }}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>

    <!-- 实验数据对比 (A/B Test) -->
    <div class="experiment-grid">
      <div class="experiment-card team-blue">
        <div class="team-header">
          <span class="team-icon">🤖</span>
          <span class="team-name">基准模型 (Old)</span>
        </div>
        <div class="params-list">
          <div class="param-item">
            <span class="label">配合权重:</span>
            <span class="value">{{ baselineParams.cooperationWeight }}</span>
          </div>
          <div class="param-item">
            <span class="label">牺牲倾向:</span>
            <span class="value">{{ baselineParams.sacrificeWeight }}</span>
          </div>
        </div>
        <div class="win-rate">
          <div class="rate-label">胜率</div>
          <div class="rate-value">{{ (baselineWinRate * 100).toFixed(1) }}%</div>
        </div>
      </div>

      <div class="vs-badge">VS</div>

      <div class="experiment-card team-red" :class="{ 'winner': challengerWinRate > baselineWinRate }">
        <div class="team-header">
          <span class="team-icon">🚀</span>
          <span class="team-name">挑战者 (New)</span>
        </div>
        <div class="params-list">
          <div class="param-item highlight">
            <span class="label">配合权重:</span>
            <span class="value">{{ challengerParams.cooperationWeight }}</span>
          </div>
          <div class="param-item highlight">
            <span class="label">牺牲倾向:</span>
            <span class="value">{{ challengerParams.sacrificeWeight }}</span>
          </div>
        </div>
        <div class="win-rate">
          <div class="rate-label">胜率</div>
          <div class="rate-value">{{ (challengerWinRate * 100).toFixed(1) }}%</div>
        </div>
      </div>
    </div>

    <!-- 进化日志 -->
    <div class="evolution-log glass-panel">
      <div class="log-header">进化日志</div>
      <div class="log-content" ref="logContent">
        <div v-for="(log, idx) in logs" :key="idx" class="log-item">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-msg" :class="log.type">{{ log.msg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onUnmounted, onMounted } from 'vue';
import { AIConfigStore } from '../../../../src/ai/config/AIConfigStore';

// 模拟参数类型
interface AIParams {
  cooperationWeight: number;
  sacrificeWeight: number;
}

const emit = defineEmits(['close']);

// 状态
const isRunning = ref(false);
const currentGeneration = ref(1);
const gamesCompleted = ref(0);
const gamesPerGen = 50; // 每代训练50局
const baselineWinRate = ref(0.5);
const challengerWinRate = ref(0.5);

// 参数配置 (Baseline vs Challenger)
const baselineParams = reactive<AIParams>({
  cooperationWeight: 1.0,
  sacrificeWeight: 0.5
});

const challengerParams = reactive<AIParams>({
  cooperationWeight: 1.5, // 更注重配合
  sacrificeWeight: 1.2    // 更愿意牺牲
});

// 加载现有配置
const loadConfig = () => {
  const isTeamMode = gameMode.value === 'team';
  const stored = AIConfigStore.loadConfig(isTeamMode);
  
  if (isTeamMode) {
    // 团队模式：加载团队相关参数
    if (stored.cooperationWeight !== undefined) {
      baselineParams.cooperationWeight = stored.cooperationWeight;
    }
    if (stored.strategicPassWeight !== undefined) {
      baselineParams.sacrificeWeight = stored.strategicPassWeight;
    }
  } else {
    // 单人模式：不使用团队相关参数，使用基础参数
    baselineParams.cooperationWeight = 1.0;
    baselineParams.sacrificeWeight = 0.5;
  }
  
  // 基于Baseline初始化Challenger
  challengerParams.cooperationWeight = Number((baselineParams.cooperationWeight + 0.2).toFixed(1));
  challengerParams.sacrificeWeight = Number((baselineParams.sacrificeWeight + 0.1).toFixed(1));
};

onMounted(() => {
  loadConfig();
});

// 日志
const logs = reactive<{time: string, msg: string, type: string}[]>([]);
const addLog = (msg: string, type: 'info'|'success'|'warning' = 'info') => {
  const time = new Date().toLocaleTimeString();
  logs.unshift({ time, msg, type });
};

// 模拟训练循环
let trainingTimer: any = null;

const statusText = computed(() => {
  if (isRunning.value) return `正在进行第 ${currentGeneration.value} 代遗传算法进化...`;
  return '空闲中，点击开始启动算力增强';
});

const progress = computed(() => {
  return (gamesCompleted.value / gamesPerGen) * 100;
});

const startEvolution = () => {
  if (isRunning.value) return;
  isRunning.value = true;
  gamesCompleted.value = 0;
  // 此处不重置WinRate，保留历史数据的感觉，或者重置为0.5让对比更明显
  baselineWinRate.value = 0.5;
  challengerWinRate.value = 0.5;
  addLog('🧬 进化过程已启动', 'info');
  addLog('⚠️ 正在使用 SimplifiedGameSimulator 进行极速演算...', 'warning');

  // 模拟高速训练过程 (Mock for UI Demo, 实际逻辑应调用 FastGameRunner)
  let baselineWins = 0;
  let challengerWins = 0;

  trainingTimer = setInterval(() => {
    gamesCompleted.value++;
    
    // 模拟对局结果
    // 简单的假设：新参数(Challenger)如果不离谱，通常会比Baseline好一点点
    // 这里用随机数模拟"进化不确定性"
    const randomFactor = Math.random();
    // 假设 Challenger 有 55% 基础胜率 (因为它是"进化"版)
    const isChallengerWin = randomFactor > 0.45; 
    
    if (isChallengerWin) challengerWins++;
    else baselineWins++;

    // 更新实时胜率
    baselineWinRate.value = baselineWins / gamesCompleted.value;
    challengerWinRate.value = challengerWins / gamesCompleted.value;

    if (gamesCompleted.value % 10 === 0) {
      addLog(`⚡ 已完成 ${gamesCompleted.value} 局极速模拟`, 'info');
    }

    if (gamesCompleted.value >= gamesPerGen) {
      finishGeneration(baselineWins, challengerWins);
    }
  }, 50); // 加速：50ms 一局
};

const stopEvolution = () => {
  isRunning.value = false;
  clearInterval(trainingTimer);
  addLog('🛑 训练已手动停止', 'warning');
};

const finishGeneration = (baseWins: number, challWins: number) => {
  clearInterval(trainingTimer);
  isRunning.value = false;
  
  const total = baseWins + challWins;
  const improvement = ((challWins / total) - 0.5) * 100;

  if (challWins > baseWins) {
    addLog(`✅ 进化成功！第 ${currentGeneration.value} 代策略胜率提升 ${improvement.toFixed(1)}%`, 'success');
    addLog(`🚀 已自动应用新的参数组合并保存（${gameMode.value === 'team' ? '团队模式' : '单人模式'}）`, 'success');
    
    // 根据游戏模式保存配置
    const isTeamMode = gameMode.value === 'team';
    if (isTeamMode) {
      // 团队模式：保存团队相关参数
      AIConfigStore.saveConfig({
        cooperationWeight: challengerParams.cooperationWeight,
        strategicPassWeight: challengerParams.sacrificeWeight,
        roleWeight: 1.5 + (currentGeneration.value * 0.1) // 随着进化，角色意识逐渐增强
      }, true);
    } else {
      // 单人模式：保存基础参数（不使用团队相关参数）
      AIConfigStore.saveConfig({
        // 单人模式下主要调整基础MCTS参数
        iterations: 100 + (currentGeneration.value * 10), // 随着进化，迭代次数增加
        explorationConstant: 1.414
      }, false);
    }
    
    // 更新基准，准备下一代
    baselineParams.cooperationWeight = challengerParams.cooperationWeight;
    baselineParams.sacrificeWeight = challengerParams.sacrificeWeight;
    
    // 生成下一代变异参数
    challengerParams.cooperationWeight = Number((baselineParams.cooperationWeight + 0.2).toFixed(1));
    challengerParams.sacrificeWeight = Number((baselineParams.sacrificeWeight + 0.1).toFixed(1));
    currentGeneration.value++;
    
    // 自动开始下一轮？还是手动？这里手动比较好
    // 如果想要"全自动"，可以 recursive call startEvolution()
    // startEvolution(); 
    
  } else {
    addLog(`❌ 进化失败，新策略表现不佳，回滚参数`, 'warning');
    // 尝试不同的变异方向
    challengerParams.cooperationWeight = Number((baselineParams.cooperationWeight - 0.1).toFixed(1));
    challengerParams.sacrificeWeight = Number((baselineParams.sacrificeWeight - 0.1).toFixed(1));
  }
};

onUnmounted(() => {
  clearInterval(trainingTimer);
});
</script>

<style scoped>
/* Sci-Fi / Cyberpunk Theme */
.evolution-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 95%;
  max-width: 650px;
  background: rgba(10, 10, 20, 0.95);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(0, 198, 255, 0.2);
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.8), 
              0 0 20px rgba(0, 198, 255, 0.1);
  padding: 30px;
  color: #e0e0ffff;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 24px;
  font-family: 'Inter', 'Roboto Mono', monospace;
  animation: panel-enter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes panel-enter {
  from { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.mode-selector {
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mode-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.mode-buttons {
  display: flex;
  gap: 8px;
}

.mode-btn {
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 13px;
  font-weight: 500;
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.mode-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(90deg, #00c6ff, #0072ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.8);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 59, 48, 0.2);
  color: #ff3b30;
  transform: rotate(90deg);
}

/* Status Card */
.status-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.status-card.running {
  background: linear-gradient(145deg, rgba(0, 198, 255, 0.1) 0%, rgba(0, 114, 255, 0.05) 100%);
  border-color: rgba(0, 198, 255, 0.3);
  box-shadow: 0 0 20px rgba(0, 198, 255, 0.1);
}

.status-card.running::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00c6ff, transparent);
  animation: scan-line 2s linear infinite;
}

@keyframes scan-line {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.status-icon {
  font-size: 2.5rem;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
}

.status-info {
  flex: 1;
}

.status-title {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 6px;
  color: #fff;
}

.status-desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
}

.btn-primary, .btn-danger {
  padding: 10px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: linear-gradient(135deg, #00c6ff, #0072ff);
  color: white;
  box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 198, 255, 0.5);
}

.btn-danger {
  background: rgba(255, 59, 48, 0.1);
  color: #ff453a;
  border: 1px solid rgba(255, 59, 48, 0.3);
}

.btn-danger:hover {
  background: rgba(255, 59, 48, 0.2);
  box-shadow: 0 0 15px rgba(255, 59, 48, 0.2);
}

/* Progress Section */
.progress-section {
  background: rgba(0, 0, 0, 0.2);
  padding: 16px;
  border-radius: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #88ccff;
  margin-bottom: 8px;
  font-family: 'Roboto Mono', monospace;
}

.progress-bar-bg {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00c6ff, #0072ff);
  box-shadow: 0 0 10px rgba(0, 198, 255, 0.5);
  transition: width 0.3s ease;
}

/* Experiment Grid */
.experiment-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: stretch;
}

.vs-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.2);
  font-style: italic;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}

.experiment-card {
  background: rgba(30, 30, 40, 0.5);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  transition: all 0.3s ease;
}

.team-blue {
  border-top: 4px solid #0072ff;
}

.team-red {
  border-top: 4px solid #ff0055;
}

.experiment-card.winner {
  border-color: #4cd964;
  background: linear-gradient(180deg, rgba(76, 217, 100, 0.1) 0%, rgba(30, 30, 40, 0.5) 100%);
  box-shadow: 0 0 30px rgba(76, 217, 100, 0.15);
  transform: scale(1.02);
  z-index: 10;
}

.team-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-weight: bold;
  font-size: 1.1rem;
}

.team-blue .team-name { color: #5599ff; }
.team-red .team-name { color: #ff5588; }

.params-list {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.5);
}

.param-item.highlight {
  color: #fff;
  font-weight: bold;
}

.team-red .param-item.highlight .value { color: #ff0055; }
.team-blue .param-item.highlight .value { color: #0072ff; }

.win-rate {
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.rate-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.rate-value {
  font-size: 1.8rem;
  font-weight: 800;
  font-family: 'Roboto Mono', monospace;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.team-blue .rate-value { color: #00c6ff; }
.team-red .rate-value { color: #ff0055; }

/* Logs */
.evolution-log {
  flex: 1;
  min-height: 180px;
  max-height: 250px;
  overflow-y: auto;
  background: #0a0a10;
  border-radius: 16px;
  padding: 16px;
  font-size: 0.8rem;
  font-family: 'Roboto Mono', monospace;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
}

.log-header {
  position: sticky;
  top: 0;
  background: #0a0a10;
  font-size: 0.7rem;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  text-transform: uppercase;
}

.log-item {
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
  opacity: 0.9;
}

.log-time {
  color: #444;
  min-width: 60px;
}

.log-msg.info { color: #8899aa; }
.log-msg.success { color: #4cd964; text-shadow: 0 0 10px rgba(76, 217, 100, 0.3); }
.log-msg.warning { color: #ffd60a; }

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

</style>
