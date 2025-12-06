<template>
  <van-popup
    v-model:show="isOpen"
    position="center"
    :style="{ width: '90%', maxWidth: '500px', maxHeight: '85vh', borderRadius: '16px' }"
    closeable
    close-icon-position="top-right"
    @close="handleClose"
    :safe-area-inset-bottom="true"
    :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }"
  >
    <div class="settings-panel">
      <div class="settings-header">
        <h2>⚙️ 设置</h2>
      </div>

      <div class="settings-body">
        <van-tabs v-model:active="activeTab" swipeable sticky>
        <!-- 游戏设置 -->
        <van-tab title="🎮 游戏" name="game">
          <div class="settings-content">
            <van-cell-group>
              <van-field
                :value="getGameModeLabel(localGameSettings.gameMode)"
                label="游戏模式"
                readonly
                is-link
                @click="showGameModePicker = true"
              >
                <template #input>
                  <van-radio-group 
                    v-model="localGameSettings.gameMode"
                    direction="horizontal"
                    @change="updateGameSettings({ gameMode: localGameSettings.gameMode })"
                  >
                    <van-radio name="individual">个人</van-radio>
                    <van-radio name="team">团队</van-radio>
                  </van-radio-group>
                </template>
              </van-field>
              <van-switch
                v-model="localGameSettings.enableSoundEffects"
                title="音效"
                @change="updateGameSettings({ enableSoundEffects: localGameSettings.enableSoundEffects })"
              />
              <van-switch
                v-model="localGameSettings.enableVoiceChat"
                title="语音聊天"
                @change="updateGameSettings({ enableVoiceChat: localGameSettings.enableVoiceChat })"
              />
            </van-cell-group>
          </div>
        </van-tab>

        <!-- LLM配置 -->
        <van-tab title="🤖 LLM" name="llm">
          <div class="settings-content">
            <!-- 连接状态摘要 -->
            <van-cell-group>
              <van-cell title="连接状态" :value="llmConnectionStatus">
                <template #icon>
                  <span class="status-icon">{{ llmStatusIcon }}</span>
                </template>
              </van-cell>
            </van-cell-group>

            <!-- 基础配置 -->
            <van-cell-group title="📡 基础配置">
              <van-cell title="LLM提供商">
                <template #value>
                  <van-radio-group 
                    v-model="localLLMConfig.provider"
                    direction="horizontal"
                    @change="updateLLMConfig({ provider: localLLMConfig.provider })"
                  >
                    <van-radio name="openai">OpenAI</van-radio>
                    <van-radio name="claude">Claude</van-radio>
                    <van-radio name="custom">自定义</van-radio>
                  </van-radio-group>
                </template>
              </van-cell>
              <van-field
                v-model="localLLMConfig.apiUrl"
                label="API地址"
                placeholder="http://localhost:11434/api/chat"
                @change="updateLLMConfig({ apiUrl: localLLMConfig.apiUrl })"
              >
                <template #button>
                  <van-button 
                    size="small" 
                    type="primary"
                    @click.stop="testLLMConnection"
                  >
                    🔍 测试
                  </van-button>
                </template>
              </van-field>
              <van-field
                v-model="localLLMConfig.model"
                label="模型名称"
                placeholder="qwen2:0.5b"
                @change="updateLLMConfig({ model: localLLMConfig.model })"
              />
            </van-cell-group>

            <!-- 高级配置 - 可折叠 -->
            <van-collapse v-model="llmAdvancedOpen">
              <van-collapse-item title="⚙️ 高级配置" name="advanced">
                <van-field
                  v-model.number="localLLMConfig.temperature"
                  label="温度 (0-2)"
                  type="number"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  @change="updateLLMConfig({ temperature: localLLMConfig.temperature })"
                />
                <van-field
                  v-model.number="localLLMConfig.maxTokens"
                  label="最大Token数"
                  type="number"
                  :min="50"
                  :max="2000"
                  @change="updateLLMConfig({ maxTokens: localLLMConfig.maxTokens })"
                />
                <van-field
                  v-model.number="localLLMConfig.timeout"
                  label="超时时间(ms)"
                  type="number"
                  :min="5000"
                  :max="60000"
                  @change="updateLLMConfig({ timeout: localLLMConfig.timeout })"
                />
                <van-switch
                  v-model="localLLMConfig.enableContext"
                  title="使用游戏上下文"
                  @change="updateLLMConfig({ enableContext: localLLMConfig.enableContext })"
                />
                <van-switch
                  v-model="localLLMConfig.enableHistory"
                  title="使用聊天历史"
                  @change="updateLLMConfig({ enableHistory: localLLMConfig.enableHistory })"
                />
              </van-collapse-item>
            </van-collapse>
          </div>
        </van-tab>

        <!-- TTS配置 -->
        <van-tab title="🔊 TTS" name="tts">
          <div class="settings-content">
            <!-- TTS服务器状态摘要 -->
            <van-cell-group>
              <van-cell>
                <template #title>
                  <div class="tts-summary">
                    <span>📊 总数: {{ settingsStore.ttsServers.length }}</span>
                    <span>✅ 已启用: {{ enabledTTSServers }}</span>
                    <span>🟢 可用: {{ availableTTSServers }}</span>
                  </div>
                </template>
              </van-cell>
            </van-cell-group>

            <!-- 添加服务器按钮 -->
            <div class="tts-header">
              <van-button
                type="primary"
                size="small"
                block
                @click="showAddTTSServer = true"
              >
                ➕ 添加TTS服务器
              </van-button>
            </div>

            <!-- TTS服务器列表 - 改进显示 -->
            <van-cell-group title="服务器列表">
              <div
                v-for="server in settingsStore.ttsServers"
                :key="server.id"
                class="tts-server-item"
                :class="{ 'server-disabled': !server.enabled }"
              >
                <van-cell
                  :title="server.name"
                  :label="`${getServerTypeLabel(server.type)} | ${server.connection.host}:${server.connection.port}`"
                  is-link
                  @click="editTTSServer(server)"
                >
                  <template #icon>
                    <span class="server-status-icon">
                      {{ getServerStatusIcon(server) }}
                    </span>
                  </template>
                  <template #value>
                    <div class="server-actions">
                      <van-button
                        size="mini"
                        type="primary"
                        @click.stop="testTTSServer(server)"
                      >
                        🔍
                      </van-button>
                      <van-switch
                        :model-value="server.enabled"
                        @update:model-value="(val) => updateTTSServer(server.id, { enabled: val })"
                        @click.stop
                      />
                    </div>
                  </template>
                  <template #right-icon>
                    <van-tag
                      v-if="server.status?.latency"
                      :type="server.status.health === 'available' ? 'success' : 'danger'"
                      size="mini"
                    >
                      {{ server.status.latency }}ms
                    </van-tag>
                  </template>
                </van-cell>
              </div>
              <van-empty
                v-if="settingsStore.ttsServers.length === 0"
                description="暂无TTS服务器，点击上方按钮添加"
              />
            </van-cell-group>
          </div>
        </van-tab>

        <!-- UI设置 -->
        <van-tab title="🎨 UI" name="ui">
          <div class="settings-content">
            <van-cell-group>
              <van-cell title="主题" :value="getThemeLabel(localUISettings.theme)">
                <template #value>
                  <van-radio-group 
                    v-model="localUISettings.theme"
                    direction="horizontal"
                    @change="updateUISettings({ theme: localUISettings.theme })"
                  >
                    <van-radio name="auto">自动</van-radio>
                    <van-radio name="light">浅色</van-radio>
                    <van-radio name="dark">深色</van-radio>
                  </van-radio-group>
                </template>
              </van-cell>
              <van-switch
                v-model="localUISettings.showCardValues"
                title="显示牌值"
                @change="updateUISettings({ showCardValues: localUISettings.showCardValues })"
              />
            </van-cell-group>
          </div>
        </van-tab>

        <!-- AI设置 -->
        <van-tab title="🧠 AI" name="ai">
          <div class="settings-content">
            <van-cell-group>
              <van-cell title="AI难度" :value="getDifficultyLabel(localAISettings.difficulty)">
                <template #value>
                  <van-radio-group 
                    v-model="localAISettings.difficulty"
                    direction="horizontal"
                    @change="updateAISettings({ difficulty: localAISettings.difficulty })"
                  >
                    <van-radio name="easy">简单</van-radio>
                    <van-radio name="normal">普通</van-radio>
                    <van-radio name="hard">困难</van-radio>
                  </van-radio-group>
                </template>
              </van-cell>
              <van-cell title="AI策略" :value="getStrategyLabel(localAISettings.aiStrategy)">
                <template #value>
                  <van-radio-group 
                    v-model="localAISettings.aiStrategy"
                    direction="horizontal"
                    @change="updateAISettings({ aiStrategy: localAISettings.aiStrategy })"
                  >
                    <van-radio name="balanced">平衡</van-radio>
                    <van-radio name="aggressive">激进</van-radio>
                    <van-radio name="conservative">保守</van-radio>
                  </van-radio-group>
                </template>
              </van-cell>
            </van-cell-group>
          </div>
        </van-tab>
        </van-tabs>
      </div>

      <!-- 重置按钮放在settings-body外面，作为整个面板的底部 -->
      <div class="settings-footer">
        <van-button
          type="danger"
          block
          size="normal"
          @click="handleReset"
        >
          🔄 重置为默认值
        </van-button>
      </div>
    </div>

  </van-popup>

