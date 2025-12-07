/**
 * 通道调度器单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChannelScheduler, ChannelUsage, ChannelAllocation } from '../../src/services/audio/channelScheduler';
import { ChannelType } from '../../src/types/channel';

describe('ChannelScheduler', () => {
  let scheduler: ChannelScheduler;

  beforeEach(() => {
    scheduler = new ChannelScheduler(3); // 最多3个并发玩家
  });

  describe('系统通道分配', () => {
    it('应该为系统消息分配ANNOUNCEMENT通道', () => {
      const allocation = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });

      expect(allocation.channel).toBe(ChannelType.ANNOUNCEMENT);
      expect(allocation.isQueued).toBe(false);
    });

    it('系统通道应该可以立即分配（即使正在播放）', () => {
      // 第一次分配
      const allocation1 = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });
      expect(allocation1.channel).toBe(ChannelType.ANNOUNCEMENT);
      expect(allocation1.isQueued).toBe(false);

      // 第二次分配（应该也可以立即分配，因为系统优先级最高）
      const allocation2 = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });
      expect(allocation2.channel).toBe(ChannelType.ANNOUNCEMENT);
    });
  });

  describe('玩家通道分配', () => {
    it('应该为玩家分配PLAYER通道', () => {
      const allocation = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      expect(allocation.channel).toBeGreaterThanOrEqual(ChannelType.PLAYER_0);
      expect(allocation.channel).toBeLessThanOrEqual(ChannelType.PLAYER_7);
      expect(allocation.isQueued).toBe(false);
    });

    it('应该为不同玩家分配不同通道', () => {
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

      expect(allocation1.channel).not.toBe(allocation2.channel);
    });

    it('应该为同一玩家分配相同通道（如果可用）', () => {
      const allocation1 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      // 释放通道
      scheduler.releaseChannel(allocation1.channel, 1);

      // 再次分配
      const allocation2 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      expect(allocation2.channel).toBe(allocation1.channel);
    });

    it('如果通道被占用，应该加入队列', () => {
      // 分配第一个（通道会被标记为active，currentPlayerId会被设置）
      const allocation1 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });
      
      // 确保通道确实在使用中（通过检查分配结果）
      expect(allocation1.isQueued).toBe(false);
      expect(allocation1.channel).toBeDefined();
      
      // 验证通道状态（确保isActive和currentPlayerId已设置）
      const state1 = scheduler.getChannelState(allocation1.channel);
      expect(state1?.isActive).toBe(true);
      expect(state1?.currentPlayerId).toBe(1);

      // 同一玩家再次请求（通道被占用，应该加入队列）
      // 因为state.isActive && state.currentPlayerId === playerId 都为true
      const allocation2 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      expect(allocation2.isQueued).toBe(true);
      expect(allocation2.queuePosition).toBeGreaterThan(0);
    });

    it('应该支持最多maxConcurrentPlayers个并发玩家', () => {
      const allocations: ChannelAllocation[] = [];

      // 分配3个玩家（maxConcurrentPlayers = 3）
      for (let i = 1; i <= 3; i++) {
        allocations.push(scheduler.allocateChannel({
          usage: ChannelUsage.PLAYER,
          playerId: i,
          priority: 1
        }));
      }

      // 所有分配应该成功
      allocations.forEach(allocation => {
        expect(allocation.isQueued).toBe(false);
      });

      // 第4个玩家应该被加入队列
      const allocation4 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 4,
        priority: 1
      });

      expect(allocation4.isQueued).toBe(true);
    });

    it('应该支持8个玩家声道（PLAYER_0到PLAYER_7）', () => {
      const scheduler8 = new ChannelScheduler(8); // 最多8个并发
      const allocations: ChannelAllocation[] = [];
      const usedChannels = new Set<ChannelType>();

      // 分配8个不同玩家
      for (let i = 0; i < 8; i++) {
        const allocation = scheduler8.allocateChannel({
          usage: ChannelUsage.PLAYER,
          playerId: i,
          priority: 1
        });
        allocations.push(allocation);
        usedChannels.add(allocation.channel);
      }

      // 所有分配应该成功
      allocations.forEach(allocation => {
        expect(allocation.isQueued).toBe(false);
        expect(allocation.channel).toBeGreaterThanOrEqual(ChannelType.PLAYER_0);
        expect(allocation.channel).toBeLessThanOrEqual(ChannelType.PLAYER_7);
      });

      // 应该使用了8个不同的声道
      expect(usedChannels.size).toBe(8);

      // 清理
      allocations.forEach((allocation, index) => {
        scheduler8.releaseChannel(allocation.channel, index);
      });
    });

    it('当maxConcurrentPlayers=8时，应该支持8个玩家同时播放', () => {
      const scheduler8 = new ChannelScheduler(8);
      const allocations: ChannelAllocation[] = [];

      // 分配8个玩家
      for (let i = 0; i < 8; i++) {
        allocations.push(scheduler8.allocateChannel({
          usage: ChannelUsage.PLAYER,
          playerId: i,
          priority: 1
        }));
      }

      // 所有8个都应该成功分配
      expect(allocations.every(a => !a.isQueued)).toBe(true);
      expect(allocations.length).toBe(8);

      // 第9个玩家应该被加入队列
      const allocation9 = scheduler8.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 8,
        priority: 1
      });
      expect(allocation9.isQueued).toBe(true);

      // 清理
      allocations.forEach((allocation, index) => {
        scheduler8.releaseChannel(allocation.channel, index);
      });
    });
  });

  describe('通道释放', () => {
    it('应该能够释放通道', () => {
      const allocation = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      const stateBefore = scheduler.getChannelState(allocation.channel);
      expect(stateBefore?.isActive).toBe(true);

      scheduler.releaseChannel(allocation.channel, 1);

      const stateAfter = scheduler.getChannelState(allocation.channel);
      expect(stateAfter?.isActive).toBe(false);
    });

    it('释放后应该处理队列中的下一个', () => {
      // 分配并占用通道
      const allocation1 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });
      
      // 确保第一次分配成功
      expect(allocation1.isQueued).toBe(false);

      // 同一玩家再次请求（加入队列）
      const allocation2 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });
      expect(allocation2.isQueued).toBe(true);
      expect(allocation2.queuePosition).toBeGreaterThan(0);

      // 释放通道（应该减少队列长度）
      scheduler.releaseChannel(allocation1.channel, 1);

      // 队列长度应该减少（releaseChannel会减少队列长度）
      const state = scheduler.getChannelState(allocation1.channel);
      expect(state?.queueLength).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const allocation = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      // 确保通道被分配且未加入队列
      expect(allocation.isQueued).toBe(false);

      const stats = scheduler.getStatistics();

      expect(stats.totalChannels).toBe(9); // 8个玩家通道 + 1个系统通道
      expect(stats.activeChannels).toBeGreaterThan(0);
      expect(stats.maxConcurrentPlayers).toBe(3);
      
      // 清理
      scheduler.releaseChannel(allocation.channel, 1);
    });
  });

  describe('配置更新', () => {
    it('应该能够更新最大并发数', () => {
      scheduler.setMaxConcurrentPlayers(5);

      const stats = scheduler.getStatistics();
      expect(stats.maxConcurrentPlayers).toBe(5);
    });

    it('最大并发数应该在有效范围内（1-8）', () => {
      scheduler.setMaxConcurrentPlayers(10); // 超过8个玩家通道
      const stats = scheduler.getStatistics();
      expect(stats.maxConcurrentPlayers).toBeLessThanOrEqual(8);
      expect(stats.maxConcurrentPlayers).toBe(8); // 应该被限制为8

      scheduler.setMaxConcurrentPlayers(0); // 小于1
      const stats2 = scheduler.getStatistics();
      expect(stats2.maxConcurrentPlayers).toBeGreaterThanOrEqual(1);
      expect(stats2.maxConcurrentPlayers).toBe(1); // 应该被限制为1

      scheduler.setMaxConcurrentPlayers(5); // 有效值
      const stats3 = scheduler.getStatistics();
      expect(stats3.maxConcurrentPlayers).toBe(5);
    });

    it('应该正确统计所有9个声道（8个玩家+1个报牌）', () => {
      const stats = scheduler.getStatistics();
      expect(stats.totalChannels).toBe(9); // 8个玩家通道 + 1个系统通道

      const allStates = scheduler.getAllChannelStates();
      expect(allStates.size).toBe(9);
      
      // 验证包含所有声道
      const channels = Array.from(allStates.keys());
      expect(channels).toContain(ChannelType.ANNOUNCEMENT);
      for (let i = 0; i < 8; i++) {
        expect(channels).toContain(i as ChannelType);
      }
    });
  });
});

