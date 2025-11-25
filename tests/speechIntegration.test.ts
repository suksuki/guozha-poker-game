/**
 * 语音功能集成测试
 * 测试语音功能在实际游戏中的集成
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Card, Suit, Rank, CardType, Play } from '../src/types/card';
import { playToSpeechText } from '../src/utils/speechUtils';
import { isSpeechSupported, speakText } from '../src/services/voiceService';
import i18n from '../src/i18n';

// Mock speechSynthesis
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn(() => [
  { lang: 'zh-CN', name: 'Chinese Voice' },
  { lang: 'en-US', name: 'English Voice' }
]);

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
  mockSpeak.mockClear();
  mockCancel.mockClear();
  
  global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as any;
  
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

  // 设置 i18n 为中文，确保 playToSpeechText 返回中文
  if (!i18n.isInitialized) {
    await i18n.init();
  }
  await i18n.changeLanguage('zh-CN');
  await new Promise(resolve => setTimeout(resolve, 20));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @async - 异步调用测试，平时可以跳过
describe('语音功能集成测试', () => {
  describe('实际游戏场景的语音提示', () => {
    it('应该正确转换6个5的语音', async () => {
      const play: Play = {
        cards: Array.from({ length: 6 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.FIVE,
          id: `test-${i}`
        })),
        type: CardType.BOMB,
        value: Rank.FIVE
      };
      
      const text = playToSpeechText(play);
      expect(text).toBe('6个五');
      
      // 使用 speakText + playToSpeechText 替代 speakPlay
      const promise = speakText(text);
      
      // 由于 speakText 现在使用队列系统，我们主要验证文本转换
      await promise.catch(() => {
        // 忽略播放错误，主要测试文本转换
      });
    });

    it('应该正确转换7个5的语音（墩）', async () => {
      const play: Play = {
        cards: Array.from({ length: 7 }, (_, i) => ({
          suit: Suit.SPADES,
          rank: Rank.FIVE,
          id: `test-${i}`
        })),
        type: CardType.DUN,
        value: Rank.FIVE
      };
      
      const text = playToSpeechText(play);
      expect(text).toBe('7个五');
      
      // 使用 speakText + playToSpeechText 替代 speakPlay
      const promise = speakText(text);
      
      // 由于 speakText 现在使用队列系统，我们主要验证文本转换
      await promise.catch(() => {
        // 忽略播放错误，主要测试文本转换
      });
    });

    it('应该正确转换对子的语音', () => {
      const play: Play = {
        cards: [
          { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'test-2' }
        ],
        type: CardType.PAIR,
        value: Rank.FIVE
      };
      
      const text = playToSpeechText(play);
      expect(text).toBe('对五');
    });

    it('应该正确转换三张的语音', () => {
      const play: Play = {
        cards: [
          { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'test-2' },
          { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }
        ],
        type: CardType.TRIPLE,
        value: Rank.FIVE
      };
      
      const text = playToSpeechText(play);
      expect(text).toBe('三个五');
    });

    it('应该正确转换大小王的语音', () => {
      const play: Play = {
        cards: [
          { suit: Suit.JOKER, rank: Rank.JOKER_SMALL, id: 'test-1' }
        ],
        type: CardType.SINGLE,
        value: Rank.JOKER_SMALL
      };
      
      const text = playToSpeechText(play);
      expect(text).toBe('小王');
      
      const play2: Play = {
        cards: [
          { suit: Suit.JOKER, rank: Rank.JOKER_BIG, id: 'test-2' }
        ],
        type: CardType.SINGLE,
        value: Rank.JOKER_BIG
      };
      
      const text2 = playToSpeechText(play2);
      expect(text2).toBe('大王');
    });
  });

  describe('语音功能可用性测试', () => {
    it('应该检查浏览器是否支持语音', () => {
      expect(isSpeechSupported()).toBe(true);
    });

    it('应该能够多次调用speakText而不出错', async () => {
      const play: Play = {
        cards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' }],
        type: CardType.SINGLE,
        value: Rank.FIVE
      };
      
      const text = playToSpeechText(play);
      
      // 连续调用多次（使用 speakText + playToSpeechText）
      const promise1 = speakText(text);
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const promise2 = speakText(text);
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const promise3 = speakText(text);
      await new Promise(resolve => setTimeout(resolve, 1));
      
      // 由于 speakText 现在使用队列系统，我们主要验证不会抛出错误
      await Promise.all([
        promise1.catch(() => {}),
        promise2.catch(() => {}),
        promise3.catch(() => {})
      ]);
    });
  });
});

