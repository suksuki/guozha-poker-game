/**
 * 动画系统
 * 
 * 职责：
 * 1. CSS动画管理
 * 2. 动画队列
 * 3. 动画回调
 * 4. 动画取消
 * 
 * 使用CSS动画 + JavaScript控制，轻量高效
 */

import { AnimationConfig, AnimationType, AnimationOptions, AnimationEvent } from './types';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AnimationConfig = {
  enabled: true,
  duration: 300,
  easing: 'ease-out'
};

/**
 * CSS动画类名映射
 */
const ANIMATION_CLASSES: Record<AnimationType, string> = {
  'deal': 'anim-deal',
  'play': 'anim-play',
  'fade-in': 'anim-fade-in',
  'fade-out': 'anim-fade-out',
  'slide-up': 'anim-slide-up',
  'slide-down': 'anim-slide-down',
  'bounce': 'anim-bounce',
  'shake': 'anim-shake'
};

/**
 * 动画系统类
 */
export class AnimationSystem {
  private config: AnimationConfig;
  private listeners: Map<string, Set<(event: AnimationEvent) => void>> = new Map();
  private activeAnimations: Map<HTMLElement, Animation> = new Map();
  
  constructor(config: Partial<AnimationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.injectStyles();
    console.log('[AnimationSystem] 已创建', this.config);
  }
  
  // ==================== 初始化 ====================
  
  /**
   * 注入CSS样式
   */
  private injectStyles(): void {
    if (document.getElementById('animation-system-styles')) {
      return; // 已注入
    }
    
    const style = document.createElement('style');
    style.id = 'animation-system-styles';
    style.textContent = `
      /* 发牌动画 */
      @keyframes deal {
        from {
          opacity: 0;
          transform: translateY(-50px) scale(0.5);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .anim-deal {
        animation: deal 0.3s ease-out;
      }
      
      /* 出牌动画 */
      @keyframes play {
        0% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-20px);
        }
        100% {
          transform: translateY(0);
          opacity: 0;
        }
      }
      
      .anim-play {
        animation: play 0.4s ease-out forwards;
      }
      
      /* 淡入 */
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .anim-fade-in {
        animation: fade-in 0.3s ease-in;
      }
      
      /* 淡出 */
      @keyframes fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      .anim-fade-out {
        animation: fade-out 0.3s ease-out forwards;
      }
      
      /* 向上滑动 */
      @keyframes slide-up {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .anim-slide-up {
        animation: slide-up 0.3s ease-out;
      }
      
      /* 向下滑动 */
      @keyframes slide-down {
        from {
          transform: translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .anim-slide-down {
        animation: slide-down 0.3s ease-out;
      }
      
      /* 弹跳 */
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        25% { transform: translateY(-10px); }
        50% { transform: translateY(-5px); }
        75% { transform: translateY(-2px); }
      }
      
      .anim-bounce {
        animation: bounce 0.5s ease-out;
      }
      
      /* 震动 */
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
      
      .anim-shake {
        animation: shake 0.4s ease-out;
      }
    `;
    
    document.head.appendChild(style);
    console.log('[AnimationSystem] CSS样式已注入');
  }
  
  // ==================== 动画播放 ====================
  
  /**
   * 播放动画
   */
  async animate(
    element: HTMLElement,
    type: AnimationType,
    options: AnimationOptions = {}
  ): Promise<void> {
    if (!this.config.enabled) {
      return Promise.resolve();
    }
    
    const {
      duration = this.config.duration,
      delay = 0,
      easing = this.config.easing,
      onComplete
    } = options;
    
    return new Promise((resolve) => {
      // 延迟执行
      if (delay > 0) {
        setTimeout(() => {
          this.executeAnimation(element, type, duration, easing, () => {
            onComplete?.();
            resolve();
          });
        }, delay);
      } else {
        this.executeAnimation(element, type, duration, easing, () => {
          onComplete?.();
          resolve();
        });
      }
    });
  }
  
  /**
   * 执行动画
   */
  private executeAnimation(
    element: HTMLElement,
    type: AnimationType,
    duration: number,
    easing: string,
    onComplete: () => void
  ): void {
    const className = ANIMATION_CLASSES[type];
    
    // 设置动画持续时间和缓动
    element.style.animationDuration = `${duration}ms`;
    element.style.animationTimingFunction = easing;
    
    // 添加动画类
    element.classList.add(className);
    
    // 触发开始事件
    this.emit({ type: 'animation:start', animationType: type, element });
    
    // 监听动画结束
    const handleAnimationEnd = () => {
      element.classList.remove(className);
      element.removeEventListener('animationend', handleAnimationEnd);
      element.removeEventListener('animationcancel', handleAnimationEnd);
      
      // 触发结束事件
      this.emit({ type: 'animation:end', animationType: type, element });
      
      onComplete();
    };
    
    element.addEventListener('animationend', handleAnimationEnd);
    element.addEventListener('animationcancel', handleAnimationEnd);
    
    console.log(`[AnimationSystem] 播放: ${type} (${duration}ms)`);
  }
  
  /**
   * 批量动画（顺序执行）
   */
  async animateSequence(
    animations: Array<{
      element: HTMLElement;
      type: AnimationType;
      options?: AnimationOptions;
    }>
  ): Promise<void> {
    for (const anim of animations) {
      await this.animate(anim.element, anim.type, anim.options);
    }
  }
  
  /**
   * 批量动画（并行执行）
   */
  async animateParallel(
    animations: Array<{
      element: HTMLElement;
      type: AnimationType;
      options?: AnimationOptions;
    }>
  ): Promise<void> {
    await Promise.all(
      animations.map(anim => 
        this.animate(anim.element, anim.type, anim.options)
      )
    );
  }
  
  // ==================== 便捷方法 ====================
  
  /**
   * 发牌动画
   */
  async animateDeal(elements: HTMLElement[], delayBetween: number = 50): Promise<void> {
    const animations = elements.map((element, index) => ({
      element,
      type: 'deal' as AnimationType,
      options: { delay: index * delayBetween }
    }));
    
    await this.animateParallel(animations);
  }
  
  /**
   * 出牌动画
   */
  async animatePlay(elements: HTMLElement[]): Promise<void> {
    await this.animateParallel(
      elements.map(element => ({
        element,
        type: 'play' as AnimationType
      }))
    );
  }
  
  /**
   * 淡入动画
   */
  async fadeIn(element: HTMLElement, duration?: number): Promise<void> {
    await this.animate(element, 'fade-in', { duration });
  }
  
  /**
   * 淡出动画
   */
  async fadeOut(element: HTMLElement, duration?: number): Promise<void> {
    await this.animate(element, 'fade-out', { duration });
  }
  
  // ==================== 配置管理 ====================
  
  /**
   * 启用/禁用动画
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[AnimationSystem] 动画${enabled ? '已启用' : '已禁用'}`);
  }
  
  /**
   * 设置默认动画时长
   */
  setDuration(duration: number): void {
    this.config.duration = duration;
    console.log(`[AnimationSystem] 默认时长: ${duration}ms`);
  }
  
  /**
   * 获取配置
   */
  getConfig(): AnimationConfig {
    return { ...this.config };
  }
  
  // ==================== 事件系统 ====================
  
  /**
   * 监听事件
   */
  on(eventType: string, callback: (event: AnimationEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }
  
  /**
   * 触发事件
   */
  private emit(event: AnimationEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }
  
  // ==================== 统计信息 ====================
  
  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      enabled: this.config.enabled,
      defaultDuration: this.config.duration,
      defaultEasing: this.config.easing,
      activeAnimations: this.activeAnimations.size
    };
  }
}

