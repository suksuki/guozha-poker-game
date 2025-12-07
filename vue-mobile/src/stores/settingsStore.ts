/**
 * 设置模块 Pinia Store
 * 管理游戏设置、LLM配置、TTS配置等
 */

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { LLMChatConfig } from '../../../src/config/chatConfig';
import { DEFAULT_LLM_CHAT_CONFIG } from '../../../src/config/chatConfig';
import type { TTSServerConfig } from '../services/tts/types';
import { changeLanguage, getCurrentLanguage, type SupportedLocale } from '../i18n';

// ========== 游戏设置 ==========
export interface GameSettings {
  playerCount: number;
  gameMode: 'individual' | 'team';
  humanPlayerIndex: number;
  enableSoundEffects: boolean;
  enableVoiceChat: boolean;
  enableAnimations: boolean;
}

// ========== UI设置 ==========
export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  language: 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';
  showCardValues: boolean;
  compactMode: boolean;
}

// ========== AI设置 ==========
export interface AISettings {
  difficulty: 'easy' | 'normal' | 'hard';
  aiStrategy: 'balanced' | 'aggressive' | 'conservative';
  enableAIThinking: boolean;
  aiResponseDelay: number; // 毫秒
}

// ========== 语音播报设置 ==========
export interface VoicePlaybackSettings {
  enabled: boolean;  // 是否启用语音播报
  volume: number;     // 音量 (0-1)
  speed: number;      // 语速 (0.5-2.0)
  maxConcurrentPlayers: number;  // 最多同时播放的玩家数 (1-8)
  enableSystemAnnouncements: boolean;  // 是否启用系统播报
  enablePlayerChat: boolean;  // 是否启用玩家聊天播报
}

