/**
 * AI Brain 主导出文件
 */

// 核心类
export { AIBrain } from './core/AIBrain';
export { CognitiveLayer } from './core/CognitiveLayer';
export { FusionLayer } from './core/FusionLayer';
export { ContextManager } from './core/ContextManager';
export type { Context } from './core/ContextManager';

// 核心类型
export type {
  // 游戏状态
  GameState,
  PlayRecord,
  GamePhase,
  
  // 决策
  Decision,
  GameAction,
  DecisionSource,
  RiskLevel,
  
  // 分析
  SituationAnalysis,
  StrategicIntent,
  PlayStyle,
  KeyFactor,
  Threat,
  Opportunity,
  TeamContext,
  PlayerStatus,
  CooperationOpportunity,
  
  // 通信
  CommunicationMessage,
  MessageType,
  MessageIntent,
  TacticalInfo,
  Emotion,
  
  // 配置
  BrainConfig,
  PersonalityConfig,
  ModuleConfigs,
  ModuleConfig,
  WeightRule,
  FusionConfig,
  CommunicationConfig,
  LearningConfig,
  PerformanceConfig,
  
  // 学习
  TrainingSample,
  GameOutcome,
  ExperienceSample,
  
  // 进化
  EvolutionInsight,
  DiscoveredPattern,
  Weakness,
  FailureCase,
  Improvement,
  OpponentStrategy,
  Statistics,
  
  // 状态
  BrainState,
  ModuleStatus,
  BrainMetrics,
  ModuleMetrics
} from './core/types';

// 模块接口
export type { 
  IDecisionModule,
  ModuleAnalysis,
  ActionSuggestion,
  LearningSample,
  ModuleStatistics
} from './modules/base/IDecisionModule';

export { BaseDecisionModule } from './modules/base/BaseDecisionModule';

// 配置
export {
  DEFAULT_BRAIN_CONFIG,
  AGGRESSIVE_CONFIG,
  CONSERVATIVE_CONFIG,
  BALANCED_CONFIG,
  ADAPTIVE_CONFIG,
  LLM_ENHANCED_CONFIG,
  PRESET_CONFIGS,
  getPresetConfig,
  mergeConfig,
  validateConfig,
  configFromPersonality
} from './config/BrainConfig';

// 工具函数
export * from './utils';

