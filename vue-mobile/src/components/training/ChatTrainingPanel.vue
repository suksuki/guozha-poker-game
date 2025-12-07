<template>
  <div class="chat-training-panel">
    <van-cell-group title="训练配置">
      <van-field
        v-model.number="localConfig.rounds"
        label="训练轮数"
        type="number"
        placeholder="请输入训练轮数"
        @update:model-value="updateConfig"
      />
      <van-field
        v-model.number="localConfig.batchSize"
        label="批次大小"
        type="number"
        placeholder="请输入批次大小"
        @update:model-value="updateConfig"
      />
    </van-cell-group>
    
    <van-cell-group title="LLM配置">
      <van-switch
        v-model="localConfig.llm.enabled"
        @update:model-value="updateConfig"
      />
      <van-field
        v-model="localConfig.llm.endpoint"
        label="LLM端点"
        placeholder="http://localhost:11434/api/chat"
        :disabled="!localConfig.llm.enabled"
        @update:model-value="updateConfig"
      />
      <van-field
        v-model="localConfig.llm.model"
        label="模型名称"
        placeholder="qwen2.5:3b"
        :disabled="!localConfig.llm.enabled"
        @update:model-value="updateConfig"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { TrainingConfig } from '../../../../src/types/training';

const props = defineProps<{
  config: Partial<TrainingConfig>;
}>();

const emit = defineEmits<{
  'update:config': [config: Partial<TrainingConfig>];
}>();

const localConfig = ref<Partial<TrainingConfig>>({
  type: 'chat',
  rounds: 10,
  batchSize: 5,
  fastMode: {
    enabled: true,
    speedMultiplier: 10,
    skipUI: true,
    skipTTS: true
  },
  llm: {
    enabled: true,
    endpoint: 'http://localhost:11434/api/chat',
    model: 'qwen2.5:3b'
  },
  ...props.config
});

watch(() => props.config, (newConfig) => {
  localConfig.value = { ...localConfig.value, ...newConfig };
}, { deep: true });

const updateConfig = () => {
  emit('update:config', { ...localConfig.value });
};
</script>

<style scoped>
.chat-training-panel {
  padding: 16px 0;
}
</style>