export const useSettingsStore = defineStore('settings', () => {
  // ========== 状态 ==========
  
  // 游戏设置
  const gameSettings = ref<GameSettings>({
    playerCount: 4,
    gameMode: 'individual',
    humanPlayerIndex: 0,
    enableSoundEffects: true,
    enableVoiceChat: true,
    enableAnimations: true
  });

  // UI设置
  const uiSettings = ref<UISettings>({
    theme: 'auto',
    fontSize: 'medium',
    language: 'zh-CN',
    showCardValues: true,
    compactMode: false
  });

  // AI设置
  const aiSettings = ref<AISettings>({
    difficulty: 'normal',
    aiStrategy: 'balanced',
    enableAIThinking: true,
    aiResponseDelay: 500
  });

  // LLM配置
  const llmConfig = ref<LLMChatConfig>({
    ...DEFAULT_LLM_CHAT_CONFIG
  });

  // TTS服务器列表
  const ttsServers = ref<TTSServerConfig[]>([]);

  // 语音播报设置
  const voicePlaybackSettings = ref<VoicePlaybackSettings>({
    enabled: true,
    volume: 1.0,
    speed: 1.0,
    maxConcurrentPlayers: 3,
    enableSystemAnnouncements: true,
    enablePlayerChat: true
  });

  // 设置面板是否打开
  const isSettingsOpen = ref(false);

  // ========== 计算属性 ==========
  
  const currentLLMProvider = computed(() => llmConfig.value.provider);
  const currentLLMUrl = computed(() => llmConfig.value.apiUrl || '');
  const currentLLMModel = computed(() => llmConfig.value.model || '');

  // ========== 方法 ==========
  
  /**
   * 初始化设置（从localStorage加载）
   */
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('game-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        gameSettings.value = { ...gameSettings.value, ...parsed.gameSettings };
        uiSettings.value = { ...uiSettings.value, ...parsed.uiSettings };
        aiSettings.value = { ...aiSettings.value, ...parsed.aiSettings };
        
        // 加载语言设置后立即应用
        if (uiSettings.value.language) {
          changeLanguage(uiSettings.value.language);
        }
      }

      const savedLLM = localStorage.getItem('llm-config');
      if (savedLLM) {
        llmConfig.value = { ...llmConfig.value, ...JSON.parse(savedLLM) };
      }

      const savedTTS = localStorage.getItem('tts-servers');
      if (savedTTS) {
        ttsServers.value = JSON.parse(savedTTS);
      }

      const savedVoicePlayback = localStorage.getItem('voice-playback-settings');
      if (savedVoicePlayback) {
        voicePlaybackSettings.value = { ...voicePlaybackSettings.value, ...JSON.parse(savedVoicePlayback) };
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  /**
   * 保存设置到localStorage
   */
  const saveSettings = () => {
    try {
      localStorage.setItem('game-settings', JSON.stringify({
        gameSettings: gameSettings.value,
        uiSettings: uiSettings.value,
        aiSettings: aiSettings.value
      }));
      localStorage.setItem('llm-config', JSON.stringify(llmConfig.value));
      localStorage.setItem('tts-servers', JSON.stringify(ttsServers.value));
      localStorage.setItem('voice-playback-settings', JSON.stringify(voicePlaybackSettings.value));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  /**
   * 更新游戏设置
   */
  const updateGameSettings = (updates: Partial<GameSettings>) => {
    gameSettings.value = { ...gameSettings.value, ...updates };
    saveSettings();
  };

  /**
   * 更新UI设置
   */
  const updateUISettings = (updates: Partial<UISettings>) => {
    uiSettings.value = { ...uiSettings.value, ...updates };
    
    // 如果语言改变，立即切换
    if (updates.language && updates.language !== getCurrentLanguage()) {
      changeLanguage(updates.language);
    }
    
    saveSettings();
  };

  /**
   * 更新AI设置
   */
  const updateAISettings = (updates: Partial<AISettings>) => {
    aiSettings.value = { ...aiSettings.value, ...updates };
    saveSettings();
  };

  /**
   * 更新LLM配置
   */
  const updateLLMConfig = (updates: Partial<LLMChatConfig>) => {
    llmConfig.value = { ...llmConfig.value, ...updates };
    saveSettings();
    
    // 如果AI Brain已初始化，触发重新初始化（延迟执行，避免频繁初始化）
    if ((window as any).__aiBrainReinitTimer) {
      clearTimeout((window as any).__aiBrainReinitTimer);
    }
    (window as any).__aiBrainReinitTimer = setTimeout(() => {
      // 通过事件通知gameStore重新初始化
      window.dispatchEvent(new CustomEvent('llm-config-updated', { detail: llmConfig.value }));
    }, 1000);
  };

  /**
   * 添加TTS服务器
   */
  const addTTSServer = (server: TTSServerConfig) => {
    // 验证必需字段
    if (server.type !== 'browser' && !server.connection) {
      console.error('[SettingsStore] 添加TTS服务器失败：缺少connection字段', server);
      throw new Error('TTS服务器配置不完整：缺少connection字段');
    }
    
    if (server.connection && (!server.connection.host || !server.connection.port)) {
      console.error('[SettingsStore] 添加TTS服务器失败：connection字段不完整', server);
      throw new Error('TTS服务器配置不完整：connection字段缺少host或port');
    }
    
    ttsServers.value.push(server);
    saveSettings();
  };

  /**
   * 更新TTS服务器
   */
  const updateTTSServer = (id: string, updates: Partial<TTSServerConfig>) => {
    const index = ttsServers.value.findIndex(s => s.id === id);
    if (index !== -1) {
      const existing = ttsServers.value[index];
      
      // 如果更新了connection，需要合并；否则保留现有的connection
      let connection = existing.connection;
      if (updates.connection) {
        if (existing.connection) {
          connection = {
            ...existing.connection,
            ...updates.connection
          };
        } else {
          connection = updates.connection;
        }
      }
      
      const updated = { 
        ...existing, 
        ...updates,
        connection  // 确保connection被正确设置
      };
      
      // 验证必需字段
      if (updated.type !== 'browser' && !updated.connection) {
        console.error('[SettingsStore] 更新TTS服务器失败：缺少connection字段', updated);
        throw new Error('TTS服务器配置不完整：缺少connection字段');
      }
      
      if (updated.connection && (!updated.connection.host || !updated.connection.port)) {
        console.error('[SettingsStore] 更新TTS服务器失败：connection字段不完整', updated);
        throw new Error('TTS服务器配置不完整：connection字段缺少host或port');
      }
      
      ttsServers.value[index] = updated;
      saveSettings();
    }
  };

  /**
   * 删除TTS服务器
   */
  const removeTTSServer = (id: string) => {
    ttsServers.value = ttsServers.value.filter(s => s.id !== id);
    saveSettings();
  };

  /**
   * 更新语音播报设置
   */
  const updateVoicePlaybackSettings = async (updates: Partial<VoicePlaybackSettings>) => {
    voicePlaybackSettings.value = { ...voicePlaybackSettings.value, ...updates };
    saveSettings();
    
    // 同步到音频服务
    try {
      const { getMultiChannelAudioService } = await import('../services/audio/multiChannelAudioService');
      const audioService = getMultiChannelAudioService();
      audioService.updateConfig({
        enabled: voicePlaybackSettings.value.enabled,
        maxConcurrentPlayers: voicePlaybackSettings.value.maxConcurrentPlayers,
        masterVolume: voicePlaybackSettings.value.volume
      });
    } catch (error) {
      console.error('[SettingsStore] 同步语音播报配置失败:', error);
    }
  };

  /**
   * 打开设置面板
   */
  const openSettings = () => {
    isSettingsOpen.value = true;
  };

  /**
   * 关闭设置面板
   */
  const closeSettings = () => {
    isSettingsOpen.value = false;
  };

  /**
   * 切换设置面板
   */
  const toggleSettings = () => {
    isSettingsOpen.value = !isSettingsOpen.value;
  };

  /**
   * 重置所有设置为默认值
   */
  const resetToDefaults = () => {
    gameSettings.value = {
      playerCount: 4,
      gameMode: 'individual',
      humanPlayerIndex: 0,
      enableSoundEffects: true,
      enableVoiceChat: true,
      enableAnimations: true
    };
    uiSettings.value = {
      theme: 'auto',
      fontSize: 'medium',
      language: 'zh-CN',
      showCardValues: true,
      compactMode: false
    };
    aiSettings.value = {
      difficulty: 'normal',
      aiStrategy: 'balanced',
      enableAIThinking: true,
      aiResponseDelay: 500
    };
    llmConfig.value = { ...DEFAULT_LLM_CHAT_CONFIG };
    ttsServers.value = [];
    voicePlaybackSettings.value = {
      enabled: true,
      volume: 1.0,
      speed: 1.0,
      maxConcurrentPlayers: 3,
      enableSystemAnnouncements: true,
      enablePlayerChat: true
    };
    saveSettings();
  };

  // 初始化时加载设置
  loadSettings();
  
  // 监听TTS服务器变化，同步到TTS服务
  watch(ttsServers, async (newServers) => {
    try {
      const { updateTTSServiceConfig } = await import('../services/tts/init');
      updateTTSServiceConfig(newServers);
    } catch (error) {
      console.error('[SettingsStore] 同步TTS配置失败:', error);
    }
  }, { deep: true });

  // 监听语音播报设置变化，同步到音频服务
  watch(voicePlaybackSettings, async (newSettings) => {
    try {
      const { getMultiChannelAudioService } = await import('../services/audio/multiChannelAudioService');
      const audioService = getMultiChannelAudioService();
      audioService.updateConfig({
        enabled: newSettings.enabled,
        maxConcurrentPlayers: newSettings.maxConcurrentPlayers,
        masterVolume: newSettings.volume
      });
    } catch (error) {
      console.error('[SettingsStore] 同步语音播报配置失败:', error);
    }
  }, { deep: true });

  return {
    // 状态
    gameSettings,
    uiSettings,
    aiSettings,
    llmConfig,
    ttsServers,
    voicePlaybackSettings,
    isSettingsOpen,
    
    // 计算属性
    currentLLMProvider,
    currentLLMUrl,
    currentLLMModel,
    
    // 方法
    loadSettings,
    saveSettings,
    updateGameSettings,
    updateUISettings,
    updateAISettings,
    updateLLMConfig,
    addTTSServer,
    updateTTSServer,
    removeTTSServer,
    updateVoicePlaybackSettings,
    openSettings,
    closeSettings,
    toggleSettings,
    resetToDefaults
  };
});

