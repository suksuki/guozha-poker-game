<template>
  <van-popup
    v-model:show="isOpen"
    position="bottom"
    class="settings-popup glass-dark"
    :style="{ height: '90%', maxHeight: '90%', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }"
    closeable
    close-icon-position="top-right"
    @close="handleClose"
    :safe-area-inset-bottom="true"
    :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }"
  >
    <div class="settings-panel">
      <div class="settings-header">
        <h2 class="header-title">
          <span class="icon">⚙️</span>
          <span>游戏设置</span>
        </h2>
      </div>

      <div class="settings-body">
        <van-tabs v-model:active="activeTab" animated swipeable background="transparent" title-active-color="#818cf8" title-inactive-color="rgba(255,255,255,0.6)" line-width="20px" line-height="3px">
          
          <!-- 游戏设置 -->
          <van-tab title="🎮 游戏" name="game">
            <div class="settings-content">
              <div class="setting-card">
                <h3 class="card-title">基础选项</h3>
                
                <div class="setting-row">
                  <div class="setting-label">
                    <span class="main-label">游戏模式</span>
                    <span class="sub-label">{{ getGameModeLabel(localGameSettings.gameMode) }}</span>
                  </div>
                  <div class="setting-control">
                     <van-radio-group 
                      v-model="localGameSettings.gameMode"
                      direction="horizontal"
                      class="custom-radio-group"
                      @change="updateGameSettings({ gameMode: localGameSettings.gameMode })"
                    >
                      <van-radio name="individual">个人</van-radio>
                      <van-radio name="team">团队</van-radio>
                    </van-radio-group>
                  </div>
                </div>

                <div class="setting-row">
                  <div class="setting-label">音效</div>
                  <van-switch
                    v-model="localGameSettings.enableSoundEffects"
                    active-color="#667eea"
                    inactive-color="rgba(255,255,255,0.2)"
                    size="24px"
                    @change="updateGameSettings({ enableSoundEffects: localGameSettings.enableSoundEffects })"
                  />
                </div>

                <div class="setting-row">
                  <div class="setting-label">语音聊天</div>
                  <van-switch
                    v-model="localGameSettings.enableVoiceChat"
                     active-color="#667eea"
                    inactive-color="rgba(255,255,255,0.2)"
                    size="24px"
                    @change="updateGameSettings({ enableVoiceChat: localGameSettings.enableVoiceChat })"
                  />
                </div>
              </div>
            </div>
          </van-tab>

          <!-- LLM配置 -->
          <van-tab title="🤖 LLM" name="llm">
            <div class="settings-content">
              
              <div class="setting-card">
                <div class="connection-status" :class="llmConnectionStatus.includes('已连接') ? 'status-connected' : 'status-disconnected'">
                  <div class="status-indicator"></div>
                  <span class="status-text">{{ llmConnectionStatus }}</span>
                </div>
              </div>

              <div class="setting-card">
                <h3 class="card-title">服务提供商</h3>
                <div class="provider-grid">
                  <div 
                    v-for="p in ['ollama', 'openai', 'claude', 'custom']" 
                    :key="p"
                    class="provider-item"
                    :class="{ active: localLLMConfig.provider === p }"
                    @click="() => { localLLMConfig.provider = p as any; handleProviderChange(); }"
                  >
                    <div class="provider-icon">
                       <span v-if="p==='ollama'">🦙</span>
                       <span v-else-if="p==='openai'">🧠</span>
                       <span v-else-if="p==='claude'">🤖</span>
                       <span v-else>⚙️</span>
                    </div>
                    <div class="provider-name">{{ getLLMProviderLabel(p) }}</div>
                  </div>
                </div>
              </div>

              <!-- Ollama专用配置 -->
              <div class="setting-card" v-if="localLLMConfig.provider === 'ollama'">
                <h3 class="card-title">Ollama 配置</h3>
                
                <div class="setting-row">
                   <div class="setting-label">连接模式</div>
                   <van-radio-group 
                      v-model="ollamaServerMode"
                      direction="horizontal"
                      class="custom-radio-group"
                      @change="handleOllamaServerModeChange"
                    >
                      <van-radio name="local">本地</van-radio>
                      <van-radio name="lan">局域网</van-radio>
                      <van-radio name="custom">自定义</van-radio>
                    </van-radio-group>
                </div>

                <div class="input-row" v-if="ollamaServerMode === 'lan'">
                  <van-field
                    v-model="ollamaLanIP"
                    label="IP地址"
                    placeholder="例如: 192.168.1.5"
                    @change="updateOllamaServerUrl"
                    class="glass-input"
                  />
                </div>

                <div class="input-row" v-if="ollamaServerMode === 'custom'">
                  <van-field
                    v-model="ollamaCustomHost"
                    label="主机"
                    placeholder="IP或域名"
                    @change="updateOllamaServerUrl"
                    class="glass-input"
                  />
                </div>

                 <div class="input-row" v-if="ollamaServerMode !== 'local'">
                  <van-field
                    v-model="ollamaPort"
                    label="端口"
                    type="number"
                    placeholder="11434"
                    @change="updateOllamaServerUrl"
                    class="glass-input"
                  />
                </div>
                
                <div class="setting-row">
                   <van-button size="small" type="primary" block @click="testLLMConnection" :loading="isTestingConnection">
                    测试连接
                   </van-button>
                </div>
              </div>

               <!-- API URL (非Ollama) -->
              <div class="setting-card" v-if="localLLMConfig.provider !== 'ollama'">
                 <h3 class="card-title">API 设置</h3>
                 <van-field
                    v-model="localLLMConfig.apiUrl"
                    label="API地址"
                    placeholder="https://api.example.com/v1"
                    @change="updateLLMConfig({ apiUrl: localLLMConfig.apiUrl })"
                    class="glass-input"
                  >
                    <template #button>
                       <van-button size="small" type="primary" @click="testLLMConnection" :loading="isTestingConnection">
                        测试
                       </van-button>
                    </template>
                  </van-field>
              </div>

              <!-- 模型选择 -->
              <div class="setting-card">
                 <div class="card-header-row">
                    <h3 class="card-title">模型</h3>
                    <van-button size="mini" icon="replay" type="primary" plain @click="refreshModels" :loading="isLoadingModels">刷新</van-button>
                 </div>

                 <div class="models-grid" v-if="availableModels.length > 0">
                    <div 
                      v-for="model in availableModels" 
                      :key="model"
                      class="model-chip"
                      :class="{ active: model === localLLMConfig.model }"
                      @click="selectModel(model)"
                    >
                      {{ model }}
                    </div>
                 </div>
                 <div v-else class="input-row">
                    <van-field
                      v-model="localLLMConfig.model"
                      label="模型名"
                      placeholder="输入模型名称"
                      class="glass-input"
                      @change="updateLLMConfig({ model: localLLMConfig.model })"
                    />
                 </div>
              </div>
              
              <div class="setting-card">
                <h3 class="card-title">功能开关</h3>
                <div class="setting-row">
                  <div class="setting-label">使用游戏上下文</div>
                  <van-switch v-model="localLLMConfig.enableContext" size="20px" active-color="#667eea" inactive-color="rgba(255,255,255,0.2)" @change="updateLLMConfig({ enableContext: localLLMConfig.enableContext })"/>
                </div>
                 <div class="setting-row">
                  <div class="setting-label">保留聊天历史</div>
                  <van-switch v-model="localLLMConfig.enableHistory" size="20px" active-color="#667eea" inactive-color="rgba(255,255,255,0.2)" @change="updateLLMConfig({ enableHistory: localLLMConfig.enableHistory })"/>
                </div>
              </div>

            </div>
          </van-tab>

           <!-- TTS配置 -->
          <van-tab title="🔊 TTS" name="tts">
            <div class="settings-content">
              <div class="setting-card">
                 <h3 class="card-title">语音合成</h3>
                 <div class="setting-row">
                    <div class="setting-label">启用TTS</div>
                    <van-switch
                      v-model="localVoicePlaybackSettings.enabled"
                      size="24px"
                      active-color="#667eea"
                      inactive-color="rgba(255,255,255,0.2)"
                      @change="updateVoicePlaybackSettings({ enabled: localVoicePlaybackSettings.enabled })"
                    />
                 </div>
                 
                 <template v-if="localVoicePlaybackSettings.enabled">
                    <div class="gap-16"></div>
                    <div class="setting-slider-row">
                      <div class="slider-label">音量 {{ Math.round(localVoicePlaybackSettings.volume * 100) }}%</div>
                      <van-slider 
                        v-model="localVoicePlaybackSettings.volume" 
                        :min="0" :max="1" :step="0.1" 
                        active-color="#667eea"
                        @change="updateVoicePlaybackSettings({ volume: localVoicePlaybackSettings.volume })"
                      />
                    </div>
                    
                    <div class="setting-slider-row">
                      <div class="slider-label">语速 {{ localVoicePlaybackSettings.speed.toFixed(1) }}x</div>
                      <van-slider 
                        v-model="localVoicePlaybackSettings.speed" 
                        :min="0.5" :max="2.0" :step="0.1"
                        active-color="#667eea" 
                        @change="updateVoicePlaybackSettings({ speed: localVoicePlaybackSettings.speed })"
                      />
                    </div>
                 </template>
              </div>

              <div class="setting-card">
                 <div class="card-header-row">
                   <h3 class="card-title">TTS服务器</h3>
                   <van-button size="mini" icon="plus" type="primary" @click="showAddTTSServer = true">添加</van-button>
                 </div>
                 
                 <div class="tts-list">
                    <div 
                      v-for="server in settingsStore.ttsServers" 
                      :key="server.id"
                      class="tts-server-card"
                      :class="{ disabled: !server.enabled }"
                      @click="editTTSServer(server)"
                    >
                      <div class="server-info">
                         <div class="server-name">
                           {{ server.name }}
                           <span class="server-tag">{{ getServerTypeLabel(server.type) }}</span>
                         </div>
                         <div class="server-status">
                            <span class="status-dot" :class="server.status?.health === 'available' ? 'dot-success' : 'dot-danger'"></span>
                            {{ server.status?.latency ? server.status.latency + 'ms' : '未知' }}
                         </div>
                      </div>
                      <div class="server-actions">
                         <van-switch 
                           :model-value="server.enabled" 
                           size="16px"
                           @click.stop
                           @update:model-value="(val) => updateTTSServer(server.id, { enabled: val })"
                         />
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </van-tab>

          <!-- UI设置 -->
          <van-tab title="🎨 UI" name="ui">
            <div class="settings-content">
               <div class="setting-card">
                 <h3 class="card-title">界面偏好</h3>
                 
                 <div class="setting-block">
                    <div class="block-label">语言</div>
                    <div class="language-grid">
                       <div 
                         v-for="lang in [['zh-CN','🇨🇳 中文'], ['en-US','🇺🇸 English'], ['ja-JP','🇯🇵 日本語'], ['ko-KR','🇰🇷 한국어']]" 
                         :key="lang[0]"
                         class="lang-chip"
                         :class="{ active: localUISettings.language === lang[0] }"
                         @click="updateUISettings({ language: lang[0] })"
                       >
                         {{ lang[1] }}
                       </div>
                    </div>
                 </div>

                 <div class="gap-16"></div>

                 <div class="setting-row">
                    <div class="setting-label">主题模式</div>
                    <van-radio-group 
                      v-model="localUISettings.theme"
                      direction="horizontal"
                      class="custom-radio-group"
                      @change="updateUISettings({ theme: localUISettings.theme })"
                    >
                      <van-radio name="auto">自动</van-radio>
                      <van-radio name="light">浅色</van-radio>
                      <van-radio name="dark">深色</van-radio>
                    </van-radio-group>
                 </div>
                 
                  <div class="setting-row">
                    <div class="setting-label">显示牌面数值</div>
                    <van-switch
                      v-model="localUISettings.showCardValues"
                      size="24px"
                      active-color="#667eea"
                      inactive-color="rgba(255,255,255,0.2)"
                      @change="updateUISettings({ showCardValues: localUISettings.showCardValues })"
                    />
                  </div>
               </div>
            </div>
          </van-tab>

           <!-- AI设置 -->
          <van-tab title="🧠 AI" name="ai">
             <div class="settings-content">
               <div class="setting-card">
                 <h3 class="card-title">AI 行为</h3>
                 
                 <div class="setting-block">
                   <div class="block-label">难度</div>
                   <div class="difficulty-options">
                      <div 
                        v-for="d in ['easy', 'normal', 'hard']" 
                        :key="d" 
                        class="diff-chip"
                        :class="[d, { active: localAISettings.difficulty === d }]"
                        @click="updateAISettings({ difficulty: d })"
                      >
                         <div class="diff-icon">
                           {{ d==='easy' ? '🌱' : (d==='normal' ? '⚖️' : '🔥') }}
                         </div>
                         <div class="diff-name">{{ getDifficultyLabel(d) }}</div>
                      </div>
                   </div>
                 </div>

                 <div class="gap-16"></div>

                 <div class="setting-block">
                    <div class="block-label">策略</div>
                     <van-radio-group 
                      v-model="localAISettings.aiStrategy"
                      direction="horizontal"
                      class="custom-radio-group"
                      @change="updateAISettings({ aiStrategy: localAISettings.aiStrategy })"
                    >
                      <van-radio name="balanced">平衡</van-radio>
                      <van-radio name="aggressive">激进</van-radio>
                      <van-radio name="conservative">保守</van-radio>
                    </van-radio-group>
                 </div>
               </div>

               <div class="setting-card">
                 <h3 class="card-title">打牌决策</h3>
                 <div class="setting-row">
                   <div class="setting-label">
                     <div>启用LLM决策</div>
                     <div class="setting-desc">使用LLM辅助打牌决策（关闭则仅使用MCTS，不影响聊天功能）</div>
                   </div>
                   <van-switch 
                     v-model="enableLLMDecision" 
                     size="24px" 
                     active-color="#667eea" 
                     inactive-color="rgba(255,255,255,0.2)" 
                     @change="handleEnableLLMDecisionChange"
                   />
                 </div>
               </div>
             </div>
          </van-tab>

        </van-tabs>
      </div>

      <div class="settings-footer">
        <van-button
          color="rgba(239, 68, 68, 0.2)"
          block
          size="normal"
          class="reset-btn"
          @click="handleReset"
        >
          <span style="color: #fca5a5;">🔄 重置为默认值</span>
        </van-button>
      </div>
    </div>
    
    <TTSServerDialog
      v-model="showAddTTSServer"
      :server="editingTTSServer || undefined"
      @confirm="handleAddTTSServer"
    />
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useSettingsStore, type VoicePlaybackSettings } from '../../stores/settingsStore';
import { showToast, showSuccessToast, showFailToast, showLoadingToast, showConfirmDialog, type TagType } from 'vant';
import type { GameSettings, UISettings, AISettings } from '../../stores/settingsStore';
import type { LLMChatConfig } from '../../core/config/chatConfig';
import type { TTSServerConfig, TTSProvider } from '../../services/tts/types';
import { checkLLMAvailability } from '../../core/utils/llmHealthCheck';
import { getAvailableOllamaModels, checkOllamaService } from '../../core/utils/llmModelService';
import { ollamaServerManager, type OllamaServerConfig } from '../../services/llm/ollamaServerManager';
import { getMultiChannelAudioService } from '../../services/audio/multiChannelAudioService';
import TTSServerDialog from './TTSServerDialog.vue';
import { useI18n } from '../../i18n/composable';
import { AIConfigStore } from '../../core/ai/config/AIConfigStore';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const settingsStore = useSettingsStore();
const { t } = useI18n();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const activeTab = ref('game');
const llmAdvancedOpen = ref<string[]>([]);

