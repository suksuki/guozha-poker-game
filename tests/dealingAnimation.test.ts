/**
 * 发牌动画组件测试
 * 主要测试发牌逻辑和状态管理
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DealingAnimation } from '../src/components/game/DealingAnimation';
import { PlayerType } from '../src/types/card';

// Mock i18next-browser-languagedetector（必须在 i18n 之前）
vi.mock('i18next-browser-languagedetector', () => ({
  default: {
    type: 'languageDetector' as const,
    detect: vi.fn(() => 'en-US'),
    init: vi.fn(),
    cacheUserLanguage: vi.fn()
  }
}));

// Mock i18next（避免初始化）
vi.mock('i18next', () => {
  const mockI18n = {
    language: 'en-US',
    isInitialized: true,
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    t: (key: string, params?: any) => {
      if (key === 'ui:dealing.dealingProgress' && params) {
        return `Dealing... ${params.current} / ${params.total}`;
      }
      const translations: { [key: string]: string } = {
        'ui:dealing.skipAnimation': 'Skip dealing animation',
        'ui:dealing.switchToManual': '👆 Switch to Manual',
        'ui:dealing.switchToAuto': '👆 Switch to Auto',
        'ui:dealing.drawCard': 'Draw Card',
        'ui:playerHand.loading': 'Loading hand data...'
      };
      return translations[key] || key;
    }
  };
  return {
    default: mockI18n
  };
});

// Mock i18n 模块（避免在测试中初始化）
vi.mock('../src/i18n', () => ({
  default: {
    language: 'en-US',
    isInitialized: true,
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    t: (key: string, params?: any) => {
      if (key === 'ui:dealing.dealingProgress' && params) {
        return `Dealing... ${params.current} / ${params.total}`;
      }
      const translations: { [key: string]: string } = {
        'ui:dealing.skipAnimation': 'Skip dealing animation',
        'ui:dealing.switchToManual': '👆 Switch to Manual',
        'ui:dealing.switchToAuto': '👆 Switch to Auto',
        'ui:dealing.drawCard': 'Draw Card',
        'ui:playerHand.loading': 'Loading hand data...'
      };
      return translations[key] || key;
    }
  }
}));

// Mock chatService
vi.mock('../src/services/chatService', () => ({
  triggerDealingReaction: vi.fn().mockResolvedValue(undefined),
  chatService: {
    triggerSortingReaction: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock i18n
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, params?: any) => {
        // 处理带参数的翻译
        if (key === 'ui:dealing.dealingProgress' && params) {
          return `Dealing... ${params.current} / ${params.total}`;
        }
        // 其他翻译键的映射
        const translations: { [key: string]: string } = {
          'ui:dealing.skipAnimation': 'Skip dealing animation',
          'ui:dealing.switchToManual': '👆 Switch to Manual',
          'ui:dealing.switchToAuto': '👆 Switch to Auto',
          'ui:dealing.drawCard': 'Draw Card',
          'ui:playerHand.loading': 'Loading hand data...'
        };
        return translations[key] || key;
      },
      i18n: {
        changeLanguage: vi.fn(),
        language: 'en-US'
      }
    }),
    initReactI18next: {
      type: 'languageDetector' as const,
      init: vi.fn()
    }
  };
});

// Mock dealCardsWithAlgorithm
vi.mock('../src/utils/dealingAlgorithms', () => ({
  dealCardsWithAlgorithm: vi.fn((config) => {
    // 生成测试用的牌
    const hands: any[][] = [];
    const cardsPerPlayer = 54; // 每副牌54张
    
    for (let i = 0; i < config.playerCount; i++) {
      const hand = [];
      for (let j = 0; j < cardsPerPlayer; j++) {
        hand.push({
          id: `card-${i}-${j}`,
          suit: 'spades',
          rank: 3 + (j % 13)
        });
      }
      hands.push(hand);
    }
    
    return {
      hands,
      totalCards: cardsPerPlayer * config.playerCount,
      cardsPerPlayer: Array(config.playerCount).fill(cardsPerPlayer)
    };
  }),
  getDealingAlgorithmDescription: vi.fn((alg) => `算法: ${alg}`)
}));

// @ui - 界面交互测试，平时可以跳过
describe('发牌动画组件', () => {
  const mockPlayers = [
    {
      id: 0,
      name: '你',
      type: PlayerType.HUMAN,
      isHuman: true,
      score: 0
    },
    {
      id: 1,
      name: '玩家2',
      type: PlayerType.AI,
      isHuman: false,
      score: 0
    },
    {
      id: 2,
      name: '玩家3',
      type: PlayerType.AI,
      isHuman: false,
      score: 0
    },
    {
      id: 3,
      name: '玩家4',
      type: PlayerType.AI,
      isHuman: false,
      score: 0
    }
  ];

  const mockDealingConfig = {
    algorithm: 'random' as const,
    playerCount: 4,
    favorPlayerIndex: 0
  };

  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // 使用 fake timers 控制动画时间
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('应该渲染发牌界面', () => {
    render(
      <DealingAnimation
        playerCount={4}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
      />
    );

    // 应该显示发牌进度（实际显示的是英文 "Dealing..."）
    expect(screen.getByText(/Dealing/)).toBeInTheDocument();
  });

  it('应该显示所有玩家', () => {
    render(
      <DealingAnimation
        playerCount={4}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
      />
    );

    // 应该显示所有玩家名称
    mockPlayers.forEach(player => {
      expect(screen.getByText(player.name)).toBeInTheDocument();
    });
  });

  it('应该显示进度条', () => {
    render(
      <DealingAnimation
        playerCount={4}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
      />
    );

    // 应该显示进度文本（实际显示的是英文 "Dealing..."）
    expect(screen.getByText(/Dealing/)).toBeInTheDocument();
    // 应该显示进度条
    expect(document.querySelector('.progress-bar')).toBeInTheDocument();
  });

  it('应该支持取消发牌', () => {
    render(
      <DealingAnimation
        playerCount={4}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
        onCancel={mockOnCancel}
      />
    );

    // 应该显示取消按钮（实际显示的是英文 "Skip dealing animation"）
    const cancelButton = screen.getByText(/Skip dealing animation/i);
    expect(cancelButton).toBeInTheDocument();
    
    // 点击取消按钮应该调用 onCancel
    cancelButton.click();
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('发牌完成后应该调用 onComplete', async () => {
    // 使用更快的发牌速度（1ms）来加速测试
    render(
      <DealingAnimation
        playerCount={4}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
        dealingSpeed={1} // 测试时使用1ms，而不是默认的150ms
      />
    );

    // 等待组件初始化（useEffect 会延迟 500ms 开始发牌）
    await vi.advanceTimersByTimeAsync(600);

    // 等待发牌完成（需要等待所有牌发完）
    // 4个玩家 * 54张牌 = 216张牌，每张1ms = 216ms
    // 加上 onComplete 的延迟 500ms，总共需要至少 716ms
    // 再加上一些缓冲，推进 2500ms 确保所有定时器都执行完
    await vi.advanceTimersByTimeAsync(2500);

    // 运行所有待处理的定时器（确保所有 setTimeout 都执行完）
    await vi.runAllTimersAsync();

    // 直接检查 onComplete 是否被调用（不使用 waitFor，因为 fake timers 可能无法正确触发 waitFor）
    expect(mockOnComplete).toHaveBeenCalled();

    // 验证 onComplete 被调用时传入了正确的牌
    expect(mockOnComplete).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        expect.any(Array)
      ])
    );
  }, 10000); // 测试超时时间10秒
});

