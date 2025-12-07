/**
 * 智能声道调度器
 * 
 * 职责：
 * 1. 系统声道（SYSTEM = 0）专用，永远不与其他声道冲突
 * 2. 玩家声道（PLAYER_1 到 PLAYER_7）共享，智能分配和调度
 * 3. 根据玩家数量、当前负载、优先级等智能平衡分配
 * 4. 支持优先级：系统(4) > 对骂(3) > 事件(2) > 随机(1)
 * 5. 每个声道内部排队（同一声道按顺序播放）
 * 6. 不同声道可以同时播放（真正的多声道）
 */

import { ChannelType } from '../../types/channel';

/**
 * 声道用途类型
 */
export enum ChannelUsage {
  SYSTEM = 'system',      // 系统声音（报牌等，独占SYSTEM声道）
  PLAYER = 'player'       // 玩家聊天（共享PLAYER_1-PLAYER_7）
}

/**
 * 声道分配请求
 */
export interface ChannelRequest {
  usage: ChannelUsage;
  playerId?: number;  // 玩家ID（仅用于PLAYER类型）
  priority: number;    // 优先级：4=系统，3=对骂，2=事件，1=随机
  totalPlayers?: number;  // 总玩家数（用于智能调度）
}

/**
 * 声道分配结果
 */
export interface ChannelAllocation {
  channel: ChannelType;
  isQueued: boolean;  // 是否加入队列等待
  queuePosition?: number;  // 队列位置（如果被加入队列）
  reason?: string;  // 分配原因（用于调试）
}

/**
 * 声道状态
 */
interface ChannelState {
  isActive: boolean;      // 是否正在播放
  currentPlayerId?: number;  // 当前使用的玩家ID（仅用于PLAYER类型）
  queueLength: number;    // 队列长度
  priority: number;       // 当前播放的优先级
  lastUsedTime: number;   // 最后使用时间（用于负载均衡）
  usageCount: number;      // 使用次数（用于负载均衡）
}

/**
 * 智能声道调度器
 */
export class SmartChannelScheduler {
  // 声道状态映射
  private channelStates: Map<ChannelType, ChannelState> = new Map();
  
  // 玩家到声道的映射（用于玩家声道分配）
  private playerChannelMap: Map<number, ChannelType> = new Map();
  
  // 系统声道（专用，永不冲突）
  private readonly SYSTEM_CHANNEL = ChannelType.SYSTEM;
  
  // 可用的玩家声道池（PLAYER_1 到 PLAYER_7，共7条）
  private readonly availablePlayerChannels: ChannelType[] = [
    ChannelType.PLAYER_1,
    ChannelType.PLAYER_2,
    ChannelType.PLAYER_3,
    ChannelType.PLAYER_4,
    ChannelType.PLAYER_5,
    ChannelType.PLAYER_6,
    ChannelType.PLAYER_7,
  ];
  
  // 最大并发玩家数（默认根据玩家数量智能计算）
  private maxConcurrentPlayers: number = 3;
  
  // 当前活跃的玩家数（用于统计）
  private activePlayerCount: number = 0;
  
  // 总玩家数（用于智能调度）
  private totalPlayers: number = 4;
  
  constructor(maxConcurrentPlayers?: number, totalPlayers: number = 4) {
    this.totalPlayers = totalPlayers;
    this.maxConcurrentPlayers = maxConcurrentPlayers ?? this.calculateOptimalConcurrency(totalPlayers);
    this.initializeChannels();
  }
  
  /**
   * 根据玩家数量计算最优并发数
   */
  private calculateOptimalConcurrency(totalPlayers: number): number {
    // 智能计算：根据玩家数量动态调整
    // 2-3人：2个并发
    // 4-5人：3个并发
    // 6-7人：4个并发
    // 8人：5个并发
    if (totalPlayers <= 3) return 2;
    if (totalPlayers <= 5) return 3;
    if (totalPlayers <= 7) return 4;
    return 5; // 最多5个并发，保留2个声道作为缓冲
  }
  
  /**
   * 初始化所有声道状态
   */
  private initializeChannels(): void {
    // 初始化系统声道（SYSTEM，专用）
    this.channelStates.set(this.SYSTEM_CHANNEL, {
      isActive: false,
      queueLength: 0,
      priority: 0,
      lastUsedTime: 0,
      usageCount: 0
    });
    
    // 初始化所有玩家声道
    this.availablePlayerChannels.forEach(channel => {
      this.channelStates.set(channel, {
        isActive: false,
        queueLength: 0,
        priority: 0,
        lastUsedTime: 0,
        usageCount: 0
      });
    });
  }
  
