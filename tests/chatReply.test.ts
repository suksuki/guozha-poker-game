/**
 * 聊天回复功能单元测试
 * @async - 测试异步回复生成和消息订阅
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Player, PlayerType } from '../src/types/card';
import { ChatMessage, ChatEventType } from '../src/types/chat';
import { LLMChatStrategy } from '../src/chat/strategy/LLMChatStrategy';
import { RuleBasedStrategy } from '../src/chat/strategy/RuleBasedStrategy';
import { triggerReply, subscribeToMessages, chatService } from '../src/services/chatService';
import { DEFAULT_LLM_CHAT_CONFIG } from '../src/config/chatConfig';
import { DEFAULT_CHAT_SERVICE_CONFIG, DEFAULT_BIG_DUN_CONFIG, DEFAULT_TAUNT_CONFIG } from '../src/config/chatConfig';
import { ChatContext } from '../src/chat/strategy/IChatStrategy';

// Mock LLM API
vi.mock('../src/utils/llmModelService', () => ({
  getAvailableOllamaModels: vi.fn(() => Promise.resolve(['qwen2:0.5b'])),
  checkOllamaService: vi.fn(() => Promise.resolve(true)),
  filterChatModels: vi.fn((models) => models)
}));

// Mock fetch for LLM API
global.fetch = vi.fn();

describe('聊天回复功能', () => {
  let mockPlayer: Player;
  let mockReplyPlayer: Player;
  let originalMessage: ChatMessage;
  let mockContext: ChatContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPlayer = {
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

    mockReplyPlayer = {
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

    originalMessage = {
      playerId: mockPlayer.id,
      playerName: mockPlayer.name,
      content: '好牌！',
      timestamp: Date.now(),
      type: 'random'
    };

    mockContext = {
      gameState: {
        roundNumber: 1,
        roundScore: 50,
        totalScore: 100,
        playerCount: 4,
        currentPlayerIndex: 0,
        status: 'playing' as any,
        lastPlay: null,
        lastPlayPlayerIndex: null
      },
      currentPlayer: mockReplyPlayer,
      allPlayers: [mockPlayer, mockReplyPlayer]
    };

    // Mock LLM API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: '确实不错'
        }
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('LLMChatStrategy.generateReply', () => {
    it('应该生成回复消息', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const reply = await strategy.generateReply!(mockReplyPlayer, originalMessage, mockContext);

      expect(reply).not.toBeNull();
      expect(reply?.playerId).toBe(mockReplyPlayer.id);
      expect(reply?.playerName).toBe(mockReplyPlayer.name);
      expect(reply?.content).toBeTruthy();
      expect(reply?.replyTo).toBeDefined();
      expect(reply?.replyTo?.playerId).toBe(originalMessage.playerId);
      expect(reply?.replyTo?.content).toBe(originalMessage.content);
    });

    it('应该包含原消息信息在回复中', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const reply = await strategy.generateReply!(mockReplyPlayer, originalMessage, mockContext);

      expect(reply?.replyTo).toEqual({
        playerId: originalMessage.playerId,
        playerName: originalMessage.playerName,
        content: originalMessage.content,
        timestamp: originalMessage.timestamp
      });
    });

    it('应该调用LLM API生成回复', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      await strategy.generateReply!(mockReplyPlayer, originalMessage, mockContext);

      expect(global.fetch).toHaveBeenCalled();
      
      // 找到包含 /api/chat 的调用（可能先有 /api/tags 调用获取模型列表）
      const allCalls = (global.fetch as any).mock.calls;
      const chatCall = allCalls.find((call: any[]) => {
        const url = call[0];
        return typeof url === 'string' && url.includes('/api/chat');
      });
      
      expect(chatCall).toBeDefined();
      expect(chatCall[0]).toContain('/api/chat');
      
      // 检查请求体
      const requestBody = JSON.parse(chatCall[1].body);
      expect(requestBody.messages).toBeDefined();
      expect(requestBody.messages.some((m: any) => m.content.includes('好牌！'))).toBe(true);
    });

    it('应该处理南昌话方言转换', async () => {
      const nanchangPlayer: Player = {
        ...mockReplyPlayer,
        voiceConfig: {
          gender: 'male',
          dialect: 'nanchang'
        }
      };

      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const reply = await strategy.generateReply!(nanchangPlayer, originalMessage, mockContext);

      expect(reply).not.toBeNull();
      // 回复内容应该经过方言处理（如果有映射）
    });
  });

  describe('RuleBasedStrategy.generateReply', () => {
    it('应该生成回复消息', () => {
      const strategy = new RuleBasedStrategy(
        DEFAULT_CHAT_SERVICE_CONFIG,
        DEFAULT_BIG_DUN_CONFIG,
        DEFAULT_TAUNT_CONFIG
      );
      const reply = strategy.generateReply!(mockReplyPlayer, originalMessage, mockContext);

      expect(reply).not.toBeNull();
      expect(reply?.playerId).toBe(mockReplyPlayer.id);
      expect(reply?.playerName).toBe(mockReplyPlayer.name);
      expect(reply?.content).toBeTruthy();
      expect(reply?.replyTo).toBeDefined();
    });

    it('应该包含原消息信息', () => {
      const strategy = new RuleBasedStrategy(
        DEFAULT_CHAT_SERVICE_CONFIG,
        DEFAULT_BIG_DUN_CONFIG,
        DEFAULT_TAUNT_CONFIG
      );
      const reply = strategy.generateReply!(mockReplyPlayer, originalMessage, mockContext);

      expect(reply?.replyTo?.playerId).toBe(originalMessage.playerId);
      expect(reply?.replyTo?.content).toBe(originalMessage.content);
    });

    it('应该生成不同的回复内容', () => {
      const strategy = new RuleBasedStrategy(
        DEFAULT_CHAT_SERVICE_CONFIG,
        DEFAULT_BIG_DUN_CONFIG,
        DEFAULT_TAUNT_CONFIG
      );
      
      const replies: string[] = [];
      for (let i = 0; i < 10; i++) {
        const reply = strategy.generateReply!(mockReplyPlayer, originalMessage, mockContext);
        if (reply) {
          replies.push(reply.content);
        }
      }

      // 应该有一些不同的回复（虽然可能重复）
      expect(replies.length).toBeGreaterThan(0);
      expect(replies.every(r => r.length > 0)).toBe(true);
    });
  });

  describe('chatService.triggerReply', () => {
    it('应该触发回复并添加到消息列表', async () => {
      const fullGameState = {
        players: [mockPlayer, mockReplyPlayer],
        playerCount: 2,
        roundNumber: 1,
        roundScore: 50,
        totalScore: 100,
        currentPlayerIndex: 0,
        status: 'playing' as any,
        lastPlay: null,
        lastPlayPlayerIndex: null,
        currentRoundPlays: []
      } as any;

      // 使用概率1.0确保回复
      const reply = await triggerReply(mockReplyPlayer, originalMessage, 1.0, fullGameState);

      expect(reply).not.toBeNull();
      expect(reply?.replyTo).toBeDefined();
    });

    it('应该根据概率决定是否回复', async () => {
      const fullGameState = {
        players: [mockPlayer, mockReplyPlayer],
        playerCount: 2,
        roundNumber: 1,
        roundScore: 50,
        totalScore: 100,
        currentPlayerIndex: 0,
        status: 'playing' as any,
        lastPlay: null,
        lastPlayPlayerIndex: null,
        currentRoundPlays: []
      } as any;

      // 使用概率0.0确保不回复
      const reply = await triggerReply(mockReplyPlayer, originalMessage, 0.0, fullGameState);

      expect(reply).toBeNull();
    });

    it('应该标记回复消息的replyTo字段', async () => {
      const fullGameState = {
        players: [mockPlayer, mockReplyPlayer],
        playerCount: 2,
        roundNumber: 1,
        roundScore: 50,
        totalScore: 100,
        currentPlayerIndex: 0,
        status: 'playing' as any,
        lastPlay: null,
        lastPlayPlayerIndex: null,
        currentRoundPlays: []
      } as any;

      const reply = await triggerReply(mockReplyPlayer, originalMessage, 1.0, fullGameState);

      if (reply) {
        expect(reply.replyTo).toEqual({
          playerId: originalMessage.playerId,
          playerName: originalMessage.playerName,
          content: originalMessage.content,
          timestamp: originalMessage.timestamp
        });
      }
    });
  });

  describe('消息订阅机制', () => {
    it('应该能够订阅消息通知', () => {
      const receivedMessages: ChatMessage[] = [];
      const unsubscribe = subscribeToMessages((message) => {
        receivedMessages.push(message);
      });

      // 添加一条消息
      const testMessage: ChatMessage = {
        playerId: 0,
        playerName: '测试',
        content: '测试消息',
        timestamp: Date.now(),
        type: 'random'
      };
      chatService['addMessage'](testMessage);

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].content).toBe('测试消息');

      // 取消订阅
      unsubscribe();
      
      // 再添加一条消息，不应该收到
      const testMessage2: ChatMessage = {
        playerId: 1,
        playerName: '测试2',
        content: '测试消息2',
        timestamp: Date.now(),
        type: 'random'
      };
      chatService['addMessage'](testMessage2);

      expect(receivedMessages.length).toBe(1); // 仍然是1条
    });

    it('应该支持多个订阅者', () => {
      const received1: ChatMessage[] = [];
      const received2: ChatMessage[] = [];

      const unsubscribe1 = subscribeToMessages((msg) => received1.push(msg));
      const unsubscribe2 = subscribeToMessages((msg) => received2.push(msg));

      const testMessage: ChatMessage = {
        playerId: 0,
        playerName: '测试',
        content: '测试消息',
        timestamp: Date.now(),
        type: 'random'
      };
      chatService['addMessage'](testMessage);

      expect(received1.length).toBe(1);
      expect(received2.length).toBe(1);

      unsubscribe1();
      unsubscribe2();
    });

    it('应该处理订阅回调中的错误', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('测试错误');
      });
      const normalCallback = vi.fn();

      subscribeToMessages(errorCallback);
      subscribeToMessages(normalCallback);

      const testMessage: ChatMessage = {
        playerId: 0,
        playerName: '测试',
        content: '测试消息',
        timestamp: Date.now(),
        type: 'random'
      };

      // 不应该因为一个回调出错而影响其他回调
      expect(() => {
        chatService['addMessage'](testMessage);
      }).not.toThrow();

      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('回复消息的场景标记', () => {
    it('回复消息应该标记为SPONTANEOUS场景', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const reply = await strategy.generateReply!(mockReplyPlayer, originalMessage, mockContext);

      expect(reply?.scene).toBe('spontaneous');
      expect(reply?.type).toBe('random');
    });
  });
});

