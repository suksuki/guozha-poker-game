/**
 * useGameActions Hook 单元测试
 * 
 * 注意：这个测试文件已重写以匹配实际的 Hook 接口
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameStatus, PlayerType, Card } from '../src/types/card';
import { useGameActions } from '../src/hooks/useGameActions';
import { Game } from '../src/utils/Game';
import { createDeck } from '../src/utils/cardUtils';

// Mock Game 类
const createMockGame = (overrides: any = {}): any => {
  const deck = createDeck();
  
  // 创建mock Round对象
  const mockRound = {
    getPlays: vi.fn(() => []),
    getLastPlay: vi.fn(() => null),
    getLastPlayPlayerIndex: vi.fn(() => null),
    getTotalScore: vi.fn(() => 0),
    roundNumber: 1
  };
  
  return {
    currentPlayerIndex: 0,
    status: GameStatus.PLAYING,
    players: [
      {
        id: 0,
        name: '玩家1',
        type: PlayerType.HUMAN,
        hand: deck.slice(0, 10),
        isHuman: true
      }
    ],
    playCards: vi.fn(() => Promise.resolve(true)),
    passCards: vi.fn(() => Promise.resolve()),
    getCurrentRound: vi.fn(() => mockRound),
    ...overrides
  };
};

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('useGameActions', () => {
  let mockGame: any;
  let mockHumanPlayer: any;
  let mockSelectedCards: Card[];

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

    mockGame = createMockGame({
      currentPlayerIndex: 0,
      players: [mockHumanPlayer]
    });
  });

  it('应该初始化默认状态', () => {
    const { result } = renderHook(() =>
      useGameActions({
        game: mockGame,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts'
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
    const gameWithPlayerTurn = createMockGame({
      currentPlayerIndex: 0,
      players: [mockHumanPlayer]
    });

    const { result } = renderHook(() =>
      useGameActions({
        game: gameWithPlayerTurn,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts'
      })
    );

    expect(result.current.isPlayerTurn).toBe(true);
  });

  it('应该正确处理出牌', async () => {
    const mockClearSelectedCards = vi.fn();
    const mockPlayCards = vi.fn(() => Promise.resolve(true));
    const gameWithPlayCards = createMockGame({
      playCards: mockPlayCards
    });

    const { result } = renderHook(() =>
      useGameActions({
        game: gameWithPlayCards,
        humanPlayer: mockHumanPlayer,
        selectedCards: mockSelectedCards,
        clearSelectedCards: mockClearSelectedCards,
        strategy: 'balanced',
        algorithm: 'mcts'
      })
    );

    await act(async () => {
      await result.current.handlePlay();
    });

    expect(mockPlayCards).toHaveBeenCalledWith(0, mockSelectedCards);
  });

  it('应该正确处理要不起', async () => {
    const mockClearSelectedCards = vi.fn();
    const mockPassCards = vi.fn(() => Promise.resolve());
    const gameWithPassCards = createMockGame({
      passCards: mockPassCards
    });

    const { result } = renderHook(() =>
      useGameActions({
        game: gameWithPassCards,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: mockClearSelectedCards,
        strategy: 'balanced',
        algorithm: 'mcts'
      })
    );

    await act(async () => {
      await result.current.handlePass();
    });

    expect(mockPassCards).toHaveBeenCalledWith(0);
    expect(mockClearSelectedCards).toHaveBeenCalled();
  });

  it('在没有选中牌时不应该出牌', async () => {
    const mockPlayCards = vi.fn(() => Promise.resolve(true));
    const gameWithPlayCards = createMockGame({
      playCards: mockPlayCards
    });

    const { result } = renderHook(() =>
      useGameActions({
        game: gameWithPlayCards,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts'
      })
    );

    await act(async () => {
      await result.current.handlePlay();
    });

    expect(mockPlayCards).not.toHaveBeenCalled();
  });

  it('在没有人类玩家时不应该出牌', async () => {
    const mockPlayCards = vi.fn(() => Promise.resolve(true));
    const gameWithPlayCards = createMockGame({
      playCards: mockPlayCards
    });

    const { result } = renderHook(() =>
      useGameActions({
        game: gameWithPlayCards,
        humanPlayer: undefined,
        selectedCards: mockSelectedCards,
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts'
      })
    );

    await act(async () => {
      await result.current.handlePlay();
    });

    expect(mockPlayCards).not.toHaveBeenCalled();
  });

  it('应该能够判断是否可以要不起', () => {
    const gameWithLastPlay = createMockGame({
      currentPlayerIndex: 0,
      players: [mockHumanPlayer]
    });

    const { result } = renderHook(() =>
      useGameActions({
        game: gameWithLastPlay,
        humanPlayer: mockHumanPlayer,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts'
      })
    );

    expect(typeof result.current.canPass).toBe('boolean');
  });

  it('当玩家已出完牌时不应该显示要不起按钮', () => {
    const playerWithoutHand = {
      ...mockHumanPlayer,
      hand: []
    };

    const gameWithEmptyHand = createMockGame({
      currentPlayerIndex: 0,
      players: [playerWithoutHand]
    });

    const { result } = renderHook(() =>
      useGameActions({
        game: gameWithEmptyHand,
        humanPlayer: playerWithoutHand,
        selectedCards: [],
        clearSelectedCards: vi.fn(),
        strategy: 'balanced',
        algorithm: 'mcts'
      })
    );

    expect(result.current.canPass).toBe(false);
  });
});
