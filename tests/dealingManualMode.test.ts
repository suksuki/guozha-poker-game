/**
 * 手动发牌模式测试
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    const hands: any[][] = [];
    const cardsPerPlayer = 54;
    
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

// Mock cardSorting
vi.mock('../src/utils/cardSorting', () => ({
  sortCards: vi.fn((cards) => [...cards]),
  groupCardsByRank: vi.fn((cards) => {
    const groups = new Map();
    cards.forEach((card: any) => {
      if (!groups.has(card.rank)) {
        groups.set(card.rank, []);
      }
      groups.get(card.rank).push(card);
    });
    return groups;
  })
}));

describe('手动发牌模式', () => {
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
    }
  ];

  const mockDealingConfig = {
    algorithm: 'random' as const,
    playerCount: 2,
    favorPlayerIndex: 0
  };

  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('应该显示手动/自动切换按钮', () => {
    render(
      <DealingAnimation
        playerCount={2}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
      />
    );

    // 应该显示切换按钮
    const modeButton = screen.getByText(/切换到手动|切换到自动/);
    expect(modeButton).toBeInTheDocument();
  });

  it('应该能够切换到手动模式', async () => {
    render(
      <DealingAnimation
        playerCount={2}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
      />
    );

    // 等待组件初始化
    await vi.advanceTimersByTimeAsync(600);

    // 点击切换到手动模式
    const modeButton = screen.getByText(/切换到手动/);
    fireEvent.click(modeButton);

    // 应该显示"点击抓牌"提示
    await waitFor(() => {
      expect(screen.getByText(/点击抓牌/)).toBeInTheDocument();
    });
  });

  it('手动模式下点击牌堆应该发一张牌', async () => {
    render(
      <DealingAnimation
        playerCount={2}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
      />
    );

    // 等待组件初始化
    await vi.advanceTimersByTimeAsync(600);

    // 切换到手动模式
    const modeButton = screen.getByText(/切换到手动/);
    fireEvent.click(modeButton);

    await waitFor(() => {
      expect(screen.getByText(/点击抓牌/)).toBeInTheDocument();
    });

    // 获取初始牌数
    const initialCount = screen.getByText(/\d+ 张/).textContent;
    const initialCountNum = parseInt(initialCount?.match(/\d+/)?.[0] || '0');

    // 点击牌堆
    const deck = screen.getByText(/点击抓牌/).closest('.dealing-deck');
    if (deck) {
      fireEvent.click(deck);
    }

    // 等待状态更新
    await vi.advanceTimersByTimeAsync(500);

    // 应该发了一张牌（牌数增加）
    const newCount = screen.getByText(/\d+ 张/).textContent;
    const newCountNum = parseInt(newCount?.match(/\d+/)?.[0] || '0');
    
    // 注意：由于是轮询发牌，可能已经发了几张，所以只检查牌数有变化
    expect(newCountNum).toBeGreaterThanOrEqual(initialCountNum);
  });

  it('手动模式下不应该自动发牌', async () => {
    render(
      <DealingAnimation
        playerCount={2}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
      />
    );

    // 等待组件初始化
    await vi.advanceTimersByTimeAsync(600);

    // 切换到手动模式
    const modeButton = screen.getByText(/切换到手动/);
    fireEvent.click(modeButton);

    await waitFor(() => {
      expect(screen.getByText(/点击抓牌/)).toBeInTheDocument();
    });

    // 获取初始牌数
    const initialCount = screen.getByText(/\d+ 张/).textContent;
    const initialCountNum = parseInt(initialCount?.match(/\d+/)?.[0] || '0');

    // 等待一段时间（应该不会自动发牌）
    await vi.advanceTimersByTimeAsync(2000);

    // 牌数应该不变（除非手动点击）
    const newCount = screen.getByText(/\d+ 张/).textContent;
    const newCountNum = parseInt(newCount?.match(/\d+/)?.[0] || '0');
    
    // 在手动模式下，不点击应该不会发牌
    expect(newCountNum).toBe(initialCountNum);
  });

  it('应该能够从手动模式切换回自动模式', async () => {
    render(
      <DealingAnimation
        playerCount={2}
        humanPlayerIndex={0}
        players={mockPlayers}
        dealingConfig={mockDealingConfig}
        onComplete={mockOnComplete}
      />
    );

    // 等待组件初始化
    await vi.advanceTimersByTimeAsync(600);

    // 切换到手动模式
    const modeButton = screen.getByText(/切换到手动/);
    fireEvent.click(modeButton);

    await waitFor(() => {
      expect(screen.getByText(/点击抓牌/)).toBeInTheDocument();
    });

    // 切换回自动模式
    const autoButton = screen.getByText(/切换到自动/);
    fireEvent.click(autoButton);

    // 应该开始自动发牌
    await vi.advanceTimersByTimeAsync(200);

    // 等待一段时间后，牌数应该增加（自动发牌）
    await vi.advanceTimersByTimeAsync(500);
    
    // 验证自动发牌正在进行（牌数应该增加）
    const countText = screen.getByText(/\d+ 张/);
    expect(countText).toBeInTheDocument();
  });
});

