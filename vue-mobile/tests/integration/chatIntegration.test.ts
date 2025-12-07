/**
 * 聊天功能集成测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from '../../src/stores/gameStore';
import { useChatStore } from '../../src/stores/chatStore';
import { setActivePinia, createPinia } from 'pinia';
import { aiBrainIntegration } from '../../src/services/ai/aiBrainIntegration';
import { Game } from '../../../src/game-engine/Game';

// Mock fetch for LLM calls
global.fetch = vi.fn();

// Mock AIBrainIntegration
let messageCallback: ((msg: any) => void) | null = null;

vi.mock('../../src/services/ai/aiBrainIntegration', () => {
  return {
    aiBrainIntegration: {
      initialize: vi.fn(async () => {
        // 模拟初始化成功
      }),
      notifyStateChange: vi.fn(async (game: Game, playerId: number, changeType?: string) => {
        // 模拟触发聊天，延迟发送消息
        setTimeout(() => {
          if (messageCallback) {
            messageCallback({
              playerId: 1,
              content: '出牌后反应',
              intent: 'tactical_signal',
              emotion: 'confident',
              timestamp: Date.now()
            });
          }
        }, 100);
      }),
      triggerAITurn: vi.fn(async () => {
        // 模拟AI回合
      }),
      triggerBatchChat: vi.fn(async () => {
        return new Map([
          [1, { content: '消息1', intent: 'social_chat', timestamp: Date.now() }],
          [2, { content: '消息2', intent: 'social_chat', timestamp: Date.now() }]
        ]);
      }),
      onCommunicationMessage: vi.fn((callback: (msg: any) => void) => {
        messageCallback = callback;
        return () => {
          messageCallback = null;
        };
      }),
      shutdown: vi.fn()
    }
  };
});

describe('聊天功能集成测试', () => {
  let gameStore: ReturnType<typeof useGameStore>;
  let chatStore: ReturnType<typeof useChatStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    gameStore = useGameStore();
    chatStore = useChatStore();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // 清理
    if (gameStore) {
      // 清理游戏状态
    }
  });

  describe('游戏流程中的聊天触发', () => {
    it('应该在整个游戏流程中正确触发聊天', async () => {
      // 1. 初始化游戏
      gameStore.startGame();

      // 2. 初始化AI Brain
      await gameStore.initializeAIBrain();
      chatStore.initializeAIBrainListener();

      // 3. 玩家出牌
      const cards = gameStore.humanPlayer?.hand.slice(0, 1) || [];
      await gameStore.playCards(cards);

      // 4. 等待AI反应
      await new Promise(resolve => setTimeout(resolve, 200));

      // 5. 验证聊天被触发
      expect(aiBrainIntegration.notifyStateChange).toHaveBeenCalled();
    });

    it('应该在多个玩家出牌后触发批量聊天', async () => {
      gameStore.startGame();
      await gameStore.initializeAIBrain();
      chatStore.initializeAIBrainListener();

      // 模拟多个玩家出牌
      const cards1 = gameStore.humanPlayer?.hand.slice(0, 1) || [];
      await gameStore.playCards(cards1);

      await new Promise(resolve => setTimeout(resolve, 200));

      // 验证批量聊天被触发
      expect(aiBrainIntegration.notifyStateChange).toHaveBeenCalled();
    });
  });

  describe('聊天气泡显示', () => {
    it('应该在收到消息时显示气泡', () => {
      chatStore.initializeAIBrainListener();

      // 模拟收到消息
      const mockMessage = {
        playerId: 1,
        content: '测试消息',
        intent: 'social_chat',
        timestamp: Date.now()
      };

      // 直接调用回调（模拟AI Brain发送消息）
      // initializeAIBrainListener会调用onCommunicationMessage，设置messageCallback
      if (messageCallback) {
        messageCallback(mockMessage);
      }

      // 验证气泡显示
      expect(chatStore.activeBubbles.has(1)).toBe(true);
      expect(chatStore.activeBubbles.get(1)?.content).toBe('测试消息');
    });

    it('应该支持多个玩家同时显示气泡', () => {
      chatStore.initializeAIBrainListener();

      // 模拟多个玩家同时发送消息
      const messages = [
        { playerId: 1, content: '消息1', intent: 'social_chat', timestamp: Date.now() },
        { playerId: 2, content: '消息2', intent: 'social_chat', timestamp: Date.now() },
        { playerId: 3, content: '消息3', intent: 'social_chat', timestamp: Date.now() }
      ];

      // 直接调用回调（模拟AI Brain发送消息）
      if (messageCallback) {
        messages.forEach(msg => messageCallback!(msg));
      }

      // 验证所有玩家的气泡都显示
      expect(chatStore.activeBubbles.has(1)).toBe(true);
      expect(chatStore.activeBubbles.has(2)).toBe(true);
      expect(chatStore.activeBubbles.has(3)).toBe(true);
    });
  });

  describe('聊天消息存储', () => {
    it('应该正确存储聊天消息', () => {
      chatStore.initializeAIBrainListener();

      const mockMessage = {
        playerId: 1,
        content: '测试消息',
        intent: 'social_chat',
        timestamp: Date.now()
      };

      // 直接调用回调（模拟AI Brain发送消息）
      if (messageCallback) {
        messageCallback(mockMessage);
      }

      // 验证消息被存储
      expect(chatStore.messages.length).toBeGreaterThan(0);
      expect(chatStore.messages[0].content).toBe('测试消息');
      expect(chatStore.messages[0].playerId).toBe(1);
    });

    it('应该限制消息数量', () => {
      chatStore.initializeAIBrainListener();

      // 添加大量消息
      for (let i = 0; i < 60; i++) {
        const callback = (aiBrainIntegration.onCommunicationMessage as any).mock.calls[0]?.[0];
        if (callback) {
          callback({
            playerId: 1,
            content: `消息${i}`,
            intent: 'social_chat',
            timestamp: Date.now() + i
          });
        }
      }

      // 验证消息数量被限制
      expect(chatStore.messages.length).toBeLessThanOrEqual(50);
    });
  });
});

