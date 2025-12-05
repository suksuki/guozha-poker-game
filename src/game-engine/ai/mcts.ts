/**
 * MCTS算法模块（纯函数）
 * 
 * 从 src/ai/mcts/ 复用MCTS算法
 * 这些是纯函数，可以100%复用
 */

// 导出UCT算法
export { uctValue } from '../../ai/mcts/uct';
export { selectBestChild } from '../../ai/mcts/selection';

// 导出其他核心函数
export { expandNode } from '../../ai/mcts/expansion';
export { generateActions } from '../../ai/mcts/actions';
export { backpropagate } from '../../ai/mcts/backpropagation';
export { evaluateActionQuality, selectBestActionByHeuristic } from '../../ai/mcts/evaluation';
export { simulateGame, estimateOpponentHand } from '../../ai/mcts/simulation';

// 导出团队相关
export { teamMCTS, teamMCTSChooseMultiplePlays } from '../../ai/mcts/teamMCTS';
export { generateTeamActions, evaluateStrategicPass } from '../../ai/mcts/teamActions';
export { evaluateTeamAction, normalizeTeamScore } from '../../ai/mcts/teamEvaluation';
export { teamUCTValue, selectBestTeamChild } from '../../ai/mcts/teamUCT';
export { simulateTeamGame } from '../../ai/mcts/teamSimulation';

// 重新导出类型
export type {
  MCTSConfig,
  MCTSNode,
  SimulatedGameState,
  MCTSTeamConfig,
  TeamMCTSNode,
  TeamSimulatedGameState,
  TeamAction
} from '../../types';

