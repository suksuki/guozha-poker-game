/**
 * AI Core 主导出文件
 * 统一的AI核心系统，完全独立于UI框架
 */

// 主大脑
export { MasterAIBrain } from './master-brain/MasterAIBrain';
export type { MasterBrainConfig, AIBehavior } from './master-brain/MasterAIBrain';

// AI玩家
export { AIPlayer } from './players/AIPlayer';

// 调度器
export { AIOrchestrator } from './orchestrator/AIOrchestrator';
export { CommunicationScheduler } from './orchestrator/CommunicationScheduler';
export { RoundController } from './orchestrator/RoundController';

// 认知层
export { SharedCognitiveLayer } from './cognitive/SharedCognitiveLayer';

// 基础设施
export { PerformanceMonitor } from './infrastructure/monitoring/PerformanceMonitor';
export { GameKnowledgeBase } from './infrastructure/knowledge/GameKnowledgeBase';
export { MasterDataCollector } from './infrastructure/data-collection/MasterDataCollector';
export { UnifiedLLMService } from './infrastructure/llm/UnifiedLLMService';

// 集成
export { GameBridge } from './integration/GameBridge';
export type { GameBridgeAPI } from './integration/GameBridge';
export { EventBus } from './integration/EventBus';

// 类型
export type {
  GameState,
  Decision,
  GameAction,
  CommunicationMessage,
  CommunicationIntent,
  Emotion,
  AIPlayerConfig,
  PersonalityConfig,
  AIEvent
} from './types';

// 基础设施类型
export type { PerformanceMetric, PerformanceStats } from './infrastructure/monitoring/types';
export type { KnowledgeEntry, StrategyPattern } from './infrastructure/knowledge/types';
export type { TrainingDataPoint, TrainingSession } from './infrastructure/data-collection/types';

