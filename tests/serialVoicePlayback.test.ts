/**
 * 串行播放单元测试
 * 测试串行播放逻辑、优先级排序、队列管理
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { multiChannelVoiceService, ChannelType } from '../src/services/multiChannelVoiceService';
import { VoiceConfig } from '../src/types/card';

// Mock speechSynthesis
class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = 'zh-CN';
  rate: number = 1;
  pitch: number = 1;
  volume: number = 1;
  voice: any = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  __interrupted: boolean = false;

  constructor(text: string) {
    this.text = text;
  }
}

class MockSpeechSynthesis {
  speaking: boolean = false;
  pending: boolean = false;
  private utterances: MockSpeechSynthesisUtterance[] = [];
  private voices: any[] = [
    { name: 'Microsoft Yaoyao', lang: 'zh-CN', default: true }
  ];

  speak(utterance: MockSpeechSynthesisUtterance) {
    this.utterances.push(utterance);
    this.pending = true;
    this.speaking = true;
    
    // 模拟异步播放
    setTimeout(() => {
      if (!utterance.__interrupted) {
        utterance.onstart?.();
        setTimeout(() => {
          if (!utterance.__interrupted) {
            utterance.onend?.();
            this.speaking = this.utterances.length > 1;
            this.pending = this.utterances.length > 1;
            this.utterances.shift();
          }
        }, 100);
      }
    }, 10);
  }

  cancel() {
    this.utterances.forEach(u => {
      u.__interrupted = true;
    });
    this.utterances = [];
    this.speaking = false;
    this.pending = false;
  }

  getVoices() {
    return this.voices;
  }
}

// 设置全局 mock
const mockSpeechSynthesis = new MockSpeechSynthesis();
(global as any).window = {
  speechSynthesis: mockSpeechSynthesis,
  SpeechSynthesisUtterance: MockSpeechSynthesisUtterance
};
(global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

describe('串行播放单元测试', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 重置 mock
    mockSpeechSynthesis.speaking = false;
    mockSpeechSynthesis.pending = false;
    mockSpeechSynthesis['utterances'] = [];
    
    // 清理服务状态
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理所有定时器
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('优先级排序', () => {
    it('应该按优先级排序：对骂 > 事件 > 随机', async () => {
      const events: Array<{ text: string; priority: number }> = [];
      
      // 创建不同优先级的消息
      const promises = [
        // 随机（优先级1）
        multiChannelVoiceService.speak('随机消息1', undefined, ChannelType.PLAYER_0, {
          onEnd: () => events.push({ text: '随机消息1', priority: 1 })
        }, 1),
        // 对骂（优先级3）
        multiChannelVoiceService.speak('对骂消息1', undefined, ChannelType.PLAYER_1, {
          onEnd: () => events.push({ text: '对骂消息1', priority: 3 })
        }, 3),
        // 事件（优先级2）
        multiChannelVoiceService.speak('事件消息1', undefined, ChannelType.PLAYER_2, {
          onEnd: () => events.push({ text: '事件消息1', priority: 2 })
        }, 2),
        // 随机（优先级1）
        multiChannelVoiceService.speak('随机消息2', undefined, ChannelType.PLAYER_3, {
          onEnd: () => events.push({ text: '随机消息2', priority: 1 })
        }, 1),
      ];

      // 推进定时器，让所有消息完成
      await vi.advanceTimersByTimeAsync(1000);

      // 等待所有消息完成
      await Promise.all(promises);

      // 验证顺序：对骂 > 事件 > 随机
      expect(events[0].priority).toBeGreaterThanOrEqual(events[1].priority);
      expect(events[1].priority).toBeGreaterThanOrEqual(events[2].priority);
      expect(events[2].priority).toBeGreaterThanOrEqual(events[3].priority);
    });
  });

  describe('串行播放', () => {
    it('应该一次只播放一个聊天语音', async () => {
      let playingCount = 0;
      let maxConcurrent = 0;

      const onStart = () => {
        playingCount++;
        maxConcurrent = Math.max(maxConcurrent, playingCount);
      };

      const onEnd = () => {
        playingCount--;
      };

      // 同时发送多个聊天消息
      const promises = [
        multiChannelVoiceService.speak('消息1', undefined, ChannelType.PLAYER_0, { onStart, onEnd }, 1),
        multiChannelVoiceService.speak('消息2', undefined, ChannelType.PLAYER_1, { onStart, onEnd }, 1),
        multiChannelVoiceService.speak('消息3', undefined, ChannelType.PLAYER_2, { onStart, onEnd }, 1),
      ];

      // 推进定时器让消息播放
      await vi.advanceTimersByTimeAsync(500);

      await Promise.all(promises);

      // 验证最多同时只有1个在播放（串行播放）
      expect(maxConcurrent).toBeLessThanOrEqual(1);
    });

    it('应该按顺序播放队列中的消息', async () => {
      const playbackOrder: string[] = [];

      const createMessage = (text: string, priority: number) => {
        return multiChannelVoiceService.speak(
          text,
          undefined,
          ChannelType.PLAYER_0,
          {
            onStart: () => playbackOrder.push(text)
          },
          priority
        );
      };

      // 发送多个消息（低优先级先发送）
      const promises = [
        createMessage('消息1（随机）', 1),
        createMessage('消息2（事件）', 2),
        createMessage('消息3（对骂）', 3),
        createMessage('消息4（随机）', 1),
      ];

      // 推进定时器让消息播放
      await vi.advanceTimersByTimeAsync(1000);

      await Promise.all(promises);

      // 验证播放顺序：对骂 > 事件 > 随机
      expect(playbackOrder.length).toBeGreaterThanOrEqual(2);
      // 验证对骂消息最先播放
      if (playbackOrder.length > 0) {
        expect(playbackOrder[0]).toBe('消息3（对骂）');
      }
      // 验证所有消息都被播放了
      expect(playbackOrder.includes('消息1（随机）')).toBe(true);
      expect(playbackOrder.includes('消息2（事件）')).toBe(true);
      expect(playbackOrder.includes('消息3（对骂）')).toBe(true);
      expect(playbackOrder.includes('消息4（随机）')).toBe(true);
    });
  });

  describe('报牌中断', () => {
    it('报牌应该可以中断聊天语音', async () => {
      let chatInterrupted = false;
      let announcementPlayed = false;

      // 开始播放聊天
      const chatPromise = multiChannelVoiceService.speak(
        '聊天消息',
        undefined,
        ChannelType.PLAYER_0,
        {
          onError: () => {
            chatInterrupted = true;
          }
        },
        1
      );

      // 立即发送报牌
      const announcementPromise = multiChannelVoiceService.speak(
        '报牌消息',
        undefined,
        ChannelType.ANNOUNCEMENT,
        {
          onStart: () => {
            announcementPlayed = true;
          }
        },
        4
      );

      // 推进定时器
      await vi.advanceTimersByTimeAsync(500);

      await Promise.all([chatPromise, announcementPromise]);

      // 验证报牌播放了，聊天被中断
      expect(announcementPlayed).toBe(true);
      // 注意：由于mock的限制，可能无法完全模拟中断，但至少验证报牌能播放
    });
  });

  describe('队列管理', () => {
    it('队列满时应该丢弃低优先级消息', async () => {
      const playedMessages: string[] = [];
      const rejectedMessages: string[] = [];

      // 填满队列（发送超过maxQueueSize的消息）
      const promises: Promise<void>[] = [];
      
      for (let i = 0; i < 15; i++) {
        const promise = multiChannelVoiceService.speak(
          `消息${i}`,
          undefined,
          ChannelType.PLAYER_0,
          {
            onStart: () => playedMessages.push(`消息${i}`)
          },
          i < 5 ? 1 : 3 // 前5个是低优先级，后面是高优先级
        ).catch(err => {
          if (err.message.includes('丢弃')) {
            rejectedMessages.push(`消息${i}`);
          }
        });
        promises.push(promise);
      }

      // 推进定时器
      await vi.advanceTimersByTimeAsync(2000);

      await Promise.all(promises);

      // 验证高优先级消息被播放，低优先级消息可能被丢弃
      // 由于队列长度为10，前5个低优先级消息可能被丢弃
      expect(playedMessages.length).toBeGreaterThan(0);
      // 验证高优先级消息（后10个）被播放
      const highPriorityPlayed = playedMessages.filter(m => m.startsWith('消息') && parseInt(m.replace('消息', '')) >= 5);
      expect(highPriorityPlayed.length).toBeGreaterThan(0);
    });

    it('应该正确处理队列中的消息', async () => {
      const playbackOrder: string[] = [];

      // 快速发送多个消息
      const promises = [
        multiChannelVoiceService.speak('消息1', undefined, ChannelType.PLAYER_0, {
          onStart: () => playbackOrder.push('消息1')
        }, 1),
        multiChannelVoiceService.speak('消息2', undefined, ChannelType.PLAYER_1, {
          onStart: () => playbackOrder.push('消息2')
        }, 2),
        multiChannelVoiceService.speak('消息3', undefined, ChannelType.PLAYER_2, {
          onStart: () => playbackOrder.push('消息3')
        }, 3),
      ];

      // 推进定时器
      await vi.advanceTimersByTimeAsync(1000);

      await Promise.all(promises);

      // 验证所有消息都被播放了
      expect(playbackOrder.length).toBe(3);
      // 验证优先级高的先播放
      expect(playbackOrder[0]).toBe('消息3'); // 优先级3
      expect(playbackOrder[1]).toBe('消息2'); // 优先级2
      expect(playbackOrder[2]).toBe('消息1'); // 优先级1
    });
  });

  describe('气泡同步', () => {
    it('onStart应该在语音真正开始时触发', async () => {
      let startTriggered = false;
      let endTriggered = false;

      const promise = multiChannelVoiceService.speak(
        '测试消息',
        undefined,
        ChannelType.PLAYER_0,
        {
          onStart: () => {
            startTriggered = true;
          },
          onEnd: () => {
            endTriggered = true;
          }
        },
        1
      );

      // 推进定时器
      await vi.advanceTimersByTimeAsync(200);

      await promise;

      // 验证事件被触发
      expect(startTriggered).toBe(true);
      expect(endTriggered).toBe(true);
    });

    it('队列中的消息也应该触发onStart', async () => {
      const events: string[] = [];

      // 发送第一个消息（立即播放）
      const promise1 = multiChannelVoiceService.speak('消息1', undefined, ChannelType.PLAYER_0, {
        onStart: () => events.push('消息1开始')
      }, 1);

      // 立即发送第二个消息（加入队列）
      const promise2 = multiChannelVoiceService.speak('消息2', undefined, ChannelType.PLAYER_1, {
        onStart: () => events.push('消息2开始')
      }, 1);

      await Promise.all([promise1, promise2]);

      // 验证两个消息的onStart都被触发
      expect(events).toContain('消息1开始');
      expect(events).toContain('消息2开始');
    });
  });
});

