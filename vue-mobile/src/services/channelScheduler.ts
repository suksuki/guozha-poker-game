/**
 * 声道调度器
 * 
 * 职责：
 * 1. 系统声音（报牌等）独占一个声道（ANNOUNCEMENT）
 * 2. 玩家聊天共享其余声道（PLAYER_0 到 PLAYER_7），动态分配
 * 3. 支持优先级：系统(4) > 对骂(3) > 事件(2) > 随机(1)
 * 4. 每个声道内部排队（同一声道按顺序播放）
 * 5. 不同声道可以同时播放（真正的多声道）
 */

import { ChannelType } from '../types/channel';

/**
 * 声道用途类型
 */
export enum ChannelUsage {
  SYSTEM = 'system',      // 系统声音（报牌等，独占ANNOUNCEMENT）
  PLAYER = 'player'       // 玩家聊天（共享PLAYER_0-PLAYER_7）
}

/**
 * 声道分配请求
 */
export interface ChannelRequest {
  usage: ChannelUsage;
  playerId?: number;  // 玩家ID（仅用于PLAYER类型）
  priority: number;    // 优先级：4=系统，3=对骂，2=事件，1=随机
}

/**
 * 声道分配结果
 */
export interface ChannelAllocation {
  channel: ChannelType;
  isQueued: boolean;  // 是否加入队列等待
  queuePosition?: number;  // 队列位置（如果被加入队列）
}

/**
 * 声道状态
 */
interface ChannelState {
  isActive: boolean;      // 是否正在播放
  currentPlayerId?: number;  // 当前使用的玩家ID（仅用于PLAYER类型）
  queueLength: number;    // 队列长度
  priority: number;       // 当前播放的优先级
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
  
  // 最大并发玩家数（默认3个，可配置）
  private maxConcurrentPlayers: number = 3;
  
  // 当前活跃的玩家数（用于统计）
  private activePlayerCount: number = 0;
  
  constructor(maxConcurrentPlayers: number = 3) {
    this.maxConcurrentPlayers = maxConcurrentPlayers;
    this.initializeChannels();
  }
  
  /**
   * 初始化所有声道状态
   */
  private initializeChannels(): void {
    // 初始化系统声道（ANNOUNCEMENT）
    this.channelStates.set(ChannelType.ANNOUNCEMENT, {
      isActive: false,
      queueLength: 0,
      priority: 0
    });
    
    // 初始化所有玩家声道
    this.availablePlayerChannels.forEach(channel => {
      this.channelStates.set(channel, {
        isActive: false,
        queueLength: 0,
        priority: 0
      });
    });
  }
  
  /**
   * 分配声道
   */
  allocateChannel(request: ChannelRequest): ChannelAllocation {
    if (request.usage === ChannelUsage.SYSTEM) {
      return this.allocateSystemChannel(request);
    } else {
      return this.allocatePlayerChannel(request);
    }
  }
  
