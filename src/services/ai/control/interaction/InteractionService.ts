/**
 * 交互服务
 * 提供与AI中控系统交互的统一接口
 */

import { AIControlCenter } from '../AIControlCenter';
import { AnalysisResult, OptimizationSuggestion, ResourceStatus } from '../types';
import { GameSession } from '../data/PlayerActionTracker';

/**
 * 系统状态
 */
export interface SystemStatus {
  initialized: boolean;
  monitoring: boolean;
  resourceStatus: ResourceStatus;
  config: any;
}

/**
 * 交互服务
 */
export class InteractionService {
  private aiControl: AIControlCenter;
  
  constructor() {
    this.aiControl = AIControlCenter.getInstance();
  }
  
  /**
   * 获取系统状态
   */
  getSystemStatus(): SystemStatus {
    try {
      // 先检查是否已初始化
      const isInitialized = this.aiControl.getMonitorLayer() !== null;
      
      if (!isInitialized) {
        // 系统未初始化，返回默认状态
        return {
          initialized: false,
          monitoring: false,
          resourceStatus: {
            cpu: { used: 0, limit: 1, usage: 0 },
            memory: { used: 0, limit: 100 * 1024 * 1024, usage: 0 }
          },
          config: {}
        };
      }
      
      // 系统已初始化，获取真实状态
      const resourceStatus = this.aiControl.getResourceStatus();
      const isMonitoring = this.aiControl.getMonitoringStatus();
      const config = this.aiControl.getConfig();
      
      return {
        initialized: true,
        monitoring: isMonitoring,
        resourceStatus,
        config
      };
    } catch (error) {
      // 返回默认状态
      return {
        initialized: false,
        monitoring: false,
        resourceStatus: {
          cpu: { used: 0, limit: 1, usage: 0 },
          memory: { used: 0, limit: 100 * 1024 * 1024, usage: 0 }
        },
        config: {}
      };
    }
  }
  
  /**
   * 启动监控
   */
  startMonitoring(): void {
    try {
      // 检查是否已初始化
      if (!this.aiControl.getMonitorLayer()) {
        throw new Error('AI中控系统未初始化，请等待系统初始化完成');
      }
      this.aiControl.startMonitoring();
    } catch (error: any) {
      throw error;
    }
  }
  
  /**
   * 停止监控
   */
  stopMonitoring(): void {
    this.aiControl.stopMonitoring();
  }
  
  /**
   * 获取分析结果
   */
  getAnalysisResults(filters?: {
    type?: string;
    severity?: string;
    limit?: number;
  }): AnalysisResult[] {
    const results = this.aiControl.getAnalysisResults();
    
    // 应用过滤
    let filtered = results;
    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(r => r.type === filters.type);
      }
      if (filters.severity) {
        filtered = filtered.filter(r => r.severity === filters.severity);
      }
      if (filters.limit) {
        filtered = filtered.slice(0, filters.limit);
      }
    }
    
    return filtered;
  }
  
  /**
   * 获取单个分析结果
   */
  getAnalysisResult(id: string): AnalysisResult | undefined {
    return this.aiControl.getAnalyzeLayer().getResult(id);
  }
  
  /**
   * 生成优化方案
   */
  async generateOptimization(analysisId: string): Promise<OptimizationSuggestion> {
    const result = this.getAnalysisResult(analysisId);
    if (!result) {
      throw new Error(`分析结果不存在: ${analysisId}`);
    }
    
    // 简化处理，直接返回建议
    return {
      id: `suggestion_${Date.now()}`,
      type: result.type,
      description: result.description,
      estimatedImpact: result.severity === 'high' ? 'high' : result.severity === 'medium' ? 'medium' : 'low',
      risk: result.risk,
      data: result.data
    };
  }
  
  /**
   * 执行优化
   */
  async executeOptimization(analysisId: string): Promise<void> {
    await this.aiControl.executeOptimization(analysisId);
  }
  
  /**
   * 获取游戏会话列表
   */
  async getGameSessions(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<GameSession[]> {
    const dataLayer = this.aiControl.getDataCollectionLayer();
    const tracker = dataLayer.getPlayerActionTracker();
    
    const sessions = tracker.getAllSessions();
    
    // 应用分页
    if (filters) {
      const offset = filters.offset || 0;
      const limit = filters.limit || 100;
      return sessions.slice(offset, offset + limit);
    }
    
    return sessions;
  }
  
  /**
   * 获取游戏会话详情
   */
  getGameSession(id: string): GameSession | undefined {
    const dataLayer = this.aiControl.getDataCollectionLayer();
    const tracker = dataLayer.getPlayerActionTracker();
    return tracker.getSession(id);
  }
  
  /**
   * 生成训练数据
   */
  async generateTrainingData(
    sessionIds: string[],
    format: 'json' | 'csv' | 'jsonl'
  ): Promise<string> {
    const dataLayer = this.aiControl.getDataCollectionLayer();
    const generator = dataLayer.getTrainingDataGenerator();
    const tracker = dataLayer.getPlayerActionTracker();
    
    // 获取会话
    const sessions = sessionIds
      .map(id => tracker.getSession(id))
      .filter((s): s is GameSession => s !== undefined);
    
    // 生成训练数据
    const allTrainingData = sessions.flatMap(s => 
      generator.generateFromSession(s)
    );
    
    // 导出
    return await generator.exportTrainingData(allTrainingData, format);
  }
  
  /**
   * 更新配置
   */
  async updateConfig(config: Partial<any>): Promise<void> {
    try {
      // 获取当前配置
      const currentConfig = (this.aiControl as any).getConfig();
      if (!currentConfig) {
        throw new Error('无法获取当前配置');
      }
      
      // 合并配置
      const newConfig = {
        ...currentConfig,
        ...config
      };
      
      // 更新配置（需要AIControlCenter支持动态配置更新）
      (this.aiControl as any).config = newConfig;
      
      // 如果监控已启动，需要重启以应用新配置
      const isMonitoring = (this.aiControl as any).getMonitoringStatus();
      if (isMonitoring) {
        this.aiControl.stopMonitoring();
        // 重新初始化监控层（需要AIControlCenter提供方法）
        // this.aiControl.reinitializeMonitoring();
        this.aiControl.startMonitoring();
      }
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 获取配置
   */
  getConfig(): any {
    try {
      return (this.aiControl as any).getConfig() || {};
    } catch (error) {
      return {};
    }
  }
  
  /**
   * 获取知识库历史
   */
  async getKnowledgeHistory(
    type: string,
    limit: number = 100
  ): Promise<any[]> {
    const knowledgeBase = this.aiControl.getKnowledgeBase();
    return await knowledgeBase.queryHistory(type, limit);
  }
  
  /**
   * 订阅事件
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.aiControl.on(event, handler);
  }
  
  /**
   * 取消订阅
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.aiControl.off(event, handler);
  }
}

// 单例实例
let interactionServiceInstance: InteractionService | null = null;

/**
 * 获取交互服务实例
 */
export function getInteractionService(): InteractionService {
  if (!interactionServiceInstance) {
    interactionServiceInstance = new InteractionService();
  }
  return interactionServiceInstance;
}

