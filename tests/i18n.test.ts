/**
 * 多语言功能测试
 * @async - 异步调用测试，平时可以跳过
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { i18n } from '../src/i18n';
import { playToSpeechText } from '../src/utils/speechUtils';
import { Play, CardType, Rank, Suit } from '../src/types/card';

// 辅助函数：等待语言切换完成（带超时保护，优化后减少等待时间）
async function waitForLanguageChange(targetLang: string, maxWait = 200): Promise<void> {
  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = 20; // 减少尝试次数，加快测试速度
  
  while (i18n.language !== targetLang && attempts < maxAttempts && (Date.now() - startTime) < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 5)); // 从10ms减少到5ms
    attempts++;
  }
  
  // 如果还没切换，强制切换
  if (i18n.language !== targetLang) {
    console.log(`[测试] 语言切换超时，强制设置: ${targetLang}`);
    await i18n.changeLanguage(targetLang);
    await new Promise(resolve => setTimeout(resolve, 10)); // 从50ms减少到10ms
  }
  
  // 额外等待确保资源加载完成（减少等待时间）
  await new Promise(resolve => setTimeout(resolve, 10)); // 从50ms减少到10ms
}

// @async - 异步调用测试，平时可以跳过
describe('多语言功能测试', () => {
  beforeEach(async () => {
    // 清理 localStorage
    localStorage.removeItem('i18nextLng');
    
    // 确保 i18n 已初始化
    if (i18n && typeof i18n.isInitialized !== 'undefined' && !i18n.isInitialized) {
      await i18n.init();
    }
    
    // 强制重置为默认语言（使用同步方法）
    if (i18n && i18n.changeLanguage) {
      await i18n.changeLanguage('zh-CN');
    }
    // 等待一小段时间让语言切换生效（优化：减少等待时间）
    await new Promise(resolve => setTimeout(resolve, 20)); // 从100ms减少到20ms
  });

  afterEach(() => {
    // 清理 localStorage
    localStorage.removeItem('i18nextLng');
  });

  describe('语言切换', () => {
    it('应该支持切换到英文', async () => {
      const changePromise = i18n.changeLanguage('en-US');
      // 等待语言切换完成（优化：减少等待时间）
      await changePromise;
      await new Promise(resolve => setTimeout(resolve, 20)); // 从100ms减少到20ms
      
      // 验证语言已切换
      const currentLang = i18n.language;
      expect(currentLang).toBe('en-US');
      
      // 验证翻译文本
      const title = i18n.t('game:title');
      expect(title).toBe('Guozha Poker Game (Multi-Player)');
    });

    it('应该支持切换到中文', async () => {
      const changePromise = i18n.changeLanguage('zh-CN');
      await changePromise;
      await new Promise(resolve => setTimeout(resolve, 20)); // 从100ms减少到20ms
      
      expect(i18n.language).toBe('zh-CN');
      expect(i18n.t('game:title')).toBe('过炸扑克游戏（多人版）');
    });

    it('应该支持切换到韩文', async () => {
      const changePromise = i18n.changeLanguage('ko-KR');
      await changePromise;
      await new Promise(resolve => setTimeout(resolve, 20)); // 从100ms减少到20ms
      
      expect(i18n.language).toBe('ko-KR');
      const title = i18n.t('game:title');
      expect(title).toContain('과자');
    });

    it('应该支持切换到日文', async () => {
      const changePromise = i18n.changeLanguage('ja-JP');
      await changePromise;
      await new Promise(resolve => setTimeout(resolve, 20)); // 从100ms减少到20ms
      
      expect(i18n.language).toBe('ja-JP');
      const title = i18n.t('game:title');
      expect(title).toContain('ポーカー');
    });
  });

  describe('游戏文本翻译', () => {
    it('应该正确翻译游戏操作按钮（中文）', async () => {
      await i18n.changeLanguage('zh-CN');
      expect(i18n.t('game:actions.play')).toBe('出牌');
      expect(i18n.t('game:actions.pass')).toBe('要不起');
      expect(i18n.t('game:actions.aiSuggest')).toBe('🤖 AI建议');
    });

    it('应该正确翻译游戏操作按钮（英文）', async () => {
      await i18n.changeLanguage('en-US');
      await new Promise(resolve => setTimeout(resolve, 20)); // 从150ms减少到20ms
      
      // 验证当前语言
      expect(i18n.language).toBe('en-US');
      
      expect(i18n.t('game:actions.play')).toBe('Play');
      expect(i18n.t('game:actions.pass')).toBe('Pass');
      expect(i18n.t('game:actions.aiSuggest')).toBe('🤖 AI Suggest');
    });

    it('应该正确翻译游戏状态', async () => {
      await i18n.changeLanguage('zh-CN');
      expect(i18n.t('game:status.playing')).toBe('游戏中');
      expect(i18n.t('game:status.yourTurn')).toBe('你的回合');
    });
  });

  describe('卡牌语音转换多语言', () => {
    it('应该正确转换单张（中文）', async () => {
      await i18n.changeLanguage('zh-CN');
      const play: Play = {
        cards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' }],
        type: CardType.SINGLE,
        value: Rank.FIVE
      };
      expect(playToSpeechText(play)).toBe('五');
    });

    it('应该正确转换单张（英文）', async () => {
      await i18n.changeLanguage('en-US');
      await new Promise(resolve => setTimeout(resolve, 20)); // 从150ms减少到20ms
      
      // 验证语言已切换
      expect(i18n.language).toBe('en-US');
      
      const play: Play = {
        cards: [{ suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' }],
        type: CardType.SINGLE,
        value: Rank.FIVE
      };
      const result = playToSpeechText(play);
      expect(result).toBe('5');
    });

    it('应该正确转换对子（中文）', async () => {
      await i18n.changeLanguage('zh-CN');
      await waitForLanguageChange('zh-CN');
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

    it('应该正确转换对子（英文）', async () => {
      await i18n.changeLanguage('en-US');
      await new Promise(resolve => setTimeout(resolve, 20)); // 从150ms减少到20ms
      
      // 验证语言已切换
      expect(i18n.language).toBe('en-US');
      
      const play: Play = {
        cards: [
          { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'test-2' }
        ],
        type: CardType.PAIR,
        value: Rank.FIVE
      };
      const result = playToSpeechText(play);
      expect(result).toBe('Pair of 5');
    });

    it('应该正确转换三张（中文）', async () => {
      await i18n.changeLanguage('zh-CN');
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

    it('应该正确转换三张（英文）', async () => {
      await i18n.changeLanguage('en-US');
      const play: Play = {
        cards: [
          { suit: Suit.SPADES, rank: Rank.FIVE, id: 'test-1' },
          { suit: Suit.HEARTS, rank: Rank.FIVE, id: 'test-2' },
          { suit: Suit.DIAMONDS, rank: Rank.FIVE, id: 'test-3' }
        ],
        type: CardType.TRIPLE,
        value: Rank.FIVE
      };
      expect(playToSpeechText(play)).toBe('Three 5s');
    });

    it('应该正确转换所有卡牌点数（中文）', async () => {
      await i18n.changeLanguage('zh-CN');
      await new Promise(resolve => setTimeout(resolve, 20)); // 从150ms减少到20ms
      
      // 验证语言已切换
      expect(i18n.language).toBe('zh-CN');
      
      const ranks = [
        { rank: Rank.THREE, expected: '三' },
        { rank: Rank.FOUR, expected: '四' },
        { rank: Rank.FIVE, expected: '五' },
        { rank: Rank.JACK, expected: '钩' },
        { rank: Rank.QUEEN, expected: '圈圈' },
        { rank: Rank.ACE, expected: '桌桌' },
        { rank: Rank.TWO, expected: '喔喔' },
        { rank: Rank.JOKER_SMALL, expected: '小王' },
        { rank: Rank.JOKER_BIG, expected: '大王' },
      ];
      
      ranks.forEach(({ rank, expected }) => {
        const play: Play = {
          cards: [{ suit: Suit.SPADES, rank, id: 'test-1' }],
          type: CardType.SINGLE,
          value: rank
        };
        const result = playToSpeechText(play);
        expect(result).toBe(expected);
      });
    });

    it('应该正确转换所有卡牌点数（英文）', async () => {
      await i18n.changeLanguage('en-US');
      const ranks = [
        { rank: Rank.THREE, expected: '3' },
        { rank: Rank.FOUR, expected: '4' },
        { rank: Rank.FIVE, expected: '5' },
        { rank: Rank.JACK, expected: 'J' },
        { rank: Rank.QUEEN, expected: 'Q' },
        { rank: Rank.ACE, expected: 'A' },
        { rank: Rank.TWO, expected: '2' },
        { rank: Rank.JOKER_SMALL, expected: 'Small Joker' },
        { rank: Rank.JOKER_BIG, expected: 'Big Joker' },
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

  describe('UI配置文本翻译', () => {
    it('应该正确翻译配置项（中文）', async () => {
      await i18n.changeLanguage('zh-CN');
      await new Promise(resolve => setTimeout(resolve, 20)); // 从150ms减少到20ms
      
      // 验证语言已切换
      expect(i18n.language).toBe('zh-CN');
      
      expect(i18n.t('ui:config.playerCount')).toBe('玩家数量 (4-8人)');
      expect(i18n.t('ui:config.aiStrategy')).toBe('AI策略');
      expect(i18n.t('ui:strategies.balanced')).toBe('平衡');
    });

    it('应该正确翻译配置项（英文）', async () => {
      await i18n.changeLanguage('en-US');
      expect(i18n.t('ui:config.playerCount')).toBe('Player Count (4-8)');
      expect(i18n.t('ui:config.aiStrategy')).toBe('AI Strategy');
      expect(i18n.t('ui:strategies.balanced')).toBe('Balanced');
    });
  });

  describe('语言持久化', () => {
    it('应该保存语言选择到 localStorage', async () => {
      await i18n.changeLanguage('en-US');
      expect(localStorage.getItem('i18nextLng')).toBe('en-US');
    });
  });
});

