/**
 * MCTS算法主入口
 * 整合所有MCTS相关模块
 */

// 暂时从原文件导入mctsChoosePlay（MCTS主算法还未完全迁移）
export { mctsChoosePlay } from '../../utils/mctsAI';

// 导出模拟函数
export { simulateGame, estimateOpponentHand } from './simulation';

// 导出类型
export type { 
  MCTSConfig, 
  MCTSNode, 
  SimulatedGameState,
  MCTSTeamConfig,
  TeamMCTSNode,
  TeamSimulatedGameState,
  TeamAction
} from '../types';

// 导出核心函数（逐步迁移）
export { uctValue } from './uct';
export { selectBestChild } from './selection';
export { expandNode } from './expansion';
export { generateActions } from './actions';
export { evaluateActionQuality, selectBestActionByHeuristic } from './evaluation';
export { backpropagate } from './backpropagation';

// 导出团队MCTS函数
export { teamMCTS, teamMCTSChooseMultiplePlays } from './teamMCTS';
export { generateTeamActions, evaluateStrategicPass } from './teamActions';
export { evaluateTeamAction, normalizeTeamScore } from './teamEvaluation';
export { teamUCTValue, selectBestTeamChild } from './teamUCT';
export { simulateTeamGame } from './teamSimulation';

