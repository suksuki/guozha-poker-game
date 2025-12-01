/**
 * 性能监控器
 */

import { Sampler } from '../Sampler';
import { EventBus } from '../../events/EventBus';
import { ResourceStatus } from '../../types';

export class PerformanceMonitor {
  private monitoring = false;
  private marks: Map<string, number> = new Map();
  
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
    
    // 监控内存
    this.monitorMemory();
    
    // 监控长任务
    this.monitorLongTasks();
    
    this.monitoring = true;
  }
  
  /**
   * 停止监控
   */
  stop(): void {
    this.monitoring = false;
  }
  
  /**
   * 监控函数执行时间
   */
  monitorFunction<T extends Function>(
    fn: T,
    name: string
  ): T {
    if (!this.sampler.shouldSample(name)) {
      return fn;
    }
    
    return new Proxy(fn, {
      apply: (target, thisArg, args) => {
        const start = performance.now();
        let result: any;
        let error: Error | null = null;
        
        try {
          result = target.apply(thisArg, args);
        } catch (e) {
          error = e as Error;
          throw e;
        } finally {
          const duration = performance.now() - start;
          
          // 异步记录，不阻塞
          requestIdleCallback(() => {
            this.eventBus.emit('monitor:performance', {
              name,
              duration,
              args,
              result,
              error: error ? {
                message: error.message,
                stack: error.stack
              } : undefined
            });
          });
        }
        
        return result;
      }
    }) as T;
  }
  
  /**
   * 标记开始
   */
  markStart(name: string): void {
    performance.mark(`${name}-start`);
    this.marks.set(name, performance.now());
  }
  
  /**
   * 标记结束
   */
  markEnd(name: string): void {
    performance.mark(`${name}-end`);
    performance.measure(
      name,
      `${name}-start`,
      `${name}-end`
    );
    
    const measure = performance.getEntriesByName(name)[0];
    if (measure) {
      this.eventBus.emit('monitor:performance', {
        name,
        duration: measure.duration
      });
    }
  }
  
  /**
   * 监控内存
   */
  private monitorMemory(): void {
    setInterval(() => {
      if (!this.monitoring) return;
      
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.eventBus.emit('monitor:memory', {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          usage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
        });
      }
    }, 5000); // 每5秒
  }
  
  /**
   * 监控长任务
   */
  private monitorLongTasks(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // 超过50ms的任务
              this.eventBus.emit('monitor:longtask', {
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // 浏览器不支持longtask
        console.warn('[PerformanceMonitor] 不支持longtask监控');
      }
    }
  }
  
  /**
   * 获取资源状态
   */
  getResourceStatus(): ResourceStatus {
    let memoryUsage = 0;
    let memoryUsed = 0;
    let memoryLimit = 0;
    
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsed = memory.usedJSHeapSize;
      memoryLimit = memory.jsHeapSizeLimit;
      memoryUsage = memoryUsed / memoryLimit;
    }
    
    // CPU使用率需要从其他地方获取（这里简化处理）
    const cpuUsage = 0; // 实际需要更复杂的计算
    
    return {
      memory: {
        used: memoryUsed,
        limit: memoryLimit,
        usage: memoryUsage
      },
      cpu: {
        used: cpuUsage,
        limit: 0.05, // 5%
        usage: cpuUsage / 0.05
      }
    };
  }
}

