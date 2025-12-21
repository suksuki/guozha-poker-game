<template>
  <div class="dun-explosion-container" v-if="isExploding">
    <!-- 7-8个头：烟花效果 -->
    <template v-if="dunSize <= 8">
      <div class="fireworks">
        <div 
          v-for="(firework, index) in fireworks" 
          :key="index"
          class="firework"
          :style="getFireworkStyle(firework)"
        >
          <div class="firework-spark" v-for="(spark, sIdx) in firework.sparks" :key="sIdx" :style="getSparkStyle(spark)"></div>
        </div>
      </div>
    </template>
    
    <!-- 9个头：大火箭 -->
    <template v-else-if="dunSize === 9">
      <div class="rocket-container">
        <div class="rocket" :class="{ 'launching': isExploding }">
          <div class="rocket-body"></div>
          <div class="rocket-flame"></div>
        </div>
        <div class="rocket-explosion" :class="{ 'exploding': isExploding }"></div>
      </div>
    </template>
    
    <!-- 10个头：原子弹蘑菇云 -->
    <template v-else-if="dunSize === 10">
      <div class="mushroom-cloud">
        <div class="mushroom-stem" :class="{ 'growing': isExploding }"></div>
        <div class="mushroom-cap" :class="{ 'expanding': isExploding }">
          <div class="mushroom-ring" v-for="i in 3" :key="i" :class="{ 'expanding': isExploding }" :style="{ animationDelay: `${i * 0.1}s` }"></div>
        </div>
        <div class="mushroom-particles">
          <div v-for="(particle, idx) in mushroomParticles" :key="idx" class="mushroom-particle" :style="getMushroomParticleStyle(particle)"></div>
        </div>
      </div>
    </template>
    
    <!-- 11个头：彗星撞地球 -->
    <template v-else-if="dunSize === 11">
      <div class="comet-impact">
        <div class="comet" :class="{ 'falling': isExploding }">
          <div class="comet-tail"></div>
          <div class="comet-core"></div>
        </div>
        <div class="impact-explosion" :class="{ 'exploding': isExploding }">
          <div class="impact-wave" v-for="i in 5" :key="i" :style="{ animationDelay: `${i * 0.15}s` }"></div>
        </div>
        <div class="debris" v-for="(debris, idx) in debrisParticles" :key="idx" :style="getDebrisStyle(debris)"></div>
      </div>
    </template>
    
    <!-- 12个头：地球爆炸 -->
    <template v-else-if="dunSize === 12">
      <div class="earth-explosion">
        <div class="earth" :class="{ 'exploding': isExploding }">
          <div class="earth-crack" v-for="i in 8" :key="i" :style="{ transform: `rotate(${i * 45}deg)` }"></div>
        </div>
        <div class="planet-fragments" v-for="(fragment, idx) in planetFragments" :key="idx" :style="getFragmentStyle(fragment)"></div>
        <div class="cosmic-shockwave" :class="{ 'expanding': isExploding }"></div>
        <div class="cosmic-particles">
          <div v-for="(particle, idx) in cosmicParticles" :key="idx" class="cosmic-particle" :style="getCosmicParticleStyle(particle)"></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

const props = defineProps<{
  dunSize: number; // 墩的数量（7-12）
}>();

const isExploding = ref(false);

// 烟花效果数据（7-8个头）
const fireworks = ref<Array<{ angle: number; sparks: Array<{ angle: number; distance: number; delay: number }> }>>([]);

// 蘑菇云粒子（10个头）
const mushroomParticles = ref<Array<{ angle: number; distance: number; delay: number }>>([]);

// 碎片粒子（11个头）
const debrisParticles = ref<Array<{ angle: number; distance: number; delay: number; size: number }>>([]);

// 星球碎片（12个头）
const planetFragments = ref<Array<{ angle: number; distance: number; delay: number; size: number }>>([]);

// 宇宙粒子（12个头）
const cosmicParticles = ref<Array<{ angle: number; distance: number; delay: number }>>([]);