  /**
   * 分配系统声道（ANNOUNCEMENT）
   */
  private allocateSystemChannel(request: ChannelRequest): ChannelAllocation {
    const channel = ChannelType.ANNOUNCEMENT;
    const state = this.channelStates.get(channel)!;
    
    // 系统声道优先级最高，可以中断当前播放
    if (state.isActive && request.priority >= state.priority) {
      // 如果新请求优先级更高或相等，可以中断
      // 这里简化处理，系统声道通常优先级最高，直接分配
      return {
        channel,
        isQueued: false
      };
    }
    
    // 如果正在播放且优先级不够，加入队列
    if (state.isActive) {
      state.queueLength++;
      return {
        channel,
        isQueued: true,
        queuePosition: state.queueLength
      };
    }
    
    // 声道空闲，直接分配
    state.isActive = true;
    state.priority = request.priority;
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
        state.queueLength++;
        return {
          channel: assignedChannel,
          isQueued: true,
          queuePosition: state.queueLength
        };
      }
      // 如果通道已分配但不活跃，清除映射（可能已被释放）
      if (!state.isActive) {
        this.playerChannelMap.delete(playerId);
        assignedChannel = undefined;
      }
    }
    
    // 查找空闲的玩家声道
    const availableChannel = this.findAvailablePlayerChannel();
    
    if (availableChannel !== null) {
      // 找到空闲声道，分配给该玩家
      const state = this.channelStates.get(availableChannel)!;
      state.isActive = true;
      state.currentPlayerId = playerId;
      state.priority = request.priority;
      this.playerChannelMap.set(playerId, availableChannel);
      this.activePlayerCount++; // 增加活跃玩家计数
      return {
        channel: availableChannel,
        isQueued: false
      };
    }
    
    // 所有玩家声道都在使用，加入队列（使用第一个可用声道的队列）
    const firstChannel = this.availablePlayerChannels[0];
    const state = this.channelStates.get(firstChannel)!;
    state.queueLength++;
    return {
      channel: firstChannel,  // 临时分配，实际会在播放时重新分配
      isQueued: true,
      queuePosition: state.queueLength
    };
  }
  
  /**
   * 查找可用的玩家声道
   */
  private findAvailablePlayerChannel(): ChannelType | null {
    // 如果已达到最大并发数，返回null（需要排队）
    if (this.activePlayerCount >= this.maxConcurrentPlayers) {
      return null;
    }
    
    // 查找空闲声道
    for (const channel of this.availablePlayerChannels) {
      const state = this.channelStates.get(channel)!;
      if (!state.isActive) {
        return channel;
      }
    }
    
    // 所有声道都被占用，返回null（需要排队）
    return null;
  }
  
  /**
   * 释放声道
   */
  releaseChannel(channel: ChannelType, playerId?: number): void {
    const state = this.channelStates.get(channel);
    if (!state) return;
    
    const wasActive = state.isActive;
    state.isActive = false;
    state.priority = 0;
    
    // 如果是玩家声道，清除玩家映射并减少活跃计数
    if (playerId !== undefined && this.availablePlayerChannels.includes(channel)) {
      if (this.playerChannelMap.get(playerId) === channel) {
        this.playerChannelMap.delete(playerId);
      }
      state.currentPlayerId = undefined;
      if (wasActive) {
        this.activePlayerCount = Math.max(0, this.activePlayerCount - 1);
      }
    }
    
    // 如果队列中有等待的，减少队列长度
    if (state.queueLength > 0) {
      state.queueLength--;
    }
  }
  
  /**
   * 更新最大并发数
   */
  setMaxConcurrentPlayers(max: number): void {
    // 限制在1-8之间（8个玩家声道）
    this.maxConcurrentPlayers = Math.max(1, Math.min(max, 8));
    console.log(`[ChannelScheduler] 更新最大并发玩家数: ${this.maxConcurrentPlayers}`);
  }
  
  /**
   * 获取声道状态
   */
  getChannelState(channel: ChannelType): ChannelState | undefined {
    return this.channelStates.get(channel);
  }
  
  /**
   * 获取所有声道状态
   */
  getAllChannelStates(): Map<ChannelType, ChannelState> {
    return new Map(this.channelStates);
  }
  
  /**
   * 获取统计信息
   */
  getStatistics() {
    const states = Array.from(this.channelStates.values());
    return {
      totalChannels: this.channelStates.size,
      activeChannels: states.filter(s => s.isActive).length,
      totalQueueLength: states.reduce((sum, s) => sum + s.queueLength, 0),
      maxConcurrentPlayers: this.maxConcurrentPlayers,
      activePlayerChannels: states.filter(s => 
        s.isActive && this.availablePlayerChannels.some(ch => 
          this.channelStates.get(ch) === s
        )
      ).length
    };
  }
}

// 单例实例
let channelSchedulerInstance: ChannelScheduler | null = null;

/**
 * 获取声道调度器单例
 */
export function getChannelScheduler(maxConcurrentPlayers?: number): ChannelScheduler {
  if (!channelSchedulerInstance) {
    channelSchedulerInstance = new ChannelScheduler(maxConcurrentPlayers);
  } else if (maxConcurrentPlayers !== undefined) {
    channelSchedulerInstance.setMaxConcurrentPlayers(maxConcurrentPlayers);
  }
  return channelSchedulerInstance;
}

