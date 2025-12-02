/**
 * 声道调度器
 * 
 * 职责：
 * 1. 报牌和系统声音专享一个声道（ANNOUNCEMENT）
 * 2. 玩家共享其余声道（PLAYER_0 到 PLAYER_7）
 * 3. 每个声道内部排队（同一声道按顺序播放）
 * 4. 不同声道可以交叉播放（不同声道可以同时播放）
 * 5. 动态分配玩家声道（玩家可以共享声道）
 */

import { ChannelType } from '../types/channel';
import { VoiceConfig } from '../types/card';

/**
 * 声道用途类型
 */
export enum ChannelUsage {
  ANNOUNCEMENT = 'announcement',  // 报牌和系统声音（专享）
  SYSTEM = 'system',              // 系统声音（与报牌共享）
  PLAYER = 'player'               // 玩家聊天（共享）
}

/**
 * 声道分配请求
 */
export interface ChannelRequest {
  usage: ChannelUsage;
  playerId?: number;  // 玩家ID（仅用于PLAYER类型）
  priority: number;    // 优先级：4=报牌，3=对骂，2=事件，1=随机
}

/**
 * 声道分配结果
 */
export interface ChannelAllocation {
  channel: ChannelType;
  isQueued: boolean;  // 是否加入队列等待
}

/**
 * 声道状态
 */
interface ChannelState {
  isActive: boolean;      // 是否正在播放
  currentPlayerId?: number;  // 当前使用的玩家ID（仅用于PLAYER类型）
  queueLength: number;    // 队列长度
}

/**
 * 播放优先级
 */
export enum PlaybackPriority {
  ANNOUNCEMENT = 4,  // 报牌（最高）
  QUARREL = 3,      // 对骂
  EVENT = 2,        // 事件
  CHAT = 1          // 普通聊天（最低）
}

/**
 * 播放请求
 */
export interface PlayRequest {
  text: string;
  voiceConfig?: VoiceConfig;
  channel: ChannelType;
  priority: PlaybackPriority;
  type: 'announcement' | 'chat';
  playerId?: number;
  events?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
    estimatedDuration?: number;
  };
}

/**
 * 声道调度器
 */
export class ChannelScheduler {
  // 声道状态映射
  private channelStates: Map<ChannelType, ChannelState> = new Map();
  
  // 玩家到声道的映射（用于玩家声道分配）
  private playerChannelMap: Map<number, ChannelType> = new Map();
  
  // 可用的玩家声道池（PLAYER_0 到 PLAYER_7）
  private availablePlayerChannels: ChannelType[] = [
    ChannelType.PLAYER_0,
    ChannelType.PLAYER_1,
    ChannelType.PLAYER_2,
    ChannelType.PLAYER_3,
    ChannelType.PLAYER_4,
    ChannelType.PLAYER_5,
    ChannelType.PLAYER_6,
    ChannelType.PLAYER_7,
  ];
  
  // 最大并发玩家数（受 maxConcurrentSpeakers 限制）
  private maxConcurrentPlayers: number = 2;
  
  constructor() {
    // 初始化所有声道状态
    this.initializeChannels();
  }
  
  /**
   * 初始化声道状态
   */
  private initializeChannels(): void {
    // 初始化报牌声道
    this.channelStates.set(ChannelType.ANNOUNCEMENT, {
      isActive: false,
      queueLength: 0
    });
    
    // 初始化玩家声道
    this.availablePlayerChannels.forEach(channel => {
      this.channelStates.set(channel, {
        isActive: false,
        queueLength: 0
      });
    });
  }
  
  /**
   * 分配声道
   * 
   * @param request 声道请求
   * @returns 声道分配结果
   */
  allocateChannel(request: ChannelRequest): ChannelAllocation {
    if (request.usage === ChannelUsage.ANNOUNCEMENT || request.usage === ChannelUsage.SYSTEM) {
      // 报牌和系统声音使用专用声道
      return this.allocateAnnouncementChannel(request);
    } else if (request.usage === ChannelUsage.PLAYER) {
      // 玩家使用共享声道池
      return this.allocatePlayerChannel(request);
    }
    
    // 默认返回玩家0声道
    return {
      channel: ChannelType.PLAYER_0,
      isQueued: false
    };
  }
  
