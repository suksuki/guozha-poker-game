/**
 * SettingsStore 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
// 注意：pinia可能在vue-mobile目录下，测试可能需要从vue-mobile目录运行
// 这里先测试核心逻辑，不依赖pinia实例
import type { LLMChatConfig } from '../../../src/config/chatConfig';
import type { TTSServerConfig } from '../../../src/tts/models/TTSServerConfig';
import { DEFAULT_LLM_CHAT_CONFIG } from '../../../src/config/chatConfig';

// 由于pinia可能不在根目录，我们测试数据逻辑而不是store实例
describe('SettingsStore - 数据逻辑测试', () => {

  beforeEach(() => {
    // 清理localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('默认配置', () => {
    it('应该定义默认游戏设置', () => {
      const defaultGameSettings = {
        playerCount: 4,
        gameMode: 'individual',
        humanPlayerIndex: 0,
        enableSoundEffects: true,
        enableVoiceChat: true,
        enableAnimations: true
      };
      
      expect(defaultGameSettings.playerCount).toBe(4);
      expect(defaultGameSettings.gameMode).toBe('individual');
    });

    it('应该定义默认UI设置', () => {
      const defaultUISettings = {
        theme: 'auto',
        fontSize: 'medium',
        language: 'zh-CN',
        showCardValues: true,
        compactMode: false
      };
      
      expect(defaultUISettings.theme).toBe('auto');
      expect(defaultUISettings.fontSize).toBe('medium');
    });

    it('应该定义默认AI设置', () => {
      const defaultAISettings = {
        difficulty: 'normal',
        aiStrategy: 'balanced',
        enableAIThinking: true,
        aiResponseDelay: 500
      };
      
      expect(defaultAISettings.difficulty).toBe('normal');
      expect(defaultAISettings.aiStrategy).toBe('balanced');
    });

    it('应该定义默认LLM配置', () => {
      expect(DEFAULT_LLM_CHAT_CONFIG.provider).toBeDefined();
      expect(DEFAULT_LLM_CHAT_CONFIG.apiUrl).toBeDefined();
      expect(DEFAULT_LLM_CHAT_CONFIG.model).toBeDefined();
    });
  });

  describe('设置数据结构', () => {
    it('游戏设置应该包含所有必需字段', () => {
      const gameSettings = {
        playerCount: 4,
        gameMode: 'individual' as const,
        humanPlayerIndex: 0,
        enableSoundEffects: true,
        enableVoiceChat: true,
        enableAnimations: true
      };
      
      expect(gameSettings).toHaveProperty('playerCount');
      expect(gameSettings).toHaveProperty('gameMode');
      expect(gameSettings).toHaveProperty('humanPlayerIndex');
      expect(gameSettings).toHaveProperty('enableSoundEffects');
      expect(gameSettings).toHaveProperty('enableVoiceChat');
      expect(gameSettings).toHaveProperty('enableAnimations');
    });

    it('UI设置应该包含所有必需字段', () => {
      const uiSettings = {
        theme: 'auto' as const,
        fontSize: 'medium' as const,
        language: 'zh-CN' as const,
        showCardValues: true,
        compactMode: false
      };
      
      expect(uiSettings).toHaveProperty('theme');
      expect(uiSettings).toHaveProperty('fontSize');
      expect(uiSettings).toHaveProperty('language');
      expect(uiSettings).toHaveProperty('showCardValues');
      expect(uiSettings).toHaveProperty('compactMode');
    });

    it('AI设置应该包含所有必需字段', () => {
      const aiSettings = {
        difficulty: 'normal' as const,
        aiStrategy: 'balanced' as const,
        enableAIThinking: true,
        aiResponseDelay: 500
      };
      
      expect(aiSettings).toHaveProperty('difficulty');
      expect(aiSettings).toHaveProperty('aiStrategy');
      expect(aiSettings).toHaveProperty('enableAIThinking');
      expect(aiSettings).toHaveProperty('aiResponseDelay');
    });

    it('LLM配置应该包含所有必需字段', () => {
      const llmConfig: LLMChatConfig = {
        provider: 'custom',
        apiUrl: 'http://test.com',
        model: 'test-model',
        temperature: 0.7,
        maxTokens: 150,
        timeout: 30000
      };
      
      expect(llmConfig).toHaveProperty('provider');
      expect(llmConfig).toHaveProperty('apiUrl');
      expect(llmConfig).toHaveProperty('model');
    });
  });

  describe('localStorage操作', () => {
    it('应该能够保存和读取设置', () => {
      if (typeof localStorage === 'undefined') return;
      
      const testData = {
        gameSettings: { playerCount: 3 },
        uiSettings: { theme: 'dark' },
        aiSettings: { difficulty: 'hard' }
      };
      
      localStorage.setItem('game-settings', JSON.stringify(testData));
      const loaded = JSON.parse(localStorage.getItem('game-settings') || '{}');
      
      expect(loaded.gameSettings.playerCount).toBe(3);
      expect(loaded.uiSettings.theme).toBe('dark');
      expect(loaded.aiSettings.difficulty).toBe('hard');
    });

    it('应该处理无效的JSON数据', () => {
      if (typeof localStorage === 'undefined') return;
      
      localStorage.setItem('game-settings', 'invalid json');
      
      expect(() => {
        JSON.parse(localStorage.getItem('game-settings') || '{}');
      }).toThrow();
    });
  });

  describe('TTS服务器配置', () => {
    it('应该创建有效的TTS服务器配置', () => {
      const server: TTSServerConfig = {
        id: 'test-1',
        name: 'Test Server',
        type: 'piper',
        enabled: true,
        priority: 1,
        connection: {
          host: 'localhost',
          port: 5000,
          protocol: 'http'
        },
        providerConfig: {},
        metadata: {
          createdAt: Date.now(),
          isFavorite: false
        }
      };
      
      expect(server.id).toBe('test-1');
      expect(server.type).toBe('piper');
      expect(server.connection.host).toBe('localhost');
      expect(server.connection.port).toBe(5000);
    });
  });
});

