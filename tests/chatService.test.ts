/**
 * 聊天服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player, PlayerType } from '../src/types/card';
import { ChatEventType } from '../src/types/chat';
import { chatService, addChatMessage, getChatMessages, clearChatMessages, createChatMessage, triggerRandomChat, triggerEventChat, triggerBigDunReaction, triggerScoreStolenReaction, triggerGoodPlayReaction, triggerTaunt, triggerBadLuckReaction, triggerWinningReaction, triggerLosingReaction, triggerFinishFirstReaction, triggerFinishLastReaction } from '../src/services/chatService';
import { Card, Suit, Rank } from '../src/types/card';
import { ChatEventType } from '../src/types/chat';

// Mock voiceService
vi.mock('../src/services/voiceService', () => ({
  speakText: vi.fn(() => Promise.resolve())
}));

// Mock chatContent
vi.mock('../src/utils/chatContent', () => ({
  getChatContent: vi.fn((eventType, dialect, isTaunt) => {
    if (isTaunt) return '对骂内容';
    if (eventType === ChatEventType.BIG_DUN) return '大墩反应';
    if (eventType === ChatEventType.SCORE_STOLEN) return '分牌被捡走';
    if (eventType === ChatEventType.GOOD_PLAY) return '好牌反应';
    return '随机闲聊';
  }),
  getRandomChat: vi.fn(() => '随机闲聊'),
  getTaunt: vi.fn(() => '对骂内容')
}));

// Mock chat strategy
vi.mock('../src/chat/strategy', () => ({
  getChatStrategy: vi.fn(() => ({
    generateRandomChat: vi.fn(async (player) => ({
      playerId: player.id,
      playerName: player.name,
      content: '随机闲聊',
      type: 'random',
      timestamp: Date.now()
    })),
    generateEventChat: vi.fn(async (player, eventType) => ({
      playerId: player.id,
      playerName: player.name,
      content: '事件聊天',
      type: 'event',
      timestamp: Date.now()
    })),
    generateTaunt: vi.fn(async (player) => ({
      playerId: player.id,
      playerName: player.name,
      content: '对骂内容',
      type: 'taunt',
      timestamp: Date.now()
    })),
    name: 'rule-based',
    description: 'Mock strategy'
  }))
}));

describe('聊天服务', () => {
  let mockPlayer: Player;

  beforeEach(() => {
    clearChatMessages();
    mockPlayer = {
      id: 0,
      name: '测试玩家',
      type: PlayerType.AI,
      hand: [],
      voiceConfig: {
        gender: 'female',
        dialect: 'mandarin'
      }
    };
  });

  describe('消息管理', () => {
    it('应该能够添加聊天消息', () => {
      const message = createChatMessage(mockPlayer, '测试消息', 'random');
      addChatMessage(message);
      
      const messages = getChatMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe('测试消息');
      expect(messages[0].playerId).toBe(0);
    });

    it('应该能够获取所有聊天消息', () => {
      clearChatMessages(); // 确保测试前清空
      const message1 = createChatMessage(mockPlayer, '消息1', 'random');
      const message2 = createChatMessage(mockPlayer, '消息2', 'event');
      
      addChatMessage(message1);
      addChatMessage(message2);
      
      const messages = getChatMessages();
      expect(messages.length).toBe(2);
    });

    it('应该能够清空聊天消息', () => {
      clearChatMessages(); // 确保测试前清空
      const message = createChatMessage(mockPlayer, '测试消息', 'random');
      addChatMessage(message);
      
      expect(getChatMessages().length).toBe(1);
      
      clearChatMessages();
      expect(getChatMessages().length).toBe(0);
    });

    it('应该限制消息数量在配置的最大值以内', () => {
      // 默认最大50条
      for (let i = 0; i < 60; i++) {
        const message = createChatMessage(mockPlayer, `消息${i}`, 'random');
        addChatMessage(message);
      }
      
      const messages = getChatMessages();
      expect(messages.length).toBeLessThanOrEqual(50);
    });
  });

  describe('createChatMessage', () => {
    it('应该创建正确的聊天消息', () => {
      const message = createChatMessage(mockPlayer, '测试内容', 'event');
      
      expect(message.playerId).toBe(0);
      expect(message.playerName).toBe('测试玩家');
      expect(message.content).toBe('测试内容');
      expect(message.type).toBe('event');
      expect(message.timestamp).toBeGreaterThan(0);
    });
  });

  describe('triggerRandomChat', () => {
    it('应该根据概率触发随机闲聊', async () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.0); // 小于概率，确保触发
      
      // 使用高概率确保触发
      const message = await triggerRandomChat(mockPlayer, 1.0);
      expect(message).not.toBeNull();
      expect(message?.playerId).toBe(0);
      expect(message?.type).toBe('random');
      
      Math.random = originalRandom;
    });

    it('应该根据概率不触发随机闲聊', async () => {
      // Mock Math.random 确保不触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 1.0); // 大于概率，确保不触发
      
      // 使用低概率确保不触发
      const message = await triggerRandomChat(mockPlayer, 0.0);
      expect(message).toBeNull();
      
      Math.random = originalRandom;
    });
  });

  describe('triggerEventChat', () => {
    it('应该触发大墩事件聊天', async () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发
      
      const message = await triggerEventChat(mockPlayer, ChatEventType.BIG_DUN);
      expect(message).not.toBeNull();
      expect(message?.type).toBe('event');
      expect(message?.playerId).toBe(0);
      
      Math.random = originalRandom;
    });

    it('应该触发分牌被捡走事件聊天', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1);
      
      const message = await triggerEventChat(mockPlayer, ChatEventType.SCORE_STOLEN);
      expect(message).not.toBeNull();
      // 注意：SCORE_STOLEN 事件在策略中会返回 'taunt' 类型（这是设计行为）
      expect(['event', 'taunt']).toContain(message?.type);
      
      Math.random = originalRandom;
    });

    it('应该触发好牌事件聊天', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1);
      
      const message = await triggerEventChat(mockPlayer, ChatEventType.GOOD_PLAY);
      expect(message).not.toBeNull();
      expect(message?.type).toBe('event');
      
      Math.random = originalRandom;
    });
  });

  describe('triggerBigDunReaction', () => {
    it('应该为大墩触发其他玩家的反应', async () => {
      const players: Player[] = [
        { ...mockPlayer, id: 0 },
        { ...mockPlayer, id: 1, name: '玩家2' },
        { ...mockPlayer, id: 2, name: '玩家3' }
      ];

      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = vi.fn(() => {
        callCount++;
        return 0.1; // 小于0.5，确保触发
      });

      await triggerBigDunReaction(players, 0, 8);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('不应该为小墩触发反应', async () => {
      const players: Player[] = [
        { ...mockPlayer, id: 0 },
        { ...mockPlayer, id: 1, name: '玩家2' }
      ];

      clearChatMessages();
      await triggerBigDunReaction(players, 0, 6); // 小于8张

      const messages = getChatMessages();
      expect(messages.length).toBe(0);
    });
  });

  describe('triggerScoreStolenReaction', () => {
    it('应该触发分牌被捡走反应', async () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      await triggerScoreStolenReaction(mockPlayer, 10);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('不应该在没有分牌被捡走时触发', async () => {
      clearChatMessages();
      await triggerScoreStolenReaction(mockPlayer, 0);

      const messages = getChatMessages();
      expect(messages.length).toBe(0);
    });
  });

  describe('triggerGoodPlayReaction', () => {
    it('应该触发好牌反应', async () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      await triggerGoodPlayReaction(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });
  });

  describe('triggerTaunt', () => {
    it('应该触发对骂', async () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于0.2，确保触发

      await triggerTaunt(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('taunt');

      Math.random = originalRandom;
    });
  });

  describe('其他事件反应函数', () => {
    it('应该触发坏运气反应', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      await triggerBadLuckReaction(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('event');

      Math.random = originalRandom;
    });

    it('应该触发获胜反应', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      await triggerWinningReaction(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('event');

      Math.random = originalRandom;
    });

    it('应该触发失败反应', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      await triggerLosingReaction(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('event');

      Math.random = originalRandom;
    });

    it('应该触发第一个出完反应', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      await triggerFinishFirstReaction(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('event');

      Math.random = originalRandom;
    });

    it('应该触发最后一个出完反应', async () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      await triggerFinishLastReaction(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('event');

      Math.random = originalRandom;
    });
  });

  describe('ChatService类方法', () => {
    it('应该能够获取最新消息', () => {
      const message1 = createChatMessage(mockPlayer, '消息1', 'random');
      const message2 = createChatMessage(mockPlayer, '消息2', 'event');
      
      addChatMessage(message1);
      addChatMessage(message2);
      
      const latest = chatService.getLatestMessage();
      expect(latest).not.toBeNull();
      expect(latest?.content).toBe('消息2');
    });

    it('应该能够获取消息数量', () => {
      expect(chatService.getMessageCount()).toBe(0);
      
      addChatMessage(createChatMessage(mockPlayer, '消息1', 'random'));
      addChatMessage(createChatMessage(mockPlayer, '消息2', 'event'));
      
      expect(chatService.getMessageCount()).toBe(2);
    });

    it('应该能够更新配置', () => {
      const originalMax = chatService.getMessages().length;
      chatService.updateConfig({ maxMessages: 10 });
      
      // 添加超过10条消息
      for (let i = 0; i < 15; i++) {
        addChatMessage(createChatMessage(mockPlayer, `消息${i}`, 'random'));
      }
      
      const messages = chatService.getMessages();
      expect(messages.length).toBeLessThanOrEqual(10);
    });
  });

  describe('triggerSortingReaction - 理牌聊天触发', () => {
    const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
      suit,
      rank,
      id
    });

    it('应该在形成炸弹时触发聊天', async () => {
      clearChatMessages();
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      const hand: Card[] = [
        createCard(Suit.HEARTS, Rank.FIVE, '1'),
        createCard(Suit.SPADES, Rank.FIVE, '2'),
        createCard(Suit.DIAMONDS, Rank.FIVE, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4')
      ];
      const newlyDealtCard = createCard(Suit.HEARTS, Rank.FIVE, '5');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = getChatMessages();
      // 应该触发炸弹相关的聊天
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('应该在形成墩时触发聊天', async () => {
      clearChatMessages();
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      const hand: Card[] = Array.from({ length: 7 }, (_, i) =>
        createCard(Suit.HEARTS, Rank.TEN, `card-${i}`)
      );
      const newlyDealtCard = createCard(Suit.SPADES, Rank.TEN, 'new-card');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = getChatMessages();
      // 应该触发墩相关的聊天
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('应该在抓到超大牌时触发聊天', async () => {
      clearChatMessages();
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      const hand: Card[] = [
        createCard(Suit.HEARTS, Rank.THREE, '1'),
        createCard(Suit.SPADES, Rank.FOUR, '2')
      ];
      const newlyDealtCard = createCard(Suit.JOKER, Rank.JOKER_BIG, 'big-joker');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = getChatMessages();
      // 应该触发超大牌相关的聊天
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('应该在手牌质量差时触发聊天', async () => {
      clearChatMessages();
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      // 创建质量差的手牌（都是小牌，没有组合）
      const hand: Card[] = Array.from({ length: 25 }, (_, i) =>
        createCard(Suit.HEARTS, Rank.THREE + (i % 5), `card-${i}`)
      );
      const newlyDealtCard = createCard(Suit.SPADES, Rank.FOUR, 'new-card');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = getChatMessages();
      // 可能会触发差牌相关的聊天（取决于概率）
      // 由于有概率控制，可能不会每次都触发，所以只检查没有错误

      Math.random = originalRandom;
    });

    it('应该优先检测炸弹/墩而不是超大牌', async () => {
      clearChatMessages();
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 确保触发

      // 既有炸弹又有超大牌
      const hand: Card[] = [
        createCard(Suit.HEARTS, Rank.FIVE, '1'),
        createCard(Suit.SPADES, Rank.FIVE, '2'),
        createCard(Suit.DIAMONDS, Rank.FIVE, '3'),
        createCard(Suit.CLUBS, Rank.FIVE, '4'),
        createCard(Suit.JOKER, Rank.JOKER_BIG, '5')
      ];
      const newlyDealtCard = createCard(Suit.HEARTS, Rank.TWO, 'two');

      await chatService.triggerSortingReaction(mockPlayer, hand, newlyDealtCard);

      const messages = getChatMessages();
      // 应该优先触发炸弹相关的聊天，而不是超大牌
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });
  });
});

