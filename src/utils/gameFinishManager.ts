/**
 * 游戏完成管理器 - 兼容层
 * 为旧代码提供兼容接口，实际功能已迁移到 GameController
 */

import { GameController } from './gameController';
import { Player } from '../types/card';

/**
 * 处理玩家出完牌
 * @deprecated 请使用 GameController.recordPlayerFinished 代替
 */
export function handlePlayerFinished(
  players: Player[],
  playerIndex: number,
  handScore: number,
  roundScore: number,
  finishOrder: number[],
  findNextActivePlayer: (startIndex: number, players: Player[], playerCount: number) => number | null,
  playerCount: number,
  checkGameFinished: (players: Player[], finishOrder: number[]) => boolean
): {
  updatedPlayers: Player[];
  finishOrder: number[];
  isGameFinished: boolean;
} {
  // 为了兼容性，创建一个临时的 Game 对象和 Controller
  // 注意：这只是为了测试兼容性，实际使用应该直接使用 GameController
  const mockGame = {
    players,
    finishOrder,
    updatePlayer: (index: number, updates: Partial<Player>) => {
      players[index] = { ...players[index], ...updates };
    },
    updateFinishOrder: (newFinishOrder: number[]) => {
      finishOrder.length = 0;
      finishOrder.push(...newFinishOrder);
    },
    onUpdateCallback: null
  };

  const controller = new GameController(mockGame as any);
  
  // 更新分数
  if (handScore > 0 || roundScore > 0) {
    const currentScore = players[playerIndex].score || 0;
    mockGame.updatePlayer(playerIndex, { score: currentScore + handScore + roundScore });
  }
  
  // 记录玩家完成
  const result = controller.recordPlayerFinished(playerIndex, players);
  
  // 检查游戏是否结束
  const isGameFinished = checkGameFinished(result.updatedPlayers, result.newFinishOrder);
  
  return {
    updatedPlayers: result.updatedPlayers,
    finishOrder: result.newFinishOrder,
    isGameFinished
  };
}

