/**
 * usePlayerHand Hook 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameStatus, PlayerType, Card, Suit, Rank } from '../src/types/card';
import { usePlayerHand } from '../src/hooks/usePlayerHand';
import { createDeck } from '../src/utils/cardUtils';

// Mock chatService
vi.mock('../src/services/chatService', () => ({
  getChatMessages: vi.fn(() => []),
  triggerRandomChat: vi.fn(() => null)
}));

// Mock voiceService
vi.mock('../src/services/voiceService', () => ({
  waitForVoices: vi.fn((callback) => callback()),
  listAvailableVoices: vi.fn()
}));

describe('usePlayerHand', () => {
  let mockGameState: {
    status: GameStatus;
    currentPlayerIndex: number;
    players: any[];
  };
  let mockHumanPlayer: any;
  let mockCards: Card[];

  beforeEach(() => {
    const deck = createDeck();
    mockCards = deck.slice(0, 10);
    
    mockHumanPlayer = {
      id: 0,
      name: '玩家1',
      type: PlayerType.HUMAN,
      hand: mockCards,
      isHuman: true
    };

    mockGameState = {
      status: GameStatus.PLAYING,
      currentPlayerIndex: 0,
      players: [mockHumanPlayer]
    };
  });

  it('应该初始化默认状态', () => {
    const { result } = renderHook(() => usePlayerHand(mockGameState));

    expect(result.current.selectedCards).toEqual([]);
    expect(result.current.expandedRanks.size).toBe(0);
    expect(result.current.humanPlayer).toEqual(mockHumanPlayer);
    expect(result.current.groupedHand.size).toBeGreaterThan(0);
  });

  it('应该能够选择卡片', () => {
    const { result } = renderHook(() => usePlayerHand(mockGameState));

    act(() => {
      result.current.handleCardClick(mockCards[0]);
    });

    expect(result.current.selectedCards.length).toBe(1);
    expect(result.current.selectedCards[0].id).toBe(mockCards[0].id);
  });

  it('应该能够取消选择卡片', () => {
    const { result } = renderHook(() => usePlayerHand(mockGameState));

    act(() => {
      result.current.handleCardClick(mockCards[0]);
    });

    expect(result.current.selectedCards.length).toBe(1);

    act(() => {
      result.current.handleCardClick(mockCards[0]);
    });

    expect(result.current.selectedCards.length).toBe(0);
  });

  it('应该能够切换展开/收起', () => {
    const { result } = renderHook(() => usePlayerHand(mockGameState));
    const rank = mockCards[0].rank;

    act(() => {
      result.current.toggleExpand(rank);
    });

    expect(result.current.expandedRanks.has(rank)).toBe(true);

    act(() => {
      result.current.toggleExpand(rank);
    });

    expect(result.current.expandedRanks.has(rank)).toBe(false);
  });

  it('应该能够清空选中的牌', () => {
    const { result } = renderHook(() => usePlayerHand(mockGameState));

    act(() => {
      result.current.handleCardClick(mockCards[0]);
    });

    act(() => {
      result.current.handleCardClick(mockCards[1]);
    });

    expect(result.current.selectedCards.length).toBeGreaterThanOrEqual(1);

    act(() => {
      result.current.clearSelectedCards();
    });

    expect(result.current.selectedCards.length).toBe(0);
  });

  it('应该按点数正确分组手牌', () => {
    const { result } = renderHook(() => usePlayerHand(mockGameState));

    expect(result.current.groupedHand.size).toBeGreaterThan(0);
    
    // 验证分组内容
    result.current.groupedHand.forEach((cards, rank) => {
      expect(cards.length).toBeGreaterThan(0);
      cards.forEach(card => {
        expect(card.rank).toBe(rank);
      });
    });
  });

  it('在不是玩家回合时不应该允许选择卡片', () => {
    mockGameState.currentPlayerIndex = 1;
    const { result } = renderHook(() => usePlayerHand(mockGameState));

    act(() => {
      result.current.handleCardClick(mockCards[0]);
    });

    expect(result.current.selectedCards.length).toBe(0);
  });

  it('在游戏非进行中状态时不应该允许选择卡片', () => {
    mockGameState.status = GameStatus.WAITING;
    const { result } = renderHook(() => usePlayerHand(mockGameState));

    act(() => {
      result.current.handleCardClick(mockCards[0]);
    });

    expect(result.current.selectedCards.length).toBe(0);
  });

  it('应该能够设置选中的牌', () => {
    const { result } = renderHook(() => usePlayerHand(mockGameState));

    act(() => {
      result.current.setSelectedCards([mockCards[0], mockCards[1]]);
    });

    expect(result.current.selectedCards.length).toBe(2);
  });
});