// 本地状态（用于双向绑定）
const localGameSettings = ref<GameSettings>({ ...settingsStore.gameSettings });
const localUISettings = ref<UISettings>({ ...settingsStore.uiSettings });
const localAISettings = ref<AISettings>({ ...settingsStore.aiSettings });
const localLLMConfig = ref<LLMChatConfig>({ ...settingsStore.llmConfig });
const localVoicePlaybackSettings = ref<VoicePlaybackSettings>({ ...settingsStore.voicePlaybackSettings });

// AI决策配置
const enableLLMDecision = ref(false);

// 音频统计信息
const audioStats = ref<any>(null);
let audioStatsTimer: number | null = null;
const showChannelStates = ref(false);

// Ollama服务器配置
const ollamaServerMode = ref<'local' | 'lan' | 'custom'>('local');
const ollamaLanIP = ref('');
const ollamaCustomHost = ref('');
const ollamaPort = ref(11434);
const showGameModePicker = ref(false);

// 模型选择
const showModelSelector = ref(false);
const availableModels = ref<string[]>([]);
const isLoadingModels = ref(false);
const manualModelName = ref('');
const isTestingConnection = ref(false);

// LLM测试
const testMessage = ref('');
const isTestingLLM = ref(false);
const testError = ref('');
const testResponse = ref('');