</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useSettingsStore } from '../stores/settingsStore';
import { showToast, showConfirmDialog } from 'vant';
import type { GameSettings, UISettings, AISettings } from '../stores/settingsStore';
import type { LLMChatConfig } from '../../../src/config/chatConfig';
import type { TTSServerConfig } from '../../../src/tts/models/TTSServerConfig';
import { checkLLMAvailability } from '../../../src/utils/llmHealthCheck';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const settingsStore = useSettingsStore();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const activeTab = ref('game');

// 本地状态（用于双向绑定）
const localGameSettings = ref<GameSettings>({ ...settingsStore.gameSettings });
const localUISettings = ref<UISettings>({ ...settingsStore.uiSettings });
const localAISettings = ref<AISettings>({ ...settingsStore.aiSettings });
const localLLMConfig = ref<LLMChatConfig>({ ...settingsStore.llmConfig });

// 监听store变化
watch(() => settingsStore.gameSettings, (val) => {
  localGameSettings.value = { ...val };
}, { deep: true });

watch(() => settingsStore.uiSettings, (val) => {
  localUISettings.value = { ...val };
}, { deep: true });

watch(() => settingsStore.aiSettings, (val) => {
  localAISettings.value = { ...val };
}, { deep: true });

watch(() => settingsStore.llmConfig, (val) => {
  localLLMConfig.value = { ...val };
}, { deep: true });

