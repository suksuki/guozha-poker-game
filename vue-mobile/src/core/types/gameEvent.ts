/**
 * 游戏事件类型定义
 * 统一管理所有游戏事件
 */

/**
 * 游戏事件类型
 */
export enum GameEventType {
  // 系统信息
  ANNOUNCE_PLAY = 'announce_play',      // 报牌
  ANNOUNCE_PASS = 'announce_pass',      // 要不起
  
  // 动画事件
  DUN_EXPLOSION = 'dun_explosion',      // 出墩爆炸
  BOMB_EXPLOSION = 'bomb_explosion',    // 炸弹爆炸
  SCORE_CHANGE = 'score_change',        // 分数变化
  
  // 视觉特效
  SCREEN_SHAKE = 'screen_shake',        // 屏幕震动
  FLASH = 'flash',                      // 闪光
}

/**
 * 动画强度级别
 */
export type AnimationIntensity = 'small' | 'medium' | 'large' | 'huge';

/**
 * 游戏事件数据
 */
export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  priority: number;  // 优先级（数字越大优先级越高）
  data: any;         // 事件数据
  position?: { x: number; y: number }; // 动画位置（屏幕坐标）
  duration?: number; // 持续时间（毫秒）
}

/**
 * 出墩爆炸事件数据
 */
export interface DunExplosionEventData {
  playerId: number;
  playerName: string;
  dunSize: number;  // 墩的大小（张数）
  intensity: AnimationIntensity;
  position: { x: number; y: number };
}

/**
 * 炸弹爆炸事件数据
 */
export interface BombExplosionEventData {
  playerId: number;
  playerName: string;
  bombType: string;
  position: { x: number; y: number };
}

/**
 * 报牌事件数据
 */
export interface AnnouncePlayEventData {
  play: any;  // Play 类型
  playerId: number;
  voiceConfig?: any;
}

/**
 * 事件订阅回调函数
 */
export type GameEventCallback = (event: GameEvent) => void | Promise<void>;

