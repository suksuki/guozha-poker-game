<template>
  <van-popup
    v-model:show="visible"
    position="bottom"
    round
    :style="{ minHeight: '55%' }"
    :lock-scroll="true"
    :close-on-click-overlay="false"
  >
    <div class="tts-dialog">
      <div class="dialog-header">
        <span class="title">{{ props.server ? '编辑TTS服务器' : '添加TTS服务器' }}</span>
        <van-icon name="cross" @click="handleCancel" />
      </div>

      <div class="dialog-body">
        <!-- 服务器名称 -->
        <div class="form-section">
          <van-field
            v-model="form.name"
            label="名称"
            placeholder="(可选) 自定义名称"
            clearable
            class="dark-field"
          />
        </div>

        <!-- 服务器类型选择 -->
        <div class="section-title">服务器类型</div>
        <div class="type-grid">
          <div
            v-for="opt in typeOptions"
            :key="opt.value"
            class="type-card"
            :class="{ active: form.type === opt.value }"
            @click="selectType(opt.value)"
          >
            <span class="type-icon">{{ opt.icon }}</span>
            <span class="type-name">{{ opt.label }}</span>
          </div>
        </div>

        <!-- 连接设置 (非浏览器类型) -->
        <template v-if="form.type !== 'browser'">
          <div class="section-title">连接模式</div>
          <van-radio-group v-model="connectionMode" direction="horizontal" class="mode-group">
            <van-radio name="local">本地</van-radio>
            <van-radio name="lan">局域网</van-radio>
            <van-radio name="custom">自定义</van-radio>
          </van-radio-group>

          <div class="form-section" style="margin-top: 12px;">
            <!-- 局域网IP -->
            <van-field
              v-if="connectionMode === 'lan'"
              v-model="lanIP"
              label="IP地址"
              placeholder="如: 0.13 或 192.168.0.13"
              clearable
              class="dark-field"
              @click.stop
            />
            <!-- 自定义主机 -->
            <van-field
              v-if="connectionMode === 'custom'"
              v-model="customHost"
              label="主机"
              placeholder="IP地址或域名"
              clearable
              class="dark-field"
              @click.stop
            />
            <!-- 端口 -->
            <van-field
              v-model="port"
              label="端口"
              type="digit"
              :placeholder="defaultPort"
              class="dark-field"
              @click.stop
            />
          </div>
        </template>

        <!-- 优先级和启用 -->
        <div class="form-section" style="margin-top: 12px;">
          <van-field
            v-model.number="form.priority"
            label="优先级"
            type="digit"
            placeholder="数字越小优先级越高"
            class="dark-field"
          />
          <van-cell title="启用此服务器" class="dark-cell">
            <template #right-icon>
              <van-switch v-model="form.enabled" size="20px" active-color="#818cf8" />
            </template>
          </van-cell>
        </div>

        <!-- 测试连接 -->
        <div v-if="form.type !== 'browser'" class="test-section">
          <van-button 
            size="small" 
            plain 
            round 
            block 
            :loading="isTesting"
            @click="handleTestConnection"
            class="test-btn"
          >
            {{ testMessage || '测试连接' }}
          </van-button>
        </div>
      </div>

      <div class="dialog-footer">
        <van-button plain block @click="handleCancel">取消</van-button>
        <van-button type="primary" block @click="handleConfirm">确认</van-button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { TTSServerConfig, TTSProvider } from '../../services/tts/types';
import { showToast, showLoadingToast, showSuccessToast, showFailToast } from 'vant';

interface Props {
  modelValue: boolean;
  server?: TTSServerConfig;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'confirm': [server: Partial<TTSServerConfig>];
}>();

// 类型选项
const typeOptions = [
  { value: 'melo' as TTSProvider, label: 'MeLo TTS', icon: '🎤' },
  { value: 'piper' as TTSProvider, label: 'Piper TTS', icon: '🎯' },
  { value: 'browser' as TTSProvider, label: '浏览器 TTS', icon: '🌐' },
];

// 表单状态
const form = ref({
  name: '',
  type: 'melo' as TTSProvider,
  enabled: true,
  priority: 3,
});

// 连接模式
const connectionMode = ref<'local' | 'lan' | 'custom'>('local');
const lanIP = ref('');
const customHost = ref('');
const port = ref('');

// 测试相关
const isTesting = ref(false);
const testMessage = ref('');

// 默认端口
const defaultPort = computed(() => {
  return form.value.type === 'melo' ? '7860' : '5000';
});

// 选择类型
const selectType = (type: TTSProvider) => {
  form.value.type = type;
  testMessage.value = '';
};

// 执行测试
const handleTestConnection = async () => {
  let host = 'localhost';
  if (connectionMode.value === 'local') {
    host = 'localhost';
  } else if (connectionMode.value === 'lan') {
    const ip = lanIP.value.trim();
    host = ip.includes('.') && ip.split('.').length === 4 ? ip : `192.168.${ip}`;
  } else {
    host = customHost.value.trim() || 'localhost';
  }
  
  const finalPort = parseInt(port.value) || (form.value.type === 'melo' ? 7860 : 5000);
  const baseUrl = `http://${host}:${finalPort}`;
  const healthUrl = `${baseUrl}/health`;

  isTesting.value = true;
  testMessage.value = '正在测试...';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const startTime = Date.now();
    const response = await fetch(healthUrl, { 
      method: 'GET', 
      signal: controller.signal,
      mode: 'cors'
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok) {
      let healthy = true;
      if (form.value.type === 'melo') {
        try {
          const data = await response.json();
          healthy = data.status === 'ok';
        } catch (e) {
          healthy = true; 
        }
      }
      
      if (healthy) {
        testMessage.value = `✅ 已连接 (${latency}ms)`;
        showSuccessToast('连接成功');
      } else {
        testMessage.value = '❌ 服务异常';
        showFailToast('服务返回状态异常');
      }
    } else {
      testMessage.value = `❌ HTTP ${response.status}`;
      showFailToast(`连接失败: ${response.status}`);
    }
  } catch (err: any) {
    testMessage.value = '❌ 连接超时/拒绝';
    showFailToast('无法连接到服务器，请检查地址或网络');
  } finally {
    isTesting.value = false;
  }
};

