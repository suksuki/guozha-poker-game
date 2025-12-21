<template>
  <div class="bomb-explosion-container" v-if="isExploding">
    <!-- 爆炸粒子效果 -->
    <div class="explosion-particles">
      <div 
        v-for="(particle, index) in particles" 
        :key="index"
        class="particle"
        :style="getParticleStyle(particle)"
      ></div>
    </div>
    
    <!-- 爆炸光晕 -->
    <div class="explosion-glow" :class="{ 'exploding': isExploding }"></div>
    
    <!-- 爆炸冲击波 -->
    <div class="explosion-shockwave" :class="{ 'exploding': isExploding }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const isExploding = ref(false);
const particles = ref<Array<{ angle: number; distance: number; delay: number; color: string }>>([]);

// 生成爆炸粒子
const generateParticles = () => {
  const count = 50;
  const colors = ['#FF0000', '#FF4500', '#FFD700', '#FFFFFF', '#FF6B6B'];
  const newParticles = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 80 + Math.random() * 120;
    const delay = Math.random() * 200;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    newParticles.push({ angle, distance, delay, color });
  }
  
  particles.value = newParticles;
};

// 获取粒子样式
const getParticleStyle = (particle: { angle: number; distance: number; delay: number; color: string }) => {
  const x = Math.cos(particle.angle) * particle.distance;
  const y = Math.sin(particle.angle) * particle.distance;
  
  return {
    '--x': `${x}px`,
    '--y': `${y}px`,
    '--delay': `${particle.delay}ms`,
    '--color': particle.color,
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: `${particle.delay}ms`
  };
};

// 播放炸弹音效
const playBombSound = async () => {
  try {
    // 尝试使用 soundService
    const { soundService } = await import('@/core/services/soundService');
    soundService.playBombSound();
  } catch (error) {
    // soundService 不可用，使用 Web Audio API 生成简单的爆炸音效
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建多个振荡器模拟爆炸声
      const duration = 0.3;
      const now = audioContext.currentTime;
      
      // 低频爆炸声
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(80, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + duration);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(now);
      osc1.stop(now + duration);
      
      // 高频冲击声
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(200, now);
      osc2.frequency.exponentialRampToValueAtTime(100, now + duration * 0.5);
      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.5);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(now);
      osc2.stop(now + duration * 0.5);
    } catch (e) {
      // 如果所有方案都失败，静默处理
    }
  }
};

onMounted(() => {
  generateParticles();
  isExploding.value = true;
  playBombSound();
  
  // 1秒后隐藏动画
  setTimeout(() => {
    isExploding.value = false;
  }, 1000);
});
</script>

<style scoped>
.bomb-explosion-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  pointer-events: none;
  z-index: 1000;
}

.explosion-particles {
  position: relative;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: var(--color, #FF0000);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--color, #FF0000);
  animation: particleExplode 0.8s ease-out forwards;
  animation-delay: var(--delay, 0ms);
}

@keyframes particleExplode {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--x, 0px)), calc(-50% + var(--y, 0px))) scale(0);
    opacity: 0;
  }
}

.explosion-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 69, 0, 0.8) 0%, rgba(255, 215, 0, 0.6) 30%, transparent 70%);
  opacity: 0;
}

.explosion-glow.exploding {
  animation: glowExpand 0.6s ease-out forwards;
}

@keyframes glowExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  50% {
    width: 150px;
    height: 150px;
    opacity: 0.8;
  }
  100% {
    width: 250px;
    height: 250px;
    opacity: 0;
  }
}

.explosion-shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.8);
  opacity: 0;
}

.explosion-shockwave.exploding {
  animation: shockwaveExpand 0.8s ease-out forwards;
}

@keyframes shockwaveExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
    border-width: 3px;
  }
  100% {
    width: 300px;
    height: 300px;
    opacity: 0;
    border-width: 1px;
  }
}
</style>

