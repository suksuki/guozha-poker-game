/**
 * 语音功能集成测试
 * 测试语音功能在实际游戏中的集成
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Card, Suit, Rank, CardType, Play } from '../src/types/card';
import { playToSpeechText, speakPlay, isSpeechSupported } from '../src/utils/speechUtils';

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

beforeEach(() => {
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
      
      const promise = speakPlay(play);
      
      // 等待一小段时间让队列处理（测试环境可以更快）
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe('6个五');
      
      // 触发onend事件来完成Promise
      if (utterance.onend) {
        utterance.onend();
      }
      
      await promise;
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
      
      const promise = speakPlay(play);
      
      // 等待一小段时间让队列处理（测试环境可以更快）
      await new Promise(resolve => setTimeout(resolve, 1));
      
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      const utterance = mockSpeak.mock.calls[0][0];
      expect(utterance.text).toBe('7个五');
      
      // 触发onend事件来完成Promise
      if (utterance.onend) {
        utterance.onend();
      }
      
      await promise;
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

    it('应该能够多次调用speakPlay而不出错', async () => {
      const play: Play = {
        cards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' }],
        type: CardType.SINGLE,
        value: Rank.FIVE
      };
      
      // 连续调用多次（由于去重机制，相同语音会被忽略）
      const promise1 = speakPlay(play);
      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 1)); // 从10ms减少到1ms
      
      // 第二次调用会被去重（因为和第一次相同且时间间隔短）
      const promise2 = speakPlay(play);
      await new Promise(resolve => setTimeout(resolve, 1)); // 从10ms减少到1ms
      
      // 第三次调用也会被去重
      const promise3 = speakPlay(play);
      await new Promise(resolve => setTimeout(resolve, 1)); // 从10ms减少到1ms
      
      // 由于去重机制，只有第一次会真正播放
      expect(mockSpeak).toHaveBeenCalledTimes(1);
      
      // 触发onend事件来完成Promise
      if (mockSpeak.mock.calls[0] && mockSpeak.mock.calls[0][0] && mockSpeak.mock.calls[0][0].onend) {
        mockSpeak.mock.calls[0][0].onend();
      }
      
      await Promise.all([promise1, promise2, promise3]);
    });
  });
});