// 连接状态
const llmConnectionStatus = ref('未检测');
const llmStatusIcon = ref('⚪');

// Ollama服务器管理
const ollamaServers = ref<OllamaServerConfig[]>([]);
const currentOllamaServerId = ref('local');
const showAddServerDialog = ref(false);
const newServerName = ref('');
const newServerHost = ref('');
const newServerPort = ref(11434);

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
  if (val.provider === 'ollama') {
    initOllamaServerConfig();
  }
}, { deep: true });

watch(() => settingsStore.voicePlaybackSettings, (val) => {
  localVoicePlaybackSettings.value = { ...val };
}, { deep: true });

// 监听LLM配置变化，自动检测连接状态
watch(() => localLLMConfig.value.apiUrl, async (newUrl) => {
  if (newUrl && localLLMConfig.value.provider === 'ollama') {
    // 自动检测连接状态
    try {
      const baseUrl = newUrl.replace(/\/api\/(chat|generate)/, '');
      const isAvailable = await checkOllamaService(baseUrl);
      if (isAvailable) {
        llmConnectionStatus.value = '已连接';
        llmStatusIcon.value = '✅';
      } else {
        llmConnectionStatus.value = '未连接';
        llmStatusIcon.value = '❌';
      }
    } catch (e) {
      llmConnectionStatus.value = '检测失败';
      llmStatusIcon.value = '❓';
    }
  }
});

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