// 方法
const updateGameSettings = (updates: Partial<GameSettings>) => {
  settingsStore.updateGameSettings(updates);
  localGameSettings.value = { ...settingsStore.gameSettings };
};

const updateUISettings = (updates: Partial<UISettings>) => {
  settingsStore.updateUISettings(updates);
  localUISettings.value = { ...settingsStore.uiSettings };
};

const updateAISettings = (updates: Partial<AISettings>) => {
  settingsStore.updateAISettings(updates);
  localAISettings.value = { ...settingsStore.aiSettings };
};

const updateLLMConfig = (updates: Partial<LLMChatConfig>) => {
  settingsStore.updateLLMConfig(updates);
  localLLMConfig.value = { ...settingsStore.llmConfig };
};

const updateTTSServer = (id: string, updates: Partial<TTSServerConfig>) => {
  settingsStore.updateTTSServer(id, updates);
};

const editTTSServer = (server: TTSServerConfig) => {
  // TODO: 打开编辑对话框
  showToast('编辑TTS服务器功能开发中');
};

const testTTSServer = async (server: TTSServerConfig) => {
  if (server.type === 'browser') {
    showToast.success('✅ 浏览器TTS总是可用');
    return;
  }

  console.log('🔍 开始测试TTS服务器:', server.name);
  
  let loadingToast: any = null;
  try {
    loadingToast = showToast.loading({
      message: '正在测试连接...',
      forbidClick: true,
      duration: 0
    });
    const baseUrl = `${server.connection.protocol}://${server.connection.host}:${server.connection.port}`;
    const healthUrl = `${baseUrl}/health`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const startTime = Date.now();
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (loadingToast) {
      loadingToast.close();
    }

    if (response.ok) {
      showToast.success({
        message: `✅ 连接成功！\n响应时间: ${responseTime}ms`,
        duration: 3000
      });
      
      // 更新服务器状态
      settingsStore.updateTTSServer(server.id, {
        status: {
          health: 'available',
          latency: responseTime,
          lastCheckTime: Date.now()
        }
      });
    } else {
      showToast.fail({
        message: `❌ 连接失败\nHTTP ${response.status}`,
        duration: 3000
      });
    }
  } catch (error: any) {
    if (loadingToast) {
      loadingToast.close();
    }
    console.error('❌ TTS服务器测试失败:', error);
    
    if (error.name === 'AbortError') {
      showToast.fail({
        message: '❌ 连接超时（5秒）',
        duration: 3000
      });
    } else {
      showToast.fail({
        message: `❌ 连接失败\n${error.message || '未知错误'}`,
        duration: 3000
      });
    }
  }
};

