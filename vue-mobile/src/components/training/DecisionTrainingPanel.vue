<template>
  <div class="decision-training-panel">
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
    
    <van-cell-group :title="$t('training.fastMode')" v-if="localConfig.fastMode">
      <van-switch
        v-model="localConfig.fastMode.enabled"
        @update:model-value="updateConfig"
      />
      <van-field
        v-model.number="localConfig.fastMode.speedMultiplier"
        :label="$t('training.speedMultiplier')"
        type="number"
        :placeholder="$t('training.inputSpeed')"
        :disabled="!localConfig.fastMode.enabled"
        @update:model-value="updateConfig"
      />
    </van-cell-group>
    
    <van-cell-group :title="$t('training.dataCollection')" v-if="localConfig.dataCollection">
      <van-switch
        v-model="localConfig.dataCollection.enabled"
        @update:model-value="updateConfig"
      />
      <van-switch
        v-model="localConfig.dataCollection.autoSave"
        :label="$t('training.autoSave')"
        @update:model-value="updateConfig"
      />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { TrainingConfig } from '@/core/types/training';

const props = defineProps<{
  config: Partial<TrainingConfig>;
}>();

const emit = defineEmits<{
  'update:config': [config: Partial<TrainingConfig>];
}>();

const localConfig = ref<Partial<TrainingConfig>>({
  type: 'decision',
  rounds: 10,
  batchSize: 5,
  fastMode: {
    enabled: true,
    speedMultiplier: 10,
    skipUI: true,
    skipTTS: true
  },
  dataCollection: {
    enabled: true,
    autoSave: false
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
.decision-training-panel {
  padding: 8px 0;
}

/* Field Customization */
:deep(.van-field__label) {
  color: var(--text-secondary);
}
:deep(.van-field__control) {
  color: white;
  font-family: 'Roboto Mono', monospace;
}
:deep(.van-field__control::placeholder) {
  color: rgba(255, 255, 255, 0.2);
}

/* Switch Customization */
:deep(.van-switch--on) {
  background: var(--evo-neon-blue);
}
:deep(.van-switch) {
  background: rgba(255, 255, 255, 0.1);
}

</style>

