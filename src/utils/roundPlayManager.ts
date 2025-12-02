/**
 * 打牌轮管理模块
 * 负责管理每一轮打牌的开始、进行和结束逻辑
 */

import { Player, Play, RoundRecord, RoundPlayRecord } from '../types/card';
import { findNextActivePlayer } from './gameStateUtils';
import { hasPlayableCards } from '../utils/cardUtils';

/**
 * 打牌轮状态
 */
export interface RoundPlayState {
  roundNumber: number;
  currentPlayerIndex: number;
  lastPlay: Play | null;
  lastPlayPlayerIndex: number | null;
  roundScore: number;
  currentRoundPlays: RoundPlayRecord[];
  isRoundActive: boolean; // 是否正在进行中
  roundStartTime?: number; // 轮次开始时间
}

/**
 * 打牌轮管理器
 */
export class RoundPlayManager {
  private state: RoundPlayState;

  constructor(initialState?: Partial<RoundPlayState>) {
    this.state = {
      roundNumber: initialState?.roundNumber ?? 1,
      currentPlayerIndex: initialState?.currentPlayerIndex ?? 0,
      lastPlay: initialState?.lastPlay ?? null,
      lastPlayPlayerIndex: initialState?.lastPlayPlayerIndex ?? null,
      roundScore: initialState?.roundScore ?? 0,
      currentRoundPlays: initialState?.currentRoundPlays ?? [],
      isRoundActive: initialState?.isRoundActive ?? true,
      roundStartTime: initialState?.roundStartTime ?? Date.now()
    };
  }

  /**
   * 获取当前轮次状态
   */
  getState(): RoundPlayState {
    return { ...this.state };
  }

  /**
   * 开始新轮次
   * @param winnerIndex 上一轮赢家索引
   * @param players 玩家列表
   * @param playerCount 玩家总数
   */
  startNewRound(winnerIndex: number, players: Player[], playerCount: number): {
    currentPlayerIndex: number;
    roundNumber: number;
  } {
    // 检查是否所有玩家都出完了
    const allFinished = players.every(p => p.hand.length === 0);
    if (allFinished) {
      throw new Error('无法开始新轮次：所有玩家都已出完牌，应该结束游戏');
    }

    // 确定新轮次开始玩家
    let nextActivePlayerIndex: number | null;
    if (players[winnerIndex]?.hand.length > 0) {
      nextActivePlayerIndex = winnerIndex;
    } else {
      nextActivePlayerIndex = findNextActivePlayer(winnerIndex, players, playerCount);
    }

    if (nextActivePlayerIndex === null) {
      throw new Error('无法找到新轮次开始玩家：所有玩家都已出完牌');
    }

    // 验证找到的玩家确实还有手牌
    if (players[nextActivePlayerIndex].hand.length === 0) {
      throw new Error(`新轮次开始玩家 ${nextActivePlayerIndex} 没有手牌，这是不应该发生的`);
    }

    // 更新状态
    this.state = {
      roundNumber: this.state.roundNumber + 1,
      currentPlayerIndex: nextActivePlayerIndex,
      lastPlay: null,
      lastPlayPlayerIndex: null,
      roundScore: 0,
      currentRoundPlays: [],
      isRoundActive: true,
      roundStartTime: Date.now()
    };


    return {
      currentPlayerIndex: this.state.currentPlayerIndex,
      roundNumber: this.state.roundNumber
    };
  }

  /**
   * 处理玩家出牌
   * @param playerIndex 出牌玩家索引
   * @param play 出的牌
   * @param playRecord 出牌记录
   * @param playScore 这一手牌的分值
   * @param players 玩家列表
   * @param playerCount 玩家总数
   */
  handlePlayerPlay(
    playerIndex: number,
    play: Play,
    playRecord: RoundPlayRecord,
    playScore: number,
    players: Player[],
    playerCount: number
  ): {
    updatedState: RoundPlayState;
    nextPlayerIndex: number | null;
    shouldEndRound: boolean;
  } {
    // 更新轮次分数
    this.state.roundScore += playScore;
    this.state.currentRoundPlays.push(playRecord);

    // 更新最后出牌信息
    this.state.lastPlay = play;
    this.state.lastPlayPlayerIndex = playerIndex;

    // 计算下一个玩家
    const nextPlayerIndex = findNextActivePlayer(playerIndex, players, playerCount);

    // 检查是否应该结束轮次
    const shouldEndRound = this.checkShouldEndRound(players, playerIndex, play);

    return {
      updatedState: { ...this.state },
      nextPlayerIndex,
      shouldEndRound
    };
  }

