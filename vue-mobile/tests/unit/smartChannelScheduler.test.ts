/**
 * 智能通道调度器单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartChannelScheduler, ChannelUsage, ChannelAllocation } from '../../src/services/audio/smartChannelScheduler';
import { ChannelType } from '../../src/types/channel';

describe('SmartChannelScheduler', () => {
  let scheduler: SmartChannelScheduler;

  beforeEach(() => {
    scheduler = new SmartChannelScheduler(3, 4); // 最多3个并发玩家，总共4个玩家
  });

  describe('系统通道分配', () => {
    it('应该为系统消息分配SYSTEM通道', () => {
      const allocation = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });

      expect(allocation.channel).toBe(ChannelType.SYSTEM);
      expect(allocation.isQueued).toBe(false);
      expect(allocation.reason).toBeDefined();
    });

    it('系统通道应该可以立即分配（即使正在播放）', () => {
      // 第一次分配
      const allocation1 = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });
      expect(allocation1.channel).toBe(ChannelType.SYSTEM);
      expect(allocation1.isQueued).toBe(false);

      // 第二次分配（应该也可以立即分配，因为系统优先级最高）
      const allocation2 = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });
      expect(allocation2.channel).toBe(ChannelType.SYSTEM);
    });
  });

  describe('玩家通道分配', () => {
    it('应该为玩家分配玩家通道', () => {
      const allocation = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      expect(allocation.channel).toBeGreaterThanOrEqual(ChannelType.PLAYER_1);
      expect(allocation.channel).toBeLessThanOrEqual(ChannelType.PLAYER_7);
      expect(allocation.channel).not.toBe(ChannelType.SYSTEM);
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
      
      // 确保通道确实在使用中
      expect(allocation1.isQueued).toBe(false);
      expect(allocation1.channel).toBeDefined();
      
      // 验证通道状态
      const state1 = scheduler.getChannelState(allocation1.channel);
      expect(state1?.isActive).toBe(true);
      expect(state1?.currentPlayerId).toBe(1);

      // 同一玩家再次请求（通道被占用，应该加入队列）
      const allocation2 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      expect(allocation2.isQueued).toBe(true);
      expect(allocation2.channel).toBe(allocation1.channel);
      expect(allocation2.queuePosition).toBeGreaterThan(0);

      // 清理
      scheduler.releaseChannel(allocation1.channel, 1);
    });
  });

  describe('智能调度', () => {
    it('应该根据玩家数量智能计算并发数', () => {
      const scheduler2 = new SmartChannelScheduler(undefined, 2);
      const stats2 = scheduler2.getStatistics();
      expect(stats2.playerChannels.maxConcurrent).toBe(2); // 2-3人：2个并发

      const scheduler4 = new SmartChannelScheduler(undefined, 4);
      const stats4 = scheduler4.getStatistics();
      expect(stats4.playerChannels.maxConcurrent).toBe(3); // 4-5人：3个并发

      const scheduler6 = new SmartChannelScheduler(undefined, 6);
      const stats6 = scheduler6.getStatistics();
      expect(stats6.playerChannels.maxConcurrent).toBe(4); // 6-7人：4个并发

      const scheduler8 = new SmartChannelScheduler(undefined, 8);
      const stats8 = scheduler8.getStatistics();
      expect(stats8.playerChannels.maxConcurrent).toBe(5); // 8人：5个并发
    });

    it('应该负载均衡分配声道', () => {
      // 分配多个玩家，应该优先使用使用次数最少的声道
      const allocations: ChannelAllocation[] = [];
      
      for (let i = 0; i < 3; i++) {
        const allocation = scheduler.allocateChannel({
          usage: ChannelUsage.PLAYER,
          playerId: i,
          priority: 1
        });
        allocations.push(allocation);
        // 立即释放，模拟使用
        scheduler.releaseChannel(allocation.channel, i);
      }

      // 再次分配，应该优先使用之前使用次数少的声道
      const newAllocation = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 10,
        priority: 1
      });

      expect(newAllocation.isQueued).toBe(false);
      expect(newAllocation.channel).toBeGreaterThanOrEqual(ChannelType.PLAYER_1);
      expect(newAllocation.channel).toBeLessThanOrEqual(ChannelType.PLAYER_7);
    });

    it('应该更新总玩家数并重新计算并发数', () => {
      scheduler.updateTotalPlayers(6);
      const stats = scheduler.getStatistics();
      expect(stats.totalPlayers).toBe(6);
      expect(stats.playerChannels.maxConcurrent).toBe(4); // 6-7人：4个并发
    });
  });

  describe('系统通道和玩家通道独立性', () => {
    it('系统通道和玩家通道应该可以同时分配', () => {
      // 分配系统通道
      const systemAllocation = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });

      // 分配玩家通道
      const playerAllocation = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      // 两者都应该成功
      expect(systemAllocation.channel).toBe(ChannelType.SYSTEM);
      expect(systemAllocation.isQueued).toBe(false);
      expect(playerAllocation.isQueued).toBe(false);
      expect(playerAllocation.channel).not.toBe(ChannelType.SYSTEM);

      // 清理
      scheduler.releaseChannel(systemAllocation.channel);
      scheduler.releaseChannel(playerAllocation.channel, 1);
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const stats = scheduler.getStatistics();
      
      expect(stats.systemChannel).toBeDefined();
      expect(stats.systemChannel.channel).toBe(ChannelType.SYSTEM);
      expect(stats.playerChannels).toBeDefined();
      expect(stats.playerChannels.total).toBe(7);
      expect(stats.totalPlayers).toBe(4);
      expect(stats.loadBalance).toBeDefined();
    });
  });
});