const testLLMConnection = async () => {
  // 立即显示测试消息，确保函数被调用
  showToast({ type: 'loading', message: '测试中...', duration: 1000 });
  
  console.log('🔍 testLLMConnection 被调用了！');
  console.log('🔍 localLLMConfig.value:', localLLMConfig.value);
  console.log('🔍 apiUrl:', localLLMConfig.value?.apiUrl);
  
  // 等待一下，确保用户能看到反馈
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (!localLLMConfig.value?.apiUrl) {
    console.log('⚠️ API地址为空，显示提示');
    showToast({ type: 'fail', message: '请先填写API地址', duration: 2000 });
    return;
  }

  console.log('🔍 开始测试LLM连接:', localLLMConfig.value.apiUrl);
  
  let loadingToast: any = null;
  try {
    loadingToast = showToast.loading({
      message: '正在测试连接...',
      forbidClick: true,
      duration: 0
    });

    // 提取基础URL（去掉/api/chat等路径）
    let baseUrl = localLLMConfig.value.apiUrl || '';
    if (baseUrl.includes('/api/chat')) {
      baseUrl = baseUrl.replace('/api/chat', '');
    }
    
    console.log('🔍 测试URL:', baseUrl);
    
    // 使用已有的健康检查函数
    const status = await checkLLMAvailability(baseUrl, 5000);
    
    if (loadingToast) {
      loadingToast.close();
    }

    if (status.available) {
      llmConnectionStatus.value = `已连接 (${status.responseTime}ms, ${status.modelCount}个模型)`;
      llmStatusIcon.value = '✅';
      showToast.success({
        message: `✅ 连接成功！\n响应时间: ${status.responseTime}ms\n可用模型: ${status.modelCount}个`,
        duration: 3000
      });
    } else {
      llmConnectionStatus.value = `连接失败: ${status.error || '未知错误'}`;
      llmStatusIcon.value = '❌';
      showToast.fail({
        message: `❌ 连接失败\n${status.error || '未知错误'}\n响应时间: ${status.responseTime}ms`,
        duration: 3000
      });
    }
  } catch (error: any) {
    if (loadingToast) {
      loadingToast.close();
    }
    console.error('❌ LLM连接测试失败:', error);
    showToast.fail({
      message: `❌ 连接失败\n${error.message || '未知错误'}`,
      duration: 3000
    });
  }
};

