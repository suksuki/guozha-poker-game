<template>
  <div class="action-buttons">
    <van-button
      type="primary"
      size="large"
      block
      :disabled="!canPlay"
      @click="handlePlay"
    >
      出牌
    </van-button>
    
    <van-button
      size="large"
      block
      :disabled="!canPass"
      @click="handlePass"
    >
      过牌
    </van-button>
    
    <van-button
      size="large"
      block
      plain
      type="warning"
      @click="handleClearSelection"
    >
      清除选择
    </van-button>
  </div>
</template>

<script setup lang="ts">
import { Button } from 'vant';

interface Props {
  canPlay: boolean;
  canPass: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  play: [];
  pass: [];
  clearSelection: [];
}>();

const handlePlay = () => emit('play');
const handlePass = () => emit('pass');
const handleClearSelection = () => emit('clearSelection');
</script>

<style scoped>
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
}
</style>

