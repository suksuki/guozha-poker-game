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
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #1989fa;
  border-radius: 16px;
  padding: 16px 20px;
  font-size: 15px;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 140px;
  max-width: 200px;
  min-height: 140px;
  width: fit-content;
  word-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  /* 短文字时保持正方形，长文字时允许适度变长 */
  aspect-ratio: 1;
  max-height: 200px;
  overflow-wrap: anywhere;
}

.chat-bubble-human .chat-bubble-content {
  background: rgba(25, 137, 250, 0.95);
  color: white;
  border-color: #1989fa;
}

.chat-bubble-ai .chat-bubble-content {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-color: #1989fa;
}

.chat-bubble-tail {
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;
}

.chat-bubble[style*="bottom"] .chat-bubble-tail {
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: #1989fa;
}

.chat-bubble[style*="top"] .chat-bubble-tail {
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: #1989fa;
}

.chat-bubble-human .chat-bubble-tail {
  border-top-color: #1989fa;
  border-bottom-color: #1989fa;
}

@keyframes bubbleAppear {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
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

