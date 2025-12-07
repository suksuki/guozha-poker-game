<template>
  <div class="decision-training-panel">
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
    
    <van-cell-group title="快速模式">
      <van-switch
        v-model="localConfig.fastMode.enabled"
        @update:model-value="updateConfig"
      />
      <van-field
        v-model.number="localConfig.fastMode.speedMultiplier"
        label="速度倍数"
        type="number"
        placeholder="请输入速度倍数"
        :disabled="!localConfig.fastMode.enabled"
        @update:model-value="updateConfig"
      />
    </van-cell-group>
    
    <van-cell-group title="数据收集">
      <van-switch
        v-model="localConfig.dataCollection.enabled"
        @update:model-value="updateConfig"
      />
      <van-switch
        v-model="localConfig.dataCollection.autoSave"
        label="自动保存"
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
  padding: 16px 0;
}
</style>

