/**
 * 游戏控制器
 * 统一管理所有计分和排名逻辑
 * 其他组件只能通过调用控制器或订阅回调来交互
 */

import { Player, RoundRecord } from '../types/card';
import { calculateCardsScore, isScoreCard } from './cardUtils';
import { PlayerRanking, calculateFinalRankings, applyFinalGameRules } from './gameRules';

/**
 * 游戏控制器接口
 */
export interface GameControllerCallbacks {
  onScoreChange?: (playerIndex: number, newScore: number, reason: string) => void;
  onPlayerFinished?: (playerIndex: number, finishOrder: number[], finishedRank: number) => void;
  onRoundScoreAllocated?: (roundNumber: number, winnerIndex: number, roundScore: number) => void;
  onGameEnd?: (finalRankings: PlayerRanking[]) => void;
  onStateChange?: (state: any) => void;
}

/**
 * 游戏控制器
 * 统一管理计分和排名逻辑
 * 通过 Game 实例的方法更新状态
 */
export class GameController {
  private game: any; // Game 实例
  private callbacks: GameControllerCallbacks = {};

  constructor(game: any) {
    this.game = game;
  }

  /**
   * 订阅回调事件
   */
  subscribe(callbacks: GameControllerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 取消订阅
   */
  unsubscribe(): void {
    this.callbacks = {};
  }

  /**
   * 初始化游戏（设置初始玩家和分数）
   */
  initializeGame(players: Player[], initialScore: number = -100): void {
    // 确保 game 和 game.players 已初始化
    if (!this.game || !this.game.players) {
      return;
    }
    // 确保 game.players 已经设置（应该在 Game.initialize 中已经设置）
    if (this.game.players.length !== players.length) {
      return;
    }
    
    // 初始化玩家分数（通过 Game 的方法更新）
    players.forEach((_p, i) => {
      this.game.updatePlayer(i, {
        score: initialScore,
        wonRounds: [],
        finishedRank: null,
        dunCount: 0 // 初始化墩数为0
      });
    });
    
    this.game.updateFinishOrder([]);
    this.game.updateFinalRankings(undefined);
  }

  /**
   * 分配轮次分数（由 Round.end() 触发）
   * 这是分配轮次分数的唯一入口
   */
  allocateRoundScore(
    roundNumber: number,
    roundScore: number,
    winnerIndex: number | null,
    players: Player[],
    roundRecord: RoundRecord
  ): Player[] {
    if (!winnerIndex && winnerIndex !== 0) {
      console.warn(`[allocateRoundScore] 轮次${roundNumber}结束，但winnerIndex为null，无法分配分数`);
      return players;
    }

    // 使用 Game 中的最新玩家状态，而不是传入的 players（可能不是最新的）
    const currentPlayers = this.game.players;
    const winner = currentPlayers[winnerIndex];
    if (!winner) {
      console.warn(`[allocateRoundScore] 轮次${roundNumber}结束，但winnerIndex ${winnerIndex} 无效`);
      return currentPlayers;
    }

    // 使用最新的玩家分数来计算新分数
    const oldScore = winner.score || 0;
    const newScore = oldScore + roundScore;

    // 记录分数分配日志
    console.log(`[allocateRoundScore] 轮次${roundNumber}结束，${winner.name}获得${roundScore}分（从${oldScore}变为${newScore}）`);

    // 通过 Game 的方法更新玩家（使用最新的玩家状态）
    this.game.updatePlayer(winnerIndex, {
      score: newScore,
      wonRounds: [...(winner.wonRounds || []), roundRecord]
    });

    // 触发分数变化回调
    if (this.callbacks.onScoreChange) {
      this.callbacks.onScoreChange(winnerIndex, newScore, `轮次${roundNumber}接风分数`);
    }

    // 触发轮次分数分配回调
    if (this.callbacks.onRoundScoreAllocated) {
      this.callbacks.onRoundScoreAllocated(roundNumber, winnerIndex, roundScore);
    }

    // 触发游戏更新
    if (this.game.onUpdateCallback) {
      this.game.onUpdateCallback(this.game);
    }

    // 返回更新后的玩家数组（使用最新的 Game 状态）
    return this.game.players;
  }

  /**
   * 记录玩家出完牌（玩家出完牌时立即调用）
   * 
   * 流程：
   * 1. 根据算法确定玩家的争上游名次（finishedRank）
   * 2. 更新玩家的 finishedRank 状态
   * 3. 更新 finishOrder
   * 4. 触发 onUpdateCallback，让 React 自动更新 UI
   */
  recordPlayerFinished(
    playerIndex: number,
    players: Player[]
  ): {
    updatedPlayers: Player[];
    newFinishOrder: number[];
    finishedRank: number;
  } {
    // 如果已经在完成顺序中，不重复记录
    if (this.game.finishOrder.includes(playerIndex)) {
      const finishedRank = this.game.finishOrder.indexOf(playerIndex) + 1;
      return {
        updatedPlayers: players,
        newFinishOrder: this.game.finishOrder,
        finishedRank
      };
    }

    // ========== 步骤1：根据算法确定玩家的争上游名次 ==========
    // 算法：根据出完牌的顺序，第一个出完的是第1名，第二个出完的是第2名，以此类推
    const newFinishOrder = [...this.game.finishOrder, playerIndex];
    const finishedRank = newFinishOrder.length; // 争上游名次 = finishOrder 中的位置

    // ========== 步骤2：更新玩家的 finishedRank 状态 ==========
    // 通过 Game 的方法更新，确保状态统一管理
    this.game.updatePlayer(playerIndex, { finishedRank });
    
    // ========== 步骤3：更新 finishOrder ==========
    this.game.updateFinishOrder(newFinishOrder);

    // ========== 步骤4：触发更新回调，让 React 自动更新 UI ==========
    // 触发玩家完成回调（如果有其他订阅者需要知道）
    if (this.callbacks.onPlayerFinished) {
      this.callbacks.onPlayerFinished(playerIndex, newFinishOrder, finishedRank);
    }
    
    // 触发游戏更新回调，让 React 检测到状态变化并重新渲染
    if (this.game.onUpdateCallback) {
      this.game.onUpdateCallback(this.game);
    }

    // 返回更新后的玩家数组（用于兼容性）
    const updatedPlayers = [...this.game.players];
    updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], finishedRank };

