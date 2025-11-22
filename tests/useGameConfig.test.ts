/**
 * useGameConfig Hook 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameConfig } from '../src/hooks/useGameConfig';

describe('useGameConfig', () => {
  it('应该初始化默认配置', () => {
    const { result } = renderHook(() => useGameConfig());

    expect(result.current.playerCount).toBe(4);
    expect(result.current.humanPlayerIndex).toBe(0);
    expect(result.current.strategy).toBe('balanced');
    expect(result.current.algorithm).toBe('mcts');
  });

  it('应该能够更新玩家数量', () => {
    const { result } = renderHook(() => useGameConfig());

    act(() => {
      result.current.setPlayerCount(6);
    });

    expect(result.current.playerCount).toBe(6);
  });

  it('应该能够更新人类玩家位置', () => {
    const { result } = renderHook(() => useGameConfig());

    act(() => {
      result.current.setHumanPlayerIndex(2);
    });

    expect(result.current.humanPlayerIndex).toBe(2);
  });

  it('应该能够更新AI策略', () => {
    const { result } = renderHook(() => useGameConfig());

    act(() => {
      result.current.setStrategy('aggressive');
    });

    expect(result.current.strategy).toBe('aggressive');

    act(() => {
      result.current.setStrategy('conservative');
    });

    expect(result.current.strategy).toBe('conservative');
  });

  it('应该能够更新AI算法', () => {
    const { result } = renderHook(() => useGameConfig());

    act(() => {
      result.current.setAlgorithm('simple');
    });

    expect(result.current.algorithm).toBe('simple');

    act(() => {
      result.current.setAlgorithm('mcts');
    });

    expect(result.current.algorithm).toBe('mcts');
  });

  it('应该能够处理开始游戏', () => {
    const { result } = renderHook(() => useGameConfig());
    const mockStartGame = vi.fn();

    act(() => {
      result.current.setPlayerCount(4);
      result.current.setHumanPlayerIndex(1);
      result.current.setStrategy('aggressive');
      result.current.setAlgorithm('mcts');
    });

    act(() => {
      result.current.handleStartGame(mockStartGame);
    });

    expect(mockStartGame).toHaveBeenCalledTimes(1);
    const callArgs = mockStartGame.mock.calls[0][0];
    expect(callArgs.playerCount).toBe(4);
    expect(callArgs.humanPlayerIndex).toBe(1);
    expect(callArgs.aiConfigs).toHaveLength(4);
    expect(callArgs.aiConfigs[0].strategy).toBe('aggressive');
    expect(callArgs.aiConfigs[0].algorithm).toBe('mcts');
  });

  it('应该为每个玩家创建正确的AI配置', () => {
    const { result } = renderHook(() => useGameConfig());
    const mockStartGame = vi.fn();

    act(() => {
      result.current.setPlayerCount(6);
      result.current.setStrategy('conservative');
      result.current.setAlgorithm('simple');
    });

    act(() => {
      result.current.handleStartGame(mockStartGame);
    });

    const callArgs = mockStartGame.mock.calls[0][0];
    expect(callArgs.aiConfigs).toHaveLength(6);
    callArgs.aiConfigs.forEach(config => {
      expect(config.strategy).toBe('conservative');
      expect(config.algorithm).toBe('simple');
      expect(config.apiKey).toBe('');
    });
  });
});

