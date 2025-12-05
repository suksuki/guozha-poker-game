/**
 * 音效系统类型定义
 */

export interface SoundConfig {
  volume: number;              // 全局音量 (0-1)
  enabled: boolean;            // 是否启用音效
  preload: boolean;            // 是否预加载
}

export type SoundType = 
  | 'play-small'      // 小牌出牌
  | 'play-medium'     // 中等牌出牌
  | 'play-large'      // 大牌出牌
  | 'play-huge'       // 炸弹/王炸
  | 'pass'            // Pass
  | 'game-start'      // 游戏开始
  | 'game-end'        // 游戏结束
  | 'win'             // 胜利
  | 'explosion';      // 爆炸特效

export interface SoundEvent {
  type: 'sound:play' | 'sound:loaded' | 'sound:error';
  soundType?: SoundType;
  error?: Error;
}

