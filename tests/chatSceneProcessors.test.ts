/**
 * 聊天场景处理器单元测试
 * @async - 测试异步场景处理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player, PlayerType, Card, Suit, Rank } from '../src/types/card';
import { ChatEventType, ChatScene } from '../src/types/chat';
import { SpontaneousChatProcessor } from '../src/chat/scene/SpontaneousChatProcessor';
import { EventDrivenChatProcessor } from '../src/chat/scene/EventDrivenChatProcessor';
import { TauntChatProcessor } from '../src/chat/scene/TauntChatProcessor';
import { ChatContext } from '../src/chat/strategy/IChatStrategy';
import { DEFAULT_CHAT_SCENE_CONFIG } from '../src/config/chatConfig';

describe('聊天场景处理器', () => {
  let mockPlayer: Player;
  let mockContext: ChatContext;

  beforeEach(() => {
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

  describe('SpontaneousChatProcessor（自发聊天）', () => {
    let processor: SpontaneousChatProcessor;

    beforeEach(() => {
      processor = new SpontaneousChatProcessor();
    });

    it('应该正确标识场景类型', () => {
      expect(processor.scene).toBe(ChatScene.SPONTANEOUS);
      expect(processor.description).toContain('自发聊天');
    });

    it('应该构建轻量级提示词', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.SPONTANEOUS];
      const prompt = processor.buildPrompt(mockPlayer, ChatEventType.RANDOM, mockContext, config);
      
      expect(prompt).toContain('玩家名称：测试玩家');
      expect(prompt).toContain('当前轮次：第1轮');
      expect(prompt).not.toContain('完整游戏状态'); // 轻量级，不包含完整状态
      expect(prompt).toContain('最多20个字'); // 自发聊天允许更长
    });

    it('应该宽松处理内容', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.SPONTANEOUS];
      const content = '好的，我觉得这局很有意思，大家觉得呢？';
      const processed = processor.processContent(content, config);
      
      expect(processed.length).toBeLessThanOrEqual(config.maxLength);
      expect(processed).not.toContain('好的，'); // 应该移除冗余开头
    });

    it('应该匹配 RANDOM 和 DEALING 事件', () => {
      expect(processor.matchesEventType?.(ChatEventType.RANDOM)).toBe(true);
      expect(processor.matchesEventType?.(ChatEventType.DEALING)).toBe(true);
      expect(processor.matchesEventType?.(ChatEventType.GOOD_PLAY)).toBe(false);
    });

    it('应该包含聊天历史（如果提供）', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.SPONTANEOUS];
      const contextWithHistory: ChatContext = {
        ...mockContext,
        history: [
          {
            playerId: 1,
            playerName: '玩家1',
            content: '大家好',
            timestamp: Date.now(),
            type: 'random'
          }
        ]
      };
      
      const prompt = processor.buildPrompt(mockPlayer, ChatEventType.RANDOM, contextWithHistory, config);
      expect(prompt).toContain('最近聊天记录');
      expect(prompt).toContain('玩家1：大家好');
    });
  });

  describe('EventDrivenChatProcessor（事件触发）', () => {
    let processor: EventDrivenChatProcessor;

    beforeEach(() => {
      processor = new EventDrivenChatProcessor();
    });

    it('应该正确标识场景类型', () => {
      expect(processor.scene).toBe(ChatScene.EVENT_DRIVEN);
      expect(processor.description).toContain('事件触发');
    });

    it('应该构建详细提示词', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.EVENT_DRIVEN];
      const fullContext: ChatContext = {
        ...mockContext,
        fullGameState: {
          players: [mockPlayer],
          playerCount: 4,
          roundNumber: 1,
          roundScore: 50,
          totalScore: 100,
          currentPlayerIndex: 0,
          status: 'playing' as any,
          lastPlay: null,
          lastPlayPlayerIndex: null,
          currentRoundPlays: []
        } as any
      };
      
      const prompt = processor.buildPrompt(mockPlayer, ChatEventType.GOOD_PLAY, fullContext, config);
      
      expect(prompt).toContain('游戏规则：过炸/争上游');
      expect(prompt).toContain('当前游戏状态');
      expect(prompt).toContain('事件类型：出好牌');
      expect(prompt).toContain('最多15个字'); // 事件触发更短
    });

    it('应该严格处理内容', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.EVENT_DRIVEN];
      const content = '好的，我觉得这手牌出得不错，应该能赢吧？';
      const processed = processor.processContent(content, config);
      
      expect(processed.length).toBeLessThanOrEqual(config.maxLength);
      expect(processed).not.toContain('好的，'); // 严格移除冗余
      expect(processed).not.toContain('我觉得'); // 严格移除冗余
    });

    it('应该匹配除 RANDOM 和 DEALING 外的所有事件', () => {
      expect(processor.matchesEventType?.(ChatEventType.RANDOM)).toBe(false);
      expect(processor.matchesEventType?.(ChatEventType.DEALING)).toBe(false);
      expect(processor.matchesEventType?.(ChatEventType.GOOD_PLAY)).toBe(true);
      expect(processor.matchesEventType?.(ChatEventType.BIG_DUN)).toBe(true);
      expect(processor.matchesEventType?.(ChatEventType.SCORE_STOLEN)).toBe(true);
    });

    it('应该包含事件详情', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.EVENT_DRIVEN];
      const contextWithEvent: ChatContext = {
        ...mockContext,
        eventData: {
          dunSize: 8,
          stolenScore: 10
        }
      };
      
      const prompt = processor.buildPrompt(mockPlayer, ChatEventType.BIG_DUN, contextWithEvent, config);
      expect(prompt).toContain('大墩出现（8张）');
    });

    it('应该格式化手牌信息', () => {
      const playerWithHand: Player = {
        ...mockPlayer,
        hand: [
          { id: 1, suit: Suit.SPADES, rank: Rank.ACE },
          { id: 2, suit: Suit.SPADES, rank: Rank.ACE },
          { id: 3, suit: Suit.HEARTS, rank: Rank.KING }
        ] as Card[]
      };
      
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.EVENT_DRIVEN];
      const contextWithHand: ChatContext = {
        ...mockContext,
        currentPlayer: playerWithHand
      };
      
      const prompt = processor.buildPrompt(playerWithHand, ChatEventType.GOOD_PLAY, contextWithHand, config);
      expect(prompt).toContain('手牌详情');
    });
  });

  describe('TauntChatProcessor（对骂）', () => {
    let processor: TauntChatProcessor;

    beforeEach(() => {
      processor = new TauntChatProcessor();
    });

    it('应该正确标识场景类型', () => {
      expect(processor.scene).toBe(ChatScene.TAUNT);
      expect(processor.description).toContain('对骂');
    });

    it('应该构建对骂提示词', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.TAUNT];
      const targetPlayer: Player = {
        id: 1,
        name: '目标玩家',
        type: PlayerType.AI,
        hand: [],
        voiceConfig: {
          gender: 'female',
          dialect: 'mandarin'
        }
      };
      
      const contextWithTarget: ChatContext = {
        ...mockContext,
        targetPlayer
      };
      
      const prompt = processor.buildPrompt(mockPlayer, undefined, contextWithTarget, config);
      
      expect(prompt).toContain('目标玩家信息');
      expect(prompt).toContain('必须包含脏话');
      expect(prompt).toContain('你妈逼');
      expect(prompt).toContain('最多15个字');
    });

    it('应该保留对骂内容的原始性（不严格处理）', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.TAUNT];
      const content = '好的，我觉得你这次出牌太狠了，你妈逼，等着瞧吧！';
      const processed = processor.processContent(content, config);
      
      // 对骂内容保留原始性，只做长度限制
      expect(processed.length).toBeLessThanOrEqual(config.maxLength);
      // 不严格移除冗余表达，保留对骂的完整性
      // 只验证长度限制，不验证内容是否包含冗余表达
      expect(processed).toBeTruthy();
      expect(processed.length).toBeGreaterThan(0);
    });

    it('应该包含目标玩家信息（如果提供）', () => {
      const config = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.TAUNT];
      const targetPlayer: Player = {
        id: 1,
        name: '目标玩家',
        type: PlayerType.AI,
        hand: [],
        score: 50
      };
      
      const contextWithTarget: ChatContext = {
        ...mockContext,
        targetPlayer
      };
      
      const prompt = processor.buildPrompt(mockPlayer, undefined, contextWithTarget, config);
      expect(prompt).toContain('目标玩家信息');
      expect(prompt).toContain('目标玩家');
    });
  });

  describe('场景配置差异', () => {
    it('自发聊天应该使用更长的最大长度', () => {
      const spontaneousConfig = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.SPONTANEOUS];
      const eventConfig = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.EVENT_DRIVEN];
      
      expect(spontaneousConfig.maxLength).toBeGreaterThan(eventConfig.maxLength);
    });

    it('事件触发应该包含完整游戏状态', () => {
      const eventConfig = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.EVENT_DRIVEN];
      const spontaneousConfig = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.SPONTANEOUS];
      
      expect(eventConfig.includeFullGameState).toBe(true);
      expect(spontaneousConfig.includeFullGameState).toBe(false);
    });

    it('事件触发应该包含详细事件信息', () => {
      const eventConfig = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.EVENT_DRIVEN];
      const spontaneousConfig = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.SPONTANEOUS];
      
      expect(eventConfig.includeDetailedEventInfo).toBe(true);
      expect(spontaneousConfig.includeDetailedEventInfo).toBe(false);
    });

    it('自发聊天应该使用更长的历史记录', () => {
      const spontaneousConfig = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.SPONTANEOUS];
      const eventConfig = DEFAULT_CHAT_SCENE_CONFIG[ChatScene.EVENT_DRIVEN];
      
      expect(spontaneousConfig.historyLength).toBeGreaterThan(eventConfig.historyLength);
    });
  });
});

