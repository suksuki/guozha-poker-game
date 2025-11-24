/**
 * 发牌动画组件测试
 * 主要测试发牌逻辑和状态管理
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DealingAnimation } from '../src/components/game/DealingAnimation';
import { PlayerType } from '../src/types/card';

// Mock chatService
vi.mock('../src/services/chatService', () => ({
  triggerDealingReaction: vi.fn().mockResolvedValue(undefined),
  chatService: {
    triggerSortingReaction: vi.fn().mockResolvedValue(undefined)
  }
}));

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

    // 应该显示发牌中心区域
    expect(screen.getByText(/发牌中/)).toBeInTheDocument();
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

    // 应该显示进度文本
    expect(screen.getByText(/发牌中/)).toBeInTheDocument();
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

    // 应该显示取消按钮
    const cancelButton = screen.getByText(/跳过发牌动画/);
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

    // 等待发牌完成（需要等待所有牌发完）
    // 4个玩家 * 54张牌 = 216张牌，每张1ms = 216ms，加上一些缓冲
    await vi.advanceTimersByTimeAsync(500);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    }, { timeout: 1000 });

    // 验证 onComplete 被调用时传入了正确的牌
    expect(mockOnComplete).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
        expect.any(Array)
      ])
    );
  });
});