// 生成烟花效果（7-8个头）
const generateFireworks = () => {
  const count = props.dunSize === 7 ? 3 : 5;
  const newFireworks = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const sparkCount = 12;
    const sparks = [];
    
    for (let j = 0; j < sparkCount; j++) {
      const sparkAngle = angle + (Math.PI * 2 * j) / sparkCount;
      const distance = 60 + Math.random() * 40;
      const delay = Math.random() * 300;
      sparks.push({ angle: sparkAngle, distance, delay });
    }
    
    newFireworks.push({ angle, sparks });
  }
  
  fireworks.value = newFireworks;
};

// 生成蘑菇云粒子（10个头）
const generateMushroomParticles = () => {
  const count = 80;
  const particles = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const distance = 100 + Math.random() * 150;
    const delay = Math.random() * 500;
    particles.push({ angle, distance, delay });
  }
  
  mushroomParticles.value = particles;
};

// 生成碎片粒子（11个头）
const generateDebris = () => {
  const count = 30;
  const debris = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const distance = 120 + Math.random() * 180;
    const delay = Math.random() * 400;
    const size = 8 + Math.random() * 12;
    debris.push({ angle, distance, delay, size });
  }
  
  debrisParticles.value = debris;
};

// 生成星球碎片（12个头）
const generatePlanetFragments = () => {
  const count = 20;
  const fragments = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const distance = 150 + Math.random() * 200;
    const delay = Math.random() * 600;
    const size = 15 + Math.random() * 20;
    fragments.push({ angle, distance, delay, size });
  }
  
  planetFragments.value = fragments;
};

// 生成宇宙粒子（12个头）
const generateCosmicParticles = () => {
  const count = 100;
  const particles = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const distance = 200 + Math.random() * 300;
    const delay = Math.random() * 800;
    particles.push({ angle, distance, delay });
  }
  
  cosmicParticles.value = particles;
};

// 获取烟花样式
const getFireworkStyle = (firework: { angle: number; sparks: any[] }) => {
  return {
    transform: `rotate(${firework.angle * 180 / Math.PI}deg)`
  };
};

// 获取火花样式
const getSparkStyle = (spark: { angle: number; distance: number; delay: number }) => {
  const x = Math.cos(spark.angle) * spark.distance;
  const y = Math.sin(spark.angle) * spark.distance;
  return {
    '--x': `${x}px`,
    '--y': `${y}px`,
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: `${spark.delay}ms`
  };
};

// 获取蘑菇云粒子样式
const getMushroomParticleStyle = (particle: { angle: number; distance: number; delay: number }) => {
  const x = Math.cos(particle.angle) * particle.distance;
  const y = Math.sin(particle.angle) * particle.distance;
  return {
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: `${particle.delay}ms`
  };
};

// 获取碎片样式
const getDebrisStyle = (debris: { angle: number; distance: number; delay: number; size: number }) => {
  const x = Math.cos(debris.angle) * debris.distance;
  const y = Math.sin(debris.angle) * debris.distance;
  return {
    width: `${debris.size}px`,
    height: `${debris.size}px`,
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: `${debris.delay}ms`
  };
};

// 获取星球碎片样式
const getFragmentStyle = (fragment: { angle: number; distance: number; delay: number; size: number }) => {
  const x = Math.cos(fragment.angle) * fragment.distance;
  const y = Math.sin(fragment.angle) * fragment.distance;
  return {
    width: `${fragment.size}px`,
    height: `${fragment.size}px`,
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: `${fragment.delay}ms`
  };
};

// 获取宇宙粒子样式
const getCosmicParticleStyle = (particle: { angle: number; distance: number; delay: number }) => {
  const x = Math.cos(particle.angle) * particle.distance;
  const y = Math.sin(particle.angle) * particle.distance;
  return {
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: `${particle.delay}ms`
  };
};

