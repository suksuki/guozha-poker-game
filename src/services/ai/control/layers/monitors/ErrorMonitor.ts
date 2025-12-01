/**
 * 错误监控器
 */

import { EventBus } from '../../events/EventBus';

export class ErrorMonitor {
  private monitoring = false;
  
  constructor(private eventBus: EventBus) {}
  
  /**
   * 启动监控
   */
  start(): void {
    if (this.monitoring) {
      return;
    }
    
    // 捕获同步错误
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        type: 'error'
      });
    });
    
    // 捕获Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        type: 'unhandledRejection'
      });
    });
    
    this.monitoring = true;
  }
  
  /**
   * 停止监控
   */
  stop(): void {
    // 注意：无法完全移除error事件监听器
    // 但可以设置标志来忽略处理
    this.monitoring = false;
  }
  
  /**
   * 处理错误
   */
  private handleError(error: any): void {
    if (!this.monitoring) {
      return;
    }
    
    // 异步处理，不阻塞
    requestIdleCallback(() => {
      this.eventBus.emit('monitor:error', {
        ...error,
        timestamp: Date.now()
      });
    });
  }
}

