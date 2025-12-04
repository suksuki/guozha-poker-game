/**
 * 事件总线
 * 完全独立的事件系统，用于AI Core与外部通信
 */

type EventListener = (data?: any) => void;

export class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  
  on(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  off(event: string, listener: EventListener): void {
    this.listeners.get(event)?.delete(listener);
  }
  
  emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  clear(): void {
    this.listeners.clear();
  }
}

