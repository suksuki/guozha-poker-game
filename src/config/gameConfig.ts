/**
 * 游戏配置文件
 * 管理游戏相关的配置项
 */

/**
 * 游戏配置
 */
export interface GameConfig {
  // 播报等待时间（毫秒）
  announcementDelay: number; // 报牌后等待时间，默认1000ms
}

/**
 * 默认游戏配置
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  announcementDelay: 1000 // 1秒
};

/**
 * 获取游戏配置
 */
export function getGameConfig(): GameConfig {
  return { ...DEFAULT_GAME_CONFIG };
}

/**
 * 更新游戏配置
 */
export function updateGameConfig(config: Partial<GameConfig>): GameConfig {
  return { ...DEFAULT_GAME_CONFIG, ...config };
}

