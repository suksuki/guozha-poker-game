/**
 * 聊天系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player, PlayerType } from '../src/types/card';
import { ChatEventType } from '../src/types/chat';
import {
  addChatMessage,
  getChatMessages,
  clearChatMessages,
  createChatMessage,
  triggerRandomChat,
  triggerEventChat,
  triggerBigDunReaction,
  triggerScoreStolenReaction,
  triggerGoodPlayReaction,
  triggerTaunt
} from '../src/services/chatService';

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

describe('聊天系统', () => {
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
      const message1 = createChatMessage(mockPlayer, '消息1', 'random');
      const message2 = createChatMessage(mockPlayer, '消息2', 'event');
      
      addChatMessage(message1);
      addChatMessage(message2);
      
      const messages = getChatMessages();
      expect(messages.length).toBe(2);
    });

    it('应该能够清空聊天消息', () => {
      const message = createChatMessage(mockPlayer, '测试消息', 'random');
      addChatMessage(message);
      
      expect(getChatMessages().length).toBe(1);
      
      clearChatMessages();
      expect(getChatMessages().length).toBe(0);
    });

    it('应该限制消息数量在MAX_MESSAGES以内', () => {
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
    it('应该根据概率触发随机闲聊', () => {
      // 使用高概率确保触发
      const message = triggerRandomChat(mockPlayer, 1.0);
      expect(message).not.toBeNull();
      expect(message?.playerId).toBe(0);
      expect(message?.type).toBe('random');
    });

    it('应该根据概率不触发随机闲聊', () => {
      // 使用低概率确保不触发
      const message = triggerRandomChat(mockPlayer, 0.0);
      expect(message).toBeNull();
    });
  });

  describe('triggerEventChat', () => {
    it('应该触发大墩事件聊天', () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      const message = triggerEventChat(mockPlayer, ChatEventType.BIG_DUN);
      expect(message).not.toBeNull();
      expect(message?.type).toBe('event');
      expect(message?.playerId).toBe(0);

      Math.random = originalRandom;
    });

    it('应该触发分牌被捡走事件聊天', () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      const message = triggerEventChat(mockPlayer, ChatEventType.SCORE_STOLEN);
      expect(message).not.toBeNull();
      expect(message?.type).toBe('event');

      Math.random = originalRandom;
    });

    it('应该触发好牌事件聊天', () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      const message = triggerEventChat(mockPlayer, ChatEventType.GOOD_PLAY);
      expect(message).not.toBeNull();
      expect(message?.type).toBe('event');

      Math.random = originalRandom;
    });

    it('应该触发对骂聊天', () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      const message = triggerEventChat(mockPlayer, ChatEventType.RANDOM, true);
      expect(message).not.toBeNull();
      expect(message?.type).toBe('taunt');

      Math.random = originalRandom;
    });
  });

  describe('triggerBigDunReaction', () => {
    it('应该为大墩触发其他玩家的反应', () => {
      const players: Player[] = [
        { ...mockPlayer, id: 0 },
        { ...mockPlayer, id: 1, name: '玩家2' },
        { ...mockPlayer, id: 2, name: '玩家3' }
      ];

      // Mock Math.random 来确保触发
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = vi.fn(() => {
        callCount++;
        return 0.3; // 小于0.5，确保触发
      });

      triggerBigDunReaction(players, 0, 8);

      // 应该为其他玩家生成反应
      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });

    it('不应该为小墩触发反应', () => {
      const players: Player[] = [
        { ...mockPlayer, id: 0 },
        { ...mockPlayer, id: 1, name: '玩家2' }
      ];

      clearChatMessages();
      triggerBigDunReaction(players, 0, 6); // 小于8张

      const messages = getChatMessages();
      expect(messages.length).toBe(0);
    });
  });

  describe('triggerScoreStolenReaction', () => {
    it('应该触发分牌被捡走反应', () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.3); // 小于0.6，确保触发

      triggerScoreStolenReaction(mockPlayer, 10);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });
  });

  describe('triggerGoodPlayReaction', () => {
    it('应该触发好牌反应', () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.2); // 小于0.3，确保触发

      triggerGoodPlayReaction(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);

      Math.random = originalRandom;
    });
  });

  describe('triggerTaunt', () => {
    it('应该触发对骂', () => {
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于0.2，确保触发

      triggerTaunt(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].type).toBe('taunt');

      Math.random = originalRandom;
    });
  });
});

