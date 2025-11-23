/**
 * 发牌功能回归测试
 * 测试手动抓牌、叠放显示等新功能
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DealingAnimation } from '../src/components/game/DealingAnimation';
import { PlayerHandGrouped } from '../src/components/game/PlayerHandGrouped';
import { Card, Suit, Rank, PlayerType } from '../src/types/card';

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
  })
}));

describe('发牌功能回归测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('手动抓牌功能', () => {
    const mockPlayers = [
      {
        id: 0,
        name: '你',
        type: PlayerType.HUMAN,
        isHuman: true,
        score: 0
      }
    ];

    const mockDealingConfig = {
      algorithm: 'random' as const,
      playerCount: 1,
      favorPlayerIndex: 0
    };

    it('应该支持手动和自动模式切换', async () => {
      const mockOnComplete = vi.fn();
      
      render(
        <DealingAnimation
          playerCount={1}
          humanPlayerIndex={0}
          players={mockPlayers}
          dealingConfig={mockDealingConfig}
          onComplete={mockOnComplete}
        />
      );

      await vi.advanceTimersByTimeAsync(600);

      // 应该显示切换按钮
      const modeButton = screen.getByText(/切换到手动|切换到自动/);
      expect(modeButton).toBeInTheDocument();

      // 切换到手动模式
      fireEvent.click(modeButton);
      
      await waitFor(() => {
        expect(screen.getByText(/点击抓牌/)).toBeInTheDocument();
      });

      // 切换回自动模式
      const autoButton = screen.getByText(/切换到自动/);
      fireEvent.click(autoButton);

      // 应该不再显示"点击抓牌"
      await waitFor(() => {
        expect(screen.queryByText(/点击抓牌/)).not.toBeInTheDocument();
      });
    });

    it('手动模式下点击牌堆应该发牌', async () => {
      const mockOnComplete = vi.fn();
      
      render(
        <DealingAnimation
          playerCount={1}
          humanPlayerIndex={0}
          players={mockPlayers}
          dealingConfig={mockDealingConfig}
          onComplete={mockOnComplete}
        />
      );

      await vi.advanceTimersByTimeAsync(600);

      // 切换到手动模式
      const modeButton = screen.getByText(/切换到手动/);
      fireEvent.click(modeButton);

      await waitFor(() => {
        expect(screen.getByText(/点击抓牌/)).toBeInTheDocument();
      });

      // 点击牌堆
      const deck = screen.getByText(/点击抓牌/).closest('.dealing-deck');
      if (deck) {
        fireEvent.click(deck);
      }

      await vi.advanceTimersByTimeAsync(500);

      // 应该发了一张牌
      const countText = screen.getByText(/\d+ 张/);
      expect(countText).toBeInTheDocument();
    });
  });

  describe('叠放显示功能', () => {
    const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
      suit,
      rank,
      id
    });

    it('应该正确显示叠放的卡牌', () => {
      const groupedHand = new Map<number, Card[]>();
      const cards: Card[] = Array.from({ length: 8 }, (_, i) =>
        createCard(Suit.HEARTS, Rank.SIX, `card-${i}`)
      );
      groupedHand.set(Rank.SIX, cards);

      render(
        <PlayerHandGrouped
          groupedHand={groupedHand}
          selectedCards={[]}
          expandedRanks={new Set()}
          onCardClick={() => {}}
          onToggleExpand={() => {}}
        />
      );

      // 应该显示叠放容器
      const stack = document.querySelector('.card-stack');
      expect(stack).toBeInTheDocument();

      // 应该显示8张牌
      const stackItems = document.querySelectorAll('.card-stack-item');
      expect(stackItems.length).toBe(8);
    });

    it('展开时应该显示所有牌（不叠放）', () => {
      const groupedHand = new Map<number, Card[]>();
      const cards: Card[] = Array.from({ length: 5 }, (_, i) =>
        createCard(Suit.HEARTS, Rank.FIVE, `card-${i}`)
      );
      groupedHand.set(Rank.FIVE, cards);

      render(
        <PlayerHandGrouped
          groupedHand={groupedHand}
          selectedCards={[]}
          expandedRanks={new Set([Rank.FIVE])}
          onCardClick={() => {}}
          onToggleExpand={() => {}}
        />
      );

      // 展开时不应该有叠放容器
      const stack = document.querySelector('.card-stack');
      expect(stack).not.toBeInTheDocument();

      // 应该有展开内容
      const content = document.querySelector('.card-group-content');
      expect(content).toBeInTheDocument();
    });

    it('应该正确计算叠放偏移量', () => {
      const groupedHand = new Map<number, Card[]>();
      const cards: Card[] = Array.from({ length: 6 }, (_, i) =>
        createCard(Suit.HEARTS, Rank.SEVEN, `card-${i}`)
      );
      groupedHand.set(Rank.SEVEN, cards);

      render(
        <PlayerHandGrouped
          groupedHand={groupedHand}
          selectedCards={[]}
          expandedRanks={new Set()}
          onCardClick={() => {}}
          onToggleExpand={() => {}}
        />
      );

      const stackItems = document.querySelectorAll('.card-stack-item');
      
      stackItems.forEach((item, index) => {
        const style = window.getComputedStyle(item as HTMLElement);
        const transform = style.transform;
        const expectedOffset = -index * 40;
        
        expect(transform).toContain(`translateY(${expectedOffset}px)`);
      });
    });
  });

  describe('集成测试', () => {
    it('手动抓牌和叠放显示应该协同工作', async () => {
      const mockPlayers = [
        {
          id: 0,
          name: '你',
          type: PlayerType.HUMAN,
          isHuman: true,
          score: 0
        }
      ];

      const mockDealingConfig = {
        algorithm: 'random' as const,
        playerCount: 1,
        favorPlayerIndex: 0
      };

      const mockOnComplete = vi.fn();
      
      render(
        <DealingAnimation
          playerCount={1}
          humanPlayerIndex={0}
          players={mockPlayers}
          dealingConfig={mockDealingConfig}
          onComplete={mockOnComplete}
        />
      );

      await vi.advanceTimersByTimeAsync(600);

      // 切换到手动模式
      const modeButton = screen.getByText(/切换到手动/);
      fireEvent.click(modeButton);

      await waitFor(() => {
        expect(screen.getByText(/点击抓牌/)).toBeInTheDocument();
      });

      // 手动抓几张牌
      const deck = screen.getByText(/点击抓牌/).closest('.dealing-deck');
      for (let i = 0; i < 3; i++) {
        if (deck) {
          fireEvent.click(deck);
        }
        await vi.advanceTimersByTimeAsync(500);
      }

      // 应该显示手牌（可能包含叠放效果）
      const handArea = document.querySelector('.human-player-hand-area');
      expect(handArea).toBeInTheDocument();
    });
  });
});

