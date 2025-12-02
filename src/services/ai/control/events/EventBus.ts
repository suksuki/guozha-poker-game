/**
 * 事件总线
 * 用于各层之间的通信
 */

type EventHandler = (...args: any[]) => void;

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  
  /**
   * 订阅事件
   */
  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }
  
  /**
   * 取消订阅
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  /**
   * 触发事件
   */
  emit(event: string, ...args: any[]): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
        }
      });
    }
    
    // 支持通配符 '*'
    if (event !== '*') {
      const wildcardHandlers = this.handlers.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => {
          try {
            handler(event, ...args);
          } catch (error) {
          }
        });
      }
    }
  }
  
  /**
   * 清除所有监听器
   */
  clear(): void {
    this.handlers.clear();
  }
  
  /**
   * 获取事件监听器数量
   */
  getListenerCount(event: string): number {
    return this.handlers.get(event)?.size || 0;
  }
}

