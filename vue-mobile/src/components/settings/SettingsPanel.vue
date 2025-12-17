<template>
  <van-popup
    v-model:show="isOpen"
    position="center"
    :style="{ width: '90%', maxWidth: '500px', height: '85vh', maxHeight: '85vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }"
    closeable
    close-icon-position="top-right"
    @close="handleClose"
    :safe-area-inset-bottom="true"
    :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }"
  >
    <div class="settings-panel">
      <div class="settings-header">
        <h2>⚙️ 设置</h2>
        <button class="close-button" @click="handleClose" aria-label="关闭设置">
          ❌
        </button>
      </div>

      <div class="settings-body">
        <van-tabs v-model:active="activeTab" swipeable>
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
            <!-- 连接状态 -->
            <van-cell-group>
              <van-cell title="连接状态" :value="llmConnectionStatus">
                <template #icon>
                  <span class="status-icon">{{ llmStatusIcon }}</span>
                </template>
              </van-cell>
            </van-cell-group>

            <!-- LLM提供商选择 -->
            <van-cell-group title="📡 LLM提供商">
              <van-cell title="选择提供商">
                <template #value>
                  <van-radio-group 
                    v-model="localLLMConfig.provider"
                    direction="horizontal"
                    @change="handleProviderChange"
                  >
                    <van-radio name="ollama">Ollama</van-radio>
                    <van-radio name="openai">OpenAI</van-radio>
                    <van-radio name="claude">Claude</van-radio>
                    <van-radio name="custom">自定义</van-radio>
                  </van-radio-group>
                </template>
              </van-cell>
            </van-cell-group>

            <!-- Ollama服务器配置 -->
            <van-cell-group v-if="localLLMConfig.provider === 'ollama'" title="🖥️ Ollama服务器配置">
              <!-- 服务器类型 -->
              <van-cell title="服务器类型">
                <template #value>
                  <van-radio-group 
                    v-model="ollamaServerMode"
                    direction="horizontal"
                    @change="handleOllamaServerModeChange"
                  >
                    <van-radio name="local">本地</van-radio>
                    <van-radio name="lan">局域网</van-radio>
                    <van-radio name="custom">其他</van-radio>
                  </van-radio-group>
                </template>
              </van-cell>

              <!-- 局域网IP地址 -->
              <van-field
                v-if="ollamaServerMode === 'lan'"
                v-model="ollamaLanIP"
                label="IP地址"
                placeholder="0.13 或 192.168.0.13"
                @change="updateOllamaServerUrl"
              >
                <template #prefix>
                  <span style="color: #999;">192.168.</span>
                </template>
              </van-field>

              <!-- 自定义主机地址 -->
              <van-field
                v-if="ollamaServerMode === 'custom'"
                v-model="ollamaCustomHost"
                label="主机地址"
                placeholder="IP或域名"
                @change="updateOllamaServerUrl"
              />

              <!-- 端口（非本地模式） -->
              <van-field
                v-if="ollamaServerMode !== 'local'"
                v-model="ollamaPort"
                label="端口"
                type="number"
                placeholder="11434"
                @change="updateOllamaServerUrl"
              />

              <!-- 当前API地址显示 -->
              <van-cell title="当前API地址" :value="localLLMConfig.apiUrl || '未设置'" />

              <!-- 测试连接按钮 -->
              <van-cell>
                <van-button 
                  type="primary"
                  size="normal"
                  @click="testLLMConnection"
                  :loading="isTestingConnection"
                  block
                  round
                >
                  {{ isTestingConnection ? '测试中...' : '🔍 测试连接' }}
                </van-button>
              </van-cell>
            </van-cell-group>

            <!-- 非Ollama的API地址配置 -->
            <van-cell-group v-if="localLLMConfig.provider !== 'ollama'" title="🔗 API配置">
              <van-field
                v-model="localLLMConfig.apiUrl"
                label="API地址"
                placeholder="请输入API地址"
                @change="updateLLMConfig({ apiUrl: localLLMConfig.apiUrl })"
              >
                <template #button>
                  <van-button 
                    size="small" 
                    type="primary"
                    @click.stop="testLLMConnection"
                    :loading="isTestingConnection"
                  >
                    🔍 测试
                  </van-button>
                </template>
              </van-field>
            </van-cell-group>

            <!-- 模型选择 -->
            <van-cell-group title="🤖 模型配置">
              <van-cell title="当前选择" :value="localLLMConfig.model || '未选择'" />
              
              <!-- 刷新按钮 -->
              <van-cell>
                <van-button 
                  size="small" 
                  type="primary"
                  @click="refreshModels"
                  :loading="isLoadingModels"
                  block
                >
                  🔄 刷新模型列表
                </van-button>
              </van-cell>
              
              <!-- 加载中 -->
              <div v-if="isLoadingModels" class="model-loading">
                <van-loading>加载模型中...</van-loading>
              </div>
              
              <!-- 模型列表 - 直接显示，点击选择 -->
              <div v-else-if="availableModels.length > 0" class="models-list-container">
                <div class="models-list">
                  <van-button
                    v-for="model in availableModels"
                    :key="model"
                    :type="model === localLLMConfig.model ? 'primary' : 'default'"
                    size="small"
                    class="model-button"
                    :class="{ 'model-selected': model === localLLMConfig.model }"
                    @click="selectModel(model)"
                  >
                    {{ model }}
                  </van-button>
                </div>
              </div>
              
              <!-- 无法获取模型时，显示手动输入 -->
              <div v-else class="model-manual-input">
                <van-field
                  v-model="localLLMConfig.model"
                  label="手动输入模型名称"
                  placeholder="如: qwen2:0.5b 或 deepseek-chat"
                  @change="updateLLMConfig({ model: localLLMConfig.model })"
                >
                  <template #button>
                    <van-button 
                      size="small" 
                      type="primary"
                      @click="updateLLMConfig({ model: localLLMConfig.model })"
                    >
                      确定
                    </van-button>
                  </template>
                </van-field>
              </div>
            </van-cell-group>

            <!-- Ollama服务器管理 -->
            <van-cell-group v-if="localLLMConfig.provider === 'ollama'" title="🖥️ Ollama服务器管理">
              <van-cell 
                title="添加服务器" 
                is-link
                @click="showAddServerDialog = true"
              />
              
              <!-- 服务器列表 -->
              <van-cell
                v-for="server in ollamaServers"
                :key="server.id"
                :title="server.name"
                :label="`${server.host}:${server.port}`"
                :value="server.id === currentOllamaServerId ? '当前使用' : ''"
                is-link
                @click="switchOllamaServer(server.id)"
              >
                <template #right-icon>
                  <van-button
                    v-if="server.id !== 'local'"
                    size="mini"
                    type="danger"
                    @click.stop="removeOllamaServer(server.id)"
                  >
                    删除
                  </van-button>
                </template>
              </van-cell>
              
              <van-empty
                v-if="ollamaServers.length === 0"
                description="暂无服务器，点击上方添加"
              />
            </van-cell-group>

            <!-- LLM测试窗口 -->
            <van-cell-group title="🧪 大模型测试">
              <van-field
                v-model="testMessage"
                label="测试消息"
                placeholder="输入测试消息，如：你好，介绍一下自己"
                @keyup.enter="handleTestLLMChat"
              >
                <template #button>
                  <van-button 
                    size="small" 
                    type="primary"
                    @click="handleTestLLMChat"
                    :loading="isTestingLLM"
                    :disabled="!testMessage.trim() || !canTestLLM"
                  >
                    {{ isTestingLLM ? '测试中...' : '📤 发送' }}
                  </van-button>
                </template>
              </van-field>
              
              <div v-if="testError" class="test-error">
                <van-cell title="❌ 错误" :value="testError" />
              </div>
              
              <div v-if="testResponse" class="test-response">
                <van-cell title="🤖 模型回应" />
                <div class="test-response-content">{{ testResponse }}</div>
              </div>
            </van-cell-group>
            
            <!-- 添加服务器对话框 -->
            <van-dialog
              v-model:show="showAddServerDialog"
              title="添加Ollama服务器"
              show-cancel-button
              @confirm="handleAddOllamaServer"
              @cancel="() => { newServerName = ''; newServerHost = ''; newServerPort = 11434; }"
            >
              <van-form @submit="handleAddOllamaServer">
                <van-field
                  v-model="newServerName"
                  label="服务器名称"
                  placeholder="如: 办公室服务器"
                  clearable
                />
                <van-field
                  v-model="newServerHost"
                  label="主机地址"
                  placeholder="IP或域名"
                  required
                  clearable
                />
                <van-field
                  v-model.number="newServerPort"
                  label="端口"
                  type="number"
                  placeholder="11434"
                  required
                  clearable
                />
              </van-form>
            </van-dialog>

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
            <!-- 语音播报设置 -->
            <van-cell-group title="语音播报">
              <van-switch
                v-model="localVoicePlaybackSettings.enabled"
                title="启用语音播报"
                @change="updateVoicePlaybackSettings({ enabled: localVoicePlaybackSettings.enabled })"
              />
              <van-switch
                v-model="localVoicePlaybackSettings.enableSystemAnnouncements"
                title="系统播报"
                :disabled="!localVoicePlaybackSettings.enabled"
                @change="updateVoicePlaybackSettings({ enableSystemAnnouncements: localVoicePlaybackSettings.enableSystemAnnouncements })"
              />
              <van-switch
                v-model="localVoicePlaybackSettings.enablePlayerChat"
                title="玩家聊天"
                :disabled="!localVoicePlaybackSettings.enabled"
                @change="updateVoicePlaybackSettings({ enablePlayerChat: localVoicePlaybackSettings.enablePlayerChat })"
              />
              <van-cell title="音量">
                <template #value>
                  <van-slider
                    v-model="localVoicePlaybackSettings.volume"
                    :min="0"
                    :max="1"
                    :step="0.1"
                    :disabled="!localVoicePlaybackSettings.enabled"
                    @change="updateVoicePlaybackSettings({ volume: localVoicePlaybackSettings.volume })"
                  />
                  <span style="margin-left: 8px; min-width: 40px; display: inline-block;">
                    {{ Math.round(localVoicePlaybackSettings.volume * 100) }}%
                  </span>
                </template>
              </van-cell>
              <van-cell title="语速">
                <template #value>
                  <van-slider
                    v-model="localVoicePlaybackSettings.speed"
                    :min="0.5"
                    :max="2.0"
                    :step="0.1"
                    :disabled="!localVoicePlaybackSettings.enabled"
                    @change="updateVoicePlaybackSettings({ speed: localVoicePlaybackSettings.speed })"
                  />
                  <span style="margin-left: 8px; min-width: 40px; display: inline-block;">
                    {{ localVoicePlaybackSettings.speed.toFixed(1) }}x
                  </span>
                </template>
              </van-cell>
              <van-cell title="最大同时播放数">
                <template #value>
                  <van-stepper
                    v-model="localVoicePlaybackSettings.maxConcurrentPlayers"
                    :min="1"
                    :max="8"
                    :disabled="!localVoicePlaybackSettings.enabled"
                    @change="updateVoicePlaybackSettings({ maxConcurrentPlayers: localVoicePlaybackSettings.maxConcurrentPlayers })"
                  />
                </template>
                <template #label>
                  <div style="font-size: 12px; color: #969799; margin-top: 4px;">
                    最多支持{{ localVoicePlaybackSettings.maxConcurrentPlayers }}个玩家同时说话（1-8）
                  </div>
                </template>
              </van-cell>
              <van-cell title="支持声道数">
                <template #value>
                  <span style="color: #1989fa; font-weight: bold;">8个玩家声道 + 1个报牌声道</span>
                </template>
                <template #label>
                  <div style="font-size: 12px; color: #969799; margin-top: 4px;">
                    玩家0-7各占一个声道，报牌使用独立声道
                  </div>
                </template>
              </van-cell>
            </van-cell-group>

            <!-- 语音播报统计 -->
            <van-cell-group title="📊 实时统计" v-if="audioStats">
              <van-cell title="活跃通道数" :value="`${audioStats.activeChannels}/${localVoicePlaybackSettings.maxConcurrentPlayers + 1}`">
                <template #label>
                  <div style="font-size: 12px; color: #969799; margin-top: 4px;">
                    玩家通道: {{ audioStats.activeChannels }} / 报牌通道: 1
                  </div>
                </template>
              </van-cell>
              <van-cell title="队列总长度" :value="audioStats.totalQueueLength">
                <template #label>
                  <div style="font-size: 12px; color: #969799; margin-top: 4px;">
                    等待播放的消息数
                  </div>
                </template>
              </van-cell>
              <van-cell 
                v-if="audioStats.channelStates" 
                title="声道状态" 
                is-link
                @click="showChannelStates = !showChannelStates"
              >
                <template #value>
                  <span style="color: #1989fa;">{{ showChannelStates ? '收起' : '展开' }}</span>
                </template>
              </van-cell>
              <div v-if="showChannelStates && audioStats.channelStates" style="padding: 8px 16px; background: #f7f8fa;">
                <div 
                  v-for="[channel, state] in Array.from(audioStats.channelStates.entries())" 
                  :key="channel"
                  style="padding: 4px 0; font-size: 12px; display: flex; justify-content: space-between;"
                >
                  <span>{{ getChannelName(channel) }}:</span>
                  <span :style="{ color: state.isActive ? '#07c160' : '#969799' }">
                    {{ state.isActive ? '🔊 播放中' : '🔇 空闲' }}
                    <span v-if="state.queueLength > 0"> (队列: {{ state.queueLength }})</span>
                    <span v-if="state.currentPlayerId !== undefined"> [玩家{{ state.currentPlayerId }}]</span>
                  </span>
                </div>
              </div>
            </van-cell-group>

            <!-- TTS服务器状态摘要 -->
            <van-cell-group title="TTS服务器">
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
                  :label="`${getServerTypeLabel(server.type)} | ${server.connection?.host || 'N/A'}:${server.connection?.port || 'N/A'}`"
                  is-link
                  @click="editTTSServer(server)"
                >
                  <template #label>
                    <div>
                      <span>{{ getServerTypeLabel(server.type) }}</span>
                      <span v-if="server.connection"> | {{ server.connection.host }}:{{ server.connection.port }}</span>
                      <span v-else> | N/A</span>
                      <span v-if="server.assignedChannels && server.assignedChannels.length > 0">
                        | 声道: {{ server.assignedChannels.join(',') }}
                      </span>
                    </div>
                  </template>
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
              <van-cell :title="$t('settings.language')">
                <template #value>
                  <van-radio-group 
                    v-model="localUISettings.language"
                    direction="horizontal"
                    @change="updateUISettings({ language: localUISettings.language })"
                  >
                    <van-radio name="zh-CN">🇨🇳 中文</van-radio>
                    <van-radio name="en-US">🇺🇸 English</van-radio>
                    <van-radio name="ja-JP">🇯🇵 日本語</van-radio>
                    <van-radio name="ko-KR">🇰🇷 한국어</van-radio>
                  </van-radio-group>
                </template>
              </van-cell>
              <van-cell :title="$t('settings.theme')" :value="getThemeLabel(localUISettings.theme)">
                <template #value>
                  <van-radio-group 
                    v-model="localUISettings.theme"
                    direction="horizontal"
                    @change="updateUISettings({ theme: localUISettings.theme })"
                  >
                    <van-radio name="auto">{{ $t('settings.auto') }}</van-radio>
                    <van-radio name="light">{{ $t('settings.light') }}</van-radio>
                    <van-radio name="dark">{{ $t('settings.dark') }}</van-radio>
                  </van-radio-group>
                </template>
              </van-cell>
              <van-switch
                v-model="localUISettings.showCardValues"
                :title="$t('settings.showCardValues')"
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
    
    <!-- TTS服务器添加/编辑对话框 -->
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
import { showToast, showSuccessToast, showFailToast, showLoadingToast, showConfirmDialog } from 'vant';
import type { GameSettings, UISettings, AISettings } from '../../stores/settingsStore';
import type { LLMChatConfig } from '../../../../src/config/chatConfig';
import type { TTSServerConfig } from '../../services/tts/types';
import { checkLLMAvailability } from '../../../../src/utils/llmHealthCheck';
import { getAvailableOllamaModels, checkOllamaService } from '../../../../src/utils/llmModelService';
import { ollamaServerManager, type OllamaServerConfig } from '../../services/llm/ollamaServerManager';
import { getMultiChannelAudioService } from '../../services/audio/multiChannelAudioService';
import TTSServerDialog from './TTSServerDialog.vue';
import { useI18n } from '../../i18n/composable';

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

