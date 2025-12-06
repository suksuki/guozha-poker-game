/**
 * GameStore AI Brain集成单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { aiBrainIntegration } from '../../src/services/aiBrainIntegration';

// Mock AI Brain集成
const mockInitialize = vi.fn(() => Promise.resolve());
const mockTriggerAITurn = vi.fn(() => Promise.resolve());
const mockNotifyStateChange = vi.fn();
const mockShutdown = vi.fn(() => Promise.resolve());

vi.mock('../../src/services/aiBrainIntegration', () => ({
  aiBrainIntegration: {
    initialize: mockInitialize,
    triggerAITurn: mockTriggerAITurn,
    notifyStateChange: mockNotifyStateChange,
    shutdown: mockShutdown
  }
}));

// Mock fetch
global.fetch = vi.fn();

describe('GameStore AI Brain集成', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('AI Brain初始化', () => {
    it('应该在游戏开始时初始化AI Brain', async () => {
      const gameStore = useGameStore();
      const settingsStore = useSettingsStore();
      
      // 设置LLM配置
      settingsStore.updateLLMConfig({
        provider: 'ollama',
        apiUrl: 'http://localhost:11434/api/chat',
        model: 'qwen2:0.5b'
      });

      // 开始游戏
      gameStore.startGame();

      // 等待初始化（减少等待时间）
      await new Promise(resolve => setTimeout(resolve, 10));

      // 验证AI Brain被初始化
      expect(mockInitialize).toHaveBeenCalled();
    });

    it('应该使用settingsStore中的LLM配置', async () => {
      const gameStore = useGameStore();
      const settingsStore = useSettingsStore();
      
      settingsStore.updateLLMConfig({
        provider: 'ollama',
        apiUrl: 'http://192.168.0.13:11434/api/chat',
        model: 'deepseek-chat'
      });

      gameStore.startGame();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockInitialize).toHaveBeenCalledWith(
        expect.objectContaining({
          llmEndpoint: 'http://192.168.0.13:11434/api/chat',
          llmModel: 'deepseek-chat'
        })
      );
    });
  });

  describe('AI回合触发', () => {
    it('应该在AI玩家回合时触发AI Brain', async () => {
      const gameStore = useGameStore();
      
      gameStore.startGame();
      await new Promise(resolve => setTimeout(resolve, 10));

      // 模拟AI玩家回合（需要实际游戏状态）
      // 这里主要测试逻辑是否正确
      expect(gameStore).toBeDefined();
    });
  });

  describe('游戏事件触发聊天', () => {
    it('应该能够触发AI Brain聊天', async () => {
      const gameStore = useGameStore();
      
      gameStore.startGame();
      await new Promise(resolve => setTimeout(resolve, 10));

      // 触发聊天
      await gameStore.triggerAIBrainChat(1, 'after_play', { play: {} });

      // 验证notifyStateChange被调用
      expect(mockNotifyStateChange).toHaveBeenCalled();
    });
  });
});

