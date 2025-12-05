/**
 * 异步任务管理器
 * 
 * 职责：
 * - 统一管理所有异步操作
 * - 提供超时、重试、降级支持
 * - 记录性能指标
 * - 支持任务取消
 * 
 * @example
 * ```typescript
 * const manager = new AsyncTaskManager();
 * 
 * const result = await manager.execute(
 *   () => fetchData(),
 *   {
 *     timeout: 5000,
 *     retryCount: 2,
 *     fallback: () => getCachedData()
 *   }
 * );
 * ```
 */

/**
 * 异步任务配置
 */
export interface AsyncTaskConfig {
  // 超时设置
  timeout: number;                    // 超时时间（毫秒）
  
  // 重试设置
  retryCount?: number;                // 重试次数（默认0）
  retryDelay?: number;                // 重试延迟（毫秒，默认1000）
  retryBackoff?: number;              // 重试退避系数（默认1.5）
  
  // 降级设置
  fallback?: () => Promise<any>;      // 降级函数
  fallbackTimeout?: number;           // 降级操作超时
  
  // 取消设置
  abortSignal?: AbortSignal;          // 外部取消信号
  
  // 监控设置
  enableMetrics?: boolean;            // 是否记录指标（默认true）
  taskName?: string;                  // 任务名称（用于日志）
  priority?: 'high' | 'normal' | 'low'; // 优先级
}

/**
 * 任务执行结果
 */
export interface TaskResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  
  // 元数据
  duration: number;                   // 执行时长（毫秒）
  retries: number;                    // 重试次数
  fromFallback: boolean;              // 是否来自降级
  cancelled: boolean;                 // 是否被取消
  timedOut: boolean;                  // 是否超时
  
  // 调试信息
  taskName: string;
  timestamp: number;
}

/**
 * 任务状态
 */
enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

/**
 * 任务指标
 */
interface TaskMetrics {
  taskName: string;
  successCount: number;
  failureCount: number;
  totalDuration: number;
  avgDuration: number;
  lastError: Error | null;
}

/**
 * 指标快照
 */
export interface AsyncMetricsSnapshot {
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDuration: number;
  taskMetrics: TaskMetrics[];
}

/**
 * 自定义错误类
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class CancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CancellationError';
  }
}

export class FallbackFailedError extends Error {
  constructor(
    message: string,
    public originalError: Error,
    public fallbackError: Error
  ) {
    super(message);
    this.name = 'FallbackFailedError';
  }
}

/**
 * 异步任务类（内部使用）
 */
class AsyncTask<T> {
  status: TaskStatus = TaskStatus.PENDING;
  retryCount: number = 0;
  
  constructor(
    public id: string,
    public name: string,
    public taskFn: () => Promise<T>,
    public config: AsyncTaskConfig
  ) {}
}

/**
 * 异步任务管理器
 */
export class AsyncTaskManager {
  private activeTasks: Map<string, AsyncTask<any>> = new Map();
  private taskHistory: TaskResult<any>[] = [];
  private metrics: AsyncMetrics;
  private taskIdCounter: number = 0;
  
  constructor() {
    this.metrics = new AsyncMetrics();
  }
  
