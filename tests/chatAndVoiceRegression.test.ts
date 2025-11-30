/**
 * 聊天和语音系统回归测试
 * 确保新增功能不影响现有功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player, PlayerType, Card, Suit, Rank, CardType, Play } from '../src/types/card';
import { ChatEventType } from '../src/types/chat';
import { generateRandomVoiceConfig } from '../src/services/voiceConfigService';
import { playToSpeechText } from '../src/utils/speechUtils';
import {
  clearChatMessages,
  getChatMessages,
  triggerRandomChat,
  triggerEventChat,
  triggerBigDunReaction
} from '../src/services/chatService';
import { getChatContent, getRandomChat, getTaunt } from '../src/utils/chatContent';
import i18n from '../src/i18n';

// @async - 异步调用测试，平时可以跳过
describe('聊天和语音系统回归测试', () => {
  beforeEach(async () => {
    clearChatMessages();
    vi.clearAllMocks();

    // 设置 i18n 为中文，确保 playToSpeechText 返回中文
    if (i18n && typeof i18n.isInitialized !== 'undefined' && !i18n.isInitialized) {
      await i18n.init();
    }
    if (i18n && i18n.changeLanguage) {
      await i18n.changeLanguage('zh-CN');
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  });

  describe('语音功能回归', () => {
    it('应该保持原有的牌型转语音文本功能', () => {
      const play: Play = {
        cards: [
          { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'test-2' }
        ],
        type: CardType.PAIR,
        value: Rank.FIVE
      };

      expect(playToSpeechText(play)).toBe('对五');
    });

    it('应该保持原有的语音配置生成功能', () => {
      const config = generateRandomVoiceConfig(0);
      expect(config).toBeDefined();
      expect(config.gender).toBe('female');
      expect(['mandarin', 'cantonese']).toContain(config.dialect);
    });

    it('应该保持原有的自定义rank发音', () => {
      const playJ: Play = {
        cards: Array.from({ length: 7 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.JACK,
          id: `test-j-${i}`
        })),
        type: CardType.DUN,
        value: Rank.JACK
      };
      expect(playToSpeechText(playJ)).toContain('钩');

      const playQ: Play = {
        cards: Array.from({ length: 7 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.QUEEN,
          id: `test-q-${i}`
        })),
        type: CardType.DUN,
        value: Rank.QUEEN
      };
      expect(playToSpeechText(playQ)).toContain('圈圈');

      const playA: Play = {
        cards: Array.from({ length: 7 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.ACE,
          id: `test-a-${i}`
        })),
        type: CardType.DUN,
        value: Rank.ACE
      };
      expect(playToSpeechText(playA)).toContain('桌桌');

      const play2: Play = {
        cards: Array.from({ length: 7 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.TWO,
          id: `test-2-${i}`
        })),
        type: CardType.DUN,
        value: Rank.TWO
      };
      expect(playToSpeechText(play2)).toContain('喔喔');
    });
  });

  describe('聊天功能回归', () => {
    it('应该能够正常触发随机闲聊', async () => {
      const player: Player = {
        id: 0,
        name: '测试玩家',
        type: PlayerType.AI,
        hand: [],
        voiceConfig: {
          gender: 'female',
          dialect: 'mandarin'
        }
      };

      // 使用高概率确保触发
      const message = await triggerRandomChat(player, 1.0);
      expect(message).not.toBeNull();
      expect(message?.playerId).toBe(0);
    });

    it('应该能够正常触发事件聊天', async () => {
      const player: Player = {
        id: 0,
        name: '测试玩家',
        type: PlayerType.AI,
        hand: [],
        voiceConfig: {
          gender: 'female',
          dialect: 'mandarin'
        }
      };

      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 小于概率，确保触发

      const message = await triggerEventChat(player, ChatEventType.BIG_DUN);
      expect(message).not.toBeNull();
      expect(['event', 'taunt']).toContain(message?.type);

      Math.random = originalRandom;
    });

    it('应该能够正常触发大墩反应', async () => {
      const players: Player[] = [
        {
          id: 0,
          name: '玩家1',
          type: PlayerType.AI,
          hand: [],
          voiceConfig: { gender: 'female', dialect: 'mandarin' }
        },
        {
          id: 1,
          name: '玩家2',
          type: PlayerType.AI,
          hand: [],
          voiceConfig: { gender: 'female', dialect: 'cantonese' }
        }
      ];

      // Mock Math.random 确保触发
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.3);

      await triggerBigDunReaction(players, 0, 8);

      const messages = getChatMessages();
      expect(messages.length).toBeGreaterThan(0);

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

  describe('集成回归', () => {
    it('应该能够同时使用语音和聊天功能', async () => {
      const player: Player = {
        id: 0,
        name: '测试玩家',
        type: PlayerType.AI,
        hand: [],
        voiceConfig: generateRandomVoiceConfig(0)
      };

      // 测试语音配置
      expect(player.voiceConfig).toBeDefined();
      expect(player.voiceConfig?.gender).toBe('female');

      // 测试聊天功能（triggerRandomChat 返回 Promise）
      const message = await triggerRandomChat(player, 1.0);
      expect(message).not.toBeNull();
      expect(message?.playerId).toBe(0);
    });

    it('应该能够处理多个玩家的聊天', async () => {
      const players: Player[] = [
        {
          id: 0,
          name: '玩家1',
          type: PlayerType.AI,
          hand: [],
          voiceConfig: generateRandomVoiceConfig(0)
        },
        {
          id: 1,
          name: '玩家2',
          type: PlayerType.AI,
          hand: [],
          voiceConfig: generateRandomVoiceConfig(1)
        },
        {
          id: 2,
          name: '玩家3',
          type: PlayerType.AI,
          hand: [],
          voiceConfig: generateRandomVoiceConfig(2)
        }
      ];

      // 每个玩家都应该有不同的语音配置
      expect(players[0].voiceConfig?.voiceIndex).toBe(0);
      expect(players[1].voiceConfig?.voiceIndex).toBe(1);
      expect(players[2].voiceConfig?.voiceIndex).toBe(2);

      // 每个玩家都能触发聊天（triggerRandomChat 返回 Promise）
      for (const player of players) {
        const message = await triggerRandomChat(player, 1.0);
        expect(message).not.toBeNull();
        expect(message?.playerId).toBe(player.id);
      }

      const messages = getChatMessages();
      expect(messages.length).toBe(3);
    });
  });
});