const updateVoicePlaybackSettings = (updates: Partial<VoicePlaybackSettings>) => {
  settingsStore.updateVoicePlaybackSettings(updates);
  localVoicePlaybackSettings.value = { ...settingsStore.voicePlaybackSettings };
};

const updateLLMConfig = (updates: Partial<LLMChatConfig>) => {
  settingsStore.updateLLMConfig(updates);
  localLLMConfig.value = { ...settingsStore.llmConfig };
};

// 处理LLM决策开关变化（通用配置，同时保存到两个模式）
const handleEnableLLMDecisionChange = (value: boolean) => {
  // enableLLMDecision是通用配置，同时保存到团队和单人模式
  AIConfigStore.saveConfig({ enableLLMDecision: value }, true);
  AIConfigStore.saveConfig({ enableLLMDecision: value }, false);
  showSuccessToast(value ? '已启用LLM打牌决策' : '已禁用LLM打牌决策（仅使用MCTS）');
};

// 初始化Ollama服务器配置
const initOllamaServerConfig = () => {
  const apiUrl = localLLMConfig.value.apiUrl || '';
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    ollamaServerMode.value = 'local';
  } else if (apiUrl.includes('192.168.')) {
    ollamaServerMode.value = 'lan';
    const match = apiUrl.match(/192\.168\.(\d+\.\d+)/);
    if (match) {
      ollamaLanIP.value = match[1];
    }
    const portMatch = apiUrl.match(/:(\d+)/);
    if (portMatch) {
      ollamaPort.value = parseInt(portMatch[1]) || 11434;
    }
  } else if (apiUrl) {
    ollamaServerMode.value = 'custom';
    try {
      const url = new URL(apiUrl);
      ollamaCustomHost.value = url.hostname;
      ollamaPort.value = parseInt(url.port) || 11434;
    } catch (e) {
      // 解析失败，保持默认值
    }
  }
};

