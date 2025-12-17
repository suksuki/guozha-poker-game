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
  animation: bubbleAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), bubbleFloat 3s ease-in-out infinite;
}

.chat-bubble-content {
  /* 现代渐变背景 */
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 240, 255, 0.9) 100%);
  border: 2px solid rgba(102, 126, 234, 0.4);
  border-radius: 20px;
  padding: 12px 18px;
  font-size: 14px;
  color: #1a1a2e;
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.2),
    0 4px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  min-width: 100px;
  max-width: 200px;
  word-wrap: break-word;
  word-break: break-word;
  line-height: 1.5;
  position: relative;
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.3px;
}

/* 人类玩家气泡 - 紫色渐变 */
.chat-bubble-human .chat-bubble-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 8px 24px rgba(102, 126, 234, 0.4),
    0 4px 8px rgba(118, 75, 162, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* AI玩家气泡 - 根据不同AI有不同颜色 */
.chat-bubble-ai .chat-bubble-content {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(134, 239, 172, 0.2) 100%);
  color: #1a2e1a;
  border-color: rgba(34, 197, 94, 0.4);
  box-shadow: 
    0 8px 24px rgba(34, 197, 94, 0.2),
    0 4px 8px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 气泡尾巴 */
.chat-bubble-tail {
  position: absolute;
  width: 0;
  height: 0;
  border: 10px solid transparent;
}

.chat-bubble[style*="bottom"] .chat-bubble-tail {
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  border-top-color: rgba(255, 255, 255, 0.95);
}

.chat-bubble[style*="top"] .chat-bubble-tail {
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  border-bottom-color: rgba(255, 255, 255, 0.95);
}

.chat-bubble[style*="left"] .chat-bubble-tail {
  left: -18px;
  top: 50%;
  transform: translateY(-50%);
  border-right-color: rgba(255, 255, 255, 0.95);
}

.chat-bubble[style*="right"] .chat-bubble-tail {
  right: -18px;
  top: 50%;
  transform: translateY(-50%);
  border-left-color: rgba(255, 255, 255, 0.95);
}

.chat-bubble-human .chat-bubble-tail {
  border-top-color: #764ba2;
  border-bottom-color: #764ba2;
  border-left-color: #764ba2;
  border-right-color: #764ba2;
}

.chat-bubble-ai .chat-bubble-tail {
  border-top-color: rgba(255, 255, 255, 0.95);
  border-bottom-color: rgba(255, 255, 255, 0.95);
  border-left-color: rgba(255, 255, 255, 0.95);
  border-right-color: rgba(255, 255, 255, 0.95);
}

/* 出现动画 - 弹跳 + 闪光 */
@keyframes bubbleAppear {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.6) rotate(-5deg);
    filter: blur(4px);
  }
  40% {
    opacity: 1;
    transform: translateY(-10px) scale(1.1) rotate(2deg);
    filter: blur(0);
  }
  60% {
    transform: translateY(3px) scale(0.95) rotate(-1deg);
  }
  80% {
    transform: translateY(-4px) scale(1.02) rotate(0deg);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
}

/* 微微浮动 + 呼吸效果 */
@keyframes bubbleFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }
  25% {
    transform: translateY(-4px) scale(1.01);
  }
  50% {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  }
  75% {
    transform: translateY(-5px) scale(1.01);
  }
}

/* 边框光效 */
@keyframes borderGlow {
  0%, 100% {
    border-color: rgba(212, 175, 55, 0.3);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(212, 175, 55, 0);
  }
  50% {
    border-color: rgba(212, 175, 55, 0.6);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 15px rgba(212, 175, 55, 0.3);
  }
}

/* 文字闪烁效果（模拟打字完成） */
@keyframes textPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.95;
  }
}

/* Vue 过渡动画 */
.chat-bubble-enter-active {
  animation: bubbleAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.chat-bubble-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-bubble-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.8) rotate(5deg);
  filter: blur(3px);
}

/* 强调动画（可用于重要消息） */
@keyframes bubbleEmphasize {
  0%, 100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.05);
  }
  50% {
    transform: scale(0.98);
  }
  75% {
    transform: scale(1.02);
  }
}
</style>

