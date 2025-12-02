/**
 * 游戏事件服务
 * 统一管理所有游戏事件，包括系统信息、动画、特效等
 */

import { GameEvent, GameEventType, GameEventCallback } from '../types/gameEvent';

/**
 * 游戏事件服务类
 */
class GameEventService {
  private eventQueue: GameEvent[] = [];
  private subscribers: Map<GameEventType, GameEventCallback[]> = new Map();
  private isProcessing = false;
  private maxQueueSize = 50; // 最大队列长度

  /**
   * 订阅事件
   * @param eventType 事件类型
   * @param callback 回调函数
   * @returns 取消订阅的函数
   */
  subscribe(eventType: GameEventType, callback: GameEventCallback): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    
    const callbacks = this.subscribers.get(eventType)!;
    callbacks.push(callback);
    
    // 返回取消订阅的函数
    return () => {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 发布事件
   * @param event 事件对象
   */
  emit(event: GameEvent): void {
    // 检查队列是否已满
    if (this.eventQueue.length >= this.maxQueueSize) {
      // 移除优先级最低的事件
      const minPriorityIndex = this.eventQueue.reduce((minIndex, current, index, arr) => 
        current.priority < arr[minIndex].priority ? index : minIndex, 0
      );
      this.eventQueue.splice(minPriorityIndex, 1);
    }

    // 按优先级插入事件（优先级高的在前）
    const insertIndex = this.eventQueue.findIndex(e => e.priority < event.priority);
    if (insertIndex === -1) {
      this.eventQueue.push(event);
    } else {
      this.eventQueue.splice(insertIndex, 0, event);
    }

    // 处理事件队列
    this.processQueue();
  }

  /**
   * 处理事件队列
   */
  private processQueue(): void {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // 使用 queueMicrotask 确保事件处理在渲染周期之后执行，避免在渲染期间更新状态
    queueMicrotask(async () => {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        
        try {
          // 通知所有订阅者
          const callbacks = this.subscribers.get(event.type) || [];
          await Promise.all(callbacks.map(callback => {
            try {
              return callback(event);
            } catch (error) {
              return Promise.resolve();
            }
          }));

          // 如果事件有持续时间，等待完成
          if (event.duration) {
            await new Promise(resolve => setTimeout(resolve, event.duration));
          }
        } catch (error) {
        }
      }

      this.isProcessing = false;
    });
  }

  /**
   * 清空事件队列
   */
  clearQueue(): void {
    this.eventQueue = [];
  }

  /**
   * 获取当前队列长度
   */
  getQueueLength(): number {
    return this.eventQueue.length;
  }

  /**
   * 移除所有订阅
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }
}

// 创建全局事件服务实例
export const gameEventService = new GameEventService();