  /**
   * 检查是否应该结束轮次
   * 条件：玩家出完牌且所有剩余玩家都要不起
   */
  private checkShouldEndRound(players: Player[], playerIndex: number, play: Play): boolean {
    // 检查出牌玩家是否已出完
    const playerFinished = players[playerIndex]?.hand.length === 0;
    if (!playerFinished) {
      return false;
    }

    // 检查所有剩余玩家是否都要不起
    for (let i = 0; i < players.length; i++) {
      if (i !== playerIndex && players[i].hand.length > 0) {
        if (hasPlayableCards(players[i].hand, play)) {
          return false; // 有人能打过，不结束轮次
        }
      }
    }

    // 所有剩余玩家都要不起，应该结束轮次
    return true;
  }

  /**
   * 结束当前轮次
   * @param players 玩家列表
   * @param playerCount 玩家总数
   * @param allRounds 所有轮次记录
   */
  endRound(
    players: Player[],
    playerCount: number,
    allRounds: RoundRecord[] = []
  ): {
    roundRecord: RoundRecord;
    updatedPlayers: Player[];
    updatedAllRounds: RoundRecord[];
    nextRoundStartPlayer: number;
  } {
    // 确定赢家（最后出牌的人）
    const winnerIndex = this.state.lastPlayPlayerIndex;
    if (winnerIndex === null) {
      throw new Error('无法结束轮次：没有最后出牌玩家');
    }

    const winner = players[winnerIndex];
    if (!winner) {
      throw new Error(`无法结束轮次：赢家索引 ${winnerIndex} 无效`);
    }

    // 创建轮次记录
    const roundRecord: RoundRecord = {
      roundNumber: this.state.roundNumber,
      plays: [...this.state.currentRoundPlays],
      totalScore: this.state.roundScore,
      winnerId: winnerIndex,
      winnerName: winner.name
    };

    // 更新玩家分数
    const updatedPlayers = [...players];
    if (this.state.roundScore > 0) {
      updatedPlayers[winnerIndex] = {
        ...winner,
        score: (winner.score || 0) + this.state.roundScore,
        wonRounds: [...(winner.wonRounds || []), roundRecord]
      };
    }

    // 保存轮次记录
    const updatedAllRounds = [...allRounds, roundRecord];

    // 确定下一轮开始玩家
    let nextRoundStartPlayer: number;
    if (updatedPlayers[winnerIndex]?.hand.length > 0) {
      nextRoundStartPlayer = winnerIndex;
    } else {
      const nextPlayer = findNextActivePlayer(winnerIndex, updatedPlayers, playerCount);
      if (nextPlayer === null) {
        throw new Error('无法确定下一轮开始玩家：所有玩家都已出完牌');
      }
      nextRoundStartPlayer = nextPlayer;
    }

    // 标记轮次结束
    this.state.isRoundActive = false;
    return {
      roundRecord,
      updatedPlayers,
      updatedAllRounds,
      nextRoundStartPlayer
    };
  }

  /**
   * 处理玩家要不起
   * 检查是否所有玩家都要不起，如果是则结束轮次
   */
  handlePlayerPass(
    playerIndex: number,
    players: Player[],
    playerCount: number
  ): {
    shouldEndRound: boolean;
    nextPlayerIndex: number | null;
  } {
    // 如果当前没有最后出牌，说明是接风状态，不需要结束轮次
    if (this.state.lastPlayPlayerIndex === null || this.state.lastPlay === null) {
      const nextPlayerIndex = findNextActivePlayer(playerIndex, players, playerCount);
      return {
        shouldEndRound: false,
        nextPlayerIndex
      };
    }

    // 计算下一个玩家
    const nextPlayerIndex = findNextActivePlayer(playerIndex, players, playerCount);

    // 如果下一个玩家是最后出牌的人，说明所有玩家都要不起，应该结束轮次
    const shouldEndRound = nextPlayerIndex === this.state.lastPlayPlayerIndex;

    return {
      shouldEndRound,
      nextPlayerIndex
    };
  }

  /**
   * 检查是否是接风状态（所有剩余玩家都要不起）
   */
  checkTakeover(players: Player[], currentPlayerIndex: number, lastPlay: Play | null): boolean {
    if (lastPlay === null) {
      return false; // 没有最后出牌，不是接风
    }

    // 检查所有剩余玩家是否都要不起
    for (let i = 0; i < players.length; i++) {
      if (i !== currentPlayerIndex && players[i].hand.length > 0) {
        if (hasPlayableCards(players[i].hand, lastPlay)) {
          return false; // 有人能打过，不是接风
        }
      }
    }

    return true; // 所有剩余玩家都要不起，是接风
  }

  /**
   * 更新当前玩家索引（用于播报完成后的状态更新）
   */
  updateCurrentPlayerIndex(nextPlayerIndex: number): void {
    this.state.currentPlayerIndex = nextPlayerIndex;
  }

  /**
   * 重置状态（用于游戏重新开始）
   */
  reset(): void {
    this.state = {
      roundNumber: 1,
      currentPlayerIndex: 0,
      lastPlay: null,
      lastPlayPlayerIndex: null,
      roundScore: 0,
      currentRoundPlays: [],
      isRoundActive: true,
      roundStartTime: Date.now()
    };
  }
}

