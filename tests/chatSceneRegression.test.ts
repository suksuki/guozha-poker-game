/**
 * 聊天场景化系统回归测试
 * 确保场景化系统不影响现有功能，并正确标记场景类型
 * @async - 测试异步聊天生成
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player, PlayerType, Card, Suit, Rank } from '../src/types/card';
import { ChatEventType, ChatScene, ChatMessage } from '../src/types/chat';
import { LLMChatStrategy } from '../src/chat/strategy/LLMChatStrategy';
import { RuleBasedStrategy } from '../src/chat/strategy/RuleBasedStrategy';
import { ChatSceneProcessorFactory } from '../src/chat/scene/ChatSceneProcessorFactory';
import { DEFAULT_LLM_CHAT_CONFIG, DEFAULT_CHAT_SERVICE_CONFIG, DEFAULT_BIG_DUN_CONFIG, DEFAULT_TAUNT_CONFIG } from '../src/config/chatConfig';
import { ChatContext } from '../src/chat/strategy/IChatStrategy';

// Mock LLM API
vi.mock('../src/chat/strategy/LLMChatStrategy', async () => {
  const actual = await vi.importActual('../src/chat/strategy/LLMChatStrategy');
  return {
    ...actual,
    LLMChatStrategy: class MockLLMChatStrategy extends (actual as any).LLMChatStrategy {
      private mockCallLLMAPI = vi.fn(async (prompt: string) => {
        // 模拟LLM返回
        if (prompt.includes('对骂')) {
          return '你妈逼，等着';
        }
        if (prompt.includes('事件类型：出好牌')) {
          return '好牌！';
        }
        if (prompt.includes('随机闲聊')) {
          return '大家好';
        }
        return '测试内容';
      });

      // 重写 callLLMAPI 方法
      protected async callLLMAPI(prompt: string, priority: number): Promise<string> {
        return this.mockCallLLMAPI(prompt);
      }
    }
  };
});

describe('聊天场景化系统回归测试', () => {
  let mockPlayer: Player;
  let mockContext: ChatContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockPlayer = {
      id: 0,
      name: '测试玩家',
      type: PlayerType.AI,
      hand: [],
      score: 100,
      voiceConfig: {
        gender: 'male',
        dialect: 'mandarin'
      }
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
      currentPlayer: mockPlayer,
      allPlayers: [mockPlayer]
    };
  });

  describe('LLMChatStrategy 场景集成', () => {
    it('应该为随机聊天标记 SPONTANEOUS 场景', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const message = await strategy.generateRandomChat(mockPlayer, mockContext);
      
      expect(message).not.toBeNull();
      expect(message?.scene).toBe(ChatScene.SPONTANEOUS);
      expect(message?.type).toBe('random');
    });

    it('应该为事件聊天标记 EVENT_DRIVEN 场景', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const message = await strategy.generateEventChat(mockPlayer, ChatEventType.GOOD_PLAY, mockContext);
      
      expect(message).not.toBeNull();
      expect(message?.scene).toBe(ChatScene.EVENT_DRIVEN);
      expect(message?.type).toBe('event');
      expect(message?.eventType).toBe(ChatEventType.GOOD_PLAY);
    });

    it('应该为对骂标记 TAUNT 场景', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const targetPlayer: Player = {
        id: 1,
        name: '目标玩家',
        type: PlayerType.AI,
        hand: []
      };
      
      const message = await strategy.generateTaunt(mockPlayer, targetPlayer, mockContext);
      
      expect(message).not.toBeNull();
      expect(message?.scene).toBe(ChatScene.TAUNT);
      expect(message?.type).toBe('taunt');
    });

    it('应该根据事件类型选择正确的场景', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      
      // RANDOM 应该使用 SPONTANEOUS
      const randomMessage = await strategy.generateRandomChat(mockPlayer, mockContext);
      expect(randomMessage?.scene).toBe(ChatScene.SPONTANEOUS);
      
      // GOOD_PLAY 应该使用 EVENT_DRIVEN
      const eventMessage = await strategy.generateEventChat(mockPlayer, ChatEventType.GOOD_PLAY, mockContext);
      expect(eventMessage?.scene).toBe(ChatScene.EVENT_DRIVEN);
      
      // BIG_DUN 应该使用 EVENT_DRIVEN
      const bigDunMessage = await strategy.generateEventChat(mockPlayer, ChatEventType.BIG_DUN, mockContext);
      expect(bigDunMessage?.scene).toBe(ChatScene.EVENT_DRIVEN);
    });
  });

  describe('RuleBasedStrategy 场景标记', () => {
    it('应该为随机聊天标记 SPONTANEOUS 场景', () => {
      const strategy = new RuleBasedStrategy(
        DEFAULT_CHAT_SERVICE_CONFIG,
        DEFAULT_BIG_DUN_CONFIG,
        DEFAULT_TAUNT_CONFIG
      );
      
      const message = strategy.generateRandomChat(mockPlayer, mockContext);
      
      if (message) {
        expect(message.scene).toBe(ChatScene.SPONTANEOUS);
        expect(message.type).toBe('random');
      }
    });

    it('应该为事件聊天标记 EVENT_DRIVEN 场景', () => {
      const strategy = new RuleBasedStrategy(
        DEFAULT_CHAT_SERVICE_CONFIG,
        DEFAULT_BIG_DUN_CONFIG,
        DEFAULT_TAUNT_CONFIG
      );
      
      const message = strategy.generateEventChat(mockPlayer, ChatEventType.GOOD_PLAY, mockContext);
      
      if (message) {
        expect(message.scene).toBe(ChatScene.EVENT_DRIVEN);
        expect(message.type).toBe('event');
        expect(message.eventType).toBe(ChatEventType.GOOD_PLAY);
      }
    });

    it('应该为对骂标记 TAUNT 场景', () => {
      const strategy = new RuleBasedStrategy(
        DEFAULT_CHAT_SERVICE_CONFIG,
        DEFAULT_BIG_DUN_CONFIG,
        DEFAULT_TAUNT_CONFIG
      );
      
      const message = strategy.generateTaunt(mockPlayer, undefined, mockContext);
      
      if (message) {
        expect(message.scene).toBe(ChatScene.TAUNT);
        expect(message.type).toBe('taunt');
      }
    });
  });

  describe('向后兼容性', () => {
    it('消息应该包含所有必需字段', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const message = await strategy.generateRandomChat(mockPlayer, mockContext);
      
      expect(message).not.toBeNull();
      expect(message).toHaveProperty('playerId');
      expect(message).toHaveProperty('playerName');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('type');
      expect(message).toHaveProperty('scene'); // 新增字段
    });

    it('场景字段应该是可选的（向后兼容）', () => {
      // 模拟旧版本消息（没有 scene 字段）
      const oldMessage: ChatMessage = {
        playerId: 0,
        playerName: '测试玩家',
        content: '测试内容',
        timestamp: Date.now(),
        type: 'random'
        // 没有 scene 字段
      };
      
      expect(oldMessage.scene).toBeUndefined();
      // 应该不会导致错误
      expect(oldMessage.type).toBe('random');
    });
  });

  describe('场景处理器工厂集成', () => {
    it('应该能够根据事件类型获取正确的场景', () => {
      expect(ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.RANDOM)).toBe(ChatScene.SPONTANEOUS);
      expect(ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.DEALING)).toBe(ChatScene.SPONTANEOUS);
      expect(ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.GOOD_PLAY)).toBe(ChatScene.EVENT_DRIVEN);
      expect(ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.BIG_DUN)).toBe(ChatScene.EVENT_DRIVEN);
    });

    it('应该能够获取所有场景的处理器', () => {
      const spontaneousProcessor = ChatSceneProcessorFactory.getProcessor(ChatScene.SPONTANEOUS);
      const eventProcessor = ChatSceneProcessorFactory.getProcessor(ChatScene.EVENT_DRIVEN);
      const tauntProcessor = ChatSceneProcessorFactory.getProcessor(ChatScene.TAUNT);
      
      expect(spontaneousProcessor.scene).toBe(ChatScene.SPONTANEOUS);
      expect(eventProcessor.scene).toBe(ChatScene.EVENT_DRIVEN);
      expect(tauntProcessor.scene).toBe(ChatScene.TAUNT);
    });
  });

  describe('场景配置差异', () => {
    it('不同场景应该使用不同的配置', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      
      // 自发聊天应该使用更长的最大长度
      const spontaneousMessage = await strategy.generateRandomChat(mockPlayer, mockContext);
      expect(spontaneousMessage?.content.length).toBeLessThanOrEqual(20); // SPONTANEOUS 最大长度
      
      // 事件触发应该使用更短的最大长度
      const eventMessage = await strategy.generateEventChat(mockPlayer, ChatEventType.GOOD_PLAY, mockContext);
      expect(eventMessage?.content.length).toBeLessThanOrEqual(15); // EVENT_DRIVEN 最大长度
    });
  });

  describe('内容处理差异化', () => {
    it('自发聊天应该宽松处理内容', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const message = await strategy.generateRandomChat(mockPlayer, mockContext);
      
      // 自发聊天允许更多口语化表达
      expect(message?.content).toBeTruthy();
      expect(message?.content.length).toBeGreaterThan(0);
    });

    it('事件触发应该严格处理内容', async () => {
      const strategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
      const message = await strategy.generateEventChat(mockPlayer, ChatEventType.GOOD_PLAY, mockContext);
      
      // 事件触发应该更精准
      expect(message?.content).toBeTruthy();
      expect(message?.content.length).toBeLessThanOrEqual(15);
    });
  });
});