// 弹窗可见性
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// 监听弹窗打开，初始化表单
watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.server) {
      // 编辑模式
      form.value = {
        name: props.server.name || '',
        type: props.server.type || 'melo',
        enabled: props.server.enabled ?? true,
        priority: props.server.priority ?? 3,
      };
      // 解析连接信息
      const conn = props.server.connection;
      if (conn) {
        port.value = String(conn.port || '');
        if (conn.host === 'localhost' || conn.host === '127.0.0.1') {
          connectionMode.value = 'local';
          lanIP.value = '';
          customHost.value = '';
        } else if (conn.host?.startsWith('192.168.')) {
          connectionMode.value = 'lan';
          lanIP.value = conn.host;
          customHost.value = '';
        } else {
          connectionMode.value = 'custom';
          customHost.value = conn.host || '';
          lanIP.value = '';
        }
      }
    } else {
      // 新建模式
      form.value = { name: '', type: 'melo', enabled: true, priority: 3 };
      connectionMode.value = 'local';
      lanIP.value = '';
      customHost.value = '';
      port.value = '';
    }
  }
});

// 类型变更时重置端口
watch(() => form.value.type, () => {
  port.value = '';
});

const handleConfirm = () => {
  // 构建主机地址
  let host = 'localhost';
  if (form.value.type !== 'browser') {
    if (connectionMode.value === 'local') {
      host = 'localhost';
    } else if (connectionMode.value === 'lan') {
      const ip = lanIP.value.trim();
      // 支持输入 "0.13" 或完整 "192.168.0.13"
      if (ip.includes('.') && ip.split('.').length === 4) {
        host = ip;
      } else {
        host = `192.168.${ip}`;
      }
    } else {
      host = customHost.value.trim() || 'localhost';
    }
  }

  const finalPort = parseInt(port.value) || (form.value.type === 'melo' ? 7860 : 5000);

  const server: Partial<TTSServerConfig> = {
    id: props.server?.id || `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: form.value.name || `${form.value.type.toUpperCase()} - ${host}`,
    type: form.value.type,
    enabled: form.value.enabled,
    priority: form.value.priority,
    connection: form.value.type !== 'browser' ? {
      host,
      port: finalPort,
      protocol: 'http' as const,
    } : undefined,
    providerConfig: form.value.type === 'melo' 
      ? { melo: { speaker: 'ZH', speed: 1.0 } }
      : form.value.type === 'piper'
      ? { piper: { model: 'zh_CN-huayan-medium' } }
      : undefined,
  };

  emit('confirm', server);
  visible.value = false;
};

const handleCancel = () => {
  visible.value = false;
};
</script>

<style scoped>
.tts-dialog {
  padding: 16px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
  color: #e2e8f0;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(129, 140, 248, 0.2);
}

.dialog-header .title {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
}

.dialog-header :deep(.van-icon) {
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
}

.dialog-body {
  padding: 16px 0;
}

.section-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 16px 0 8px 4px;
}

.form-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  overflow: hidden;
}

.dark-field,
.dark-cell {
  background: transparent !important;
}

.dark-field :deep(.van-field__label),
.dark-cell :deep(.van-cell__title) {
  color: rgba(255, 255, 255, 0.6);
}

.dark-field :deep(.van-field__control) {
  color: #f1f5f9;
}

.dark-field :deep(.van-field__control::placeholder) {
  color: rgba(255, 255, 255, 0.3);
}

.dark-field :deep(.van-field__clear) {
  color: rgba(255, 255, 255, 0.4);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s;
  cursor: pointer;
}

.type-card:active {
  transform: scale(0.96);
}

.type-card.active {
  background: rgba(129, 140, 248, 0.2);
  border-color: #818cf8;
  box-shadow: 0 0 20px rgba(129, 140, 248, 0.3);
}

.type-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.type-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  font-weight: 500;
}

.type-card.active .type-name {
  color: #c7d2fe;
}

.mode-group {
  display: flex;
  gap: 16px;
  padding: 0 4px;
}

.mode-group :deep(.van-radio__label) {
  color: rgba(255, 255, 255, 0.8);
}

/* 深色输入框样式 */
:deep(.van-cell-group--inset) {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

:deep(.van-cell) {
  background: transparent;
  color: #e2e8f0;
}

:deep(.van-field__label) {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.van-field__control) {
  color: #f1f5f9;
}

:deep(.van-field__control::placeholder) {
  color: rgba(255, 255, 255, 0.3);
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid rgba(129, 140, 248, 0.2);
}

.test-section {
  margin-top: 20px;
  padding: 0 4px;
}

.test-btn {
  background: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(129, 140, 248, 0.3) !important;
  color: #818cf8 !important;
  height: 38px;
}

.dialog-footer .van-button {
  flex: 1;
}

.dialog-footer .van-button--plain {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.dialog-footer .van-button--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}
</style>
