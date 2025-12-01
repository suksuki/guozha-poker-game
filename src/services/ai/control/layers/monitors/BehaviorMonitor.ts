/**
 * 行为监控器
 * 监控用户操作和游戏状态
 */

import { Sampler } from '../Sampler';
import { EventBus } from '../../events/EventBus';

export class BehaviorMonitor {
  private monitoring = false;
  private lastActionTime = 0;
  private throttleInterval = 1000; // 1秒节流
  
  constructor(
    private sampler: Sampler,
    private eventBus: EventBus
  ) {}
  
  /**
   * 启动监控
   */
  start(): void {
    if (this.monitoring) {
      return;
    }
    
    // 监控用户操作（使用事件委托，减少监听器数量）
    document.addEventListener('click', (event) => {
      this.recordAction('click', {
        target: (event.target as HTMLElement)?.tagName,
        id: (event.target as HTMLElement)?.id,
        className: (event.target as HTMLElement)?.className
      });
    }, { passive: true });
    
    // 监控键盘操作
    document.addEventListener('keydown', (event) => {
      this.recordAction('keydown', {
        key: event.key,
        code: event.code
      });
    }, { passive: true });
    
    this.monitoring = true;
  }
  
  /**
   * 停止监控
   */
  stop(): void {
    this.monitoring = false;
  }
  
  /**
   * 记录操作（节流处理）
   */
  private recordAction(type: string, data: any): void {
    if (!this.monitoring) {
      return;
    }
    
    const now = Date.now();
    if (now - this.lastActionTime < this.throttleInterval) {
      return; // 节流
    }
    
    this.lastActionTime = now;
    
    // 异步记录
    requestIdleCallback(() => {
      this.eventBus.emit('monitor:userAction', {
        type,
        data,
        timestamp: Date.now()
      });
    });
  }
}

