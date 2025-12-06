/**
 * 设置模块 Pinia Store
 * 管理游戏设置、LLM配置、TTS配置等
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LLMChatConfig } from '../../../src/config/chatConfig';
import type { TTSServerConfig } from '../../../src/tts/models/TTSServerConfig';
import { DEFAULT_LLM_CHAT_CONFIG } from '../../../src/config/chatConfig';

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
      }

      const savedLLM = localStorage.getItem('llm-config');
      if (savedLLM) {
        llmConfig.value = { ...llmConfig.value, ...JSON.parse(savedLLM) };
      }

      const savedTTS = localStorage.getItem('tts-servers');
      if (savedTTS) {
        ttsServers.value = JSON.parse(savedTTS);
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
    ttsServers.value.push(server);
    saveSettings();
  };

  /**
   * 更新TTS服务器
   */
  const updateTTSServer = (id: string, updates: Partial<TTSServerConfig>) => {
    const index = ttsServers.value.findIndex(s => s.id === id);
    if (index !== -1) {
      ttsServers.value[index] = { ...ttsServers.value[index], ...updates };
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
    saveSettings();
  };

  // 初始化时加载设置
  loadSettings();

  return {
    // 状态
    gameSettings,
    uiSettings,
    aiSettings,
    llmConfig,
    ttsServers,
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
    openSettings,
    closeSettings,
    toggleSettings,
    resetToDefaults
  };
});

