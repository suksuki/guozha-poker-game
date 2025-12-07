<template>
  <transition name="chat-bubble">
    <div 
      v-if="visible" 
      class="chat-bubble"
      :class="{
        'chat-bubble-human': isHuman,
        'chat-bubble-ai': !isHuman
      }"
      :style="bubbleStyle"
    >
      <div class="chat-bubble-content">
        {{ content }}
      </div>
      <div class="chat-bubble-tail"></div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface Props {
  content: string;
  playerId: number;
  isHuman?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  offsetX?: number;
  offsetY?: number;
  duration?: number; // 显示时长（毫秒），默认3000
}

const props = withDefaults(defineProps<Props>(), {
  isHuman: false,
  position: 'top',
  offsetX: 0,
  offsetY: 0,
  duration: 3000
});

const visible = ref(false);
let hideTimer: number | null = null;

// 气泡位置样式
const bubbleStyle = computed(() => {
  const styles: Record<string, string> = {};
  
  switch (props.position) {
    case 'top':
      styles.bottom = `${props.offsetY}px`;
      break;
    case 'bottom':
      styles.top = `${props.offsetY}px`;
      break;
    case 'left':
      styles.right = `${props.offsetX}px`;
      break;
    case 'right':
      styles.left = `${props.offsetX}px`;
      break;
  }
  
  return styles;
});

onMounted(() => {
  // 延迟显示，确保动画生效
  setTimeout(() => {
    visible.value = true;
  }, 10);
  
  // 自动隐藏
  hideTimer = window.setTimeout(() => {
    visible.value = false;
  }, props.duration);
});

onUnmounted(() => {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
});
</script>

<style scoped>
.chat-bubble {
  position: absolute;
  z-index: 1000;
  pointer-events: none;
  animation: bubbleAppear 0.3s ease-out;
}

.chat-bubble-content {
  /* 泡泡风格：更明显的半透明背景 */
  background: rgba(255, 255, 255, 0.5);
  border: 2px solid rgba(25, 137, 250, 0.3);
  /* 泡泡风格：更大的圆角 */
  border-radius: 20px;
  padding: 14px 18px;
  font-size: 14px;
  color: #333;
  /* 泡泡风格：柔和的阴影和模糊效果 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15),
              0 2px 4px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(15px) saturate(180%);
  -webkit-backdrop-filter: blur(15px) saturate(180%);
  min-width: 120px;
  max-width: 220px;
  min-height: auto;
  width: fit-content;
  word-wrap: break-word;
  word-break: break-word;
  line-height: 1.5;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-height: 200px;
  overflow-wrap: anywhere;
  /* 泡泡风格：更柔和的字体 */
  font-weight: 500;
}

.chat-bubble-human .chat-bubble-content {
  /* 人类泡泡：更明显的半透明蓝色 */
  background: rgba(25, 137, 250, 0.5);
  color: white;
  border-color: rgba(25, 137, 250, 0.4);
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.3),
              0 2px 4px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(15px) saturate(180%);
  -webkit-backdrop-filter: blur(15px) saturate(180%);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.chat-bubble-ai .chat-bubble-content {
  /* AI泡泡：更明显的半透明白色 */
  background: rgba(255, 255, 255, 0.5);
  color: #333;
  border-color: rgba(25, 137, 250, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15),
              0 2px 4px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(15px) saturate(180%);
  -webkit-backdrop-filter: blur(15px) saturate(180%);
}

.chat-bubble-tail {
  position: absolute;
  width: 0;
  height: 0;
  border: 8px solid transparent;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.chat-bubble[style*="bottom"] .chat-bubble-tail {
  bottom: -16px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: rgba(25, 137, 250, 0.5);
}

.chat-bubble[style*="top"] .chat-bubble-tail {
  top: -16px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: rgba(255, 255, 255, 0.5);
}

.chat-bubble-human .chat-bubble-tail {
  border-top-color: rgba(25, 137, 250, 0.5);
  border-bottom-color: rgba(25, 137, 250, 0.5);
}

.chat-bubble-ai .chat-bubble-tail {
  border-top-color: rgba(255, 255, 255, 0.5);
  border-bottom-color: rgba(255, 255, 255, 0.5);
}

@keyframes bubbleAppear {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.85);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

.chat-bubble-enter-active,
.chat-bubble-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.chat-bubble-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.8);
}

.chat-bubble-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.8);
}
</style>