  /**
   * 分配声道（主入口）
   */
  allocateChannel(request: ChannelRequest): ChannelAllocation {
    // 更新总玩家数（如果提供）
    if (request.totalPlayers !== undefined) {
      this.updateTotalPlayers(request.totalPlayers);
    }
    
    if (request.usage === ChannelUsage.SYSTEM) {
      return this.allocateSystemChannel(request);
    } else {
      return this.allocatePlayerChannel(request);
    }
  }
  
  /**
   * 分配系统声道（SYSTEM，专用，永不冲突）
   */
  private allocateSystemChannel(request: ChannelRequest): ChannelAllocation {
    const channel = this.SYSTEM_CHANNEL;
    const state = this.channelStates.get(channel)!;
    
    // 系统声道优先级最高，可以中断当前播放
    if (state.isActive && request.priority >= state.priority) {
      // 如果新请求优先级更高或相等，可以中断
      console.log(`[SmartChannelScheduler] 系统声道正在播放，但新请求优先级足够，直接分配`);
      return {
        channel,
        isQueued: false,
        reason: '系统声道优先级足够，直接分配'
      };
    }
    
    // 如果正在播放且优先级不够，加入队列
    if (state.isActive) {
      state.queueLength++;
      console.log(`[SmartChannelScheduler] 系统声道正在播放，新请求加入队列，位置=${state.queueLength}`);
      return {
        channel,
        isQueued: true,
        queuePosition: state.queueLength,
        reason: '系统声道正在播放，加入队列'
      };
    }
    
    // 声道空闲，直接分配
    state.isActive = true;
    state.priority = request.priority;
    state.lastUsedTime = Date.now();
    state.usageCount++;
    console.log(`[SmartChannelScheduler] 系统声道空闲，直接分配`);
    return {
      channel,
      isQueued: false,
      reason: '系统声道空闲，直接分配'
    };
  }
  
  /**
   * 分配玩家声道（智能调度）
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
        console.log(`[SmartChannelScheduler] 玩家${playerId}的声道${assignedChannel}正在使用，加入队列，位置=${state.queueLength}`);
        return {
          channel: assignedChannel,
          isQueued: true,
          queuePosition: state.queueLength,
          reason: `玩家${playerId}的声道正在使用，加入队列`
        };
      }
      // 如果通道已分配但不活跃，清除映射（可能已被释放）
      if (!state.isActive) {
        this.playerChannelMap.delete(playerId);
        assignedChannel = undefined;
      }
    }
    
    // 智能查找最佳可用声道
    const availableChannel = this.findBestAvailablePlayerChannel(playerId);
    
    if (availableChannel !== null) {
      // 找到空闲声道，分配给该玩家
      const state = this.channelStates.get(availableChannel)!;
      state.isActive = true;
      state.currentPlayerId = playerId;
      state.priority = request.priority;
      state.lastUsedTime = Date.now();
      state.usageCount++;
      this.playerChannelMap.set(playerId, availableChannel);
      this.activePlayerCount++;
      console.log(`[SmartChannelScheduler] 为玩家${playerId}智能分配声道${availableChannel}，当前活跃玩家数=${this.activePlayerCount}/${this.maxConcurrentPlayers}`);
      return {
        channel: availableChannel,
        isQueued: false,
        reason: `智能分配声道${availableChannel}给玩家${playerId}`
      };
    }
    
    // 所有玩家声道都在使用，智能选择最佳队列
    const bestQueueChannel = this.findBestQueueChannel();
    const state = this.channelStates.get(bestQueueChannel)!;
    state.queueLength++;
    console.log(`[SmartChannelScheduler] 所有玩家声道都在使用，玩家${playerId}加入声道${bestQueueChannel}的队列，位置=${state.queueLength}`);
    return {
      channel: bestQueueChannel,
      isQueued: true,
      queuePosition: state.queueLength,
      reason: `所有声道都在使用，加入声道${bestQueueChannel}的队列`
    };
  }
  
  /**
   * 智能查找最佳可用玩家声道
   * 考虑因素：负载均衡、玩家分布、使用频率
   */
  private findBestAvailablePlayerChannel(playerId: number): ChannelType | null {
    // 如果已达到最大并发数，返回null（需要排队）
    if (this.activePlayerCount >= this.maxConcurrentPlayers) {
      return null;
    }
    
    // 查找空闲声道
    const idleChannels: ChannelType[] = [];
    for (const channel of this.availablePlayerChannels) {
      const state = this.channelStates.get(channel)!;
      if (!state.isActive) {
        idleChannels.push(channel);
      }
    }
    
    if (idleChannels.length === 0) {
      return null;
    }
    
    // 智能选择：优先选择使用次数最少的声道（负载均衡）
    let bestChannel = idleChannels[0];
    let minUsageCount = this.channelStates.get(bestChannel)!.usageCount;
    
    for (const channel of idleChannels) {
      const state = this.channelStates.get(channel)!;
      if (state.usageCount < minUsageCount) {
        minUsageCount = state.usageCount;
        bestChannel = channel;
      }
    }
    
    return bestChannel;
  }
  
