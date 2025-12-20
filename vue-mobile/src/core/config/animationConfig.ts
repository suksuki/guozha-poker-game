/**
 * 动画配置文件
 * 管理所有动画相关的配置
 */

import { AnimationIntensity } from '../types/gameEvent';

/**
 * 出墩动画配置
 */
export interface DunAnimationConfig {
  intensity: AnimationIntensity;
  particleCount: number;      // 粒子数量
  explosionRadius: number;    // 爆炸半径（像素）
  duration: number;           // 动画持续时间（毫秒）
  scale: number;              // 缩放倍数
  particleSpeed: number;       // 粒子速度
  particleLifetime: number;   // 粒子生命周期（毫秒）
  colors: string[];           // 粒子颜色
}

/**
 * 根据墩的大小获取动画配置
 */
export function getDunAnimationConfig(dunSize: number): DunAnimationConfig {
  if (dunSize <= 5) {
    return {
      intensity: 'small',
      particleCount: 20,
      explosionRadius: 100,
      duration: 500,
      scale: 1.2,
      particleSpeed: 2,
      particleLifetime: 800,
      colors: ['#FFD700', '#FFA500', '#FF6347'] // 金色、橙色、番茄红
    };
  } else if (dunSize <= 8) {
    return {
      intensity: 'medium',
      particleCount: 50,
      explosionRadius: 150,
      duration: 700,
      scale: 1.5,
      particleSpeed: 3,
      particleLifetime: 1000,
      colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493'] // 增加粉红色
    };
  } else if (dunSize <= 12) {
    return {
      intensity: 'large',
      particleCount: 100,
      explosionRadius: 200,
      duration: 900,
      scale: 2.0,
      particleSpeed: 4,
      particleLifetime: 1200,
      colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1'] // 增加青色
    };
  } else {
    return {
      intensity: 'huge',
      particleCount: 200,
      explosionRadius: 300,
      duration: 1200,
      scale: 2.5,
      particleSpeed: 5,
      particleLifetime: 1500,
      colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#00CED1', '#9400D3'] // 增加紫色
    };
  }
}

/**
 * 炸弹动画配置
 */
export interface BombAnimationConfig {
  particleCount: number;
  explosionRadius: number;
  duration: number;
  scale: number;
  colors: string[];
}

export const BOMB_ANIMATION_CONFIG: BombAnimationConfig = {
  particleCount: 150,
  explosionRadius: 250,
  duration: 1000,
  scale: 2.2,
  colors: ['#FF0000', '#FF4500', '#FFD700', '#FFFFFF'] // 红色、橙红色、金色、白色
};

/**
 * 屏幕震动配置
 */
export interface ScreenShakeConfig {
  intensity: number;  // 震动强度（像素）
  duration: number;   // 持续时间（毫秒）
  frequency: number;  // 震动频率（次/秒）
}

export const SCREEN_SHAKE_CONFIG: Record<AnimationIntensity, ScreenShakeConfig> = {
  small: {
    intensity: 5,
    duration: 200,
    frequency: 20
  },
  medium: {
    intensity: 10,
    duration: 300,
    frequency: 25
  },
  large: {
    intensity: 15,
    duration: 400,
    frequency: 30
  },
  huge: {
    intensity: 20,
    duration: 500,
    frequency: 35
  }
};

