/**
 * AI模块主入口
 * 统一导出所有AI相关功能
 */

// 导出AI配置和主函数
export { aiChoosePlay } from '../utils/aiPlayer';

export {
  BeatsGenerator,
  getBeatsGenerator,
  type Beat,
  type BeatsStructure,
  type BeatsGenerationContext,
} from './beatsGenerator';

export {
  QuarrelService,
  getQuarrelService,
  type QuarrelConfig,
} from './quarrelService';
export type { AIConfig } from './types';

// 导出策略接口和实现
export type { IAIStrategy } from './strategy';
export { 
  MCTSStrategy, 
  SimpleStrategy, 
  LLMStrategy,
  getAIStrategy,
  registerStrategy,
  getAvailableStrategies
} from './strategy';

// 导出MCTS相关
export { mctsChoosePlay } from './mcts';
export type { MCTSConfig, MCTSNode, SimulatedGameState } from './types';

// 导出简单策略
export { simpleAIStrategy, analyzeHandStructure, evaluateHandValue, evaluatePlayOption } from './simpleStrategy';

// 导出类型
export type { HandStructure, PlayOption } from './types';

// 导出配置
export { 
  DEFAULT_AI_CONFIG,
  MCTS_CONFIG,
  FAST_MODE_CONFIG,
  HIGH_QUALITY_MODE_CONFIG,
  SIMPLE_MODE_CONFIG,
  DEFAULT_LLM_CONFIG,
  getAIConfigByMode,
  mergeAIConfig
} from '../config/aiConfig';
export type { LLMConfig } from '../config/aiConfig';