// 更新Ollama服务器URL
const updateOllamaServerUrl = () => {
  let host = '';
  let port = ollamaPort.value || 11434;
  
  if (ollamaServerMode.value === 'local') {
    host = 'localhost';
  } else if (ollamaServerMode.value === 'lan') {
    const ip = ollamaLanIP.value.trim();
    if (ip.split('.').length === 2) {
      host = `192.168.${ip}`;
    } else {
      host = ip.startsWith('192.168.') ? ip : `192.168.${ip}`;
    }
  } else {
    host = ollamaCustomHost.value.trim();
  }
  
  if (host) {
    const apiUrl = `http://${host}:${port}/api/chat`;
    updateLLMConfig({ apiUrl });
  }
};

// 处理提供商变更
const handleProviderChange = () => {
  if (localLLMConfig.value.provider === 'ollama') {
    initOllamaServerConfig();
    // 自动加载模型列表
    refreshModels();
  }
  updateLLMConfig({ provider: localLLMConfig.value.provider });
};

// 处理Ollama服务器模式变更
const handleOllamaServerModeChange = () => {
  updateOllamaServerUrl();
  // 切换服务器后重新加载模型列表
  refreshModels();
};

// 刷新模型列表
const refreshModels = async () => {
  if (localLLMConfig.value.provider !== 'ollama') {
    return;
  }
  
  isLoadingModels.value = true;
  availableModels.value = [];
  
  try {
    const apiUrl = localLLMConfig.value.apiUrl || 'http://localhost:11434/api/chat';
    const baseUrl = apiUrl.replace(/\/api\/(chat|generate)/, '');
    
    // 检查服务是否可用
    const isAvailable = await checkOllamaService(baseUrl);
    if (!isAvailable) {
      showFailToast('无法连接到Ollama服务');
      return;
    }
    
    // 获取模型列表
    const models = await getAvailableOllamaModels(baseUrl);
    availableModels.value = models;
    
    if (models.length === 0) {
      showToast('未找到可用模型');
    }
  } catch (error: any) {
    showFailToast(`获取模型列表失败: ${error.message}`);
  } finally {
    isLoadingModels.value = false;
  }
};

// 选择模型
const selectModel = (model: string) => {
  if (!model.trim()) {
    showToast('请输入模型名称');
    return;
  }
  updateLLMConfig({ model: model.trim() });
  showModelSelector.value = false;
  manualModelName.value = '';
};

// 测试LLM聊天
const handleTestLLMChat = async () => {
  if (!testMessage.value.trim()) {
    showToast('请输入测试消息');
    return;
  }
  
  if (!localLLMConfig.value.apiUrl || !localLLMConfig.value.model) {
    showToast('请先配置API地址和模型');
    return;
  }
  
  isTestingLLM.value = true;
  testError.value = '';
  testResponse.value = '';
  
  try {
    const apiUrl = localLLMConfig.value.apiUrl;
    const model = localLLMConfig.value.model;
    
    // 使用 /api/chat 的 messages 格式
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: testMessage.value
          }
        ],
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    testResponse.value = data.message?.content || data.response || '无响应内容';
    showSuccessToast('测试成功');
  } catch (error: any) {
    testError.value = error.message || '未知错误';
    showFailToast(`测试失败: ${testError.value}`);
  } finally {
    isTestingLLM.value = false;
  }
};