// 音频统计信息
const audioStats = ref<any>(null);
let audioStatsTimer: number | null = null;
const showChannelStates = ref(false);

// Ollama服务器配置
const ollamaServerMode = ref<'local' | 'lan' | 'custom'>('local');
const ollamaLanIP = ref('');
const ollamaCustomHost = ref('');
const ollamaPort = ref(11434);

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
      const baseUrl = newUrl.replace('/api/chat', '');
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
    const baseUrl = apiUrl.replace('/api/chat', '');
    
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
    console.error('获取模型列表失败:', error);
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
  
  console.log('🔍 开始测试TTS服务器:', {
    name: server.name,
    type: server.type,
    url: healthUrl,
    connection: server.connection
  });
  
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

    console.log('[TTS测试] 响应状态:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

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
          console.log('[TTS测试] MeLo TTS健康检查响应:', data);
          isHealthy = data.status === 'ok';
          
          if (!isHealthy) {
            console.warn('[TTS测试] 状态检查失败，返回的status不是"ok":', data);
          }
        } catch (e: any) {
          console.error('[TTS测试] JSON解析失败:', e);
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
      console.error('[TTS测试] HTTP错误:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
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
    
    console.error('❌ TTS服务器测试失败:', {
      error,
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      url: healthUrl
    });
    
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
    // 提取基础URL（去掉/api/chat等路径）
    let baseUrl = localLLMConfig.value.apiUrl || '';
    if (baseUrl.includes('/api/chat')) {
      baseUrl = baseUrl.replace('/api/chat', '');
    }
    
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
    console.error('❌ LLM连接测试失败:', error);
    showToast.fail({
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
    console.error('获取音频统计信息失败:', error);
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
  console.log('🔍 handleAddOllamaServer 被调用');
  console.log('🔍 newServerHost:', newServerHost.value);
  console.log('🔍 newServerName:', newServerName.value);
  console.log('🔍 newServerPort:', newServerPort.value);
  
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
    
    console.log('🔍 addServer 返回:', server);
    
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
    console.error('❌ 添加服务器失败:', error);
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
      console.error('[SettingsPanel] 同步TTS服务器失败:', err);
    });
  }
  showAddTTSServer.value = false;
};
</script>

