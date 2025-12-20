/**
 * 动画服务
 * 管理游戏中的动画效果
 */

import { GameEventType, DunExplosionEventData, BombExplosionEventData } from '../types/gameEvent';
import { gameEventService } from './gameEventService';
import { soundService } from './soundService';
import { getDunAnimationConfig, BOMB_ANIMATION_CONFIG } from '../config/animationConfig';

/**
 * 动画服务类
 */
class AnimationService {
  /**
   * 触发出墩爆炸动画
   * @param data 出墩爆炸事件数据
   */
  triggerDunExplosion(data: DunExplosionEventData): void {
    // 发布事件
    gameEventService.emit({
      type: GameEventType.DUN_EXPLOSION,
      timestamp: Date.now(),
      priority: 5, // 中等优先级
      data,
      position: data.position,
      duration: getDunAnimationConfig(data.dunSize).duration
    });

    // 播放音效
    soundService.playDunSound(data.intensity);
  }

  /**
   * 触发炸弹爆炸动画
   * @param data 炸弹爆炸事件数据
   */
  triggerBombExplosion(data: BombExplosionEventData): void {
    // 发布事件
    gameEventService.emit({
      type: GameEventType.BOMB_EXPLOSION,
      timestamp: Date.now(),
      priority: 6, // 较高优先级
      data,
      position: data.position,
      duration: BOMB_ANIMATION_CONFIG.duration
    });

    // 播放音效
    soundService.playBombSound();
  }

  /**
   * 触发屏幕震动
   * @param intensity 震动强度
   */
  triggerScreenShake(intensity: 'small' | 'medium' | 'large' | 'huge'): void {
    gameEventService.emit({
      type: GameEventType.SCREEN_SHAKE,
      timestamp: Date.now(),
      priority: 3, // 低优先级
      data: { intensity },
      duration: 500
    });
  }

  /**
   * 触发闪光效果
   * @param color 闪光颜色
   * @param duration 持续时间
   */
  triggerFlash(color: string = '#FFFFFF', duration: number = 200): void {
    gameEventService.emit({
      type: GameEventType.FLASH,
      timestamp: Date.now(),
      priority: 2, // 低优先级
      data: { color },
      duration
    });
  }
}

// 创建全局动画服务实例
export const animationService = new AnimationService();

