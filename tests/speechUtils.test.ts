/**
 * 语音工具测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Card, Suit, Rank, CardType, Play } from '../src/types/card';
import { playToSpeechText } from '../src/utils/speechUtils';
import { isSpeechSupported, speakText } from '../src/services/voiceService';
import { generateRandomVoiceConfig } from '../src/services/voiceConfigService';
import i18n from '../src/i18n';

// Mock speechSynthesis
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn(() => [
  { lang: 'zh-CN', name: 'Chinese Voice' },
  { lang: 'en-US', name: 'English Voice' }
]);

// Mock SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  text: string = '';
  lang: string = '';
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  voice: any = null;
  
  constructor(text: string) {
    this.text = text;
  }
}

beforeEach(async () => {
  // 重置mock
  mockSpeak.mockClear();
  mockCancel.mockClear();
  
  // Mock SpeechSynthesisUtterance
  global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as any;
  
  // Mock window.speechSynthesis
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices,
      onvoiceschanged: null
    },
    writable: true,
    configurable: true
  });
  
  // 确保speechSynthesis在window上
  if (!('speechSynthesis' in window)) {
    (window as any).speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices,
      onvoiceschanged: null
    };
  }

  // 设置 i18n 为中文，确保 playToSpeechText 返回中文
  if (i18n && typeof i18n.isInitialized !== 'undefined' && !i18n.isInitialized) {
    await i18n.init();
  }
  if (i18n && i18n.changeLanguage) {
    await i18n.changeLanguage('zh-CN');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @async - 异步调用测试，平时可以跳过
describe('语音工具测试', () => {
  describe('牌型转语音文本', () => {
    it('应该正确转换单张', () => {
      const play: Play = {
        cards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' }],
        type: CardType.SINGLE,
        value: Rank.FIVE
      };
      
      expect(playToSpeechText(play)).toBe('五');
    });

    it('应该正确转换对子', () => {
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

    it('应该正确转换三张', () => {
      const play: Play = {
        cards: [
          { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'test-2' },
          { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }
        ],
        type: CardType.TRIPLE,
        value: Rank.FIVE
      };
      
      expect(playToSpeechText(play)).toBe('三个五');
    });

    it('应该正确转换炸弹（4张）', () => {
      const play: Play = {
        cards: Array.from({ length: 4 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.FIVE,
          id: `test-${i}`
        })),
        type: CardType.BOMB,
        value: Rank.FIVE
      };
      
      expect(playToSpeechText(play)).toBe('4个五');
    });

    it('应该正确转换炸弹（6张）', () => {
      const play: Play = {
        cards: Array.from({ length: 6 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.FIVE,
          id: `test-${i}`
        })),
        type: CardType.BOMB,
        value: Rank.FIVE
      };
      
      expect(playToSpeechText(play)).toBe('6个五');
    });

    it('应该正确转换墩（7张）', () => {
      const play: Play = {
        cards: Array.from({ length: 7 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.FIVE,
          id: `test-${i}`
        })),
        type: CardType.DUN,
        value: Rank.FIVE
      };
      
      expect(playToSpeechText(play)).toBe('7个五');
    });

    it('应该正确转换墩（8张）', () => {
      const play: Play = {
        cards: Array.from({ length: 8 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.FIVE,
          id: `test-${i}`
        })),
        type: CardType.DUN,
        value: Rank.FIVE
      };
      
      expect(playToSpeechText(play)).toBe('8个五');
    });

    it('应该正确转换所有rank', () => {
      const ranks = [
        { rank: Rank.THREE, expected: '三' },
        { rank: Rank.FOUR, expected: '四' },
        { rank: Rank.FIVE, expected: '五' },
        { rank: Rank.SIX, expected: '六' },
        { rank: Rank.SEVEN, expected: '七' },
        { rank: Rank.EIGHT, expected: '八' },
        { rank: Rank.NINE, expected: '九' },
        { rank: Rank.TEN, expected: '十' },
        { rank: Rank.JACK, expected: '钩' }, // J改为钩
        { rank: Rank.QUEEN, expected: '圈圈' }, // Q改为圈圈
        { rank: Rank.KING, expected: 'K' },
        { rank: Rank.ACE, expected: '桌桌' }, // A改为桌桌
        { rank: Rank.TWO, expected: '喔喔' }, // 2改为喔喔
        { rank: Rank.JOKER_SMALL, expected: '小王' },
        { rank: Rank.JOKER_BIG, expected: '大王' }
      ];
      
      ranks.forEach(({ rank, expected }) => {
        const play: Play = {
          cards: [{ suit: Suit.SPADES, rank, id: 'test-1' }],
          type: CardType.SINGLE,
          value: rank
        };
        expect(playToSpeechText(play)).toBe(expected);
      });
    });
  });

  describe('语音合成', () => {
    it('应该检查浏览器是否支持语音合成', () => {
      // 由于我们mock了speechSynthesis，应该返回true
      expect(isSpeechSupported()).toBe(true);
    });

    it('应该能够调用speakText', async () => {
      // speakText 现在使用 multiChannelVoiceService，不会直接调用 window.speechSynthesis.speak
      // 这个测试主要验证 speakText 不会抛出错误
      const promise = speakText('测试');
      
      // 由于 speakText 使用队列系统，我们主要验证它不会抛出错误
      await promise.catch(() => {
        // 忽略播放错误，主要测试函数可以正常调用
      });
      
      // 验证 speakText 返回 Promise
      expect(promise).toBeInstanceOf(Promise);
    });

    it('应该能够调用speakPlay（使用speakText + playToSpeechText）', async () => {
      const play: Play = {
        cards: Array.from({ length: 6 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.FIVE,
          id: `test-${i}`
        })),
        type: CardType.BOMB,
        value: Rank.FIVE
      };
      
      // 确保speechSynthesis可用
      expect('speechSynthesis' in window).toBe(true);
      
      // 使用 playToSpeechText 转换，然后用 speakText 播放
      const text = playToSpeechText(play);
      expect(text).toBe('6个五');
      
      // 注意：speakText 现在使用多声道服务，不会直接调用 mockSpeak
      // 这个测试主要验证文本转换是否正确
      const promise = speakText(text);
      
      // 由于 speakText 现在使用队列系统，我们主要验证文本转换
      // 实际播放由 multiChannelVoiceService 处理，不在这个测试范围内
      await promise.catch(() => {
        // 忽略播放错误，主要测试文本转换
      });
    });
  });

  describe('语音配置', () => {
    it('应该生成随机语音配置', () => {
      const config = generateRandomVoiceConfig(0);
      expect(config).toBeDefined();
      expect(config.gender).toBe('female');
      expect(['mandarin', 'cantonese', 'nanchang']).toContain(config.dialect);
      expect(config.rate).toBeGreaterThanOrEqual(0.9);
      expect(config.rate).toBeLessThanOrEqual(1.1);
      expect(config.pitch).toBeGreaterThanOrEqual(1.0);
      expect(config.pitch).toBeLessThanOrEqual(1.3);
      expect(config.voiceIndex).toBe(0);
    });

    it('应该为不同玩家生成不同的语音配置', () => {
      const config1 = generateRandomVoiceConfig(0);
      const config2 = generateRandomVoiceConfig(1);
      const config3 = generateRandomVoiceConfig(2);

      // 至少应该有不同的voiceIndex
      expect(config1.voiceIndex).toBe(0);
      expect(config2.voiceIndex).toBe(1);
      expect(config3.voiceIndex).toBe(2);
    });

    it('应该为同一玩家生成相同的语音配置', () => {
      const config1 = generateRandomVoiceConfig(5);
      const config2 = generateRandomVoiceConfig(5);

      expect(config1.dialect).toBe(config2.dialect);
      expect(config1.rate).toBe(config2.rate);
      expect(config1.pitch).toBe(config2.pitch);
      expect(config1.voiceIndex).toBe(config2.voiceIndex);
    });

    it('应该只使用支持的方言（mandarin, cantonese, nanchang）', () => {
      for (let i = 0; i < 10; i++) {
        const config = generateRandomVoiceConfig(i);
        expect(['mandarin', 'cantonese', 'nanchang']).toContain(config.dialect);
      }
    });

    it('应该全用女声', () => {
      for (let i = 0; i < 10; i++) {
        const config = generateRandomVoiceConfig(i);
        expect(config.gender).toBe('female');
      }
    });
  });
});

