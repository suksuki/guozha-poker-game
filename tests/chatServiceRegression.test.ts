/**
 * 聊天服务回归测试
 * 确保重构后功能正常
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
  triggerTaunt,
  triggerBadLuckReaction,
  triggerWinningReaction,
  triggerLosingReaction,
  triggerFinishFirstReaction,
  triggerFinishLastReaction,
  chatService
} from '../src/services/chatService';
import { getChatContent, getRandomChat, getTaunt } from '../src/utils/chatContent';

// Mock voiceService
vi.mock('../src/services/voiceService', () => ({
  speakText: vi.fn(() => Promise.resolve())
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
    generateEventChat: vi.fn(async (player, eventType) => {
      // 根据实际策略逻辑：SCORE_STOLEN 返回 taunt，其他返回 event
      const isTaunt = eventType === ChatEventType.SCORE_STOLEN;
      return {
        playerId: player.id,
        playerName: player.name,
        content: isTaunt ? '对骂内容' : '事件聊天',
        type: isTaunt ? 'taunt' : 'event',
        timestamp: Date.now()
      };
    }),
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

// @async - 异步调用测试，平时可以跳过
describe('聊天服务回归测试', () => {
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

  describe('向后兼容性', () => {
    it('应该保持原有的API接口', () => {
      // 测试所有导出的函数都存在
      expect(typeof addChatMessage).toBe('function');
      expect(typeof getChatMessages).toBe('function');
      expect(typeof clearChatMessages).toBe('function');
      expect(typeof createChatMessage).toBe('function');
      expect(typeof triggerRandomChat).toBe('function');
      expect(typeof triggerEventChat).toBe('function');
      expect(typeof triggerBigDunReaction).toBe('function');
      expect(typeof triggerScoreStolenReaction).toBe('function');
      expect(typeof triggerGoodPlayReaction).toBe('function');
      expect(typeof triggerTaunt).toBe('function');
      expect(typeof triggerBadLuckReaction).toBe('function');
      expect(typeof triggerWinningReaction).toBe('function');
      expect(typeof triggerLosingReaction).toBe('function');
      expect(typeof triggerFinishFirstReaction).toBe('function');
      expect(typeof triggerFinishLastReaction).toBe('function');
    });

    it('应该保持原有的消息结构', () => {
      const message = createChatMessage(mockPlayer, '测试', 'random');
      expect(message).toHaveProperty('playerId');
      expect(message).toHaveProperty('playerName');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('timestamp');
      expect(message).toHaveProperty('type');
    });
  });

  describe('功能完整性', () => {
    it('应该能够处理多个玩家的聊天', async () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.0); // 小于概率，确保触发
      
      const players: Player[] = [
        { ...mockPlayer, id: 0, name: '玩家1' },
        { ...mockPlayer, id: 1, name: '玩家2' },
        { ...mockPlayer, id: 2, name: '玩家3' }
      ];

      for (const player of players) {
        const message = await triggerRandomChat(player, 1.0);
        expect(message).not.toBeNull();
        expect(message?.playerId).toBe(player.id);
      }

      const messages = getChatMessages();
      expect(messages.length).toBe(3);
      
      Math.random = originalRandom;
    });

    it('应该能够处理不同方言的聊天', async () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.0); // 小于概率，确保触发
      
      const mandarinPlayer: Player = {
        ...mockPlayer,
        voiceConfig: { gender: 'female', dialect: 'mandarin' }
      };
      const cantonesePlayer: Player = {
        ...mockPlayer,
        id: 1,
        voiceConfig: { gender: 'female', dialect: 'cantonese' }
      };

      await triggerRandomChat(mandarinPlayer, 1.0);
      await triggerRandomChat(cantonesePlayer, 1.0);

      const messages = getChatMessages();
      expect(messages.length).toBe(2);
      
      Math.random = originalRandom;
    });

    it('应该能够处理所有事件类型', async () => {
      const eventTypes = [
        ChatEventType.BIG_DUN,
        ChatEventType.SCORE_STOLEN,
        ChatEventType.GOOD_PLAY,
        ChatEventType.BAD_LUCK,
        ChatEventType.WINNING,
        ChatEventType.LOSING,
        ChatEventType.FINISH_FIRST,
        ChatEventType.FINISH_LAST
      ];

      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      for (const eventType of eventTypes) {
        const message = await triggerEventChat(mockPlayer, eventType);
        expect(message).not.toBeNull();
        // 消息类型可能是 'event' 或 'taunt'，都算有效
        expect(['event', 'taunt']).toContain(message?.type);
      }

      Math.random = originalRandom;
    });
  });

  describe('聊天内容库回归', () => {
    it('应该能够获取所有类型的聊天内容', () => {
      const random = getRandomChat('mandarin');
      expect(random).toBeTruthy();
      expect(typeof random).toBe('string');

      const taunt = getTaunt('mandarin');
      expect(taunt).toBeTruthy();
      expect(typeof taunt).toBe('string');

      const bigDun = getChatContent(ChatEventType.BIG_DUN, 'mandarin');
      expect(bigDun).toBeTruthy();
      expect(typeof bigDun).toBe('string');

      const scoreStolen = getChatContent(ChatEventType.SCORE_STOLEN, 'mandarin');
      expect(scoreStolen).toBeTruthy();
      expect(typeof scoreStolen).toBe('string');
    });

    it('应该支持普通话和粤语', () => {
      const mandarin = getRandomChat('mandarin');
      const cantonese = getRandomChat('cantonese');

      expect(mandarin).toBeTruthy();
      expect(cantonese).toBeTruthy();
      expect(typeof mandarin).toBe('string');
      expect(typeof cantonese).toBe('string');
    });
  });

  describe('集成测试', () => {
    it('应该能够同时使用聊天服务和内容库', () => {
      const message = triggerRandomChat(mockPlayer, 1.0);
      expect(message).not.toBeNull();
      
      const content = getRandomChat('mandarin');
      expect(content).toBeTruthy();
    });

    it('应该能够处理完整的聊天流程', async () => {
      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = vi.fn(() => {
        callCount++;
        return 0.0; // 小于概率，确保触发
      });
      
      // 1. 随机闲聊
      const randomMessage = await triggerRandomChat(mockPlayer, 1.0);
      expect(randomMessage).not.toBeNull();

      // 2. 好牌反应
      await triggerGoodPlayReaction(mockPlayer);

      // 3. 大墩反应
      const players: Player[] = [
        mockPlayer,
        { ...mockPlayer, id: 1, name: '玩家2' }
      ];
      await triggerBigDunReaction(players, 0, 8);

      // 4. 分牌被捡走
      await triggerScoreStolenReaction(mockPlayer, 10);

      // 5. 其他事件反应
      await triggerBadLuckReaction(mockPlayer);
      await triggerWinningReaction(mockPlayer);
      triggerFinishFirstReaction(mockPlayer);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
      
      Math.random = originalRandom;
    });
  });

  describe('配置管理', () => {
    it('应该能够更新服务配置', () => {
      const originalCount = chatService.getMessageCount();
      
      // 更新最大消息数
      chatService.updateConfig({ maxMessages: 5 });
      
      // 添加超过5条消息
      for (let i = 0; i < 10; i++) {
        addChatMessage(createChatMessage(mockPlayer, `消息${i}`, 'random'));
      }
      
      const messages = chatService.getMessages();
      expect(messages.length).toBeLessThanOrEqual(5);
    });

    it('应该能够更新大墩配置', () => {
      const players: Player[] = [
        mockPlayer,
        { ...mockPlayer, id: 1, name: '玩家2' }
      ];

      // 设置最小墩数为10
      chatService.updateBigDunConfig({ minSize: 10 });
      
      clearChatMessages();
      triggerBigDunReaction(players, 0, 8); // 8张，小于10
      
      const messages = getChatMessages();
      expect(messages.length).toBe(0);
    });

    it('应该能够更新对骂配置', async () => {
      // 设置对骂概率为1.0（100%）
      chatService.updateTauntConfig({ probability: 1.0 });
      
      clearChatMessages();
      await triggerTaunt(mockPlayer);
      
      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);
    });
  });
});

