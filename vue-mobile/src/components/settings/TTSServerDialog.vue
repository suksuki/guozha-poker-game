<template>
  <van-dialog
    v-model:show="visible"
    :title="props.server ? '编辑TTS服务器' : '添加TTS服务器'"
    show-cancel-button
    @confirm="handleConfirm"
    @cancel="handleCancel"
    :style="{ width: '90%', maxWidth: '500px' }"
  >
    <div class="tts-server-dialog">
      <van-field
        v-model="form.name"
        label="名称"
        placeholder="输入服务器名称（可选）"
      />
      <van-field
        v-model="form.type"
        label="类型"
        placeholder="选择类型"
        readonly
        is-link
        @click="showTypePicker = true"
      />
      
      <van-tabs v-model:active="inputMode" v-if="form.type !== 'browser'">
        <van-tab title="本地" name="local" />
        <van-tab title="局域网" name="lan" />
        <van-tab title="自定义" name="custom" />
      </van-tabs>
      
      <template v-if="form.type !== 'browser'">
        <van-field
          v-if="inputMode === 'lan' || inputMode === 'custom'"
          v-model="form.connection.host"
          :label="inputMode === 'lan' ? 'IP地址' : '主机地址'"
          :placeholder="inputMode === 'lan' ? '如：0.13 或 192.168.0.13' : '如：192.168.0.13 或 example.com'"
          required
        />
        <van-field
          v-model.number="form.connection.port"
          label="端口"
          type="number"
          :placeholder="getDefaultPort()"
          required
        />
      </template>
      
      <van-field
        v-model.number="form.priority"
        label="优先级"
        type="number"
        placeholder="数字越小优先级越高"
      />
      
      <van-switch
        v-model="form.enabled"
        title="启用"
      />
    </div>
  </van-dialog>
  
  <van-popup v-model:show="showTypePicker" position="bottom">
    <van-picker
      :columns="typeOptions"
      @confirm="handleTypeConfirm"
      @cancel="showTypePicker = false"
    />
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TTSServerConfig, TTSProvider } from '../../services/tts/types';

interface Props {
  modelValue: boolean;
  server?: TTSServerConfig;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [server: Partial<TTSServerConfig>];
}>();

const visible = ref(props.modelValue);
const showTypePicker = ref(false);

const typeOptions = [
  { text: '🎤 MeLo TTS', value: 'melo' },
  { text: '🎯 Piper TTS', value: 'piper' },
  { text: '🌐 浏览器 TTS', value: 'browser' }
];

const inputMode = ref<'local' | 'lan' | 'custom'>('local');

const form = ref<Partial<TTSServerConfig>>({
  name: '',
  type: 'melo',
  enabled: true,
  priority: 3,
  connection: {
    host: 'localhost',
    port: 7860,
    protocol: 'http'
  }
});

// 获取默认端口
const getDefaultPort = () => {
  if (form.value.type === 'melo') return '7860';
  if (form.value.type === 'piper') return '5000';
  return '5000';
};

watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val && props.server) {
    // 编辑模式 - 深拷贝connection对象
    form.value = { 
      ...props.server,
      connection: props.server.connection ? { ...props.server.connection } : {
        host: 'localhost',
        port: 7860,
        protocol: 'http'
      }
    };
    // 判断输入模式
    if (props.server.connection) {
      if (props.server.connection.host === 'localhost' || props.server.connection.host === '127.0.0.1') {
        inputMode.value = 'local';
      } else if (props.server.connection.host.startsWith('192.168.')) {
        inputMode.value = 'lan';
        // 提取IP地址的最后两段用于显示
        const parts = props.server.connection.host.split('.');
        if (parts.length === 4 && parts[0] === '192' && parts[1] === '168') {
          form.value.connection!.host = `${parts[2]}.${parts[3]}`;
        }
      } else {
        inputMode.value = 'custom';
      }
    }
  } else if (val) {
    // 新建模式
    form.value = {
      name: '',
      type: 'melo',
      enabled: true,
      priority: 3,
      connection: {
        host: 'localhost',
        port: 7860,
        protocol: 'http'
      }
    };
    inputMode.value = 'local';
  }
});

// 监听类型变化，更新默认端口
watch(() => form.value.type, (newType) => {
  if (form.value.connection) {
    if (newType === 'melo') {
      form.value.connection.port = 7860;
    } else if (newType === 'piper') {
      form.value.connection.port = 5000;
    }
  }
});

// 监听输入模式变化
watch(inputMode, (newMode) => {
  if (!form.value.connection) {
    form.value.connection = {
      host: 'localhost',
      port: form.value.type === 'melo' ? 7860 : 5000,
      protocol: 'http'
    };
  }
  
  if (newMode === 'local') {
    form.value.connection.host = 'localhost';
  } else if (newMode === 'lan') {
    form.value.connection.host = '';
  }
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

const handleTypeConfirm = ({ selectedOptions }: any) => {
  form.value.type = selectedOptions[0].value as TTSProvider;
  showTypePicker.value = false;
};

const handleConfirm = () => {
  // 验证必填字段
  if (form.value.type !== 'browser') {
    if (!form.value.connection?.host || !form.value.connection?.port) {
      return;
    }
  }
  
  // 处理IP地址（局域网模式自动补全）
  let finalHost = form.value.connection?.host || 'localhost';
  let finalPort = form.value.connection?.port || (form.value.type === 'melo' ? 7860 : 5000);
  
  if (inputMode.value === 'local') {
    finalHost = 'localhost';
    finalPort = form.value.type === 'melo' ? 7860 : form.value.type === 'piper' ? 5000 : 5000;
  } else if (inputMode.value === 'lan') {
    const hostValue = form.value.connection?.host?.trim() || '';
    if (hostValue.includes('.') && hostValue.split('.').length === 4) {
      finalHost = hostValue;
    } else {
      finalHost = `192.168.${hostValue}`;
    }
    finalPort = form.value.connection?.port || (form.value.type === 'melo' ? 7860 : 5000);
  } else {
    finalHost = form.value.connection?.host?.trim() || '';
    finalPort = form.value.connection?.port || 5000;
  }
  
  const server: Partial<TTSServerConfig> = {
    id: props.server?.id || `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: form.value.name || `${form.value.type} TTS - ${finalHost}`,
    type: (form.value.type || 'melo') as TTSProvider,
    enabled: form.value.enabled ?? true,
    priority: form.value.priority ?? 3,
    connection: {
      host: finalHost,
      port: finalPort,
      protocol: 'http'
    },
    providerConfig: form.value.providerConfig || (form.value.type === 'piper' ? {
      piper: { model: 'zh_CN-huayan-medium' }
    } : form.value.type === 'melo' ? {
      melo: { speaker: 'ZH', speed: 1.0 }
    } : undefined)
  };
  
  emit('confirm', server);
  visible.value = false;
};

const handleCancel = () => {
  visible.value = false;
};
</script>

<style scoped>
.tts-server-dialog {
  padding: 16px;
}
</style>

