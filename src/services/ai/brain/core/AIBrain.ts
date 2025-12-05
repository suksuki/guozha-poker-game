// @ts-nocheck
/**
 * AI Brain 核心类
 * 整个AI系统的中枢大脑，负责决策融合和整体协调
 */

import { 
  BrainConfig, 
  GameState, 
  Decision, 
  SituationAnalysis,
  CommunicationMessage,
  BrainState,
  ModuleStatus,
  BrainMetrics
} from './types';
import { IDecisionModule } from '../modules/base/IDecisionModule';
import { DEFAULT_BRAIN_CONFIG, mergeConfig, validateConfig } from '../config/BrainConfig';
import { CognitiveLayer } from './CognitiveLayer';
import { FusionLayer } from './FusionLayer';
import { ContextManager } from './ContextManager';

/**
 * AI大脑主类
 */
export class AIBrain {
  // 核心层
  private cognitiveLayer: CognitiveLayer;
  private fusionLayer: FusionLayer;
  private contextManager: ContextManager;
  
  // 决策模块注册表
  private modules: Map<string, IDecisionModule> = new Map();
  
  // 配置
  private config: BrainConfig;
  
  // 状态
  private initialized: boolean = false;
  private active: boolean = false;
  
  // 指标
  private metrics: BrainMetrics;
  
  // 版本
  public readonly version: string = '1.0.0';
  
  constructor(config?: Partial<BrainConfig>) {
    // 合并配置
    this.config = config 
      ? mergeConfig(DEFAULT_BRAIN_CONFIG, config)
      : DEFAULT_BRAIN_CONFIG;
    
    // 验证配置
    const validation = validateConfig(this.config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }
    
    // 初始化核心层
    this.cognitiveLayer = new CognitiveLayer();
    this.fusionLayer = new FusionLayer(this.config.fusion);
    this.contextManager = new ContextManager();
    
    // 初始化指标
    this.metrics = {
      totalDecisions: 0,
      avgDecisionTime: 0,
      winRate: 0,
      playerSatisfaction: 0,
      moduleMetrics: new Map()
    };
  }
  
  /**
   * 初始化AI大脑
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('AIBrain already initialized');
      return;
    }
    
    console.log('Initializing AIBrain...');
    
    // 初始化所有已注册的模块
    const initPromises = Array.from(this.modules.entries()).map(
      async ([name, module]) => {
        const moduleConfig = this.config.modules[name];
        if (moduleConfig?.enabled) {
          console.log(`Initializing module: ${name}`);
          await module.initialize(moduleConfig);
        }
      }
    );
    
    await Promise.all(initPromises);
    
    this.initialized = true;
    this.active = true;
    
    console.log('AIBrain initialized successfully');
  }
  
  /**
   * 关闭AI大脑
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    console.log('Shutting down AIBrain...');
    
    this.active = false;
    
    // 关闭所有模块
    const shutdownPromises = Array.from(this.modules.values()).map(
      module => module.shutdown()
    );
    
    await Promise.all(shutdownPromises);
    
    this.initialized = false;
    
    console.log('AIBrain shut down successfully');
  }
  
  /**
   * 注册决策模块
   */
  registerModule(name: string, module: IDecisionModule): void {
    if (this.modules.has(name)) {
      console.warn(`Module ${name} already registered, will be replaced`);
    }
    
    this.modules.set(name, module);
    console.log(`Module registered: ${name}`);
  }
  
  /**
   * 注销模块
   */
  unregisterModule(name: string): void {
    if (this.modules.has(name)) {
      this.modules.delete(name);
      console.log(`Module unregistered: ${name}`);
    }
  }
  
  /**
   * 获取模块
   */
  getModule(name: string): IDecisionModule | undefined {
    return this.modules.get(name);
  }
  
  /**
   * 获取所有模块名称
   */
  getModuleNames(): string[] {
    return Array.from(this.modules.keys());
  }
  
  /**
   * 做出决策（核心方法）
   */
  async makeDecision(gameState: GameState): Promise<Decision> {
    this.checkActive();
    
    const startTime = Date.now();
    
    try {
      // 1. 更新上下文
      this.contextManager.updateContext(gameState);
      
      // 2. 认知层分析局面
      const analysis = await this.cognitiveLayer.analyze(
        gameState,
        this.contextManager.getContext()
      );
      
      // 3. 收集各模块的建议
      const moduleSuggestions = await this.collectModuleSuggestions(
        gameState,
        analysis
      );
      
      // 4. 融合决策
      const decision = await this.fusionLayer.fuse(
        gameState,
        analysis,
        moduleSuggestions,
        this.config
      );
      
      // 5. 记录指标
      const computeTime = Date.now() - startTime;
      this.updateMetrics(decision, computeTime);
      
      // 6. 记录决策历史（用于学习）
      if (this.config.learning.collectData) {
        this.contextManager.recordDecision(gameState, decision);
      }
      
      return decision;
      
    } catch (error) {
      console.error('Error in makeDecision:', error);
      
      // 降级到后备模块
      return await this.fallbackDecision(gameState);
    }
  }
  
  /**
   * 生成通信消息
   */
  async generateMessage(
    gameState: GameState,
    type: 'tactical' | 'social' | 'taunt' | 'encourage'
  ): Promise<CommunicationMessage | null> {
    if (!this.config.communication.enabled) {
      return null;
    }
    
    // TODO: 实现消息生成逻辑
    // 这里需要集成通信模块
    return null;
  }
  
