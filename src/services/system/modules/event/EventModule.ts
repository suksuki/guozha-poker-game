/**
 * 事件模块
 * 包装现有的 gameEventService
 */

import { SystemModule, SystemContext, ModuleStatus } from '../../types/SystemModule';
import { EventConfig } from '../../types/SystemConfig';
import { gameEventService } from '../../../gameEventService';
import type { GameEvent, GameEventType, GameEventCallback } from '../../../types/gameEvent';

export class EventModule implements SystemModule {
  name = 'event';
  dependencies = []; // 无依赖
  
  private config: EventConfig | null = null;
  private context: SystemContext | null = null;
  private initialized = false;
  private enabled = true;
  
  async initialize(config: EventConfig, context: SystemContext): Promise<void> {
    this.config = config;
    this.context = context;
    this.enabled = config.enabled;
    this.initialized = true;
  }
  
  configure(config: Partial<EventConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...config };
      this.enabled = this.config.enabled;
    }
  }
  
  async shutdown(): Promise<void> {
    this.initialized = false;
    this.config = null;
    this.context = null;
  }
  
  getStatus(): ModuleStatus {
    return {
      initialized: this.initialized,
      enabled: this.enabled,
    };
  }
  
  isEnabled(): boolean {
    return this.enabled && this.initialized;
  }
  
  /**
   * 订阅事件（包装 gameEventService.subscribe）
   */
  subscribe(eventType: GameEventType, callback: GameEventCallback): () => void {
    if (!this.isEnabled()) {
      return () => {}; // 返回空函数
    }
    return gameEventService.subscribe(eventType, callback);
  }
  
  /**
   * 发布事件（包装 gameEventService.emit）
   */
  emit(event: GameEvent): void {
    if (!this.isEnabled()) {
      return;
    }
    gameEventService.emit(event);
  }
  
  /**
   * 获取事件服务实例（用于需要直接访问的情况）
   */
  getEventService() {
    return gameEventService;
  }
}