<style scoped>
/* 全局覆盖 Vant 组件样式 */
:deep(.van-popup) {
  overflow: hidden !important;
}

:deep(.van-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.van-tabs__content) {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

:deep(.van-tab__panel) {
  height: 100%;
  overflow-y: auto !important;
  overflow-x: hidden !important;
}
.settings-panel {
  height: 85vh;
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
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #f0f0f0;
}

.close-button:active {
  background-color: #e0e0e0;
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
  height: 100%;
}

.settings-body .van-tabs__wrap {
  flex-shrink: 0;
}

.settings-body .van-tabs__content {
  flex: 1;
  overflow: hidden; /* 父容器隐藏，子元素滚动 */
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
}

.settings-body .van-tab__panel {
  flex: 1;
  overflow-y: auto !important; /* 强制启用滚动 */
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch; /* iOS平滑滚动 */
  min-height: 0; /* 重要：允许滚动 */
  height: 100%;
  max-height: 100%;
  position: relative;
  /* 确保滚动条可见 */
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

/* Webkit浏览器滚动条样式 */
.settings-body .van-tab__panel::-webkit-scrollbar {
  width: 8px;
}

.settings-body .van-tab__panel::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.settings-body .van-tab__panel::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.settings-body .van-tab__panel::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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
  width: 100%;
  padding: 8px;
  padding-bottom: 20px; /* 底部留出空间 */
  background: #f7f8fa;
  box-sizing: border-box;
  /* 移除 flex: 1，让内容自然撑开，由父容器滚动 */
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

/* 模型选择器样式 */
.model-selector {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.model-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebedf0;
}

.model-selector-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.model-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 模型列表容器 */
.models-list-container {
  padding: 8px 16px 16px;
}

.models-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.model-button {
  flex: 0 0 auto;
  min-width: 100px;
  margin: 0;
}

.model-button.model-selected {
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.3);
}

.model-loading {
  padding: 20px;
  text-align: center;
}

.model-manual-input {
  padding: 8px 16px;
}

.model-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.model-tag {
  cursor: pointer;
  transition: all 0.2s;
  margin: 4px;
}

.model-tag:active {
  transform: scale(0.95);
}

.model-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 测试窗口样式 */
.test-error {
  margin-top: 8px;
  padding: 8px;
  background: #fee;
  border-radius: 4px;
}

.test-response {
  margin-top: 8px;
}

.test-response-content {
  padding: 12px;
  background: #f7f8fa;
  border-radius: 4px;
  margin-top: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 200px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.5;
}
</style>

