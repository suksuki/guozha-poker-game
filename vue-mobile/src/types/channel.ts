/**
 * 声道类型定义
 * 用于多声道语音播放系统
 * 
 * 架构：
 * - SYSTEM = 0: 专用系统声道（报牌、系统提示等），永远不与其他声道冲突
 * - PLAYER_1 到 PLAYER_7: 7条共享玩家声道，用于玩家聊天，智能调度分配
 */

export enum ChannelType {
  SYSTEM = 0,      // 系统声道（专用）：报牌、系统提示等，独占，永不冲突
  PLAYER_1 = 1,    // 玩家声道1：共享，智能分配
  PLAYER_2 = 2,    // 玩家声道2：共享，智能分配
  PLAYER_3 = 3,    // 玩家声道3：共享，智能分配
  PLAYER_4 = 4,    // 玩家声道4：共享，智能分配
  PLAYER_5 = 5,    // 玩家声道5：共享，智能分配
  PLAYER_6 = 6,    // 玩家声道6：共享，智能分配
  PLAYER_7 = 7     // 玩家声道7：共享，智能分配
}

// 兼容性：保留旧的ANNOUNCEMENT枚举值，映射到SYSTEM
export const ANNOUNCEMENT = ChannelType.SYSTEM;

