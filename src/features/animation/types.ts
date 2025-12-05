/**
 * 动画系统类型定义
 */

export interface AnimationConfig {
  enabled: boolean;           // 是否启用动画
  duration: number;           // 默认动画时长（ms）
  easing: string;             // 默认缓动函数
}

export type AnimationType = 
  | 'deal'          // 发牌
  | 'play'          // 出牌
  | 'fade-in'       // 淡入
  | 'fade-out'      // 淡出
  | 'slide-up'      // 向上滑动
  | 'slide-down'    // 向下滑动
  | 'bounce'        // 弹跳
  | 'shake';        // 震动

export interface AnimationOptions {
  duration?: number;          // 动画时长（ms）
  delay?: number;             // 延迟时间（ms）
  easing?: string;            // 缓动函数
  onComplete?: () => void;    // 完成回调
}

export interface AnimationEvent {
  type: 'animation:start' | 'animation:end' | 'animation:cancel';
  animationType?: AnimationType;
  element?: HTMLElement;
}