// 播放墩音效
const playDunSound = async () => {
  try {
    const { soundService } = await import('@/core/services/soundService');
    soundService.playDunSound(props.dunSize >= 10 ? 'huge' : props.dunSize >= 9 ? 'large' : 'medium');
  } catch (error) {
    // 使用 Web Audio API 生成音效
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = props.dunSize >= 12 ? 1.5 : props.dunSize >= 10 ? 1.2 : 0.8;
      const now = audioContext.currentTime;
      
      // 根据墩的大小调整音效强度
      const intensity = props.dunSize / 12;
      
      // 低频爆炸声
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(60 * intensity, now);
      osc1.frequency.exponentialRampToValueAtTime(30 * intensity, now + duration);
      gain1.gain.setValueAtTime(0.5 * intensity, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.start(now);
      osc1.stop(now + duration);
      
      // 高频冲击声
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(300 * intensity, now);
      osc2.frequency.exponentialRampToValueAtTime(150 * intensity, now + duration * 0.6);
      gain2.gain.setValueAtTime(0.3 * intensity, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.6);
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.start(now);
      osc2.stop(now + duration * 0.6);
    } catch (e) {
      // 静默处理
    }
  }
};

onMounted(() => {
  // 根据墩的大小生成不同的效果
  if (props.dunSize <= 8) {
    generateFireworks();
  } else if (props.dunSize === 10) {
    generateMushroomParticles();
  } else if (props.dunSize === 11) {
    generateDebris();
  } else if (props.dunSize === 12) {
    generatePlanetFragments();
    generateCosmicParticles();
  }
  
  isExploding.value = true;
  playDunSound();
  
  // 根据墩的大小调整动画持续时间
  const duration = props.dunSize >= 12 ? 2000 : props.dunSize >= 10 ? 1800 : props.dunSize >= 9 ? 1500 : 1200;
  
  setTimeout(() => {
    isExploding.value = false;
  }, duration);
});
</script>

<style scoped>
.dun-explosion-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1001;
}

/* ========== 7-8个头：烟花效果 ========== */
.fireworks {
  position: relative;
  width: 100%;
  height: 100%;
}

.firework {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: center center;
}

.firework-spark {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 6px;
  background: radial-gradient(circle, #FFD700, #FF4500);
  border-radius: 50%;
  box-shadow: 0 0 8px #FFD700;
  animation: sparkExplode 1s ease-out forwards;
}

@keyframes sparkExplode {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--x, 0px), var(--y, 0px)) scale(0);
    opacity: 0;
  }
}

/* ========== 9个头：大火箭 ========== */
.rocket-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.rocket {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 80px;
}

.rocket-body {
  width: 100%;
  height: 60%;
  background: linear-gradient(135deg, #FFD700, #FF4500);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 0 20px #FFD700;
}

.rocket-flame {
  width: 100%;
  height: 40%;
  background: radial-gradient(ellipse, #FF4500, transparent);
  animation: flameFlicker 0.1s infinite;
}

.rocket.launching {
  animation: rocketLaunch 1.5s ease-out forwards;
}

@keyframes rocketLaunch {
  0% {
    transform: translate(-50%, 0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -100px) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -200px) scale(0);
    opacity: 0;
  }
}

@keyframes flameFlicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.rocket-explosion {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 69, 0, 0.9), rgba(255, 215, 0, 0.7), transparent);
  opacity: 0;
}

.rocket-explosion.exploding {
  animation: rocketExplode 1.5s ease-out forwards;
}

@keyframes rocketExplode {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  50% {
    width: 200px;
    height: 200px;
    opacity: 0.9;
  }
  100% {
    width: 400px;
    height: 400px;
    opacity: 0;
  }
}

/* ========== 10个头：原子弹蘑菇云 ========== */
.mushroom-cloud {
  position: relative;
  width: 100%;
  height: 100%;
}

.mushroom-stem {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 0;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.9), rgba(200, 200, 200, 0.7));
  border-radius: 40px;
}

.mushroom-stem.growing {
  animation: stemGrow 1.8s ease-out forwards;
}

@keyframes stemGrow {
  0% {
    height: 0;
    opacity: 1;
  }
  100% {
    height: 200px;
    opacity: 0.8;
  }
}

.mushroom-cap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255, 255, 255, 0.95), rgba(200, 200, 200, 0.8), transparent);
}

.mushroom-cap.expanding {
  animation: capExpand 1.8s ease-out forwards;
}

@keyframes capExpand {
  0% {
    width: 0;
    height: 0;
  }
  100% {
    width: 300px;
    height: 150px;
  }
}

.mushroom-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border: 2px solid rgba(255, 255, 255, 0.6);
  border-radius: 50%;
}

.mushroom-ring.expanding {
  animation: ringExpand 1.8s ease-out forwards;
}

