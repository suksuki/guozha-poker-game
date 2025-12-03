/**
 * 游戏配置文件
 * 管理游戏相关的配置项
 */

import { PlayTimingConfig } from '../utils/Round';

/**
 * 游戏配置
 */
export interface GameConfig {
  // 播报等待时间（毫秒）
  announcementDelay: number; // 报牌后等待时间，默认1000ms
  // 出牌时间控制配置（可选）
  timingConfig?: Partial<PlayTimingConfig>;
  // 计分器开关（可选）
  cardTrackerEnabled?: boolean;
}

/**
 * 默认游戏配置
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  announcementDelay: 0, // 【优化】托管模式无延迟，改为0
  timingConfig: {
    minIntervalBetweenPlays: 50,   // 【优化】最短间隔从100ms减少到50ms
    playTimeout: 30000,              // 超时30秒
    enabled: true
  }
};

/**
 * 获取游戏配置
 * 从 localStorage 读取用户设置
 */
export function getGameConfig(): GameConfig {
  // 从 localStorage 读取超时时间（默认30秒）
  const savedTimeout = localStorage.getItem('playTimeout');
  const playTimeout = savedTimeout !== null ? parseInt(savedTimeout, 10) : 30000;

  // 从 localStorage 读取报牌后延迟时间（默认1000毫秒）
  const savedAnnouncementDelay = localStorage.getItem('announcementDelay');
  const announcementDelay = savedAnnouncementDelay !== null ? parseInt(savedAnnouncementDelay, 10) : DEFAULT_GAME_CONFIG.announcementDelay;

  return {
    ...DEFAULT_GAME_CONFIG,
    announcementDelay,
    timingConfig: {
      ...DEFAULT_GAME_CONFIG.timingConfig!,
      playTimeout
    }
  };
}

/**
 * 更新游戏配置
 */
export function updateGameConfig(config: Partial<GameConfig>): GameConfig {
  return { ...DEFAULT_GAME_CONFIG, ...config };
}

