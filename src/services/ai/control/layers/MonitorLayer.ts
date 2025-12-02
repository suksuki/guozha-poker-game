/**
 * 监控层
 * 负责监控系统行为、性能、错误等
 */

import { AIControlConfig, MonitoringData, ResourceStatus } from '../types';
import { EventBus } from '../events/EventBus';
import { PerformanceMonitor } from './monitors/PerformanceMonitor';
import { ErrorMonitor } from './monitors/ErrorMonitor';
import { BehaviorMonitor } from './monitors/BehaviorMonitor';
import { Sampler } from './Sampler';

export class MonitorLayer {
  private performanceMonitor: PerformanceMonitor;
  private errorMonitor: ErrorMonitor;
  private behaviorMonitor: BehaviorMonitor;
  private sampler: Sampler;
  
  private monitoring = false;
  private dataBuffer: MonitoringData[] = [];
  private maxBufferSize = 1000;
  
  constructor(
    private config: AIControlConfig,
    private eventBus: EventBus
  ) {
    this.sampler = new Sampler(config.monitor.samplingRate, config.monitor.keyPaths);
    this.performanceMonitor = new PerformanceMonitor(this.sampler, this.eventBus);
    this.errorMonitor = new ErrorMonitor(this.eventBus);
    this.behaviorMonitor = new BehaviorMonitor(this.sampler, this.eventBus);
  }
  
  /**
   * 启动监控
   */
  start(): void {
    if (this.monitoring) {
      return;
    }
    
    if (!this.config.monitor.enabled) {
      return;
    }
    
    // 启动各监控器
    this.performanceMonitor.start();
    this.errorMonitor.start();
    this.behaviorMonitor.start();
    
    // 启动资源监控
    this.startResourceMonitoring();
    
    this.monitoring = true;
  }
  
  /**
   * 停止监控
   */
  stop(): void {
    if (!this.monitoring) {
      return;
    }
    
    this.performanceMonitor.stop();
    this.errorMonitor.stop();
    this.behaviorMonitor.stop();
    
    this.monitoring = false;
  }
  
  /**
   * 记录事件
   */
  recordEvent(data: MonitoringData): void {
    if (!this.monitoring) {
      return;
    }
    
    // 采样判断
    if (!this.sampler.shouldSample(data.path || '')) {
      return;
    }
    
    // 添加到缓冲区
    this.dataBuffer.push(data);
    
    // 如果缓冲区满了，触发批量处理
    if (this.dataBuffer.length >= this.maxBufferSize) {
      this.flushBuffer();
    } else {
      // 单个事件也发送（异步）
      requestIdleCallback(() => {
        this.eventBus.emit('monitor:data', data);
      });
    }
  }
  
  /**
   * 记录函数调用
   */
  recordFunctionCall(
    name: string,
    duration: number,
    args?: any[],
    result?: any,
    error?: Error
  ): void {
    this.recordEvent({
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'function',
      path: name,
      data: {
        duration,
        args,
        result,
        error: error ? {
          message: error.message,
          stack: error.stack
        } : undefined
      }
    });
  }
  
  /**
   * 记录错误
   */
  recordError(error: Error, context?: any): void {
    this.recordEvent({
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'error',
      data: {
        message: error.message,
        stack: error.stack,
        context
      }
    });
  }
  
  /**
   * 记录性能指标
   */
  recordPerformance(metrics: any): void {
    this.recordEvent({
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'performance',
      data: metrics
    });
  }
  
  /**
   * 记录用户操作
   */
  recordUserAction(action: string, data?: any): void {
    this.recordEvent({
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'userAction',
      path: action,
      data
    });
  }
  
  /**
   * 记录游戏状态
   */
  recordGameState(state: any): void {
    this.recordEvent({
      id: this.generateId(),
      timestamp: Date.now(),
      type: 'gameState',
      data: state
    });
  }
  
  /**
   * 获取资源状态
   */
  getResourceStatus(): ResourceStatus {
    return this.performanceMonitor.getResourceStatus();
  }
  
  /**
   * 刷新缓冲区
   */
  private flushBuffer(): void {
    if (this.dataBuffer.length === 0) {
      return;
    }
    
    const batch = this.dataBuffer.splice(0, this.maxBufferSize);
    
    // 批量发送
    requestIdleCallback(() => {
      this.eventBus.emit('monitor:data:batch', batch);
    });
  }
  
  /**
   * 启动资源监控
   */
  private startResourceMonitoring(): void {
    // 每5秒检查一次资源使用
    setInterval(() => {
      const status = this.getResourceStatus();
      
      // 如果资源使用过高，调整采样率
      if (status.memory.usage > 0.8 || status.cpu.usage > 0.8) {
        this.sampler.adjustSamplingRate(0.01); // 降低到1%
      } else if (status.memory.usage < 0.5 && status.cpu.usage < 0.5) {
        this.sampler.adjustSamplingRate(this.config.monitor.samplingRate); // 恢复
      }
    }, 5000);
  }
  
  /**
   * 生成ID
   */
  private generateId(): string {
    return `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

