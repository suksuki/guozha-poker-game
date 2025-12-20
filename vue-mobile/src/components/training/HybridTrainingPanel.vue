<template>
  <div class="hybrid-training-panel">
    <van-cell-group :title="$t('training.config')">
      <van-field
        v-model.number="localConfig.rounds"
        :label="$t('training.rounds')"
        type="number"
        :placeholder="$t('training.inputRounds')"
        @update:model-value="updateConfig"
      />
      <van-field
        v-model.number="localConfig.batchSize"
        :label="$t('training.batchSize')"
        type="number"
        :placeholder="$t('training.inputBatchSize')"
        @update:model-value="updateConfig"
      />
    </van-cell-group>
    
    <van-cell-group :title="$t('training.llmConfig')" v-if="localConfig.llm">
      <van-switch
        v-model="localConfig.llm.enabled"
        @update:model-value="updateConfig"
      />
      <van-field
        v-model="localConfig.llm.endpoint"
        :label="$t('training.llmEndpoint')"
        placeholder="http://localhost:11434/api/chat"
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
  type: 'hybrid',
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
.hybrid-training-panel {
  padding: 16px 0;
}
</style>

