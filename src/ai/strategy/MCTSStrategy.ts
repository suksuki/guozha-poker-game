/**
 * MCTS策略实现
 */

import { Card, Play } from '../../types/card';
import { IAIStrategy } from './IAIStrategy';
import { AIConfig, MCTSConfig } from '../types';
import { mctsChoosePlay } from '../mcts';

export class MCTSStrategy implements IAIStrategy {
  readonly name = 'mcts';
  readonly description = '蒙特卡洛树搜索算法（MCTS）';

  choosePlay(
    hand: Card[],
    lastPlay: Play | null,
    config: AIConfig
  ): Card[] | null {
    const mctsConfig: MCTSConfig = {
      iterations: config.mctsIterations,
      explorationConstant: 1.414,
      simulationDepth: 20,
      perfectInformation: config.perfectInformation || false,
      allPlayerHands: config.allPlayerHands,
      currentRoundScore: config.currentRoundScore || 0,
      playerCount: config.playerCount || 2,
      teamMode: config.teamMode || false,
      // 传递动态策略调整（如果存在）
      strategyAdjustments: (config as any).strategyAdjustments
    };
    
    return mctsChoosePlay(hand, lastPlay, mctsConfig);
  }
}

