/**
 * GameEngine - 游戏引擎统一导出
 */

// 状态管理
export { GameState, StateManager } from './state';
export type { GameConfig, GameStateSnapshot, GameAction } from './state';

// 轮次管理
export { RoundData, RoundModule } from './round';
export type { RoundDataSnapshot, PlayResult, PassResult } from './round';

// 业务模块
export { RankingModule } from './modules/RankingModule';
export { TeamModule } from './modules/TeamModule';
export { ScoreModule } from './modules/ScoreModule';
export { DealingModule } from './modules/DealingModule';
export { GameFlowModule } from './modules/GameFlowModule';

// 工具
export * from './utils/card-utils';

// AI
export * from './ai/mcts';

