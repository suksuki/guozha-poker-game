<template>
  <div class="toolbar-landscape">
    <van-tag 
      v-if="playerCount !== 4"
      type="warning"
      size="small"
    >
      ⚠️ {{ playerCount }}人
    </van-tag>
    <van-button 
      size="mini" 
      icon="setting"
      @click="$emit('open-settings')"
      plain
    >
      {{ $t('common.settings') }}
    </van-button>
    <van-button 
      size="mini" 
      :type="isAutoPlay ? 'warning' : 'default'"
      @click="$emit('toggle-auto-play')"
      plain
    >
      {{ isAutoPlay ? '🤖' : '👆' }}
    </van-button>
    <van-button 
      size="mini" 
      @click="$emit('sort-hand')" 
      type="success"
      plain
    >
      📊
    </van-button>
    <van-button 
      size="mini" 
      @click="$emit('get-ai-recommendation')" 
      type="primary"
      plain
    >
      💡
    </van-button>
    <van-button 
      size="mini" 
      @click="$emit('toggle-chat')" 
      :type="showChat ? 'primary' : 'default'"
      plain
    >
      💬
    </van-button>
  </div>
</template>

<script setup lang="ts">
// Props
defineProps<{
  playerCount: number;
  isAutoPlay: boolean;
  showChat: boolean;
}>();

// Emits
defineEmits<{
  'open-settings': [];
  'toggle-auto-play': [];
  'sort-hand': [];
  'get-ai-recommendation': [];
  'toggle-chat': [];
}>();
</script>

<style scoped>
.toolbar-landscape {
  position: absolute;
  top: 4px;
  left: 4px;
  display: flex;
  gap: 4px;
  z-index: 30;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-landscape .van-button {
  font-size: 11px;
  padding: 4px 8px;
  height: auto;
  min-height: 24px;
  line-height: 1.2;
  border-radius: 4px;
}

.toolbar-landscape .van-tag {
  font-size: 10px;
  padding: 2px 6px;
  height: 20px;
  line-height: 1.2;
}
</style>
