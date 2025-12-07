/**
 * MCTS策略实现
 */

import { Card, Play } from '../../types/card';
import { IAIStrategy } from './IAIStrategy';
import { AIConfig, MCTSConfig } from '../types';
import { mctsChoosePlay } from '../mcts';
import { ParameterApplier } from '../../training/core/ParameterApplier';

export class MCTSStrategy implements IAIStrategy {
  readonly name = 'mcts';
  readonly description = '蒙特卡洛树搜索算法（MCTS）';

  choosePlay(
    hand: Card[],
    lastPlay: Play | null,
    config: AIConfig
  ): Card[] | null {
    // 获取训练后的参数（如果有）
    const trainedParams = ParameterApplier.getAppliedMCTSParams();
    
    // 构建MCTS配置，优先使用训练后的参数
    const mctsConfig: MCTSConfig = {
      iterations: trainedParams?.iterations ?? config.mctsIterations ?? 50,
      explorationConstant: trainedParams?.explorationConstant ?? 1.414,
      simulationDepth: trainedParams?.simulationDepth ?? 20,
      perfectInformation: trainedParams?.perfectInformation ?? config.perfectInformation ?? false,
      allPlayerHands: config.allPlayerHands,
      currentRoundScore: config.currentRoundScore || 0,
      playerCount: config.playerCount || 2,
      teamMode: config.teamMode || false
    };
    
    return mctsChoosePlay(hand, lastPlay, mctsConfig);
  }
}
