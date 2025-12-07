/**
 * 多声道并发集成测试
 * 测试8个玩家声道和多声道并发播放
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getMultiChannelAudioService } from '../../src/services/audio/multiChannelAudioService';
import { SmartChannelScheduler, ChannelUsage } from '../../src/services/audio/smartChannelScheduler';
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
    sampleRate: 44100,
    length: 44100,
    numberOfChannels: 1,
    getChannelData: vi.fn(() => new Float32Array(44100))
  });
  destination = {};
}

// Mock TTS服务
vi.mock('../../src/services/tts/ttsService', () => ({
  getTTSService: vi.fn(() => ({
    synthesize: vi.fn().mockResolvedValue({
      audioBuffer: new ArrayBuffer(1000),
      duration: 1.0,
      format: 'audio/wav'
    })
  }))
}));

beforeEach(() => {
  // Mock AudioContext
  global.AudioContext = MockAudioContext as any;
  global.window = {
    AudioContext: MockAudioContext as any,
    webkitAudioContext: MockAudioContext as any
  } as any;
  
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('多声道并发集成测试', () => {
  describe('8个玩家声道支持', () => {
    it('应该支持8个玩家同时分配声道', () => {
      const scheduler = new ChannelScheduler(8);
      const allocations: any[] = [];
      const usedChannels = new Set<ChannelType>();

      // 分配8个不同玩家
      for (let i = 0; i < 8; i++) {
        const allocation = scheduler.allocateChannel({
          usage: ChannelUsage.PLAYER,
          playerId: i,
          priority: 1
        });
        allocations.push(allocation);
        usedChannels.add(allocation.channel);
      }

      // 验证所有分配成功
      expect(allocations.length).toBe(8);
      expect(allocations.every(a => !a.isQueued)).toBe(true);
      expect(usedChannels.size).toBe(8);

      // 验证使用了不同的声道
      const channels = Array.from(usedChannels);
      channels.forEach(channel => {
        expect(channel).toBeGreaterThanOrEqual(ChannelType.PLAYER_1);
        expect(channel).toBeLessThanOrEqual(ChannelType.PLAYER_7);
      });

      // 清理
      allocations.forEach((allocation, index) => {
        scheduler.releaseChannel(allocation.channel, index);
      });
    });

    it('应该正确分配PLAYER_0到PLAYER_7', () => {
      const scheduler = new ChannelScheduler(8);
      const allocations: any[] = [];

      // 分配8个玩家
      for (let i = 0; i < 8; i++) {
        allocations.push(scheduler.allocateChannel({
          usage: ChannelUsage.PLAYER,
          playerId: i,
          priority: 1
        }));
      }

      // 验证声道范围
      allocations.forEach(allocation => {
        expect(allocation.channel).toBeGreaterThanOrEqual(ChannelType.PLAYER_1);
        expect(allocation.channel).toBeLessThanOrEqual(ChannelType.PLAYER_7);
      });

      // 清理
      allocations.forEach((allocation, index) => {
        scheduler.releaseChannel(allocation.channel, index);
      });
    });
  });

  describe('并发控制', () => {
    it('应该根据maxConcurrentPlayers限制并发数', () => {
      const scheduler3 = new ChannelScheduler(3);
      const allocations: any[] = [];

      // 分配3个玩家（应该成功）
      for (let i = 0; i < 3; i++) {
        allocations.push(scheduler3.allocateChannel({
          usage: ChannelUsage.PLAYER,
          playerId: i,
          priority: 1
        }));
      }

      expect(allocations.every(a => !a.isQueued)).toBe(true);

      // 第4个玩家应该被加入队列
      const allocation4 = scheduler3.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 3,
        priority: 1
      });
      expect(allocation4.isQueued).toBe(true);

      // 清理
      allocations.forEach((allocation, index) => {
        scheduler3.releaseChannel(allocation.channel, index);
      });
    });

    it('应该支持动态更新maxConcurrentPlayers', () => {
      const scheduler = new SmartChannelScheduler(3, 4);
      
      // 初始为3
      let stats = scheduler.getStatistics();
      expect(stats.maxConcurrentPlayers).toBe(3);

      // 更新为8
      scheduler.setMaxConcurrentPlayers(8);
      stats = scheduler.getStatistics();
      expect(stats.maxConcurrentPlayers).toBe(8);

      // 更新为5
      scheduler.setMaxConcurrentPlayers(5);
      stats = scheduler.getStatistics();
      expect(stats.maxConcurrentPlayers).toBe(5);
    });
  });

  describe('设置Store集成', () => {
    it('应该从设置Store加载配置', async () => {
      const settingsStore = useSettingsStore();
      
      // 设置最大并发数为8
      settingsStore.updateVoicePlaybackSettings({
        maxConcurrentPlayers: 8
      });

      // 等待配置同步
      await new Promise(resolve => setTimeout(resolve, 200));

      // 获取音频服务（应该已加载配置）
      const audioService = getMultiChannelAudioService();
      const stats = audioService.getStatistics();
      
      // 验证配置已应用（注意：如果服务已经初始化，需要手动更新配置）
      // 由于loadSettingsFromStore是异步的，我们直接验证设置Store的值
      expect(settingsStore.voicePlaybackSettings.maxConcurrentPlayers).toBe(8);
      // 音频服务应该通过watch同步了配置
      expect(stats.maxConcurrentPlayers).toBe(8);
    });

    it('应该同步设置变化到音频服务', async () => {
      const settingsStore = useSettingsStore();
      const audioService = getMultiChannelAudioService();

      // 初始值
      let stats = audioService.getStatistics();
      const initialMax = stats.maxConcurrentPlayers;

      // 更新设置
      settingsStore.updateVoicePlaybackSettings({
        maxConcurrentPlayers: 6
      });

      // 等待同步
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证已更新
      stats = audioService.getStatistics();
      expect(stats.maxConcurrentPlayers).toBe(6);
    });

    it('应该限制设置值在1-8范围内', async () => {
      const settingsStore = useSettingsStore();
      const audioService = getMultiChannelAudioService();

      // 测试超过8
      settingsStore.updateVoicePlaybackSettings({
        maxConcurrentPlayers: 10
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      let stats = audioService.getStatistics();
      expect(stats.maxConcurrentPlayers).toBeLessThanOrEqual(8);

      // 测试小于1
      settingsStore.updateVoicePlaybackSettings({
        maxConcurrentPlayers: 0
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      stats = audioService.getStatistics();
      expect(stats.maxConcurrentPlayers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('声道状态统计', () => {
    it('应该返回所有9个声道的状态', () => {
      const scheduler = new ChannelScheduler(8);
      const allStates = scheduler.getAllChannelStates();

      expect(allStates.size).toBe(9); // 8个玩家 + 1个报牌

      // 验证包含所有声道
      const channels = Array.from(allStates.keys());
      expect(channels).toContain(ChannelType.SYSTEM);
      for (let i = 0; i < 8; i++) {
        expect(channels).toContain(i as ChannelType);
      }
    });

    it('应该正确统计活跃通道数', () => {
      const scheduler = new ChannelScheduler(8);
      
      // 分配几个通道
      const allocation1 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });
      const allocation2 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 2,
        priority: 1
      });
      const allocation3 = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });

      const stats = scheduler.getStatistics();
      expect(stats.activeChannels).toBe(3); // 2个玩家 + 1个系统

      // 清理
      scheduler.releaseChannel(allocation1.channel, 1);
      scheduler.releaseChannel(allocation2.channel, 2);
      scheduler.releaseChannel(allocation3.channel);
    });
  });

  describe('报牌和聊天并发', () => {
    it('报牌和玩家聊天应该可以同时播放', () => {
      const scheduler = new SmartChannelScheduler(3, 4);

      // 分配报牌声道
      const announcementAllocation = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });

      // 分配玩家声道
      const playerAllocation = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      // 两者都应该成功
      expect(announcementAllocation.channel).toBe(ChannelType.SYSTEM);
      expect(announcementAllocation.isQueued).toBe(false);
      expect(playerAllocation.isQueued).toBe(false);
      expect(playerAllocation.channel).not.toBe(ChannelType.SYSTEM);

      // 清理
      scheduler.releaseChannel(announcementAllocation.channel);
      scheduler.releaseChannel(playerAllocation.channel, 1);
    });

    it('多个玩家可以同时播放（在maxConcurrentPlayers限制内）', () => {
      const scheduler = new SmartChannelScheduler(3, 4);
      const allocations: any[] = [];

      // 分配3个玩家
      for (let i = 0; i < 3; i++) {
        allocations.push(scheduler.allocateChannel({
          usage: ChannelUsage.PLAYER,
          playerId: i,
          priority: 1
        }));
      }

      // 所有都应该成功
      expect(allocations.every(a => !a.isQueued)).toBe(true);
      expect(allocations.length).toBe(3);

      // 验证使用了不同的声道
      const channels = allocations.map(a => a.channel);
      const uniqueChannels = new Set(channels);
      expect(uniqueChannels.size).toBe(3);

      // 清理
      allocations.forEach((allocation, index) => {
        scheduler.releaseChannel(allocation.channel, index);
      });
    });
  });
});

