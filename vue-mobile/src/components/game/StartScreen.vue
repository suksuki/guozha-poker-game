<template>
  <div class="start-screen">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="card-float card-1">🃏</div>
      <div class="card-float card-2">🂡</div>
      <div class="card-float card-3">🂱</div>
      <div class="card-float card-4">🃁</div>
    </div>
    
    <!-- 主内容 -->
    <div class="start-content">
      <!-- Logo 区域 -->
      <div class="logo-section">
        <div class="logo-icon">🎴</div>
        <h1 class="game-title">国炸扑克</h1>
        <p class="game-subtitle">Guozha Poker</p>
      </div>
      
      <!-- 按钮区域 -->
      <div class="start-buttons">
        <button class="btn-primary" @click="$emit('start', { teamMode: false })">
          <span class="btn-icon">🚀</span>
          <span class="btn-text">{{ $t('game.startNewGame') }}</span>
          <span class="btn-arrow">→</span>
        </button>

        <button class="btn-primary btn-team" @click="$emit('start', { teamMode: true })">
          <span class="btn-icon">👥</span>
          <span class="btn-text">开始团队赛</span>
          <span class="btn-arrow">→</span>
        </button>
        
        <button class="btn-secondary" @click="$emit('training')">
          <span class="btn-icon">🧠</span>
          <span class="btn-text">{{ $t('game.intelligentTraining') }}</span>
          <span class="btn-arrow">→</span>
        </button>
      </div>
      
      <!-- [新增] 快速选项区 -->
      <div class="quick-options">
        <label class="option-item">
          <input type="checkbox" v-model="settingsStore.gameSettings.skipDealing">
          <span class="checkbox-custom"></span>
          <span class="option-label">跳过发牌动画</span>
        </label>
      </div>
      
      <div class="footer-links">
        <span @click="$emit('settings')">设置</span>
        <span class="divider">|</span>
        <span @click="$emit('training')">智能训练</span>
        <span class="divider">|</span>
        <span @click="showEvolution = true">算法进化</span>
      </div>
      
      <div class="version">v1.2.0 Beta</div>
    </div>
    
    <!-- Evolution Panel -->
    <MCTSEvolutionPanel 
      v-if="showEvolution" 
      @close="showEvolution = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '../../stores/settingsStore';
import MCTSEvolutionPanel from '../training/MCTSEvolutionPanel.vue';

const settingsStore = useSettingsStore();
const showEvolution = ref(false);

defineEmits(['start', 'settings', 'training']);
</script>

<style scoped>
.start-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
}

/* 背景装饰动画 */
.bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.card-float {
  position: absolute;
  font-size: 60px;
  opacity: 0.1;
  animation: float 6s ease-in-out infinite;
}

.card-1 { top: 10%; left: 10%; animation-delay: 0s; }
.card-2 { top: 20%; right: 15%; animation-delay: 1.5s; }
.card-3 { bottom: 25%; left: 20%; animation-delay: 3s; }
.card-4 { bottom: 15%; right: 10%; animation-delay: 4.5s; }

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(10deg); }
}

/* 主内容 */
.start-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  z-index: 1;
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Logo 区域 */
.logo-section {
  text-align: center;
}

.logo-icon {
  font-size: 80px;
  margin-bottom: 16px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.game-title {
  font-size: 36px;
  font-weight: 800;
  color: white;
  margin: 0;
  background: linear-gradient(135deg, #fff 0%, #a8edea 50%, #fed6e3 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 4px 30px rgba(255, 255, 255, 0.3);
}

.game-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 8px 0 0 0;
  letter-spacing: 4px;
  text-transform: uppercase;
}

/* 按钮区域 */
.start-buttons {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 主按钮 */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 18px 24px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);
}

.btn-primary:hover::before {
  opacity: 1;
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-team {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  box-shadow: 0 8px 32px rgba(56, 239, 125, 0.4);
}

.btn-team:hover {
  box-shadow: 0 12px 40px rgba(56, 239, 125, 0.5);
}

/* 次要按钮 */
.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 16px 24px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

/* 设置按钮 */
.btn-settings {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: auto;
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0 auto;
}

.btn-settings:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* 按钮图标和箭头 */
.btn-icon {
  font-size: 20px;
}

.btn-arrow {
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

.btn-primary:hover .btn-arrow,
.btn-secondary:hover .btn-arrow {
  opacity: 1;
  transform: translateX(0);
}

.btn-text {
  flex: 1;
  text-align: center;
}

/* 快速选项 */
.quick-options {
  margin-top: -10px;
  display: flex;
  justify-content: center;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.option-item input {
  display: none;
}

.checkbox-custom {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  position: relative;
  transition: all 0.2s ease;
}

.option-item input:checked + .checkbox-custom {
  background: #764ba2;
  border-color: #667eea;
}

.option-item input:checked + .checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
}

/* 按钮图标和箭头 */
.footer-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

.divider {
  opacity: 0.5;
}

/* 响应式 */
@media (max-width: 360px) {
  .game-title {
    font-size: 28px;
  }
  
  .logo-icon {
    font-size: 60px;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 14px 20px;
    font-size: 16px;
  }
}

@media (orientation: landscape) and (max-height: 500px) {
  .start-content {
    gap: 20px;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .logo-section {
    width: 100%;
  }
  
  .logo-icon {
    font-size: 40px;
    margin-bottom: 8px;
  }
  
  .game-title {
    font-size: 24px;
  }
  
  .start-buttons {
    flex-direction: row;
    max-width: 600px;
  }
  
  .btn-settings {
    display: none;
  }
}
</style>
