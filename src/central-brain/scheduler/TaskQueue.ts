/**
 * TaskQueue - 任务队列（简单、可靠）
 * 
 * 职责：
 * - 管理任务队列
 * - 确保顺序执行
 * - 支持优先级
 * - 支持取消
 * 
 * 设计原则：
 * 1. 简单可靠
 * 2. 无状态混乱
 * 3. 易于测试
 */

/**
 * 任务定义
 */
export interface Task<T = any> {
  id: string;
  type: string;
  payload: T;
  priority: number;
  timestamp: number;
  roundNumber?: number; // 关联的轮次号（用于清理）
}

/**
 * 任务执行器
 */
export type TaskExecutor<T = any> = (task: Task<T>) => Promise<void>;

/**
 * TaskQueue - 简单的任务队列
 */
export class TaskQueue {
  private queue: Task[] = [];
  private isProcessing: boolean = false;
  private executor: TaskExecutor | null = null;
  
  // 统计信息
  private processedCount: number = 0;
  private errorCount: number = 0;
  
  /**
   * 设置任务执行器
   */
  setExecutor(executor: TaskExecutor): void {
    this.executor = executor;
  }
  
  /**
   * 添加任务
   */
  enqueue(task: Task): void {
    this.queue.push(task);
    
    // 按优先级排序（高优先级在前）
    this.queue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
    
    console.log(`[TaskQueue] Task enqueued: ${task.type} (queue size: ${this.queue.length})`);
    
    // 触发处理
    this.process();
  }
  
  /**
   * 处理队列
   */
  private async process(): Promise<void> {
    // 如果正在处理，跳过
    if (this.isProcessing) {
      return;
    }
    
    // 如果队列为空，跳过
    if (this.queue.length === 0) {
      return;
    }
    
    // 如果没有执行器，跳过
    if (!this.executor) {
      console.warn('[TaskQueue] No executor set');
      return;
    }
    
    // 标记为处理中
    this.isProcessing = true;
    
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        
        try {
          console.log(`[TaskQueue] Processing task: ${task.type} (id: ${task.id})`);
          await this.executor(task);
          this.processedCount++;
        } catch (error) {
          this.errorCount++;
          console.error(`[TaskQueue] Task failed: ${task.type}`, error);
          // 继续处理下一个任务
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * 等待队列空闲（用于测试）
   */
  async waitUntilIdle(timeout: number = 5000): Promise<void> {
    const start = Date.now();
    
    while (this.queue.length > 0 || this.isProcessing) {
      if (Date.now() - start > timeout) {
        throw new Error('Queue wait timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  /**
   * 清除指定轮次的任务
   */
  clearRound(roundNumber: number): number {
    const before = this.queue.length;
    this.queue = this.queue.filter(task => task.roundNumber !== roundNumber);
    const removed = before - this.queue.length;
    
    if (removed > 0) {
      console.log(`[TaskQueue] Cleared ${removed} tasks for round ${roundNumber}`);
    }
    
    return removed;
  }
  
  /**
   * 清空所有任务
   */
  clear(): void {
    const count = this.queue.length;
    this.queue = [];
    console.log(`[TaskQueue] Cleared all ${count} tasks`);
  }
  
  /**
   * 获取队列大小
   */
  size(): number {
    return this.queue.length;
  }
  
  /**
   * 检查是否正在处理
   */
  isActive(): boolean {
    return this.isProcessing;
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
      successRate: this.processedCount > 0 
        ? (this.processedCount - this.errorCount) / this.processedCount 
        : 0
    };
  }
}

