/**
 * 声道调度器单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelScheduler } from '../src/services/channelScheduler';
import { ChannelType } from '../src/types/channel';
import { PlaybackPriority } from '../src/services/channelScheduler/types';

// Mock ttsAudioService
vi.mock('../src/services/ttsAudioService', () => ({
  ttsAudioService: {
    speak: vi.fn().mockImplementation((text, voiceConfig, channel, events, priority) => {
      // 模拟异步播放，播放时间较长（200ms），确保测试有时间检查状态
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (events?.onStart) {
            events.onStart();
          }
          // 播放时间200ms，给测试足够时间检查状态
          setTimeout(() => {
            if (events?.onEnd) {
              events.onEnd();
            }
            resolve();
          }, 200);
        }, 10);
      });
    }),
    stopChannel: vi.fn()
  }
}));

describe('ChannelScheduler', () => {
  let scheduler: ChannelScheduler;

  beforeEach(() => {
    scheduler = new ChannelScheduler();
    vi.clearAllMocks();
  });

  describe('声道分配', () => {
    it('应该正确分配4个玩家到4个通道', () => {
      expect(scheduler.getPlayerChannel(0)).toBe(ChannelType.PLAYER_0);
      expect(scheduler.getPlayerChannel(1)).toBe(ChannelType.PLAYER_1);
      expect(scheduler.getPlayerChannel(2)).toBe(ChannelType.PLAYER_2);
      expect(scheduler.getPlayerChannel(3)).toBe(ChannelType.PLAYER_3);
    });

    it('超过4个玩家时应该循环使用通道', () => {
      expect(scheduler.getPlayerChannel(4)).toBe(ChannelType.PLAYER_0);
      expect(scheduler.getPlayerChannel(5)).toBe(ChannelType.PLAYER_1);
      expect(scheduler.getPlayerChannel(6)).toBe(ChannelType.PLAYER_2);
      expect(scheduler.getPlayerChannel(7)).toBe(ChannelType.PLAYER_3);
    });
  });

  describe('报牌播放', () => {
    it('报牌应该使用ANNOUNCEMENT通道', async () => {
      const request = {
        text: '报牌测试',
        channel: ChannelType.ANNOUNCEMENT,
        priority: PlaybackPriority.ANNOUNCEMENT,
        type: 'announcement' as const
      };

      await scheduler.requestPlay(request);

      const { ttsAudioService } = await import('../src/services/ttsAudioService');
      expect(ttsAudioService.speak).toHaveBeenCalledWith(
        '报牌测试',
        undefined,
        ChannelType.ANNOUNCEMENT,
        expect.any(Object),
        4
      );
    });

    it('报牌应该中断所有玩家聊天', async () => {
      // 先让一个玩家开始聊天
      const chatRequest = {
        text: '玩家聊天',
        channel: ChannelType.PLAYER_0,
        priority: PlaybackPriority.CHAT,
        type: 'chat' as const,
        playerId: 0
      };

      // 不等待完成，立即发送聊天请求
      const chatPromise = scheduler.requestPlay(chatRequest);
      
      // 等待一小段时间，确保聊天请求已开始播放（onStart已调用，isPlaying为true）
      await new Promise(resolve => setTimeout(resolve, 30));
      
      // 验证聊天已经开始播放
      const chatStatus = scheduler.getChannelStatus(ChannelType.PLAYER_0);
      expect(chatStatus.isPlaying).toBe(true);
      
      const announcementRequest = {
        text: '报牌',
        channel: ChannelType.ANNOUNCEMENT,
        priority: PlaybackPriority.ANNOUNCEMENT,
        type: 'announcement' as const
      };

      await scheduler.requestPlay(announcementRequest);

      const { ttsAudioService } = await import('../src/services/ttsAudioService');
      // 报牌应该调用stopChannel中断玩家通道
      expect(ttsAudioService.stopChannel).toHaveBeenCalled();
      
      // 等待聊天请求完成（避免测试结束时的警告）
      await chatPromise.catch(() => {});
    });
  });

  describe('玩家聊天播放', () => {
    it('4个玩家应该各自使用独立通道', async () => {
      const requests = [
        {
          text: '玩家0',
          channel: ChannelType.PLAYER_0,
          priority: PlaybackPriority.CHAT,
          type: 'chat' as const,
          playerId: 0
        },
        {
          text: '玩家1',
          channel: ChannelType.PLAYER_1,
          priority: PlaybackPriority.CHAT,
          type: 'chat' as const,
          playerId: 1
        },
        {
          text: '玩家2',
          channel: ChannelType.PLAYER_2,
          priority: PlaybackPriority.CHAT,
          type: 'chat' as const,
          playerId: 2
        },
        {
          text: '玩家3',
          channel: ChannelType.PLAYER_3,
          priority: PlaybackPriority.CHAT,
          type: 'chat' as const,
          playerId: 3
        }
      ];

      // 所有玩家同时播放
      await Promise.all(requests.map(req => scheduler.requestPlay(req)));

      const { ttsAudioService } = await import('../src/services/ttsAudioService');
      expect(ttsAudioService.speak).toHaveBeenCalledTimes(4);
      expect(ttsAudioService.speak).toHaveBeenCalledWith(
        '玩家0',
        undefined,
        ChannelType.PLAYER_0,
        expect.any(Object),
        1
      );
      expect(ttsAudioService.speak).toHaveBeenCalledWith(
        '玩家1',
        undefined,
        ChannelType.PLAYER_1,
        expect.any(Object),
        1
      );
    });

    it('同一玩家的多个聊天请求应该排队', async () => {
      const request1 = {
        text: '第一条消息',
        channel: ChannelType.PLAYER_0,
        priority: PlaybackPriority.CHAT,
        type: 'chat' as const,
        playerId: 0
      };

      const request2 = {
        text: '第二条消息',
        channel: ChannelType.PLAYER_0,
        priority: PlaybackPriority.CHAT,
        type: 'chat' as const,
        playerId: 0
      };

      // 发送第一个请求
      const promise1 = scheduler.requestPlay(request1);
      
      // 等待一下，让第一个请求开始播放（onStart已调用，isPlaying为true）
      await new Promise(resolve => setTimeout(resolve, 30));
      
      // 验证第一个请求已经开始播放
      const status1 = scheduler.getChannelStatus(ChannelType.PLAYER_0);
      expect(status1.isPlaying).toBe(true);
      
      // 立即发送第二个请求（此时第一个还在播放，应该排队）
      const promise2 = scheduler.requestPlay(request2);
      
      // 等待一下，让第二个请求被加入队列
      await new Promise(resolve => setTimeout(resolve, 20));

      const status2 = scheduler.getChannelStatus(ChannelType.PLAYER_0);
      expect(status2.queueLength).toBeGreaterThan(0);
      
      // 等待所有请求完成
      await Promise.all([promise1, promise2].map(p => p.catch(() => {})));
    });
  });

  describe('通道状态', () => {
    it('应该正确返回通道状态', () => {
      const status = scheduler.getChannelStatus(ChannelType.PLAYER_0);
      expect(status.channel).toBe(ChannelType.PLAYER_0);
      expect(status.isPlaying).toBe(false);
      expect(status.queueLength).toBe(0);
    });

    it('应该返回所有通道状态', () => {
      const allStatuses = scheduler.getChannelStatus();
      expect(allStatuses).toBeInstanceOf(Map);
      expect(allStatuses.size).toBe(5); // 4个玩家通道 + 1个报牌通道
    });
  });

  describe('中断功能', () => {
    it('应该能够中断指定通道', async () => {
      const request = {
        text: '测试',
        channel: ChannelType.PLAYER_0,
        priority: PlaybackPriority.CHAT,
        type: 'chat' as const,
        playerId: 0
      };

      scheduler.requestPlay(request);
      scheduler.interrupt(ChannelType.PLAYER_0);

      const { ttsAudioService } = await import('../src/services/ttsAudioService');
      expect(ttsAudioService.stopChannel).toHaveBeenCalledWith(ChannelType.PLAYER_0);
    });

    it('应该能够中断所有通道', async () => {
      scheduler.interrupt();

      const { ttsAudioService } = await import('../src/services/ttsAudioService');
      // 应该调用stopChannel多次（每个通道一次）
      expect(ttsAudioService.stopChannel).toHaveBeenCalled();
    });
  });
});