    return {
      updatedPlayers,
      newFinishOrder,
      finishedRank
    };
  }

  /**
   * 处理最后一名玩家剩余分牌
   * 在游戏结束时，最后一名未出的分牌要给第二名
   */
  private handleLastPlayerRemainingScore(players: Player[]): Player[] {
    if (this.game.finishOrder.length < 2) {
      return players;
    }

    const lastPlayerIndex = this.game.finishOrder[this.game.finishOrder.length - 1];
    const lastPlayer = players[lastPlayerIndex];
    
    if (!lastPlayer || lastPlayer.hand.length === 0) {
      return players;
    }

    // 计算最后一名手中的分牌分数
    const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
    const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);

    if (lastPlayerRemainingScore === 0) {
      return players;
    }

    // 最后一名减去未出分牌的分数
    const lastPlayerOldScore = lastPlayer.score || 0;
    const lastPlayerNewScore = lastPlayerOldScore - lastPlayerRemainingScore;
    this.game.updatePlayer(lastPlayerIndex, { score: lastPlayerNewScore });
    
    if (this.callbacks.onScoreChange) {
      this.callbacks.onScoreChange(lastPlayerIndex, lastPlayerNewScore, '最后一名未出分牌扣除');
    }

    // 找到第二名（finishOrder中的第二个，即索引1）
    if (this.game.finishOrder.length >= 2) {
      const secondPlayerIndex = this.game.finishOrder[1];
      const secondPlayer = players[secondPlayerIndex];
      
      if (secondPlayer) {
        const secondPlayerOldScore = secondPlayer.score || 0;
        const secondPlayerNewScore = secondPlayerOldScore + lastPlayerRemainingScore;
        
        this.game.updatePlayer(secondPlayerIndex, { score: secondPlayerNewScore });
        
        if (this.callbacks.onScoreChange) {
          this.callbacks.onScoreChange(secondPlayerIndex, secondPlayerNewScore, '最后一名未出分牌转移');
        }
      }
    }

    return this.game.players;
  }

  /**
   * 计算最终分数和排名（游戏结束时调用）
   */
  calculateFinalScoresAndRankings(players: Player[]): {
    updatedPlayers: Player[];
    finalRankings: PlayerRanking[];
  } {
    // 先处理最后一名剩余分牌
    this.handleLastPlayerRemainingScore(players);

    // 计算最终排名和分数
    calculateFinalRankings(this.game.players, this.game.finishOrder);
    
    // 应用最终规则并更新玩家分数
    const result = applyFinalGameRules(this.game.players, this.game.finishOrder);
    
    // 通过 Game 的方法更新玩家和最终排名
    result.players.forEach((player, i) => {
      this.game.updatePlayer(i, {
        score: player.score,
        scoreRank: player.scoreRank
      });
    });
    
    this.game.updateFinalRankings(result.rankings);

    // 触发游戏结束回调
    if (this.callbacks.onGameEnd) {
      this.callbacks.onGameEnd(result.rankings);
      
      // 回调中触发游戏更新
      if (this.game.onUpdateCallback) {
        this.game.onUpdateCallback(this.game);
      }
    }

    return {
      updatedPlayers: this.game.players,
      finalRankings: result.rankings
    };
  }

  /**
   * 获取当前玩家列表
   */
  getPlayers(): Player[] {
    return [...this.game.players];
  }

  /**
   * 获取完成顺序
   */
  getFinishOrder(): number[] {
    return [...this.game.finishOrder];
  }

  /**
   * 获取最终排名
   */
  getFinalRankings(): PlayerRanking[] | null {
    return this.game.finalRankings ? [...this.game.finalRankings] : null;
  }

  /**
   * 获取玩家分数
   */
  getPlayerScore(playerIndex: number): number {
    const player = this.game.players[playerIndex];
    return player ? (player.score || 0) : 0;
  }

  /**
   * 重置控制器（游戏结束后重置）
   */
  reset(): void {
    this.callbacks = {};
  }
}

