/**
 * 决策模块接口
 * 所有决策模块必须实现此接口，确保统一的调用方式
 */

import { 
  GameState, 
  GameAction, 
  SituationAnalysis,
  ModuleConfig 
} from '../../core/types';

/**
 * 模块分析结果
 */
export interface ModuleAnalysis {
  // 局面分析
  analysis: SituationAnalysis;
  
  // 建议动作
  suggestions: ActionSuggestion[];
  
  // 置信度
  confidence: number;
  
  // 推理过程
  reasoning: string;
  
  // 计算时间
  computeTime: number;
  
  // 其他元信息
  metadata?: Record<string, any>;
}

/**
 * 动作建议
 */
export interface ActionSuggestion {
  action: GameAction;
  score: number;        // 评分
  confidence: number;   // 置信度
  reasoning: string;    // 推理说明
  expectedValue?: number;
}

/**
 * 决策模块接口
 */
export interface IDecisionModule {
  /**
   * 模块名称
   */
  readonly name: string;
  
  /**
   * 模块版本
   */
  readonly version: string;
  
  /**
   * 模块描述
   */
  readonly description: string;
  
  /**
   * 初始化模块
   * @param config 模块配置
   */
  initialize(config: ModuleConfig): Promise<void>;
  
  /**
   * 关闭模块，释放资源
   */
  shutdown(): Promise<void>;
  
  /**
   * 检查模块是否健康
   */
  healthCheck(): Promise<boolean>;
  
  /**
   * 分析当前局面
   * @param state 游戏状态
   * @returns 分析结果
   */
  analyze(state: GameState): Promise<ModuleAnalysis>;
  
  /**
   * 建议动作
   * @param state 游戏状态
   * @param topK 返回前K个建议
   * @returns 动作建议列表
   */
  suggest(state: GameState, topK?: number): Promise<ActionSuggestion[]>;
  
  /**
   * 评估一个动作的质量
   * @param state 游戏状态
   * @param action 待评估的动作
   * @returns 评分
   */
  evaluate(state: GameState, action: GameAction): Promise<number>;
  
  /**
   * 解释为什么选择某个动作
   * @param state 游戏状态
   * @param action 选择的动作
   * @returns 解释文本
   */
  explain(state: GameState, action: GameAction): Promise<string>;
  
  /**
   * 是否适用于当前局面
   * 某些模块可能只在特定情况下有效
   * @param state 游戏状态
   * @returns 是否适用
   */
  isApplicable(state: GameState): boolean;
  
  /**
   * 获取模块的当前权重建议
   * 模块可以根据自身情况建议权重
   * @param state 游戏状态
   * @returns 推荐权重 0-1
   */
  getRecommendedWeight(state: GameState): number;
  
  /**
   * 从经验中学习
   * @param samples 训练样本
   */
  learn?(samples: LearningSample[]): Promise<void>;
  
  /**
   * 获取模块统计信息
   */
  getStatistics(): ModuleStatistics;
  
  /**
   * 重置模块状态
   */
  reset(): void;
}

/**
 * 学习样本
 */
export interface LearningSample {
  state: GameState;
  action: GameAction;
  outcome: number;  // 结果评分
  feedback?: string;
}

/**
 * 模块统计信息
 */
export interface ModuleStatistics {
  totalCalls: number;
  totalTime: number;
  avgTime: number;
  successRate: number;
  lastUsed: number;
  [key: string]: any;
}