const updateTTSServer = (id: string, updates: Partial<TTSServerConfig>) => {
  settingsStore.updateTTSServer(id, updates);
};

const editTTSServer = (server: TTSServerConfig) => {
  editingTTSServer.value = server;
  showAddTTSServer.value = true;
};

const testTTSServer = async (server: TTSServerConfig) => {
  if (server.type === 'browser') {
    showSuccessToast('✅ 浏览器TTS总是可用');
    return;
  }

  if (!server.connection) {
    showFailToast('服务器配置不完整');
    return;
  }

  const baseUrl = `${server.connection.protocol}://${server.connection.host}:${server.connection.port}`;
  const healthUrl = `${baseUrl}/health`;
  

  let loadingToast: any = null;
  try {
    loadingToast = showLoadingToast({
      message: '正在测试连接...',
      forbidClick: true,
      duration: 0
    });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const startTime = Date.now();
    let response: Response;
    try {
      response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors' // 明确指定CORS模式
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;


    if (loadingToast) {
      loadingToast.close();
    }

    if (response.ok) {
      // 对于MeLo TTS，检查返回的JSON中status是否为'ok'
      let isHealthy = true;
      let healthData: any = null;
      
      if (server.type === 'melo') {
        try {
          const data = await response.json();
          healthData = data;
          isHealthy = data.status === 'ok';
          
          if (!isHealthy) {
          }
        } catch (e: any) {
          // 如果JSON解析失败，仍然认为响应ok就是健康的
          isHealthy = true;
        }
      } else if (server.type === 'piper') {
        // Piper TTS可能没有JSON响应，只要HTTP 200就认为可用
        isHealthy = true;
      }
      
      if (isHealthy) {
        const message = healthData 
          ? `✅ 连接成功！\n服务: ${healthData.service || 'TTS'}\n响应时间: ${responseTime}ms`
          : `✅ 连接成功！\n响应时间: ${responseTime}ms`;
        
        showSuccessToast({
          message,
          duration: 3000
        });
        
        // 更新服务器状态
        settingsStore.updateTTSServer(server.id, {
          status: {
            health: 'available',
            latency: responseTime,
            lastCheck: Date.now()
          }
        });
      } else {
        showFailToast({
          message: `❌ 服务不可用\n状态检查失败`,
          duration: 3000
        });
        
        settingsStore.updateTTSServer(server.id, {
          status: {
            health: 'unavailable',
            latency: responseTime,
            lastCheck: Date.now()
          }
        });
      }
    } else {
      const errorText = await response.text().catch(() => '');
      showFailToast({
        message: `❌ 连接失败\nHTTP ${response.status}: ${response.statusText}`,
        duration: 3000
      });
      
      settingsStore.updateTTSServer(server.id, {
        status: {
          health: 'unavailable',
          lastCheck: Date.now()
        }
      });
    }
  } catch (error: any) {
    if (loadingToast) {
      loadingToast.close();
    }
    
    let errorMessage = '未知错误';
    if (error.name === 'AbortError') {
      errorMessage = '连接超时（5秒）';
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.toString) {
      errorMessage = error.toString();
    }
    
    // 检查是否是CORS错误
    if (errorMessage.includes('CORS') || errorMessage.includes('cors') || 
        errorMessage.includes('fetch') || errorMessage.includes('network')) {
      errorMessage = '网络错误或CORS问题\n请检查服务器CORS配置';
    }
    
    showFailToast({
      message: `❌ 连接失败\n${errorMessage}`,
      duration: 4000
    });
    
    settingsStore.updateTTSServer(server.id, {
      status: {
        health: 'unavailable',
        lastCheck: Date.now()
      }
    });
  }
};

const testLLMConnection = async () => {
  if (isTestingConnection.value) return;
  
  // 如果是Ollama，先确保API地址已设置
  if (localLLMConfig.value.provider === 'ollama' && !localLLMConfig.value.apiUrl) {
    // 自动生成API地址
    updateOllamaServerUrl();
  }
  
  if (!localLLMConfig.value?.apiUrl) {
    showFailToast('请先配置服务器地址');
    return;
  }

  isTestingConnection.value = true;
  llmConnectionStatus.value = '检测中...';
  llmStatusIcon.value = '🔄';
  
  try {
    // 提取基础URL（去掉/api/chat或/api/generate等路径）
    let baseUrl = localLLMConfig.value.apiUrl || '';
    baseUrl = baseUrl.replace(/\/api\/(chat|generate)/, '');
    
    // 使用已有的健康检查函数（超时时间3秒）
    const status = await checkLLMAvailability(baseUrl, 3000);
    
    if (status.available) {
      llmConnectionStatus.value = `已连接 (${status.responseTime}ms, ${status.modelCount}个模型)`;
      llmStatusIcon.value = '✅';
      showSuccessToast({
        message: `✅ 连接成功！\n响应时间: ${status.responseTime}ms\n可用模型: ${status.modelCount}个`,
        duration: 3000
      });
      
      // 连接成功后自动刷新模型列表
      if (localLLMConfig.value.provider === 'ollama') {
        refreshModels();
      }
    } else {
      llmConnectionStatus.value = `连接失败: ${status.error || '未知错误'}`;
      llmStatusIcon.value = '❌';
      showFailToast({
        message: `❌ 连接失败\n${status.error || '未知错误'}`,
        duration: 3000
      });
    }
  } catch (error: any) {
    llmConnectionStatus.value = `连接失败: ${error.message || '未知错误'}`;
    llmStatusIcon.value = '❌';
    showFailToast({
      message: `❌ 连接失败\n${error.message || '未知错误'}`,
      duration: 3000
    });
  } finally {
    isTestingConnection.value = false;
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

// 更新音频统计信息
const updateAudioStats = () => {
  try {
    const audioService = getMultiChannelAudioService();
    audioStats.value = audioService.getStatistics();
  } catch (error) {
  }
};

// 当TTS标签页激活时，开始更新统计信息
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'tts') {
    updateAudioStats();
    audioStatsTimer = window.setInterval(updateAudioStats, 1000);
  } else {
    if (audioStatsTimer !== null) {
      clearInterval(audioStatsTimer);
      audioStatsTimer = null;
    }
  }
});

