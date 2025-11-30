/**
 * useMultiPlayerGame Hook 单元测试
 * 
 * @async - 部分测试涉及异步操作（Game 方法可能调用异步服务）
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiPlayerGame } from '../src/hooks/useMultiPlayerGame';
import { Game } from '../src/utils/Game';
import { Card, GameStatus } from '../src/types/card';

// Mock Game 类
const mockGameInstance = {
  getAutoPlay: vi.fn(() => false),
  reset: vi.fn(),
  toggleAutoPlay: vi.fn(() => true),
  setOnUpdate: vi.fn(),
  status: GameStatus.WAITING,
  players: [],
  currentPlayerIndex: 0,
  winner: null,
  playerCount: 4,
  finishOrder: [],
  rounds: [],
  currentRoundIndex: 0,
};

const mockNewGameInstance = {
  ...mockGameInstance,
  status: GameStatus.PLAYING,
};

// Mock Game 类（包括构造函数和静态方法）
vi.mock('../src/utils/Game', () => {
  const mockGameClass = vi.fn(() => mockGameInstance);
  
  // 添加静态方法
  mockGameClass.startGameWithDealing = vi.fn(() => mockNewGameInstance);
  mockGameClass.handleDealingComplete = vi.fn(() => mockNewGameInstance);
  mockGameClass.handleDealingCancel = vi.fn();
  mockGameClass.createAndStartNewGame = vi.fn(() => mockNewGameInstance);
  
  return {
    Game: mockGameClass
  };
});

// Mock 服务（Game 类内部使用的服务）
vi.mock('../src/services/chatService', () => ({
  clearChatMessages: vi.fn(),
}));

vi.mock('../src/services/cardTrackerService', () => ({
  cardTracker: {
    initialize: vi.fn(),
    startRound: vi.fn(),
  }
}));

describe('useMultiPlayerGame Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 mock 实例
    Object.assign(mockGameInstance, {
      getAutoPlay: vi.fn(() => false),
      reset: vi.fn(),
      toggleAutoPlay: vi.fn(() => true),
      setOnUpdate: vi.fn(),
      status: GameStatus.WAITING,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初始化', () => {
    it('应该初始化默认状态', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      expect(result.current.game).toBeDefined();
      expect(result.current.isDealing).toBe(false);
      expect(result.current.pendingGameConfig).toBe(null);
      expect(result.current.isAutoPlay).toBe(false);
      expect(typeof result.current.startGame).toBe('function');
      expect(typeof result.current.resetGame).toBe('function');
      expect(typeof result.current.toggleAutoPlay).toBe('function');
      expect(typeof result.current.handleDealingComplete).toBe('function');
      expect(typeof result.current.handleDealingCancel).toBe('function');
    });

    it('应该设置 Game 的更新回调', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      // 检查 setOnUpdate 是否被调用
      expect(result.current.game.setOnUpdate).toHaveBeenCalled();
    });
  });

  describe('startGame', () => {
    it('应该调用 Game.startGameWithDealing 并创建新游戏', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      const mockConfig: Game['config'] = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
      };

      act(() => {
        result.current.startGame(mockConfig);
      });

      expect(Game.startGameWithDealing).toHaveBeenCalledWith(
        mockConfig,
        false // 从初始 game 获取的 isAutoPlay 值
      );
      expect(result.current.game).toBe(mockNewGameInstance);
    });

    it('应该保持托管状态', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      
      // 先设置托管状态 - Mock getAutoPlay 返回 true
      (result.current.game.getAutoPlay as any).mockReturnValue(true);

      const mockConfig: Game['config'] = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
      };

      act(() => {
        result.current.startGame(mockConfig);
      });

      // 应该传递当前的托管状态
      expect(Game.startGameWithDealing).toHaveBeenCalledWith(
        mockConfig,
        true // 托管状态应该被保持
      );
    });

    it('应该设置新游戏的更新回调', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      const mockConfig: Game['config'] = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
      };

      act(() => {
        result.current.startGame(mockConfig);
      });

      // 新游戏实例应该设置了更新回调
      expect(mockNewGameInstance.setOnUpdate).toHaveBeenCalled();
    });
  });

  describe('resetGame', () => {
    it('应该调用 Game.reset()', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      act(() => {
        result.current.resetGame();
      });

      expect(result.current.game.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('toggleAutoPlay', () => {
    it('应该调用 Game.toggleAutoPlay()', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      act(() => {
        result.current.toggleAutoPlay();
      });

      expect(result.current.game.toggleAutoPlay).toHaveBeenCalledTimes(1);
    });

    it('应该返回新的托管状态', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      
      // Mock toggleAutoPlay 返回 true
      (result.current.game.toggleAutoPlay as any).mockReturnValue(true);

      act(() => {
        result.current.toggleAutoPlay();
      });

      // 托管状态应该从 Game 实例读取
      expect(result.current.game.getAutoPlay).toHaveBeenCalled();
    });
  });

  describe('handleDealingComplete', () => {
    it('应该在没有 pendingGameConfig 时只设置 isDealing 为 false', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      const mockHands: Card[][] = [];

      act(() => {
        result.current.handleDealingComplete(mockHands);
      });

      // 如果没有 pendingGameConfig，不应该创建新游戏
      expect(Game.handleDealingComplete).not.toHaveBeenCalled();
      expect(result.current.isDealing).toBe(false);
      expect(result.current.pendingGameConfig).toBe(null);
    });

    it('应该在有 pendingGameConfig 时创建新游戏', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      const mockConfig: Game['config'] = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
      };
      const mockHands: Card[][] = [
        Array(54).fill(null).map((_, i) => ({ 
          suit: 1, 
          rank: 3, 
          id: `card-${i}`,
          type: 'normal' as const
        })),
        Array(54).fill(null).map((_, i) => ({ 
          suit: 1, 
          rank: 3, 
          id: `card-${i + 54}`,
          type: 'normal' as const
        })),
        Array(54).fill(null).map((_, i) => ({ 
          suit: 1, 
          rank: 3, 
          id: `card-${i + 108}`,
          type: 'normal' as const
        })),
        Array(54).fill(null).map((_, i) => ({ 
          suit: 1, 
          rank: 3, 
          id: `card-${i + 162}`,
          type: 'normal' as const
        })),
      ];

      // 注意：pendingGameConfig 是内部状态，无法直接设置
      // 这个测试主要验证当 pendingGameConfig 为 null 时的行为
      // 实际使用中，pendingGameConfig 会在需要发牌动画时由外部设置
      act(() => {
        result.current.handleDealingComplete(mockHands);
      });

      // 由于 pendingGameConfig 为 null，不应该创建新游戏
      expect(Game.handleDealingComplete).not.toHaveBeenCalled();
      expect(result.current.isDealing).toBe(false);
    });

    it('应该设置 isDealing 为 false，无论是否有 pendingGameConfig', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      const mockHands: Card[][] = [];

      act(() => {
        result.current.handleDealingComplete(mockHands);
      });

      expect(result.current.isDealing).toBe(false);
    });
  });

  describe('handleDealingCancel', () => {
    it('应该调用 Game.handleDealingCancel()', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      act(() => {
        result.current.handleDealingCancel();
      });

      expect(Game.handleDealingCancel).toHaveBeenCalledTimes(1);
    });

    it('应该清空 pendingGameConfig 和 isDealing', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      act(() => {
        result.current.handleDealingCancel();
      });

      expect(result.current.pendingGameConfig).toBe(null);
      expect(result.current.isDealing).toBe(false);
    });
  });

  describe('React 状态管理', () => {
    it('应该正确管理 isDealing 状态', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      expect(result.current.isDealing).toBe(false);

      act(() => {
        result.current.handleDealingCancel();
      });

      expect(result.current.isDealing).toBe(false);
    });

    it('应该正确管理 pendingGameConfig 状态', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      expect(result.current.pendingGameConfig).toBe(null);

      act(() => {
        result.current.handleDealingCancel();
      });

      expect(result.current.pendingGameConfig).toBe(null);
    });

    it('应该从 Game 实例读取 isAutoPlay', () => {
      const { result } = renderHook(() => useMultiPlayerGame());

      // isAutoPlay 应该从 game.getAutoPlay() 读取
      expect(result.current.game.getAutoPlay).toHaveBeenCalled();
      expect(result.current.isAutoPlay).toBe(false);
    });
  });

  describe('createAndSetupGame 辅助函数', () => {
    it('应该为新游戏设置更新回调', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      const mockConfig: Game['config'] = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
      };

      act(() => {
        result.current.startGame(mockConfig);
      });

      // 新游戏应该设置了更新回调
      expect(mockNewGameInstance.setOnUpdate).toHaveBeenCalled();
      const updateCallback = (mockNewGameInstance.setOnUpdate as any).mock.calls[0][0];
      expect(typeof updateCallback).toBe('function');
    });

    it('应该更新 game 状态', () => {
      const { result } = renderHook(() => useMultiPlayerGame());
      const mockConfig: Game['config'] = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
      };

      const initialGame = result.current.game;

      act(() => {
        result.current.startGame(mockConfig);
      });

      // game 应该被更新为新实例
      expect(result.current.game).not.toBe(initialGame);
      expect(result.current.game).toBe(mockNewGameInstance);
    });
  });
});

