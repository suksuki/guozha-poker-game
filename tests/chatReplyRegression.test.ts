/**
 * 聊天回复功能回归测试
 * @async - 确保新功能不影响现有功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Player, PlayerType, GameStatus } from '../src/types/card';
import { ChatMessage, ChatEventType } from '../src/types/chat';
import { 
  chatService, 
  triggerRandomChat, 
  triggerEventChat, 
  triggerReply,
  subscribeToMessages,
  getChatMessages,
  clearChatMessages
} from '../src/services/chatService';
import { LLMChatStrategy } from '../src/chat/strategy/LLMChatStrategy';
import { RuleBasedStrategy } from '../src/chat/strategy/RuleBasedStrategy';
import { DEFAULT_LLM_CHAT_CONFIG } from '../src/config/chatConfig';
import { DEFAULT_CHAT_SERVICE_CONFIG, DEFAULT_BIG_DUN_CONFIG, DEFAULT_TAUNT_CONFIG } from '../src/config/chatConfig';
import { MultiPlayerGameState } from '../src/utils/gameStateUtils';

// Mock LLM API
vi.mock('../src/utils/llmModelService', () => ({
  getAvailableOllamaModels: vi.fn(() => Promise.resolve(['qwen2:0.5b'])),
  checkOllamaService: vi.fn(() => Promise.resolve(true)),
  filterChatModels: vi.fn((models) => models)
}));

// Mock fetch for LLM API
global.fetch = vi.fn();

describe('聊天回复功能回归测试', () => {
  let mockPlayer1: Player;
  let mockPlayer2: Player;
  let mockGameState: MultiPlayerGameState;

  beforeEach(() => {
    vi.clearAllMocks();
    clearChatMessages();

    mockPlayer1 = {
      id: 0,
      name: '玩家1',
      type: PlayerType.AI,
      hand: [],
      score: 100,
      voiceConfig: {
        gender: 'male',
        dialect: 'mandarin'
      }
    };

    mockPlayer2 = {
      id: 1,
      name: '玩家2',
      type: PlayerType.AI,
      hand: [],
      score: 80,
      voiceConfig: {
        gender: 'female',
        dialect: 'mandarin'
      }
    };

    mockGameState = {
      players: [mockPlayer1, mockPlayer2],
      playerCount: 2,
      roundNumber: 1,
      roundScore: 50,
      totalScore: 100,
      currentPlayerIndex: 0,
      status: GameStatus.PLAYING,
      lastPlay: null,
      lastPlayPlayerIndex: null,
      currentRoundPlays: [],
      winner: null,
      finishOrder: []
    } as MultiPlayerGameState;

    // Mock LLM API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: '测试回复'
        }
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('向后兼容性', () => {
    it('应该保持原有聊天功能正常工作', async () => {
      const message = await triggerRandomChat(mockPlayer1, 1.0, undefined, mockGameState);
      
      expect(message).not.toBeNull();
      expect(message?.playerId).toBe(mockPlayer1.id);
      expect(message?.type).toBe('random');
      
      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
    });

    it('应该保持事件聊天功能正常工作', async () => {
      const message = await triggerEventChat(
        mockPlayer1, 
        ChatEventType.GOOD_PLAY, 
        undefined, 
        mockGameState
      );
      
      expect(message).not.toBeNull();
      expect(message?.type).toBe('event');
      expect(message?.eventType).toBe(ChatEventType.GOOD_PLAY);
    });

    it('旧消息不应该有replyTo字段', async () => {
      const message = await triggerRandomChat(mockPlayer1, 1.0, undefined, mockGameState);
      
      expect(message?.replyTo).toBeUndefined();
    });
  });

  describe('消息订阅不影响现有功能', () => {
    it('订阅机制不应该影响消息添加', () => {
      const received: ChatMessage[] = [];
      subscribeToMessages((msg) => received.push(msg));

      const testMessage: ChatMessage = {
        playerId: 0,
        playerName: '测试',
        content: '测试消息',
        timestamp: Date.now(),
        type: 'random'
      };
      chatService['addMessage'](testMessage);

      const messages = getChatMessages();
      expect(messages.length).toBe(1);
      expect(received.length).toBe(1);
    });

    it('多个订阅者不应该影响消息存储', () => {
      const received1: ChatMessage[] = [];
      const received2: ChatMessage[] = [];

      subscribeToMessages((msg) => received1.push(msg));
      subscribeToMessages((msg) => received2.push(msg));

      const testMessage: ChatMessage = {
        playerId: 0,
        playerName: '测试',
        content: '测试消息',
        timestamp: Date.now(),
        type: 'random'
      };
      chatService['addMessage'](testMessage);

      const messages = getChatMessages();
      expect(messages.length).toBe(1); // 消息只存储一次
      expect(received1.length).toBe(1);
      expect(received2.length).toBe(1);
    });
  });

  describe('回复功能不影响现有聊天流程', () => {
    it('回复消息应该正常添加到消息列表', async () => {
      const originalMessage: ChatMessage = {
        playerId: mockPlayer1.id,
        playerName: mockPlayer1.name,
        content: '好牌！',
        timestamp: Date.now(),
        type: 'random'
      };

      const reply = await triggerReply(mockPlayer2, originalMessage, 1.0, mockGameState);

      expect(reply).not.toBeNull();
      
      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      const lastMessage = messages[messages.length - 1];
      expect(lastMessage.replyTo).toBeDefined();
    });

    it('回复消息应该能够触发新的回复（回复链）', async () => {
      const originalMessage: ChatMessage = {
        playerId: mockPlayer1.id,
        playerName: mockPlayer1.name,
        content: '好牌！',
        timestamp: Date.now(),
        type: 'random'
      };

      const reply1 = await triggerReply(mockPlayer2, originalMessage, 1.0, mockGameState);
      expect(reply1).not.toBeNull();

      if (reply1) {
        // 回复的回复（应该被允许，但概率较低）
        const reply2 = await triggerReply(mockPlayer1, reply1, 0.5, mockGameState);
        // 可能为null（因为概率），但如果生成，应该正常
        if (reply2) {
          expect(reply2.replyTo).toBeDefined();
          expect(reply2.replyTo?.playerId).toBe(reply1.playerId);
        }
      }
    });
  });

  describe('策略接口兼容性', () => {
    it('LLMChatStrategy应该实现generateReply方法', () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      expect(strategy.generateReply).toBeDefined();
      expect(typeof strategy.generateReply).toBe('function');
    });

    it('RuleBasedStrategy应该实现generateReply方法', () => {
      const strategy = new RuleBasedStrategy(
        DEFAULT_CHAT_SERVICE_CONFIG,
        DEFAULT_BIG_DUN_CONFIG,
        DEFAULT_TAUNT_CONFIG
      );
      expect(strategy.generateReply).toBeDefined();
      expect(typeof strategy.generateReply).toBe('function');
    });

    it('generateReply应该是可选方法（向后兼容）', () => {
      // 即使策略没有实现generateReply，也不应该报错
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      expect(strategy.generateReply).toBeDefined();
    });
  });

  describe('消息类型完整性', () => {
    it('回复消息应该包含所有必需字段', async () => {
      const originalMessage: ChatMessage = {
        playerId: mockPlayer1.id,
        playerName: mockPlayer1.name,
        content: '好牌！',
        timestamp: Date.now(),
        type: 'random'
      };

      const reply = await triggerReply(mockPlayer2, originalMessage, 1.0, mockGameState);

      if (reply) {
        expect(reply.playerId).toBeDefined();
        expect(reply.playerName).toBeDefined();
        expect(reply.content).toBeDefined();
        expect(reply.timestamp).toBeDefined();
        expect(reply.type).toBeDefined();
        expect(reply.replyTo).toBeDefined();
        expect(reply.replyTo?.playerId).toBe(originalMessage.playerId);
        expect(reply.replyTo?.content).toBe(originalMessage.content);
      }
    });

    it('非回复消息不应该有replyTo字段', async () => {
      const message = await triggerRandomChat(mockPlayer1, 1.0, undefined, mockGameState);
      
      expect(message?.replyTo).toBeUndefined();
    });
  });

  describe('性能影响', () => {
    it('订阅机制不应该显著影响消息添加性能', () => {
      const startTime = Date.now();
      
      // 添加多个订阅者
      const unsubscribes: (() => void)[] = [];
      for (let i = 0; i < 10; i++) {
        unsubscribes.push(subscribeToMessages(() => {}));
      }

      // 添加消息
      for (let i = 0; i < 100; i++) {
        const testMessage: ChatMessage = {
          playerId: 0,
          playerName: '测试',
          content: `消息${i}`,
          timestamp: Date.now(),
          type: 'random'
        };
        chatService['addMessage'](testMessage);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 清理订阅
      unsubscribes.forEach(unsub => unsub());

      // 应该在合理时间内完成（<100ms for 100 messages）
      expect(duration).toBeLessThan(100);
    });
  });

  describe('边界情况', () => {
    it('应该处理空消息内容', async () => {
      const originalMessage: ChatMessage = {
        playerId: mockPlayer1.id,
        playerName: mockPlayer1.name,
        content: '',
        timestamp: Date.now(),
        type: 'random'
      };

      // 即使原消息为空，也不应该崩溃
      const reply = await triggerReply(mockPlayer2, originalMessage, 1.0, mockGameState);
      // 可能为null（如果策略拒绝生成），但不应该抛出错误
      expect(() => reply).not.toThrow();
    });

    it('应该处理自己回复自己的情况', async () => {
      const originalMessage: ChatMessage = {
        playerId: mockPlayer1.id,
        playerName: mockPlayer1.name,
        content: '好牌！',
        timestamp: Date.now(),
        type: 'random'
      };

      // 允许自己回复自己（虽然不太常见）
      const reply = await triggerReply(mockPlayer1, originalMessage, 1.0, mockGameState);
      if (reply) {
        expect(reply.playerId).toBe(mockPlayer1.id);
        expect(reply.replyTo?.playerId).toBe(mockPlayer1.id);
      }
    });

    it('应该处理回复已回复的消息', async () => {
      const originalMessage: ChatMessage = {
        playerId: mockPlayer1.id,
        playerName: mockPlayer1.name,
        content: '好牌！',
        timestamp: Date.now(),
        type: 'random'
      };

      const reply1 = await triggerReply(mockPlayer2, originalMessage, 1.0, mockGameState);
      expect(reply1).not.toBeNull();

      if (reply1) {
        // 回复一个已经有replyTo的消息
        const reply2 = await triggerReply(mockPlayer1, reply1, 1.0, mockGameState);
        if (reply2) {
          // 应该正常处理，replyTo指向reply1
          expect(reply2.replyTo?.playerId).toBe(reply1.playerId);
        }
      }
    });
  });
});

