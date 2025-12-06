/**
 * 聊天消息Store单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useChatStore } from '../../src/stores/chatStore';
import { setActivePinia, createPinia } from 'pinia';

// Mock多通道音频服务
vi.mock('../../src/services/multiChannelAudioService', () => {
  return {
    getMultiChannelAudioService: vi.fn(() => ({
      speak: vi.fn().mockResolvedValue(undefined)
    }))
  };
});

// Mock AI Brain集成
vi.mock('../../src/services/aiBrainIntegration', () => {
  return {
    aiBrainIntegration: {
      onCommunicationMessage: vi.fn((callback: any) => {
        // 存储回调以便测试时调用
        (global as any).__aiBrainCallback = callback;
      })
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

    it('应该能够接收AI Brain消息并触发TTS', async () => {
      const chatStore = useChatStore();
      chatStore.initializeAIBrainListener();

      // 模拟AI Brain发送消息
      const { getMultiChannelAudioService } = await import('../../src/services/multiChannelAudioService');
      const audioService = getMultiChannelAudioService();
      
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

        // 等待异步操作
        await new Promise(resolve => setTimeout(resolve, 10));

        // 验证消息已添加
        expect(chatStore.messages.length).toBeGreaterThan(0);
        expect(chatStore.messages[0].content).toBe('测试消息');

        // 验证TTS被调用
        expect(audioService.speak).toHaveBeenCalled();
      }
    });

    it('应该根据intent设置正确的优先级', async () => {
      const chatStore = useChatStore();
      chatStore.initializeAIBrainListener();

      const { getMultiChannelAudioService } = await import('../../src/services/multiChannelAudioService');
      const audioService = getMultiChannelAudioService();

      const callback = (global as any).__aiBrainCallback;
      if (callback) {
        // 测试对骂（priority = 3）
        callback({
          playerId: 1,
          content: '对骂消息',
          intent: 'taunt',
          timestamp: Date.now()
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        // 验证优先级为3
        expect(audioService.speak).toHaveBeenCalledWith(
          '对骂消息',
          undefined,
          1,
          3,
          expect.any(Object)
        );
      }
    });
  });
});