  /**
   * 分配报牌/系统声道
   */
  private allocateAnnouncementChannel(request: ChannelRequest): ChannelAllocation {
    const channel = ChannelType.ANNOUNCEMENT;
    const state = this.channelStates.get(channel)!;
    
    if (state.isActive) {
      // 报牌声道正在播放，加入队列
      state.queueLength++;      return {
        channel,
        isQueued: true
      };
    }
    
    // 报牌声道空闲，立即使用
    state.isActive = true;
    return {
      channel,
      isQueued: false
    };
  }
  
  /**
   * 分配玩家声道
   */
  private allocatePlayerChannel(request: ChannelRequest): ChannelAllocation {
    const playerId = request.playerId ?? 0;
    
    // 检查该玩家是否已经有分配的声道
    let assignedChannel = this.playerChannelMap.get(playerId);
    
    if (assignedChannel) {
      const state = this.channelStates.get(assignedChannel)!;
      if (state.isActive && state.currentPlayerId === playerId) {
        // 该玩家正在使用该声道，加入队列
        state.queueLength++;        return {
          channel: assignedChannel,
          isQueued: true
        };
      }
    }
    
    // 查找空闲的玩家声道
    const availableChannel = this.findAvailablePlayerChannel();
    
    if (availableChannel) {
      // 找到空闲声道，分配给该玩家
      const state = this.channelStates.get(availableChannel)!;
      state.isActive = true;
      state.currentPlayerId = playerId;
      this.playerChannelMap.set(playerId, availableChannel);      return {
        channel: availableChannel,
        isQueued: false
      };
    }
    
    // 所有玩家声道都在使用，加入队列（使用第一个可用声道的队列）
    // 注意：这里简化处理，实际应该为每个玩家维护独立的队列
    const firstChannel = this.availablePlayerChannels[0];
    const state = this.channelStates.get(firstChannel)!;
    state.queueLength++;    return {
      channel: firstChannel,  // 临时分配，实际会在播放时重新分配
      isQueued: true
    };
  }
  
  /**
   * 查找可用的玩家声道
   */
  private findAvailablePlayerChannel(): ChannelType | null {
    // 统计当前活跃的玩家声道数
    const activePlayerChannels = Array.from(this.channelStates.entries())
      .filter(([channel, state]) => 
        this.availablePlayerChannels.includes(channel) && state.isActive
      ).length;
    
    // 检查是否超过最大并发数
    if (activePlayerChannels >= this.maxConcurrentPlayers) {
      return null;
    }
    
    // 查找第一个空闲的玩家声道
    for (const channel of this.availablePlayerChannels) {
      const state = this.channelStates.get(channel)!;
      if (!state.isActive) {
        return channel;
      }
    }
    
    return null;
  }
  
  /**
   * 释放声道（播放完成时调用）
   */
  releaseChannel(channel: ChannelType, playerId?: number): void {
    const state = this.channelStates.get(channel);
    if (!state) {
      return;
    }
    
    state.isActive = false;
    
    if (channel === ChannelType.ANNOUNCEMENT) {
      // 报牌声道释放
      if (state.queueLength > 0) {
        state.queueLength--;
      }    } else if (this.availablePlayerChannels.includes(channel)) {
      // 玩家声道释放
      if (playerId !== undefined) {
        // 清除玩家映射（如果该玩家不再使用该声道）
        if (state.currentPlayerId === playerId) {
          state.currentPlayerId = undefined;
          this.playerChannelMap.delete(playerId);
        }
      }
      if (state.queueLength > 0) {
        state.queueLength--;
      }    }
  }
  
  /**
   * 检查声道是否正在播放
   */
  isChannelActive(channel: ChannelType): boolean {
    const state = this.channelStates.get(channel);
    return state?.isActive ?? false;
  }
  
  /**
   * 获取声道队列长度
   */
  getChannelQueueLength(channel: ChannelType): number {
    const state = this.channelStates.get(channel);
    return state?.queueLength ?? 0;
  }
  
  /**
   * 设置最大并发玩家数
   */
  setMaxConcurrentPlayers(max: number): void {
    this.maxConcurrentPlayers = max;
  }
  