  /**
   * 执行动作（记录结果用于学习）
   */
  async executeAction(decision: Decision, gameState: GameState): Promise<void> {
    // 在这里可以记录动作执行的结果
    // 用于后续的学习和优化
    
    if (this.config.learning.collectData) {
      this.contextManager.recordActionExecution(decision, gameState);
    }
  }
  
  /**
   * 获取大脑状态
   */
  getState(): BrainState {
    const moduleStatuses = new Map<string, ModuleStatus>();
    
    for (const [name, module] of this.modules) {
      const config = this.config.modules[name];
      const stats = module.getStatistics();
      
      moduleStatuses.set(name, {
        name,
        enabled: config?.enabled || false,
        healthy: true,  // TODO: 实际健康检查
        currentWeight: config?.baseWeight || 0,
        metrics: stats
      });
    }
    
    return {
      initialized: this.initialized,
      active: this.active,
      currentConfig: this.config,
      modules: moduleStatuses,
      metrics: this.metrics,
      version: this.version,
      lastUpdate: Date.now()
    };
  }
  
  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<BrainConfig>): void {
    this.config = mergeConfig(this.config, newConfig);
    
    // 验证新配置
    const validation = validateConfig(this.config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }
    
    // 更新融合层配置
    this.fusionLayer.updateConfig(this.config.fusion);
    
    console.log('AIBrain config updated');
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): BrainConfig {
    return { ...this.config };
  }
  
  /**
   * 获取指标
   */
  getMetrics(): BrainMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 重置大脑
   */
  reset(): void {
    this.contextManager.clear();
    
    // 重置所有模块
    for (const module of this.modules.values()) {
      module.reset();
    }
    
    // 重置指标
    this.metrics = {
      totalDecisions: 0,
      avgDecisionTime: 0,
      winRate: 0,
      playerSatisfaction: 0,
      moduleMetrics: new Map()
    };
    
    console.log('AIBrain reset');
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 检查是否激活
   */
  private checkActive(): void {
    if (!this.initialized) {
      throw new Error('AIBrain not initialized');
    }
    
    if (!this.active) {
      throw new Error('AIBrain not active');
    }
  }
  
  /**
   * 收集各模块的建议
   */
  private async collectModuleSuggestions(
    gameState: GameState,
    analysis: SituationAnalysis
  ): Promise<Map<string, any>> {
    const suggestions = new Map();
    
    // 并行调用所有适用的模块
    const tasks = Array.from(this.modules.entries())
      .filter(([name, module]) => {
        const config = this.config.modules[name];
        return config?.enabled && module.isApplicable(gameState);
      })
      .map(async ([name, module]) => {
        try {
          const result = await this.callModuleWithTimeout(
            module,
            gameState,
            this.config.performance.timeout
          );
          
          return { name, result };
        } catch (error) {
          console.error(`Module ${name} failed:`, error);
          return { name, result: null };
        }
      });
    
    const results = await Promise.all(tasks);
    
    for (const { name, result } of results) {
      if (result) {
        suggestions.set(name, result);
      }
    }
    
    return suggestions;
  }
  
  /**
   * 带超时的模块调用
   */
  private async callModuleWithTimeout(
    module: IDecisionModule,
    gameState: GameState,
    timeout: number
  ): Promise<any> {
    return Promise.race([
      module.analyze(gameState),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Module timeout')), timeout)
      )
    ]);
  }
  
  /**
   * 降级决策（使用后备模块）
   */
  private async fallbackDecision(gameState: GameState): Promise<Decision> {
    const fallbackModuleName = this.config.performance.fallbackModule;
    const fallbackModule = this.modules.get(fallbackModuleName);
    
    if (!fallbackModule) {
      throw new Error('No fallback module available');
    }
    
    console.warn(`Using fallback module: ${fallbackModuleName}`);
    
    const analysis = await fallbackModule.analyze(gameState);
    const suggestions = analysis.suggestions;
    
    if (suggestions.length === 0) {
      // 最后的降级：Pass
      return {
        action: { type: 'pass' },
        confidence: 0.1,
        reasoning: 'Fallback: no suggestions available',
        alternatives: [],
        sources: [],
        fusionMethod: 'fallback',
        timestamp: Date.now(),
        computeTime: 0,
        expectedValue: 0,
        riskLevel: 'medium'
      };
    }
    
    return {
      action: suggestions[0].action,
      confidence: suggestions[0].confidence,
      reasoning: suggestions[0].reasoning,
      alternatives: suggestions.slice(1).map(s => s.action),
      sources: [{
        moduleName: fallbackModuleName,
        suggestion: suggestions[0].action,
        confidence: suggestions[0].confidence,
        weight: 1.0,
        reasoning: suggestions[0].reasoning
      }],
      fusionMethod: 'fallback',
      timestamp: Date.now(),
      computeTime: 0,
      expectedValue: suggestions[0].score || 0,
      riskLevel: 'medium'
    };
  }
  
  /**
   * 更新指标
   */
  private updateMetrics(decision: Decision, computeTime: number): void {
    this.metrics.totalDecisions++;
    
    // 更新平均决策时间
    const alpha = 0.1;  // 指数移动平均的权重
    this.metrics.avgDecisionTime = 
      alpha * computeTime + (1 - alpha) * this.metrics.avgDecisionTime;
    
    // 更新模块指标
    for (const source of decision.sources) {
      const module = this.modules.get(source.moduleName);
      if (module) {
        const stats = module.getStatistics();
        this.metrics.moduleMetrics.set(source.moduleName, stats);
      }
    }
  }
}
// @ts-nocheck
