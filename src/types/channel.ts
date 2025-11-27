/**
 * 声道类型定义
 * 用于多声道语音播放系统
 * 支持最多8个玩家 + 1个报牌声道
 */

export enum ChannelType {
  PLAYER_0 = 0,  // 玩家0：左声道
  PLAYER_1 = 1,  // 玩家1：右声道
  PLAYER_2 = 2,  // 玩家2：左中
  PLAYER_3 = 3,  // 玩家3：右中
  PLAYER_4 = 4,  // 玩家4：左环绕
  PLAYER_5 = 5,  // 玩家5：右环绕
  PLAYER_6 = 6,  // 玩家6：左后
  PLAYER_7 = 7,  // 玩家7：右后
  ANNOUNCEMENT = 8  // 报牌：中央声道
}

