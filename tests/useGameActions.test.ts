/**
 * useGameActions Hook 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameStatus, PlayerType, Card, Play, CardType } from '../src/types/card';
import { useGameActions } from '../src/hooks/useGameActions';
import { createDeck } from '../src/utils/cardUtils';

// Mock dependencies
vi.mock('../src/utils/cardUtils', async () => {
  const actual = await vi.importActual('../src/utils/cardUtils');
  return {
    ...actual,
    hasPlayableCards: vi.fn(() => true)
  };
});

describe('useGameActions', () => {
  let mockGameState: any;
  let mockHumanPlayer: any;
  let mockSelectedCards: Card[];
  let mockPlayerPlay: any;
  let mockPlayerPass: any;
  let mockSuggestPlay: any;

  beforeEach(() => {
    const deck = createDeck();
    mockSelectedCards = deck.slice(0, 3);

    mockHumanPlayer = {
      id: 0,
      name: '玩家1',
      type: PlayerType.HUMAN,
      hand: deck.slice(0, 10),
      isHuman: true
    };

    mockGameState = {
      status: GameStatus.PLAYING,
      currentPlayerIndex: 0,
      lastPlay: null,
      players: [mockHumanPlayer]
    };

    mockPlayerPlay = vi.fn(() => true);
    mockPlayerPass = vi.fn();
    mockSuggestPlay = vi.fn(() => Promise.resolve(mockSelectedCards));
  });

  it('应该初始化默认状态', () => {
    const { result } = renderHook(() =>
      useGameActions({
        gameState: mockGameState,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts',
        playerPlay: mockPlayerPlay,
        playerPass: mockPlayerPass,
        suggestPlay: mockSuggestPlay
      })
    );

    expect(result.current.isSuggesting).toBe(false);
    expect(typeof result.current.canPass).toBe('boolean');
    expect(typeof result.current.isPlayerTurn).toBe('boolean');
    expect(typeof result.current.handlePlay).toBe('function');
    expect(typeof result.current.handlePass).toBe('function');
    expect(typeof result.current.handleSuggestPlay).toBe('function');
  });

  it('应该正确判断是否为玩家回合', () => {
    const { result } = renderHook(() =>
      useGameActions({
        gameState: { ...mockGameState, currentPlayerIndex: 0 },
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts',
        playerPlay: mockPlayerPlay,
        playerPass: mockPlayerPass,
        suggestPlay: mockSuggestPlay
      })
    );

    expect(result.current.isPlayerTurn).toBe(true);
  });

  it('应该正确处理出牌', () => {
    const mockClearSelectedCards = vi.fn();
    const { result } = renderHook(() =>
      useGameActions({
        gameState: mockGameState,
        humanPlayer: mockHumanPlayer,
        selectedCards: mockSelectedCards,
        clearSelectedCards: mockClearSelectedCards,
        strategy: 'balanced',
        algorithm: 'mcts',
        playerPlay: mockPlayerPlay,
        playerPass: mockPlayerPass,
        suggestPlay: mockSuggestPlay
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    expect(mockPlayerPlay).toHaveBeenCalledWith(0, mockSelectedCards);
    expect(mockClearSelectedCards).toHaveBeenCalled();
  });

  it('应该正确处理要不起', () => {
    const mockClearSelectedCards = vi.fn();
    const { result } = renderHook(() =>
      useGameActions({
        gameState: mockGameState,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: mockClearSelectedCards,
        strategy: 'balanced',
        algorithm: 'mcts',
        playerPlay: mockPlayerPlay,
        playerPass: mockPlayerPass,
        suggestPlay: mockSuggestPlay
      })
    );

    act(() => {
      result.current.handlePass();
    });

    expect(mockPlayerPass).toHaveBeenCalledWith(0);
    expect(mockClearSelectedCards).toHaveBeenCalled();
  });

  it('应该正确处理AI建议', async () => {
    const { result } = renderHook(() =>
      useGameActions({
        gameState: mockGameState,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts',
        playerPlay: mockPlayerPlay,
        playerPass: mockPlayerPass,
        suggestPlay: mockSuggestPlay
      })
    );

    let suggestedCards: Card[] | null = null;

    await act(async () => {
      suggestedCards = await result.current.handleSuggestPlay();
    });

    expect(mockSuggestPlay).toHaveBeenCalled();
    expect(suggestedCards).toEqual(mockSelectedCards);
  });

  it('在没有选中牌时不应该出牌', () => {
    const { result } = renderHook(() =>
      useGameActions({
        gameState: mockGameState,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts',
        playerPlay: mockPlayerPlay,
        playerPass: mockPlayerPass,
        suggestPlay: mockSuggestPlay
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    expect(mockPlayerPlay).not.toHaveBeenCalled();
  });

  it('在没有人类玩家时不应该出牌', () => {
    const { result } = renderHook(() =>
      useGameActions({
        gameState: mockGameState,
        humanPlayer: undefined,
        selectedCards: mockSelectedCards,
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts',
        playerPlay: mockPlayerPlay,
        playerPass: mockPlayerPass,
        suggestPlay: mockSuggestPlay
      })
    );

    act(() => {
      result.current.handlePlay();
    });

    expect(mockPlayerPlay).not.toHaveBeenCalled();
  });
});

