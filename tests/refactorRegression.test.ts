/**
 * 重构回归测试
 * 快速测试重构后的 hooks 和组件，显示进度条
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { GameStatus, PlayerType, Card } from '../src/types/card';
import { useGameConfig } from '../src/hooks/useGameConfig';
import { usePlayerHand } from '../src/hooks/usePlayerHand';
import { useChatBubbles } from '../src/hooks/useChatBubbles';
import { useGameActions } from '../src/hooks/useGameActions';
import { createDeck, hasPlayableCards } from '../src/utils/cardUtils';
import { getCardTypeName, getRankDisplay } from '../src/utils/gameUtils';

// Mock dependencies
vi.mock('../src/services/chatService', () => ({
  getChatMessages: vi.fn(() => []),
  triggerRandomChat: vi.fn(() => null),
  clearChatMessages: vi.fn()
}));

vi.mock('../src/services/voiceService', () => ({
  waitForVoices: vi.fn((callback) => callback()),
  listAvailableVoices: vi.fn()
}));

describe('重构回归测试 - 快速验证', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('✅ useGameConfig Hook', () => {
    it('应该初始化并管理游戏配置', () => {
      const { result } = renderHook(() => useGameConfig());

      expect(result.current.playerCount).toBe(4);
      expect(result.current.humanPlayerIndex).toBe(0);
      expect(result.current.strategy).toBe('balanced');
      expect(result.current.algorithm).toBe('mcts');

      act(() => {
        result.current.setPlayerCount(6);
        result.current.setHumanPlayerIndex(2);
        result.current.setStrategy('aggressive');
        result.current.setAlgorithm('simple');
      });

      expect(result.current.playerCount).toBe(6);
      expect(result.current.humanPlayerIndex).toBe(2);
      expect(result.current.strategy).toBe('aggressive');
      expect(result.current.algorithm).toBe('simple');
    });

    it('应该能够处理开始游戏', () => {
      const { result } = renderHook(() => useGameConfig());
      const mockStartGame = vi.fn();

      act(() => {
        result.current.setPlayerCount(4);
        result.current.handleStartGame(mockStartGame);
      });

      expect(mockStartGame).toHaveBeenCalledTimes(1);
      const config = mockStartGame.mock.calls[0][0];
      expect(config.playerCount).toBe(4);
      expect(config.aiConfigs).toHaveLength(4);
    });
  });

  describe('✅ usePlayerHand Hook', () => {
    it('应该管理玩家手牌状态', () => {
      const deck = createDeck();
      const mockGameState = {
        status: GameStatus.PLAYING,
        currentPlayerIndex: 0,
        players: [{
          id: 0,
          name: '玩家1',
          type: PlayerType.HUMAN,
          hand: deck.slice(0, 10),
          isHuman: true
        }]
      };

      const { result } = renderHook(() => usePlayerHand(mockGameState));

      expect(result.current.selectedCards).toEqual([]);
      expect(result.current.humanPlayer).not.toBeNull();
      expect(result.current.groupedHand.size).toBeGreaterThan(0);
    });

    it('应该能够选择和取消选择卡片', () => {
      const deck = createDeck();
      const mockGameState = {
        status: GameStatus.PLAYING,
        currentPlayerIndex: 0,
        players: [{
          id: 0,
          name: '玩家1',
          type: PlayerType.HUMAN,
          hand: deck.slice(0, 10),
          isHuman: true
        }]
      };

      const { result } = renderHook(() => usePlayerHand(mockGameState));
      const card = deck[0];

      act(() => {
        result.current.handleCardClick(card);
      });

      expect(result.current.selectedCards.length).toBe(1);

      act(() => {
        result.current.handleCardClick(card);
      });

      expect(result.current.selectedCards.length).toBe(0);
    });
  });

  describe('✅ useChatBubbles Hook', () => {
    it('应该管理聊天气泡', () => {
      const mockGameState = {
        status: GameStatus.PLAYING,
        currentPlayerIndex: 0,
        players: [{
          id: 0,
          name: '玩家1',
          type: PlayerType.HUMAN,
          hand: [],
          isHuman: true
        }]
      };

      const { result } = renderHook(() => useChatBubbles(mockGameState));

      expect(result.current.activeChatBubbles.size).toBe(0);
      expect(typeof result.current.removeChatBubble).toBe('function');
      expect(typeof result.current.getPlayerBubblePosition).toBe('function');
    });

    it('应该能够计算气泡位置', () => {
      const mockGameState = {
        status: GameStatus.PLAYING,
        currentPlayerIndex: 0,
        players: [
          {
            id: 0,
            name: '玩家1',
            type: PlayerType.HUMAN,
            hand: [],
            isHuman: true
          },
          {
            id: 1,
            name: '玩家2',
            type: PlayerType.AI,
            hand: [],
            isHuman: false
          }
        ]
      };

      const { result } = renderHook(() => useChatBubbles(mockGameState));

      const humanPosition = result.current.getPlayerBubblePosition(0);
      const aiPosition = result.current.getPlayerBubblePosition(1);

      expect(humanPosition.bottom).toBeDefined();
      expect(aiPosition.top).toBeDefined();
    });
  });

  describe('✅ useGameActions Hook', () => {
    it('应该管理游戏操作', () => {
      const deck = createDeck();
      const mockGameState = {
        status: GameStatus.PLAYING,
        currentPlayerIndex: 0,
        lastPlay: null,
        players: [{
          id: 0,
          name: '玩家1',
          type: PlayerType.HUMAN,
          hand: deck.slice(0, 10),
          isHuman: true
        }]
      };

      const mockPlayerPlay = vi.fn(() => true);
      const mockPlayerPass = vi.fn();
      const mockSuggestPlay = vi.fn(() => Promise.resolve([]));

      const { result } = renderHook(() =>
        useGameActions({
          gameState: mockGameState,
          humanPlayer: mockGameState.players[0],
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
    });
  });

  describe('✅ gameUtils 工具函数', () => {
    it('应该正确获取牌型名称', () => {
      expect(getCardTypeName('single' as any)).toBe('单张');
      expect(getCardTypeName('pair' as any)).toBe('对子');
      expect(getCardTypeName('triple' as any)).toBe('三张');
      expect(getCardTypeName('bomb' as any)).toBe('炸弹');
      expect(getCardTypeName('dun' as any)).toBe('墩');
    });

    it('应该正确获取点数显示', () => {
      expect(getRankDisplay(3)).toBe('3');
      expect(getRankDisplay(11)).toBe('J');
      expect(getRankDisplay(12)).toBe('Q');
      expect(getRankDisplay(13)).toBe('K');
      expect(getRankDisplay(14)).toBe('A');
      expect(getRankDisplay(15)).toBe('2');
      expect(getRankDisplay(16)).toBe('小王');
      expect(getRankDisplay(17)).toBe('大王');
    });
  });

  describe('✅ 集成测试', () => {
    it('应该能够组合使用多个 hooks', () => {
      const deck = createDeck();
      const mockGameState = {
        status: GameStatus.PLAYING,
        currentPlayerIndex: 0,
        lastPlay: null,
        players: [{
          id: 0,
          name: '玩家1',
          type: PlayerType.HUMAN,
          hand: deck.slice(0, 10),
          isHuman: true
        }]
      };

      // 使用 useGameConfig
      const configHook = renderHook(() => useGameConfig());
      expect(configHook.result.current.playerCount).toBe(4);

      // 使用 usePlayerHand
      const handHook = renderHook(() => usePlayerHand(mockGameState));
      expect(handHook.result.current.humanPlayer).not.toBeNull();

      // 使用 useChatBubbles
      const chatHook = renderHook(() => useChatBubbles(mockGameState));
      expect(chatHook.result.current.activeChatBubbles.size).toBe(0);

      // 所有 hooks 都应该正常工作
      expect(configHook.result.current).toBeDefined();
      expect(handHook.result.current).toBeDefined();
      expect(chatHook.result.current).toBeDefined();
    });
  });
});