  /**
   * 获取声道名称（用于日志）
   */
  private getChannelName(channel: ChannelType): string {
    const names: Record<ChannelType, string> = {
      [ChannelType.PLAYER_0]: '玩家0（左）',
      [ChannelType.PLAYER_1]: '玩家1（右）',
      [ChannelType.PLAYER_2]: '玩家2（左中）',
      [ChannelType.PLAYER_3]: '玩家3（右中）',
      [ChannelType.PLAYER_4]: '玩家4（左环绕）',
      [ChannelType.PLAYER_5]: '玩家5（右环绕）',
      [ChannelType.PLAYER_6]: '玩家6（左后）',
      [ChannelType.PLAYER_7]: '玩家7（右后）',
      [ChannelType.ANNOUNCEMENT]: '报牌（中央）'
    };
    return names[channel] || `声道${channel}`;
  }
  
  /**
   * 获取所有声道状态（用于调试）
   */
  getAllChannelStates(): Record<ChannelType, ChannelState> {
    const states: Record<number, ChannelState> = {};
    this.channelStates.forEach((state, channel) => {
      states[channel] = { ...state };
    });
    return states as Record<ChannelType, ChannelState>;
  }
  
  /**
   * 获取玩家分配的声道
   */
  getPlayerChannel(playerId: number): ChannelType {
    const assignedChannel = this.playerChannelMap.get(playerId);
    if (assignedChannel) {
      return assignedChannel;
    }
    // 如果没有分配，使用取模运算分配一个默认声道（支持超过8个玩家）
    const channelIndex = playerId % 8;
    return channelIndex as ChannelType;
  }
  
  /**
   * 请求播放（兼容接口）
   * 注意：这个方法需要调用实际的TTS服务，这里只是占位实现
   * 实际应该由 multiChannelVoiceService 来处理播放逻辑
   */
  async requestPlay(request: PlayRequest): Promise<void> {
    // 分配声道
    const allocation = this.allocateChannel({
      usage: request.type === 'announcement' ? ChannelUsage.ANNOUNCEMENT : ChannelUsage.PLAYER,
      playerId: request.playerId,
      priority: request.priority
    });
    
    // 更新请求的声道
    request.channel = allocation.channel;
    
    // 注意：实际的播放逻辑应该在 multiChannelVoiceService 中实现
    // 这里只是调度器，不负责实际播放    
    // 如果被加入队列，等待播放完成
    if (allocation.isQueued) {
      // 等待当前播放完成
      await this.waitForChannelAvailable(allocation.channel);
    }
    
    // 标记声道为活跃
    const state = this.channelStates.get(allocation.channel);
    if (state) {
      state.isActive = true;
      if (request.playerId !== undefined) {
        state.currentPlayerId = request.playerId;
      }
    }
    
    // 调用事件回调
    if (request.events?.onStart) {
      request.events.onStart();
    }
    
    // 注意：实际的播放应该在这里调用 TTS 服务
    // 这里只是占位，实际实现应该在 multiChannelVoiceService 中
  }
  
  /**
   * 等待声道可用
   */
  private async waitForChannelAvailable(channel: ChannelType, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    while (this.isChannelActive(channel)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`等待声道 ${channel} 可用超时`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// 单例实例
let channelSchedulerInstance: ChannelScheduler | null = null;

/**
 * 获取声道调度器实例
 */
export function getChannelScheduler(): ChannelScheduler {
  if (!channelSchedulerInstance) {
    channelSchedulerInstance = new ChannelScheduler();
  }
  return channelSchedulerInstance;
}

/**
 * 便捷函数：为报牌分配声道
 */
export function allocateAnnouncementChannel(priority: number = 4): ChannelAllocation {
  const scheduler = getChannelScheduler();
  return scheduler.allocateChannel({
    usage: ChannelUsage.ANNOUNCEMENT,
    priority
  });
}

/**
 * 便捷函数：为玩家分配声道
 */
export function allocatePlayerChannel(playerId: number, priority: number = 1): ChannelAllocation {
  const scheduler = getChannelScheduler();
  return scheduler.allocateChannel({
    usage: ChannelUsage.PLAYER,
    playerId,
    priority
  });
}

/**
 * 便捷函数：为系统声音分配声道
 */
export function allocateSystemChannel(priority: number = 4): ChannelAllocation {
  const scheduler = getChannelScheduler();
  return scheduler.allocateChannel({
    usage: ChannelUsage.SYSTEM,
    priority
  });
}