// 组件卸载时清理定时器
onUnmounted(() => {
  if (audioStatsTimer !== null) {
    clearInterval(audioStatsTimer);
    audioStatsTimer = null;
  }
});

// 获取声道名称
const getChannelName = (channel: number): string => {
  const channelNames: Record<number, string> = {
    0: '玩家0（左）',
    1: '玩家1（右）',
    2: '玩家2（左中）',
    3: '玩家3（右中）',
    4: '玩家4（左环绕）',
    5: '玩家5（右环绕）',
    6: '玩家6（左后）',
    7: '玩家7（右后）',
    8: '报牌（中央）'
  };
  return channelNames[channel] || `声道${channel}`;
};

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
    ollama: 'Ollama',
    openai: 'OpenAI',
    claude: 'Claude',
    custom: '自定义'
  };
  return labels[provider] || provider;
};

// Ollama服务器管理
const loadOllamaServers = () => {
  ollamaServers.value = ollamaServerManager.getAllServers();
  currentOllamaServerId.value = ollamaServerManager.getCurrentServer().id;
};

const switchOllamaServer = (serverId: string) => {
  if (ollamaServerManager.setCurrentServer(serverId)) {
    const server = ollamaServerManager.getCurrentServer();
    const apiUrl = `${server.protocol}://${server.host}:${server.port}/api/chat`;
    updateLLMConfig({ apiUrl });
    loadOllamaServers();
    refreshModels();
    showSuccessToast('已切换到: ' + server.name);
  }
};

const removeOllamaServer = async (serverId: string) => {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除此服务器吗？'
    });
    
    if (ollamaServerManager.removeServer(serverId)) {
      loadOllamaServers();
      showSuccessToast('服务器已删除');
    }
  } catch {
    // 用户取消
  }
};

const handleAddOllamaServer = async () => {
  
  if (!newServerHost.value || !newServerHost.value.trim()) {
    showFailToast('请输入主机地址');
    return;
  }
  
  try {
    const server = ollamaServerManager.addServer({
      name: newServerName.value.trim() || `${newServerHost.value}:${newServerPort.value}`,
      host: newServerHost.value.trim(),
      port: Number(newServerPort.value) || 11434,
      protocol: 'http'
    });
    
    
    if (server) {
      loadOllamaServers();
      // 自动切换到新服务器
      switchOllamaServer(server.id);
      showSuccessToast('服务器已添加');
      
      // 清空表单
      newServerName.value = '';
      newServerHost.value = '';
      newServerPort.value = 11434;
      showAddServerDialog.value = false;
    } else {
      showFailToast('添加服务器失败，请检查输入');
    }
  } catch (error: any) {
    showFailToast(`添加失败: ${error.message || '未知错误'}`);
  }
};

// 计算是否可以测试（只要有API地址和模型就可以测试，不需要等待连接状态）
const canTestLLM = computed(() => {
  return !!(localLLMConfig.value.apiUrl && localLLMConfig.value.model);
});

// 组件挂载时初始化
onMounted(() => {
  if (localLLMConfig.value.provider === 'ollama') {
    initOllamaServerConfig();
    loadOllamaServers();
    refreshModels();
  }
  // 加载AI决策配置（通用配置，从任意模式加载都可以）
  const aiConfig = AIConfigStore.loadConfig(true);
  enableLLMDecision.value = aiConfig.enableLLMDecision ?? false;
});

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
const editingTTSServer = ref<TTSServerConfig | null>(null);

