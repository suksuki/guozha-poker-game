/**
 * 决策模块基类
 * 提供通用实现，子类只需实现核心逻辑
 */

import { 
  IDecisionModule, 
  ModuleAnalysis, 
  ActionSuggestion,
  ModuleStatistics,
  LearningSample
} from './IDecisionModule';
import { GameState, GameAction, ModuleConfig } from '../../core/types';

/**
 * 决策模块抽象基类
 */
export abstract class BaseDecisionModule implements IDecisionModule {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;
  
  protected config: ModuleConfig;
  protected initialized: boolean = false;
  protected statistics: ModuleStatistics;
  
  constructor() {
    this.config = {
      enabled: true,
      baseWeight: 0.5
    };
    
    this.statistics = {
      totalCalls: 0,
      totalTime: 0,
      avgTime: 0,
      successRate: 0,
      lastUsed: 0
    };
  }
  
  /**
   * 初始化模块（可被子类覆盖）
   */
  async initialize(config: ModuleConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    this.initialized = true;
    await this.onInitialize();
  }
  
  /**
   * 子类可覆盖的初始化钩子
   */
  protected async onInitialize(): Promise<void> {
    // 子类实现
  }
  
  /**
   * 关闭模块
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
    await this.onShutdown();
  }
  
  /**
   * 子类可覆盖的关闭钩子
   */
  protected async onShutdown(): Promise<void> {
    // 子类实现
  }
  
  /**
   * 健康检查（默认实现）
   */
  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
  
  /**
   * 分析局面（核心方法，子类必须实现）
   */
  async analyze(state: GameState): Promise<ModuleAnalysis> {
    this.checkInitialized();
    
    const startTime = Date.now();
    this.statistics.totalCalls++;
    
    try {
      const result = await this.performAnalysis(state);
      
      const computeTime = Date.now() - startTime;
      this.updateStatistics(computeTime, true);
      
      return {
        ...result,
        computeTime
      };
    } catch (error) {
      this.updateStatistics(Date.now() - startTime, false);
      throw error;
    }
  }
  
  /**
   * 子类实现具体的分析逻辑
   */
  protected abstract performAnalysis(state: GameState): Promise<ModuleAnalysis>;
  
  /**
   * 建议动作
   */
  async suggest(state: GameState, topK: number = 3): Promise<ActionSuggestion[]> {
    const analysis = await this.analyze(state);
    return analysis.suggestions.slice(0, topK);
  }
  
  /**
   * 评估动作
   */
  async evaluate(state: GameState, action: GameAction): Promise<number> {
    const suggestions = await this.suggest(state, 10);
    
    // 查找匹配的建议
    const matchingSuggestion = suggestions.find(s => 
      this.actionsEqual(s.action, action)
    );
    
    if (matchingSuggestion) {
      return matchingSuggestion.score;
    }
    
    // 如果没找到，返回默认评分
    return await this.performEvaluation(state, action);
  }
  
  /**
   * 子类可覆盖的评估方法
   */
  protected async performEvaluation(state: GameState, action: GameAction): Promise<number> {
    return 0.5; // 默认中等评分
  }
  
  /**
   * 解释动作
   */
  async explain(state: GameState, action: GameAction): Promise<string> {
    return await this.performExplanation(state, action);
  }
  
  /**
   * 子类实现具体的解释逻辑
   */
  protected abstract performExplanation(state: GameState, action: GameAction): Promise<string>;
  
  /**
   * 是否适用（默认总是适用）
   */
  isApplicable(state: GameState): boolean {
    return this.initialized && this.config.enabled;
  }
  
  /**
   * 获取推荐权重（默认使用配置的基础权重）
   */
  getRecommendedWeight(state: GameState): number {
    if (!this.isApplicable(state)) {
      return 0;
    }
    
    // 检查权重规则
    if (this.config.weightRules) {
      for (const rule of this.config.weightRules) {
        if (this.evaluateWeightRule(rule.condition, state)) {
          return rule.weight;
        }
      }
    }
    
    return this.config.baseWeight;
  }
  
  /**
   * 从经验学习（可选实现）
   */
  async learn?(samples: LearningSample[]): Promise<void> {
    // 子类可选实现
  }
  
  /**
   * 获取统计信息
   */
  getStatistics(): ModuleStatistics {
    return { ...this.statistics };
  }
  
  /**
   * 重置模块
   */
  reset(): void {
    this.statistics = {
      totalCalls: 0,
      totalTime: 0,
      avgTime: 0,
      successRate: 0,
      lastUsed: 0
    };
  }
  
  // ==================== 辅助方法 ====================
  
  /**
   * 检查是否已初始化
   */
  protected checkInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Module ${this.name} not initialized`);
    }
  }
  
  /**
   * 更新统计信息
   */
  protected updateStatistics(computeTime: number, success: boolean): void {
    this.statistics.totalTime += computeTime;
    this.statistics.avgTime = this.statistics.totalTime / this.statistics.totalCalls;
    this.statistics.lastUsed = Date.now();
    
    // 更新成功率（使用指数移动平均）
    const alpha = 0.1;
    const newValue = success ? 1 : 0;
    this.statistics.successRate = 
      alpha * newValue + (1 - alpha) * this.statistics.successRate;
  }
  
  /**
   * 判断两个动作是否相等
   */
  protected actionsEqual(a: GameAction, b: GameAction): boolean {
    if (a.type !== b.type) return false;
    
    if (a.type === 'pass') return true;
    
    if (a.type === 'play' && b.type === 'play') {
      if (a.cards.length !== b.cards.length) return false;
      
      // 简单比较：排序后逐个比较
      const sortedA = [...a.cards].sort((x, y) => x.rank - y.rank);
      const sortedB = [...b.cards].sort((x, y) => x.rank - y.rank);
      
      return sortedA.every((card, i) => 
        card.rank === sortedB[i].rank && card.suit === sortedB[i].suit
      );
    }
    
    return false;
  }
  
  /**
   * 评估权重规则
   */
  protected evaluateWeightRule(
    condition: string | ((state: GameState) => boolean),
    state: GameState
  ): boolean {
    if (typeof condition === 'function') {
      return condition(state);
    }
    
    // 字符串条件的简单评估
    switch (condition) {
      case 'early_game':
        return state.phase === 'early';
      case 'mid_game':
        return state.phase === 'middle';
      case 'late_game':
        return state.phase === 'late';
      case 'critical':
        return state.phase === 'critical';
      case 'team_mode':
        return state.teamMode;
      case 'solo_mode':
        return !state.teamMode;
      case 'complex_situation':
        return this.isComplexSituation(state);
      case 'simple_situation':
        return !this.isComplexSituation(state);
      default:
        return false;
    }
  }
  
  /**
   * 判断是否复杂局面
   */
  protected isComplexSituation(state: GameState): boolean {
    // 简单启发式判断
    const multipleOptions = state.myHand.length > 5;
    const hasLastPlay = state.lastPlay !== null;
    const teamMode = state.teamMode;
    
    return multipleOptions && (hasLastPlay || teamMode);
  }
  
  /**
   * 记录日志
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.name}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

