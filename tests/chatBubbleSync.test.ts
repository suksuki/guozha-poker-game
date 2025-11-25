/**
 * 聊天气泡与语音同步测试
 * 测试文字气泡和语音播放的同步效果
 * 
 * 运行: npm test -- chatBubbleSync.test.ts --run
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChatBubble } from '../src/components/ChatBubble';
import { ChatMessage } from '../src/types/chat';
import React from 'react';

// Mock speechSynthesis
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
  speaking: false,
  onvoiceschanged: null as any
};

beforeEach(() => {
  global.window.speechSynthesis = mockSpeechSynthesis as any;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ChatBubble 同步测试', () => {
  const mockMessage: ChatMessage = {
    playerId: 0,
    playerName: '测试玩家',
    content: '好牌！',
    timestamp: Date.now(),
    type: 'random'
  };

  const mockPosition: React.CSSProperties = {
    top: '100px',
    left: '50%'
  };

  it('应该在语音开始时显示气泡和播放指示器', async () => {
    const onSpeechStart = vi.fn();
    const onSpeechEnd = vi.fn();
    const onComplete = vi.fn();

    const { rerender } = render(
      <ChatBubble
        message={mockMessage}
        playerPosition={mockPosition}
        isSpeaking={false}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onComplete={onComplete}
      />
    );

    // 初始状态：应该立即显示气泡（等待语音开始）
    await waitFor(() => {
      expect(screen.queryByText('好牌！')).toBeInTheDocument();
    });

    // 初始状态不应该有播放指示器
    expect(screen.queryByText('🔊')).not.toBeInTheDocument();

    // 设置为正在播放
    rerender(
      <ChatBubble
        message={mockMessage}
        playerPosition={mockPosition}
        isSpeaking={true}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onComplete={onComplete}
      />
    );

    // 应该调用 onSpeechStart
    await waitFor(() => {
      expect(onSpeechStart).toHaveBeenCalled();
    });

    // 应该显示播放指示器
    await waitFor(() => {
      expect(screen.queryByText('🔊')).toBeInTheDocument();
    });

    // 应该有 speaking 类名
    const bubble = screen.getByText('好牌！').closest('.chat-bubble');
    expect(bubble).toHaveClass('speaking');
  });

  it('应该在语音结束时开始淡出', async () => {
    const onSpeechStart = vi.fn();
    const onSpeechEnd = vi.fn();
    const onComplete = vi.fn();

    const { rerender } = render(
      <ChatBubble
        message={mockMessage}
        playerPosition={mockPosition}
        isSpeaking={true}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onComplete={onComplete}
      />
    );

    // 等待语音开始
    await waitFor(() => {
      expect(onSpeechStart).toHaveBeenCalled();
    });

    // 设置为播放完成
    rerender(
      <ChatBubble
        message={mockMessage}
        playerPosition={mockPosition}
        isSpeaking={false}
        onSpeechStart={onSpeechStart}
        onSpeechEnd={onSpeechEnd}
        onComplete={onComplete}
      />
    );

    // 应该调用 onSpeechEnd
    await waitFor(() => {
      expect(onSpeechEnd).toHaveBeenCalled();
    });

    // 应该开始淡出（有 fade-out class）
    const bubble = screen.getByText('好牌！').closest('.chat-bubble');
    expect(bubble).toHaveClass('fade-out');

    // 1秒后应该调用 onComplete
    vi.advanceTimersByTime(1000);
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('应该在播放中显示 speaking 类名和播放指示器', async () => {
    const { rerender } = render(
      <ChatBubble
        message={mockMessage}
        playerPosition={mockPosition}
        isSpeaking={false}
      />
    );

    // 初始显示
    await waitFor(() => {
      expect(screen.queryByText('好牌！')).toBeInTheDocument();
    });

    // 设置为播放中
    rerender(
      <ChatBubble
        message={mockMessage}
        playerPosition={mockPosition}
        isSpeaking={true}
      />
    );

    await waitFor(() => {
      const bubble = screen.getByText('好牌！').closest('.chat-bubble');
      expect(bubble).toHaveClass('speaking');
      expect(screen.queryByText('🔊')).toBeInTheDocument();
    });
  });

  it('应该在没有语音时使用超时保护机制', async () => {
    const onComplete = vi.fn();

    render(
      <ChatBubble
        message={mockMessage}
        playerPosition={mockPosition}
        isSpeaking={false}
        onComplete={onComplete}
      />
    );

    // 10秒后应该自动隐藏（保护机制）
    vi.advanceTimersByTime(10000);
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 100 });
  });
});