  /**
   * 智能查找最佳队列声道
   * 选择队列最短的声道
   */
  private findBestQueueChannel(): ChannelType {
    let bestChannel = this.availablePlayerChannels[0];
    let minQueueLength = this.channelStates.get(bestChannel)!.queueLength;
    
    for (const channel of this.availablePlayerChannels) {
      const state = this.channelStates.get(channel)!;
      if (state.queueLength < minQueueLength) {
        minQueueLength = state.queueLength;
        bestChannel = channel;
      }
    }
    
    return bestChannel;
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
    
    // 注意：队列长度的减少应该在从队列中取出项目时进行
    // 这里不自动减少，因为实际的队列在MultiChannelAudioService中管理
    // 当processNextInQueue从队列中取出项目时，会再次调用releaseChannel来减少队列长度
  }
  
  /**
   * 更新总玩家数（用于智能调度）
   */
  updateTotalPlayers(totalPlayers: number): void {
    this.totalPlayers = totalPlayers;
    const newMaxConcurrent = this.calculateOptimalConcurrency(totalPlayers);
    if (newMaxConcurrent !== this.maxConcurrentPlayers) {
      this.setMaxConcurrentPlayers(newMaxConcurrent);
    }
  }
  
  /**
   * 更新最大并发数
   */
  setMaxConcurrentPlayers(max: number): void {
    // 限制在1-7之间（7个玩家声道）
    this.maxConcurrentPlayers = Math.max(1, Math.min(max, 7));
    console.log(`[SmartChannelScheduler] 更新最大并发玩家数: ${this.maxConcurrentPlayers} (总玩家数: ${this.totalPlayers})`);
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
    const playerStates = this.availablePlayerChannels.map(ch => this.channelStates.get(ch)!);
    
    return {
      totalChannels: this.channelStates.size,
      systemChannel: {
        channel: this.SYSTEM_CHANNEL,
        isActive: this.channelStates.get(this.SYSTEM_CHANNEL)!.isActive,
        queueLength: this.channelStates.get(this.SYSTEM_CHANNEL)!.queueLength
      },
      playerChannels: {
        total: this.availablePlayerChannels.length,
        active: playerStates.filter(s => s.isActive).length,
        maxConcurrent: this.maxConcurrentPlayers,
        currentActive: this.activePlayerCount,
        totalQueueLength: playerStates.reduce((sum, s) => sum + s.queueLength, 0)
      },
      totalPlayers: this.totalPlayers,
      loadBalance: {
        avgUsageCount: playerStates.reduce((sum, s) => sum + s.usageCount, 0) / playerStates.length,
        minUsageCount: Math.min(...playerStates.map(s => s.usageCount)),
        maxUsageCount: Math.max(...playerStates.map(s => s.usageCount))
      }
    };
  }
}

// 单例实例
let smartChannelSchedulerInstance: SmartChannelScheduler | null = null;

/**
 * 获取智能声道调度器单例
 */
export function getSmartChannelScheduler(
  maxConcurrentPlayers?: number,
  totalPlayers?: number
): SmartChannelScheduler {
  if (!smartChannelSchedulerInstance) {
    smartChannelSchedulerInstance = new SmartChannelScheduler(
      maxConcurrentPlayers,
      totalPlayers ?? 4
    );
  } else {
    if (maxConcurrentPlayers !== undefined) {
      smartChannelSchedulerInstance.setMaxConcurrentPlayers(maxConcurrentPlayers);
    }
    if (totalPlayers !== undefined) {
      smartChannelSchedulerInstance.updateTotalPlayers(totalPlayers);
    }
  }
  return smartChannelSchedulerInstance;
}