@keyframes ringExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    width: 400px;
    height: 200px;
    opacity: 0;
  }
}

.mushroom-particles {
  position: relative;
  width: 100%;
  height: 100%;
}

.mushroom-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  background: radial-gradient(circle, #FFFFFF, #FFD700);
  border-radius: 50%;
  box-shadow: 0 0 10px #FFFFFF;
  animation: mushroomParticleFloat 1.8s ease-out forwards;
}

@keyframes mushroomParticleFloat {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--x, 0px)), calc(-50% + var(--y, 0px))) scale(0);
    opacity: 0;
  }
}

/* ========== 11个头：彗星撞地球 ========== */
.comet-impact {
  position: relative;
  width: 100%;
  height: 100%;
}

.comet {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 100px;
}

.comet-core {
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, #FFFFFF, #FFD700, #FF4500);
  border-radius: 50%;
  box-shadow: 0 0 30px #FFD700;
  margin: 0 auto;
}

.comet-tail {
  width: 20px;
  height: 70px;
  background: linear-gradient(to bottom, #FFD700, transparent);
  margin: 0 auto;
  box-shadow: 0 0 20px #FFD700;
}

.comet.falling {
  animation: cometFall 1.5s ease-in forwards;
}

@keyframes cometFall {
  0% {
    top: 0;
    opacity: 1;
  }
  100% {
    top: 50%;
    opacity: 1;
  }
}

.impact-explosion {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
}

.impact-explosion.exploding {
  animation: impactExplode 1.5s ease-out forwards;
}

.impact-wave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border: 4px solid rgba(255, 215, 0, 0.8);
  border-radius: 50%;
}

.impact-explosion.exploding .impact-wave {
  animation: impactWaveExpand 1.5s ease-out forwards;
}

@keyframes impactWaveExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    width: 500px;
    height: 500px;
    opacity: 0;
  }
}

.debris {
  position: absolute;
  top: 50%;
  left: 50%;
  background: linear-gradient(135deg, #8B4513, #654321);
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(139, 69, 19, 0.8);
  animation: debrisFly 1.5s ease-out forwards;
}

@keyframes debrisFly {
  0% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--x, 0px)), calc(-50% + var(--y, 0px))) scale(0) rotate(720deg);
    opacity: 0;
  }
}

/* ========== 12个头：地球爆炸 ========== */
.earth-explosion {
  position: relative;
  width: 100%;
  height: 100%;
}

.earth {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #4A90E2, #2E5C8A, #1A3A5A);
  box-shadow: 0 0 40px rgba(74, 144, 226, 0.8);
}

.earth-crack {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 60px;
  background: linear-gradient(to bottom, #FF4500, transparent);
  transform-origin: center bottom;
}

.earth.exploding .earth-crack {
  animation: crackExpand 2s ease-out forwards;
}

@keyframes crackExpand {
  0% {
    height: 0;
    opacity: 1;
  }
  100% {
    height: 120px;
    opacity: 0.8;
  }
}

.planet-fragments {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  background: radial-gradient(circle, #4A90E2, #2E5C8A);
  box-shadow: 0 0 15px rgba(74, 144, 226, 0.8);
  animation: fragmentFly 2s ease-out forwards;
}

@keyframes fragmentFly {
  0% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--x, 0px)), calc(-50% + var(--y, 0px))) scale(0) rotate(1080deg);
    opacity: 0;
  }
}

.cosmic-shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border: 6px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  opacity: 0;
}

.cosmic-shockwave.expanding {
  animation: cosmicShockwaveExpand 2s ease-out forwards;
}

@keyframes cosmicShockwaveExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    width: 800px;
    height: 800px;
    opacity: 0;
  }
}

.cosmic-particles {
  position: relative;
  width: 100%;
  height: 100%;
}

.cosmic-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: radial-gradient(circle, #FFFFFF, #FFD700);
  border-radius: 50%;
  box-shadow: 0 0 15px #FFFFFF;
  animation: cosmicParticleFly 2s ease-out forwards;
}

@keyframes cosmicParticleFly {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--x, 0px)), calc(-50% + var(--y, 0px))) scale(0);
    opacity: 0;
  }
}
</style>