  /**
   * 执行异步任务（核心方法）
   */
  async execute<T>(
    taskFn: () => Promise<T>,
    config: AsyncTaskConfig
  ): Promise<TaskResult<T>> {
    const taskId = this.generateTaskId();
    const taskName = config.taskName || 'unknown';
    const startTime = Date.now();
    
    console.log(`[AsyncTask] Starting: ${taskName} (${taskId})`);
    
    // 创建任务对象
    const task = new AsyncTask<T>(taskId, taskName, taskFn, config);
    this.activeTasks.set(taskId, task);
    
    try {
      // 执行任务（带超时、重试、降级）
      const result = await this.executeWithFullSupport(task, config);
      
      // 记录成功
      const duration = Date.now() - startTime;
      if (config.enableMetrics !== false) {
        this.metrics.recordSuccess(taskName, duration);
      }
      
      console.log(`[AsyncTask] Success: ${taskName} in ${duration}ms`);
      
      const taskResult: TaskResult<T> = {
        success: true,
        data: result.data,
        duration,
        retries: result.retries,
        fromFallback: result.fromFallback,
        cancelled: false,
        timedOut: false,
        taskName,
        timestamp: startTime
      };
      
      this.addToHistory(taskResult);
      
      return taskResult;
      
    } catch (error) {
      // 记录失败
      const duration = Date.now() - startTime;
      if (config.enableMetrics !== false) {
        this.metrics.recordFailure(taskName, error as Error);
      }
      
      console.error(`[AsyncTask] Failed: ${taskName}`, error);
      
      const taskResult: TaskResult<T> = {
        success: false,
        error: error as Error,
        duration,
        retries: task.retryCount,
        fromFallback: false,
        cancelled: task.status === TaskStatus.CANCELLED,
        timedOut: task.status === TaskStatus.TIMEOUT,
        taskName,
        timestamp: startTime
      };
      
      this.addToHistory(taskResult);
      
      return taskResult;
      
    } finally {
      // 清理
      this.activeTasks.delete(taskId);
    }
  }
  
