/**
 * 多通道音频服务单元测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MultiChannelAudioService, getMultiChannelAudioService } from '../../src/services/audio/multiChannelAudioService';
import { ChannelType } from '../../src/types/channel';

// Mock Web Audio API
class MockAudioContext {
  createGain = vi.fn(() => ({
    gain: { value: 1.0 },
    connect: vi.fn()
  }));
  createStereoPanner = vi.fn(() => ({
    pan: { value: 0 },
    connect: vi.fn()
  }));
  createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  }));
  decodeAudioData = vi.fn().mockResolvedValue({
    duration: 1.0,
    sampleRate: 44100
  });
  destination = {};
}

beforeEach(() => {
  // Mock AudioContext
  global.AudioContext = MockAudioContext as any;
  global.window = {
    AudioContext: MockAudioContext as any,
    webkitAudioContext: MockAudioContext as any
  } as any;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('MultiChannelAudioService', () => {
  let service: MultiChannelAudioService;

  beforeEach(() => {
    service = new MultiChannelAudioService();
  });

  describe('初始化', () => {
    it('应该初始化AudioContext', () => {
      expect(service).toBeDefined();
      // 由于AudioContext是私有的，我们通过调用speak来间接测试
    });

    it('应该配置所有通道', () => {
      const stats = service.getStatistics();
      expect(stats.enabled).toBe(true);
    });
  });

  describe('配置管理', () => {
    it('应该能够更新配置', () => {
      service.updateConfig({
        enabled: false,
        maxConcurrentPlayers: 5
      });

      const stats = service.getStatistics();
      expect(stats.enabled).toBe(false);
      expect(stats.maxConcurrentPlayers).toBe(5);
    });

    it('应该限制最大并发数在1-8之间', () => {
      // 测试超过8的情况
      service.updateConfig({
        maxConcurrentPlayers: 10
      });
      const stats1 = service.getStatistics();
      expect(stats1.maxConcurrentPlayers).toBeLessThanOrEqual(8);

      // 测试小于1的情况
      service.updateConfig({
        maxConcurrentPlayers: 0
      });
      const stats2 = service.getStatistics();
      expect(stats2.maxConcurrentPlayers).toBeGreaterThanOrEqual(1);

      // 测试有效值
      service.updateConfig({
        maxConcurrentPlayers: 8
      });
      const stats3 = service.getStatistics();
      expect(stats3.maxConcurrentPlayers).toBe(8);
    });

    it('应该支持8个玩家声道配置', () => {
      service.updateConfig({
        maxConcurrentPlayers: 8
      });

      const stats = service.getStatistics();
      expect(stats.maxConcurrentPlayers).toBe(8);
      
      // 验证调度器统计
      const schedulerStats = stats.schedulerStats;
      expect(schedulerStats).toBeDefined();
      expect(schedulerStats.maxConcurrentPlayers).toBe(8);
    });
  });

  describe('播放控制', () => {
    it('如果服务未启用，应该拒绝播放', async () => {
      service.updateConfig({ enabled: false });

      await expect(
        service.speak('测试', undefined, 1, 1)
      ).rejects.toThrow('多通道音频服务未启用');
    });

    it('应该能够停止指定通道', () => {
      // 由于播放是异步的，这里主要测试方法存在
      expect(() => {
        service.stopChannel(ChannelType.PLAYER_1);
      }).not.toThrow();
    });

    it('应该能够停止所有播放', () => {
      expect(() => {
        service.stopAll();
      }).not.toThrow();
    });
  });

  describe('统计信息', () => {
    it('应该返回统计信息', () => {
      const stats = service.getStatistics();

      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('maxConcurrentPlayers');
      expect(stats).toHaveProperty('activeChannels');
      expect(stats).toHaveProperty('totalQueueLength');
      expect(stats).toHaveProperty('channelStates');
      expect(stats).toHaveProperty('schedulerStats');
    });

    it('应该返回所有9个声道的状态', () => {
      const stats = service.getStatistics();
      const channelStates = stats.channelStates;

      expect(channelStates).toBeDefined();
      expect(channelStates.size).toBe(9); // 8个玩家 + 1个报牌

      // 验证包含所有声道
      const channels = Array.from(channelStates.keys());
      expect(channels).toContain(ChannelType.SYSTEM);
      for (let i = 0; i < 8; i++) {
        expect(channels).toContain(i as ChannelType);
      }
    });

    it('应该正确统计活跃通道数', () => {
      const stats = service.getStatistics();
      
      expect(stats.activeChannels).toBeGreaterThanOrEqual(0);
      expect(stats.activeChannels).toBeLessThanOrEqual(9); // 最多9个声道
    });
  });

  describe('单例模式', () => {
    it('getMultiChannelAudioService应该返回同一个实例', () => {
      const service1 = getMultiChannelAudioService();
      const service2 = getMultiChannelAudioService();

      expect(service1).toBe(service2);
    });
  });
});

