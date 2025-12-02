/**
 * AI中控系统模块
 * 集成到SystemApplication模块系统
 */

import { SystemModule, SystemContext, ModuleStatus } from '../../types/SystemModule';
import { AIControlCenter } from '../../../ai/control/AIControlCenter';
import { AIControlConfig } from '../../../ai/control/types';

export class AIControlModule implements SystemModule {
  name = 'ai-control';
  dependencies: string[] = []; // 无依赖，最先初始化
  priority = 'highest'; // 最高优先级
  
  private aiControl: AIControlCenter;
  private initialized = false;
  private enabled = true;
  
  async initialize(config: any, context: SystemContext): Promise<void> {
    try {
      
      // 获取AI中控系统实例
      this.aiControl = AIControlCenter.getInstance();
      
      // 从配置中获取AI中控配置
      const aiConfig: Partial<AIControlConfig> = config.aiControl || {};
      
      // 初始化
      await this.aiControl.initialize(aiConfig);
      
      // 注册到上下文（供其他模块使用）
      (context as any).registerService?.('aiControl', this.aiControl);
      
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }
  
  configure(config: any): void {
    // 可以动态配置
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
      
      if (this.enabled && this.initialized) {
        this.aiControl.startMonitoring();
      } else if (!this.enabled && this.initialized) {
        this.aiControl.stopMonitoring();
      }
    }
  }
  
  async shutdown(): Promise<void> {
    if (this.initialized) {
      this.aiControl.stopMonitoring();
    }
  }
  
  getStatus(): ModuleStatus {
    return {
      initialized: this.initialized,
      enabled: this.enabled
    };
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * 获取AI中控系统实例
   */
  getAIControl(): AIControlCenter {
    return this.aiControl;
  }
}