const handleAddTTSServer = (server: Partial<TTSServerConfig>) => {
  if (editingTTSServer.value) {
    // 更新现有服务器 - 确保connection字段完整
    const updates: Partial<TTSServerConfig> = { ...server };
    if (server.connection) {
      updates.connection = {
        ...editingTTSServer.value.connection,
        ...server.connection
      };
    }
    settingsStore.updateTTSServer(editingTTSServer.value.id, updates);
    editingTTSServer.value = null;
  } else {
    // 添加新服务器 - 确保connection字段完整
    if (!server.connection) {
      showFailToast('服务器配置不完整：缺少connection字段');
      return;
    }
    
    const newServer: TTSServerConfig = {
      id: server.id || `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: server.name || '新TTS服务器',
      type: (server.type || 'browser') as TTSProvider,
      enabled: server.enabled ?? true,
      priority: server.priority ?? 3,
      connection: {
        host: server.connection.host || 'localhost',
        port: server.connection.port || (server.type === 'melo' ? 7860 : 5000),
        protocol: server.connection.protocol || 'http'
      },
      providerConfig: server.providerConfig
    };
    settingsStore.addTTSServer(newServer);
    
    // 同步到TTS服务
    import('../../services/tts/ttsService').then(({ getTTSService }) => {
      const ttsService = getTTSService();
      ttsService.addServer(newServer);
    }).catch(err => {
    });
  }
  showAddTTSServer.value = false;
};
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%);
  color: #fff;
}

.settings-header {
  padding: 24px;
  background: rgba(0,0,0,0.2);
  backdrop-filter: blur(10px);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(90deg, #fff, #a5b4fc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.settings-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  max-height: calc(100vh - 200px);
  padding-bottom: 32px;
}

.setting-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 16px;
}

.card-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header-row .card-title {
  margin-bottom: 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  min-height: 48px;
}

.setting-slider-row {
  margin-bottom: 16px;
}

.slider-label {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 8px;
}

.setting-label {
  display: flex;
  flex-direction: column;
}

.setting-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
  line-height: 1.4;
}

.main-label {
  font-size: 16px;
  font-weight: 500;
}

.sub-label {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
}

/* Custom Radio UI */
.custom-radio-group {
  gap: 8px;
}

:deep(.van-radio) {
  margin-right: 12px;
}

:deep(.van-radio__label) {
  color: rgba(255,255,255,0.8) !important;
}

:deep(.van-radio__icon--checked .van-icon) {
  background-color: #667eea;
  border-color: #667eea;
}

/* Provider Grid */
.provider-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.provider-item {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-item.active {
  background: rgba(102, 126, 234, 0.2);
  border-color: #667eea;
}

.provider-icon {
  font-size: 24px;
}

.provider-name {
  font-size: 14px;
  font-weight: 600;
}

/* Input Styles */
.input-row {
  margin-bottom: 12px;
}

.glass-input {
  background: rgba(0,0,0,0.2) !important;
  border-radius: 8px;
}

:deep(.van-field__control) {
  color: #fff !important;
}

:deep(.van-field__label) {
  color: rgba(255,255,255,0.6) !important;
}

/* Models Grid */
.models-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.model-chip {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
}

.model-chip.active {
  background: #667eea;
  color: #fff;
  font-weight: bold;
}

/* Difficulty Chips */
.difficulty-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.diff-chip {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.diff-chip.active {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
}

.diff-chip.easy.active { border-color: #4ade80; color: #4ade80; background: rgba(74, 222, 128, 0.1); }
.diff-chip.normal.active { border-color: #facc15; color: #facc15; background: rgba(250, 204, 21, 0.1); }
.diff-chip.hard.active { border-color: #f87171; color: #f87171; background: rgba(248, 113, 113, 0.1); }

.diff-icon { font-size: 24px; }
.diff-name { font-size: 12px; font-weight: bold; }

/* Language Grid */
.language-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.lang-chip {
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
}

.lang-chip.active {
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid #667eea;
}

/* TTS List */
.tts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tts-server-card {
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tts-server-card.disabled {
  opacity: 0.6;
}

.server-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.server-name {
  font-weight: bold;
  font-size: 14px;
}

.server-tag {
  font-size: 10px;
  background: rgba(255,255,255,0.1);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  color: rgba(255,255,255,0.6);
}

.server-status {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #666; }
.dot-success { background: #4ade80; }
.dot-danger { background: #f87171; }

.connection-status {
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.status-connected {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.status-disconnected {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
}

.gap-16 { height: 16px; }

.reset-btn {
  border: 1px solid rgba(239, 68, 68, 0.4) !important;
}
</style>
