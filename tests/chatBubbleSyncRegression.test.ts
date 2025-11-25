/**
 * 聊天气泡与语音同步快速回归测试
 * 测试完整的同步流程，包括 useChatBubbles Hook
 * 
 * 运行: npm test -- chatBubbleSyncRegression.test.ts --run
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatBubbles } from '../src/hooks/useChatBubbles';
import { GameStatus, Player, PlayerType } from '../src/types/card';
import { ChatMessage } from '../src/types/chat';
import { addChatMessage, clearChatMessages } from '../src/services/chatService';
import * as voiceService from '../src/services/voiceService';

// Mock 语音服务
vi.mock('../src/services/voiceService', () => ({
  voiceService: {
    speak: vi.fn(() => Promise.resolve()),
    isCurrentlySpeaking: vi.fn(() => false)
  },
  waitForVoices: vi.fn((callback) => callback()),
  listAvailableVoices: vi.fn()
}));

// Mock 翻译服务
vi.mock('../src/services/translationService', () => ({
  translateText: vi.fn((text) => Promise.resolve(text))
}));

// Mock i18n
vi.mock('../src/i18n', () => ({
  default: {
    language: 'zh-CN'
  }
}));

beforeEach(() => {
  clearChatMessages();
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('聊天气泡与语音同步回归测试', () => {
  const createMockPlayer = (id: number, name: string): Player => ({
    id,
    name,
    type: PlayerType.AI,
    hand: [],
    score: 0,
    finishedRank: null,
    isHuman: false,
    voiceConfig: {
      gender: 'female',
      dialect: 'mandarin',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  });

  const createMockGameState = (players: Player[]) => ({
    status: GameStatus.PLAYING,
    players,
    currentPlayerIndex: 0
  });

  it('应该同步显示气泡和播放语音', async () => {
    const players = [
      createMockPlayer(0, '玩家0'),
      createMockPlayer(1, '玩家1')
    ];
    const gameState = createMockGameState(players);

    const { result } = renderHook(() => useChatBubbles(gameState));

    // 添加聊天消息
    const message: ChatMessage = {
      playerId: 0,
      playerName: '玩家0',
      content: '好牌！',
      timestamp: Date.now(),
      type: 'random'
    };
    addChatMessage(message);

    // 等待Hook处理
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // 应该显示气泡
    await waitFor(() => {
      expect(result.current.activeChatBubbles.has(0)).toBe(true);
    });

    // 应该调用语音服务
    await waitFor(() => {
      expect(voiceService.voiceService.speak).toHaveBeenCalled();
    });

    // 应该设置播放状态
    await waitFor(() => {
      expect(result.current.speakingStates.get(0)).toBe(true);
    });
  });

  it('应该在语音播放完成时更新状态', async () => {
    const players = [createMockPlayer(0, '玩家0')];
    const gameState = createMockGameState(players);

    // Mock speak 方法，模拟事件回调
    let onStartCallback: (() => void) | undefined;
    let onEndCallback: (() => void) | undefined;

    vi.mocked(voiceService.voiceService.speak).mockImplementation((text, config, priority, playerId, events) => {
      onStartCallback = events?.onStart;
      onEndCallback = events?.onEnd;
      return Promise.resolve();
    });

    const { result } = renderHook(() => useChatBubbles(gameState));

    // 添加聊天消息
    const message: ChatMessage = {
      playerId: 0,
      playerName: '玩家0',
      content: '好牌！',
      timestamp: Date.now(),
      type: 'random'
    };
    addChatMessage(message);

    // 等待Hook处理
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // 触发语音开始
    await act(async () => {
      onStartCallback?.();
      await vi.runAllTimersAsync();
    });

    // 应该设置播放状态为true
    await waitFor(() => {
      expect(result.current.speakingStates.get(0)).toBe(true);
    });

    // 触发语音结束
    await act(async () => {
      onEndCallback?.();
      await vi.runAllTimersAsync();
    });

    // 应该设置播放状态为false
    await waitFor(() => {
      expect(result.current.speakingStates.get(0)).toBe(false);
    });
  });

  it('应该在语音播放失败时使用超时保护', async () => {
    const players = [createMockPlayer(0, '玩家0')];
    const gameState = createMockGameState(players);

    // Mock speak 方法，模拟失败
    vi.mocked(voiceService.voiceService.speak).mockRejectedValue(new Error('播放失败'));

    const { result } = renderHook(() => useChatBubbles(gameState));

    // 添加聊天消息
    const message: ChatMessage = {
      playerId: 0,
      playerName: '玩家0',
      content: '好牌！',
      timestamp: Date.now(),
      type: 'random'
    };
    addChatMessage(message);

    // 等待Hook处理
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // 3秒后应该自动设置播放状态为false（超时保护）
    await act(async () => {
      vi.advanceTimersByTime(3000);
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(result.current.speakingStates.get(0)).toBe(false);
    });
  });

  it('应该处理多个玩家的同步播放', async () => {
    const players = [
      createMockPlayer(0, '玩家0'),
      createMockPlayer(1, '玩家1')
    ];
    const gameState = createMockGameState(players);

    const { result } = renderHook(() => useChatBubbles(gameState));

    // 添加两个玩家的消息
    const message1: ChatMessage = {
      playerId: 0,
      playerName: '玩家0',
      content: '好牌！',
      timestamp: Date.now(),
      type: 'random'
    };
    const message2: ChatMessage = {
      playerId: 1,
      playerName: '玩家1',
      content: '要不起',
      timestamp: Date.now() + 100,
      type: 'random'
    };

    addChatMessage(message1);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    addChatMessage(message2);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // 应该显示两个气泡
    await waitFor(() => {
      expect(result.current.activeChatBubbles.has(0)).toBe(true);
      expect(result.current.activeChatBubbles.has(1)).toBe(true);
    });

    // 应该调用两次语音服务
    expect(voiceService.voiceService.speak).toHaveBeenCalledTimes(2);
  });
});

