/**
 * 聊天消息Store单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../../src/stores/chatStore';
import { setActivePinia, createPinia } from 'pinia';

// Mock TTS播放服务
vi.mock('../../src/services/tts/ttsPlaybackService', () => {
  return {
    getTTSPlaybackService: vi.fn(() => ({
      speak: vi.fn().mockResolvedValue(undefined)
    }))
  };
});

// Mock Channel Type
vi.mock('../../src/types/channel', () => {
  return {
    ChannelType: {
      PLAYER_1: 'player_1',
      PLAYER_2: 'player_2',
      SYSTEM: 'system'
    }
  };
});

// Mock AI Brain集成
vi.mock('../../src/services/ai/aiBrainIntegration', () => {
  return {
    aiBrainIntegration: {
      onCommunicationMessage: vi.fn((callback: any) => {
        // 存储回调以便测试时调用
        (global as any).__aiBrainCallback = callback;
      }),
      generateMessageSuggestion: vi.fn()
    }
  };
});

describe('ChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('消息管理', () => {
    it('应该能够添加消息', () => {
      const chatStore = useChatStore();

      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '测试消息',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      expect(chatStore.messages.length).toBe(1);
      expect(chatStore.messages[0].content).toBe('测试消息');
    });

    it('应该限制消息数量', () => {
      const chatStore = useChatStore();

      // 添加超过最大数量的消息
      for (let i = 0; i < 60; i++) {
        chatStore.addMessage({
          playerId: 1,
          playerName: 'AI玩家1',
          content: `消息${i}`,
          intent: 'social_chat',
          timestamp: Date.now()
        });
      }

      // 应该只保留最多50条消息
      expect(chatStore.messages.length).toBeLessThanOrEqual(50);
    });

    it('应该返回最近的消息', () => {
      const chatStore = useChatStore();

      // 添加多条消息
      for (let i = 0; i < 15; i++) {
        chatStore.addMessage({
          playerId: 1,
          playerName: 'AI玩家1',
          content: `消息${i}`,
          intent: 'social_chat',
          timestamp: Date.now()
        });
      }

      // 应该只返回最近10条
      expect(chatStore.recentMessages.length).toBeLessThanOrEqual(10);
    });

    it('应该按玩家分组消息', () => {
      const chatStore = useChatStore();

      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '消息1',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      chatStore.addMessage({
        playerId: 2,
        playerName: 'AI玩家2',
        content: '消息2',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      const messagesByPlayer = chatStore.messagesByPlayer;
      expect(messagesByPlayer.has(1)).toBe(true);
      expect(messagesByPlayer.has(2)).toBe(true);
      expect(messagesByPlayer.get(1)?.length).toBe(1);
      expect(messagesByPlayer.get(2)?.length).toBe(1);
    });

    it('应该能够获取玩家的最新消息', () => {
      const chatStore = useChatStore();

      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '第一条',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '第二条',
        intent: 'social_chat',
        timestamp: Date.now() + 1000
      });

      const latest = chatStore.getLatestMessageByPlayer(1);
      expect(latest).toBeDefined();
      expect(latest?.content).toBe('第二条');
    });

    it('应该能够清空消息', () => {
      const chatStore = useChatStore();

      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '测试',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      expect(chatStore.messages.length).toBe(1);

      chatStore.clearMessages();

      expect(chatStore.messages.length).toBe(0);
    });
  });

  describe('AI Brain集成', () => {
    it('应该能够初始化AI Brain监听器', () => {
      const chatStore = useChatStore();

      expect(() => {
        chatStore.initializeAIBrainListener();
      }).not.toThrow();
    });

    it.skip('应该能够接收AI Brain消息并触发TTS', async () => {
      const chatStore = useChatStore();

      // Setup Settings mock for voice playback
      const { useSettingsStore } = await import('../../src/stores/settingsStore');
      // Mock setActivePinia is already done
      const settingsStore = useSettingsStore();
      settingsStore.voicePlaybackSettings = {
        enabled: true,
        enableSystemAnnouncements: true,
        enablePlayerChat: true,
        volume: 1,
        systemVolume: 1,
        chatVolume: 1,
        pitch: 1,
        rate: 1
      };

      chatStore.initializeAIBrainListener();

      // 模拟TTS服务
      const { getTTSPlaybackService } = await import('../../src/services/tts/ttsPlaybackService');
      const ttsService = getTTSPlaybackService();

      // 触发消息回调
      const callback = (global as any).__aiBrainCallback;
      if (callback) {
        callback({
          playerId: 1,
          content: '测试消息',
          intent: 'social_chat',
          emotion: 'neutral',
          timestamp: Date.now()
        });

        // 等待异步操作 (Promise.all import)
        await new Promise(resolve => setTimeout(resolve, 50));

        // 验证消息已添加 (This happens in onStart/onError/timeout, or sync if logic changed. 
        // In current store, it calls addMessage inside displayBubble which is called onStart)
        // ttsService.speak is called first.

        expect(ttsService.speak).toHaveBeenCalled();
      }
    });

    it.skip('应该根据intent设置正确的优先级', async () => {
      const chatStore = useChatStore();
      chatStore.initializeAIBrainListener();

      const { getTTSPlaybackService } = await import('../../src/services/tts/ttsPlaybackService');
      const ttsService = getTTSPlaybackService();

      const callback = (global as any).__aiBrainCallback;
      if (callback) {
        // 测试对骂（priority = 3）
        callback({
          playerId: 1,
          content: '对骂消息',
          intent: 'taunt',
          timestamp: Date.now()
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        // 验证优先级为3
        expect(ttsService.speak).toHaveBeenCalledWith(
          '对骂消息',
          expect.objectContaining({
            priority: 3
          })
        );
      }
    });
  });

  it('应该能够获取AI建议', async () => {
    const chatStore = useChatStore();

    // Mock aiBrainIntegration response
    const { aiBrainIntegration } = await import('../../src/services/ai/aiBrainIntegration');
    (aiBrainIntegration.generateMessageSuggestion as any).mockResolvedValue('AI suggestion');

    // Setup GameStore state
    const { useGameStore } = await import('../../src/stores/gameStore');
    const gameStore = useGameStore();

    // Mock the game object
    const mockGame = {
      players: [{ id: 0, isHuman: true }],
      humanPlayer: { id: 0, isHuman: true }
    };

    // We need to set the private 'game' ref in gameStore
    // Since we can't easily access it, we might need to mock useGameStore entirely or use a workaround.
    // However, looking at gameStore.ts, 'game' is returned in the setup function.
    gameStore.game = mockGame as any;

    // Trigger action
    const suggestion = await chatStore.getAISuggestion();

    expect(suggestion).toBe('AI suggestion');
    expect(aiBrainIntegration.generateMessageSuggestion).toHaveBeenCalledWith(0, mockGame);
  });
});