  /**
   * 执行任务（带完整支持）
   */
  private async executeWithFullSupport<T>(
    task: AsyncTask<T>,
    config: AsyncTaskConfig
  ): Promise<{ data: T; retries: number; fromFallback: boolean }> {
    let lastError: Error | null = null;
    let isTimeoutError: boolean = false; // 追踪是否为超时错误
    const maxRetries = config.retryCount || 0;
    
    // 尝试执行（含重试）
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 检查是否已取消
        this.checkCancellation(task, config.abortSignal);
        
        // 执行任务（带超时）
        task.status = TaskStatus.RUNNING;
        const data = await this.executeWithTimeout(
          task.taskFn,
          config.timeout,
          config.abortSignal
        );
        
        task.status = TaskStatus.COMPLETED;
        
        return {
          data,
          retries: attempt,
          fromFallback: false
        };
        
      } catch (error) {
        lastError = error as Error;
        task.retryCount = attempt;
        
        // 如果是取消错误，直接抛出
        if (error instanceof CancellationError) {
          task.status = TaskStatus.CANCELLED;
          throw error;
        }
        
        // 如果是超时错误
        if (error instanceof TimeoutError) {
          task.status = TaskStatus.TIMEOUT;
          isTimeoutError = true; // 标记为超时
          console.warn(`[AsyncTask] Timeout on attempt ${attempt + 1}: ${task.name}`);
          
          // 如果还有重试机会，继续
          if (attempt < maxRetries) {
            const delay = this.calculateRetryDelay(attempt, config);
            console.log(`[AsyncTask] Retrying in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
        } else {
          // 其他错误
          console.warn(`[AsyncTask] Error on attempt ${attempt + 1}: ${task.name}`, error);
          
          // 如果还有重试机会，继续
          if (attempt < maxRetries) {
            const delay = this.calculateRetryDelay(attempt, config);
            await this.sleep(delay);
            continue;
          }
        }
      }
    }
    
    // 所有尝试都失败，尝试降级
    if (config.fallback) {
      console.warn(`[AsyncTask] Falling back: ${task.name}`);
      
      try {
        const fallbackTimeout = config.fallbackTimeout || config.timeout;
        const data = await this.executeWithTimeout(
          config.fallback,
          fallbackTimeout,
          config.abortSignal
        );
        
        // 降级成功，但保持超时状态标记
        if (!isTimeoutError) {
          task.status = TaskStatus.COMPLETED;
        }
        
        return {
          data,
          retries: maxRetries + 1,
          fromFallback: true
        };
        
      } catch (fallbackError) {
        console.error(`[AsyncTask] Fallback failed: ${task.name}`, fallbackError);
        // 保持原始的超时状态
        throw new FallbackFailedError(
          `Task and fallback both failed: ${task.name}`,
          lastError!,
          fallbackError as Error
        );
      }
    }
    
    // 没有降级或降级失败，抛出原始错误
    // 保持之前设置的状态（TIMEOUT或其他）
    if (!isTimeoutError) {
      task.status = TaskStatus.FAILED;
    }
    throw lastError;
  }
  
  /**
   * 执行任务（带超时）
   */
  private async executeWithTimeout<T>(
    taskFn: () => Promise<T>,
    timeout: number,
    abortSignal?: AbortSignal
  ): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      // 超时定时器
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(`Task timed out after ${timeout}ms`));
      }, timeout);
      
      // 取消监听
      const onAbort = () => {
        clearTimeout(timeoutId);
        reject(new CancellationError('Task was cancelled'));
      };
      
      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort);
      }
      
      try {
        // 执行任务
        const result = await taskFn();
        clearTimeout(timeoutId);
        
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort);
        }
        
        resolve(result);
        
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (abortSignal) {
          abortSignal.removeEventListener('abort', onAbort);
        }
        
        reject(error);
      }
    });
  }
  
  /**
   * 检查取消
   */
  private checkCancellation(task: AsyncTask<any>, abortSignal?: AbortSignal): void {
    if (abortSignal?.aborted) {
      task.status = TaskStatus.CANCELLED;
      throw new CancellationError('Task was cancelled before execution');
    }
  }
  
  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(attempt: number, config: AsyncTaskConfig): number {
    const baseDelay = config.retryDelay || 1000;
    const backoff = config.retryBackoff || 1.5;
    return Math.floor(baseDelay * Math.pow(backoff, attempt));
  }
  
  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${++this.taskIdCounter}`;
  }
  
  /**
   * 添加到历史
   */
  private addToHistory(result: TaskResult<any>): void {
    this.taskHistory.push(result);
    
    // 限制历史大小
    if (this.taskHistory.length > 1000) {
      this.taskHistory.shift();
    }
  }
  
  /**
   * 取消所有任务
   */
  cancelAll(): void {
    console.warn('[AsyncTask] Cancelling all active tasks');
    this.activeTasks.forEach(task => {
      task.status = TaskStatus.CANCELLED;
    });
    this.activeTasks.clear();
  }
  
  /**
   * 获取指标
   */
  getMetrics(): AsyncMetricsSnapshot {
    return this.metrics.getSnapshot();
  }
  
  /**
   * 获取活跃任务数
   */
  getActiveTaskCount(): number {
    return this.activeTasks.size;
  }
  
  /**
   * 获取历史记录
   */
  getHistory(limit?: number): TaskResult<any>[] {
    if (limit) {
      return this.taskHistory.slice(-limit);
    }
    return [...this.taskHistory];
  }
  
  /**
   * 清空历史
   */
  clearHistory(): void {
    this.taskHistory = [];
  }
}

/**
 * 异步指标收集器
 */
class AsyncMetrics {
  private successCount: number = 0;
  private failureCount: number = 0;
  private totalDuration: number = 0;
  private taskMetrics: Map<string, TaskMetrics> = new Map();
  
  recordSuccess(taskName: string, duration: number): void {
    this.successCount++;
    this.totalDuration += duration;
    
    const metrics = this.getOrCreateTaskMetrics(taskName);
    metrics.successCount++;
    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.successCount;
  }
  
  recordFailure(taskName: string, error: Error): void {
    this.failureCount++;
    
    const metrics = this.getOrCreateTaskMetrics(taskName);
    metrics.failureCount++;
    metrics.lastError = error;
  }
  
  private getOrCreateTaskMetrics(taskName: string): TaskMetrics {
    if (!this.taskMetrics.has(taskName)) {
      this.taskMetrics.set(taskName, {
        taskName,
        successCount: 0,
        failureCount: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastError: null
      });
    }
    return this.taskMetrics.get(taskName)!;
  }
  
  getSnapshot(): AsyncMetricsSnapshot {
    const total = this.successCount + this.failureCount;
    const successRate = total > 0 ? this.successCount / total : 0;
    
    return {
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate,
      avgDuration: this.successCount > 0 ? this.totalDuration / this.successCount : 0,
      taskMetrics: Array.from(this.taskMetrics.values())
    };
  }
  
  reset(): void {
    this.successCount = 0;
    this.failureCount = 0;
    this.totalDuration = 0;
    this.taskMetrics.clear();
  }
}

