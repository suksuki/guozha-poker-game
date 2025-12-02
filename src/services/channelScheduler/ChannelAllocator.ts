/**
 * 声道分配器
 * 负责玩家ID到声道的映射和声道分配策略
 */

import { ChannelType } from '../../types/channel';
import { ChannelSchedulerConfig, DEFAULT_CHANNEL_SCHEDULER_CONFIG } from './types';

/**
 * 声道分配器类
 */
export class ChannelAllocator {
  private config: ChannelSchedulerConfig;
  
  // 玩家聊天通道数量（固定8个，支持更多玩家通过共享声道）
  private readonly CHAT_CHANNEL_COUNT = 8;

  constructor(config: ChannelSchedulerConfig = DEFAULT_CHANNEL_SCHEDULER_CONFIG) {
    this.config = config;
  }

  /**
   * 获取玩家对应的声道
   * 8个玩家时，每人一个独立通道；超过8个玩家时，共享通道（通过取模分配）
   * @param playerId 玩家ID
   * @returns 声道类型
   */
  getPlayerChannel(playerId: number): ChannelType {
    // 玩家ID映射到8个聊天通道（0-7对应PLAYER_0到PLAYER_7）
    const channelIndex = playerId % this.CHAT_CHANNEL_COUNT;
    return channelIndex as ChannelType;
  }

  /**
   * 检查是否是玩家聊天通道
   * @param channel 声道
   * @returns 是否是玩家聊天通道
   */
  isPlayerChannel(channel: ChannelType): boolean {
    return channel >= ChannelType.PLAYER_0 && channel <= ChannelType.PLAYER_7;
  }

  /**
   * 检查是否是报牌通道
   * @param channel 声道
   * @returns 是否是报牌通道
   */
  isAnnouncementChannel(channel: ChannelType): boolean {
    return channel === ChannelType.ANNOUNCEMENT;
  }

  /**
   * 获取所有玩家聊天通道
   * @returns 玩家聊天通道数组
   */
  getAllPlayerChannels(): ChannelType[] {
    return [
      ChannelType.PLAYER_0,
      ChannelType.PLAYER_1,
      ChannelType.PLAYER_2,
      ChannelType.PLAYER_3,
      ChannelType.PLAYER_4,
      ChannelType.PLAYER_5,
      ChannelType.PLAYER_6,
      ChannelType.PLAYER_7
    ];
  }

  /**
   * 获取报牌通道
   * @returns 报牌通道
   */
  getAnnouncementChannel(): ChannelType {
    return ChannelType.ANNOUNCEMENT;
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<ChannelSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

