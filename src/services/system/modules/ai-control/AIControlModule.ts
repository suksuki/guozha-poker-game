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
      console.log('[AIControlModule] 开始初始化...');
      
      // 获取AI中控系统实例
      this.aiControl = AIControlCenter.getInstance();
      console.log('[AIControlModule] AI中控系统实例已获取');
      
      // 从配置中获取AI中控配置
      const aiConfig: Partial<AIControlConfig> = config.aiControl || {};
      console.log('[AIControlModule] 配置:', aiConfig);
      
      // 初始化
      console.log('[AIControlModule] 开始初始化AI中控系统...');
      await this.aiControl.initialize(aiConfig);
      console.log('[AIControlModule] AI中控系统初始化完成');
      
      // 注册到上下文（供其他模块使用）
      (context as any).registerService?.('aiControl', this.aiControl);
      
      this.initialized = true;
      console.log('[AIControlModule] ✅ 初始化完成，状态:', this.getStatus());
    } catch (error) {
      console.error('[AIControlModule] ❌ 初始化失败:', error);
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