const handleClose = () => {
  emit('update:modelValue', false);
};

const handleReset = async () => {
  try {
    await showConfirmDialog({
      title: '确认重置',
      message: '确定要重置所有设置为默认值吗？'
    });
    settingsStore.resetToDefaults();
    showToast('已重置为默认值');
  } catch {
    // 用户取消
  }
};

// TTS统计
const enabledTTSServers = computed(() => 
  settingsStore.ttsServers.filter(s => s.enabled).length
);

const availableTTSServers = computed(() => 
  settingsStore.ttsServers.filter(s => 
    s.enabled && s.status?.health === 'available'
  ).length
);

// 辅助函数 - 标签转换
const getGameModeLabel = (mode: string) => {
  const labels: Record<string, string> = {
    individual: '个人模式',
    team: '团队模式'
  };
  return labels[mode] || mode;
};

const getLLMProviderLabel = (provider: string) => {
  const labels: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Claude',
    custom: '自定义'
  };
  return labels[provider] || provider;
};

const getThemeLabel = (theme: string) => {
  const labels: Record<string, string> = {
    auto: '自动',
    light: '浅色',
    dark: '深色'
  };
  return labels[theme] || theme;
};

const getDifficultyLabel = (difficulty: string) => {
  const labels: Record<string, string> = {
    easy: '简单',
    normal: '普通',
    hard: '困难'
  };
  return labels[difficulty] || difficulty;
};

const getStrategyLabel = (strategy: string) => {
  const labels: Record<string, string> = {
    balanced: '平衡',
    aggressive: '激进',
    conservative: '保守'
  };
  return labels[strategy] || strategy;
};

const getServerTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    melo: 'MeLo',
    piper: 'Piper',
    azure: 'Azure',
    browser: '浏览器'
  };
  return labels[type] || type;
};

const getServerStatusIcon = (server: TTSServerConfig) => {
  if (!server.enabled) return '⚪';
  if (server.status?.health === 'checking') return '🔄';
  if (server.status?.health === 'available') return '✅';
  if (server.status?.health === 'unavailable') return '❌';
  return '❓';
};

// TTS添加服务器弹窗
const showAddTTSServer = ref(false);
</script>

<style scoped>
.settings-panel {
  height: 100%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
  border-radius: 16px;
}

.settings-header {
  flex-shrink: 0;
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
  background: #fff;
  z-index: 10;
}

.settings-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.settings-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0; /* 重要：允许flex子元素缩小 */
}

.settings-body .van-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.settings-body .van-tabs__wrap {
  flex-shrink: 0;
}

.settings-body .van-tabs__content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.settings-body .van-tab__panel {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* iOS平滑滚动 */
  display: flex;
  flex-direction: column;
}

.settings-header {
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
}

.settings-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.settings-content {
  height: 100%;
  overflow-y: auto;
  padding: 8px;
  background: #f7f8fa;
  -webkit-overflow-scrolling: touch; /* iOS平滑滚动 */
}

/* 状态图标 */
.status-icon {
  font-size: 18px;
  margin-right: 8px;
}

/* TTS摘要信息 */
.tts-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.tts-summary span {
  display: inline-block;
  margin-right: 16px;
}

/* TTS服务器项 */
.tts-server-item {
  margin-bottom: 8px;
  border-radius: 8px;
  overflow: hidden;
}

.tts-server-item.server-disabled {
  opacity: 0.6;
}

.server-status-icon {
  font-size: 18px;
  margin-right: 8px;
}

.server-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 分组间距 - 更紧凑 */
.van-cell-group {
  margin-bottom: 8px;
}

/* 单元格更紧凑 */
.van-cell {
  padding: 10px 16px;
}

.van-field {
  padding: 8px 16px;
}

.settings-footer {
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid #ebedf0;
  flex-shrink: 0;
  background: #fff;
  z-index: 10;
}

.tts-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>

