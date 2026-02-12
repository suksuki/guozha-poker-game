import { GameState } from './state/GameState';
import { RoundModule, RoundData } from './round';
import { GameFlowModule } from './modules/GameFlowModule';
import type { Card, Play, Player } from '@/core/types/card';
import { GameStatus } from '@/core/types/card';
import { hasPlayableCards, getCardType, findPlayableCards, canBeat } from '@/core/utils/cardUtils';
import { TeamModeStrategy } from '../utils/gameMode/TeamModeStrategy';
import { IndividualModeStrategy } from '../utils/gameMode/IndividualModeStrategy';

const teamStrategy = new TeamModeStrategy();
const individualStrategy = new IndividualModeStrategy();

function getStrategy(state: GameState) {
  return state.config.teamMode ? teamStrategy : individualStrategy;
}

/**
 * 游戏引擎操作结果
 */
export interface GameEngineResult {
  newState: GameState;
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * 获取逆时针下一个玩家索引（简单索引递增）
 */
function getNextPlayerInOrder(currentPhysicalIndex: number, playerCount: number): number {
  return (currentPhysicalIndex + 1) % playerCount;
}

export class GameEngine {

  /**
   * 出牌（统一入口）
   */
  static playCards(
    state: GameState,
    playerIndex: number,
    cards: Card[]
  ): GameEngineResult {
    try {
      const currentRound = this.getCurrentRound(state);
      if (!currentRound) {
        return { newState: state, success: false, error: '当前回合不存在' };
      }

      // 检查回合是否已结束
      if (currentRound.isFinished) {
        return { newState: state, success: false, error: '回合已结束' };
      }

      // 识别牌型
      const cardType = getCardType(cards);
      if (!cardType) {
        return { newState: state, success: false, error: '无效牌型' };
      }

      // 规则校验：必须压过上家
      const currentPlay: Play = { cards, type: cardType.type, value: cardType.value };
      const lastPlayCards = currentRound.lastPlay;
      let lastPlay: Play | null = null;

      if (lastPlayCards && lastPlayCards.length > 0) {
        const lastCardType = getCardType(lastPlayCards);
        if (lastCardType) {
          lastPlay = {
            cards: lastPlayCards,
            type: lastCardType.type,
            value: lastCardType.value
          };
        }
      }

      if (!canBeat(currentPlay, lastPlay)) {
        return { newState: state, success: false, error: '出牌无效：必须压过上家的牌' };
      }

      // 调用RoundModule处理出牌
      const result = RoundModule.processPlay(
        currentRound,
        playerIndex,
        cards,
        state.players
      );

      let newState = state;

      // 更新回合
      newState = newState.updateRound(state.currentRoundIndex, result.updatedRound);

      // 更新玩家（手牌和墩数）
      if (result.updatedPlayers && result.updatedPlayers.length > 0) {
        result.updatedPlayers.forEach((player, index) => {
          newState = newState.updatePlayer(index, player);
        });
      }

      // 检查玩家是否出完牌
      const updatedPlayer = newState.players[playerIndex];
      if (updatedPlayer.hand.length === 0) {
        newState = newState.addToFinishOrder(playerIndex);
        const rank = newState.finishOrder.length;
        newState = newState.updatePlayer(playerIndex, { finishedRank: rank });

      }

      // 检查游戏是否结束（在切换玩家前）
      const strategy = getStrategy(newState);
      const checkResult = strategy.shouldGameEnd(newState.players as Player[], [...newState.finishOrder], newState.teamConfig);

      if (checkResult.shouldEnd) {
        // 计算最终分数
        const finalResult = strategy.calculateFinalScores(
          newState.players as Player[],
          [...newState.finishOrder],
          newState.teamConfig
        );

        // 更新玩家分数
        finalResult.updatedPlayers.forEach((p: Player, i: number) => {
          newState = newState.updatePlayer(i, p);
        });

        newState = GameFlowModule.endGame(newState, newState.finishOrder[0]);

        if (finalResult.winningTeamId !== null && finalResult.winningTeamId !== undefined) {
          newState = newState.setWinningTeam(finalResult.winningTeamId);
        }
        if (finalResult.teamRankings) {
          newState = newState.setTeamRankings(finalResult.teamRankings);
        }

        return { newState, success: true, message: '出牌成功，游戏结束' };
      }

      // 判定下家（逆时针寻找下一个有牌的活跃玩家）
      const latestRound = this.getCurrentRound(newState);
      if (!latestRound) return { newState, success: true, message: '出牌成功' };

      let nextActiveIndex = getNextPlayerInOrder(playerIndex, newState.players.length);
      let cycleDetected = false;
      const winnerIndex = latestRound.lastPlayPlayerIndex;

      // 如果 raw 下家就是赢家，直接触发回环
      if (nextActiveIndex === winnerIndex) {
        cycleDetected = true;
      } else {
        // 否则跳过已出完牌的玩家，但在跳过过程中如果撞到了赢家，也算回环
        let attempts = 0;
        while (newState.players[nextActiveIndex].hand.length === 0 && attempts < newState.players.length) {
          if (nextActiveIndex === winnerIndex) {
            cycleDetected = true;
            break;
          }
          nextActiveIndex = getNextPlayerInOrder(nextActiveIndex, newState.players.length);
          attempts++;

          if (nextActiveIndex === winnerIndex) {
            cycleDetected = true;
            break;
          }
        }
      }

      if (cycleDetected) {
        newState = this.handleTakeover(newState);
      } else {
        if (newState.players[nextActiveIndex].hand.length === 0) {
          nextActiveIndex = this.findNextActivePlayer(newState, nextActiveIndex);
        }
        newState = newState.updateCurrentPlayer(nextActiveIndex);
      }

      return { newState, success: true, message: '出牌成功' };

    } catch (error: any) {
      return { newState: state, success: false, error: error.message };
    }
  }

  /**
   * 不要（统一入口）
   */
  static pass(
    state: GameState,
    playerIndex: number
  ): GameEngineResult {
    try {
      const currentRound = this.getCurrentRound(state);
      if (!currentRound) {
        return { newState: state, success: false, error: '当前回合不存在' };
      }

      // 检查回合是否已结束
      if (currentRound.isFinished) {
        return { newState: state, success: false, error: '回合已结束' };
      }

      // 首家不能不要
      if (!currentRound.lastPlay || currentRound.lastPlay.length === 0) {
        return { newState: state, success: false, error: '首家必须出牌' };
      }

      // TODO: 策略模式重构点
      // 个人赛：检查是否有牌可出
      // 团队赛允许过牌（战术需要）
      const shouldCheckPlayable = !state.config.teamMode;
      const hasPlayable = shouldCheckPlayable ? this.hasPlayableCards(state, playerIndex) : false;

      if (hasPlayable) {
        return {
          newState: state,
          success: false,
          error: '个人赛规则：有牌可出时不能不要！必须出牌！'
        };
      }


      // 调用RoundModule处理不要
      const result = RoundModule.processPass(
        currentRound,
        playerIndex,
        state.players
      );

      let newState = state;
      newState = newState.updateRound(state.currentRoundIndex, result.updatedRound);

      // 判定下家并检查回环
      const winnerIndex = currentRound.lastPlayPlayerIndex;
      let nextActiveIndex = getNextPlayerInOrder(playerIndex, newState.players.length);
      let cycleDetected = false;

      if (nextActiveIndex === winnerIndex) {
        cycleDetected = true;
      } else {
        let attempts = 0;
        while (newState.players[nextActiveIndex].hand.length === 0 && attempts < newState.players.length) {
          if (nextActiveIndex === winnerIndex) {
            cycleDetected = true;
            break;
          }
          nextActiveIndex = getNextPlayerInOrder(nextActiveIndex, newState.players.length);
          attempts++;
          if (nextActiveIndex === winnerIndex) {
            cycleDetected = true;
            break;
          }
        }
      }

      if (cycleDetected) {
        // 全场不要，回到了出牌人，触发本轮结束与权力继承
        newState = this.handleTakeover(newState);
      } else {
        newState = newState.updateCurrentPlayer(nextActiveIndex);
      }

      return { newState, success: true, message: '不要' };

    } catch (error: any) {
      return { newState: state, success: false, error: error.message };
    }
  }

  /**
   * 处理轮次结算与权力继承（接风逻辑）
   */
  private static handleTakeover(state: GameState): GameState {
    const currentRound = this.getCurrentRound(state);
    if (!currentRound) {
      return state;
    }

    const winnerIndex = currentRound.lastPlayPlayerIndex;
    if (winnerIndex === null) {
      return state;
    }

    const winner = state.players[winnerIndex];
    let newState = state;

    // 1. 结算分数（分牌分累加）
    const roundScore = currentRound.roundScore || 0;
    // 先给赢家加上分牌分数
    newState = newState.updatePlayer(winnerIndex, { 
      score: (winner.score || 0) + roundScore 
    });

    // 2. 结算墩分 (如果存在)
    // 规则：每个墩从每个其他玩家扣除30分，出墩的玩家增加 (其他玩家数 × 30分 × 墩数)
    currentRound.plays.forEach(play => {
      if (play.cards.length >= 7) {
        const dunCount = Math.pow(2, play.cards.length - 7);
        const totalPlayers = newState.players.length;
        const otherPlayersCount = totalPlayers - 1;
        
        // 出墩玩家获得的分数 = 其他玩家数 × 30分 × 墩数
        const dunPlayerScore = otherPlayersCount * 30 * dunCount;
        
        // 每个其他玩家扣除的分数 = 30分 × 墩数
        const otherPlayersScore = 30 * dunCount;

        // 给出墩的玩家加分（包括赢家，如果赢家也出了墩）
        const dunPlayer = newState.players[play.playerId];
        newState = newState.updatePlayer(play.playerId, { 
          score: (dunPlayer.score || 0) + dunPlayerScore 
        });

        // 从每个其他玩家扣除分数（包括赢家，如果赢家没有出墩）
        newState.players.forEach((p, idx) => {
          if (idx !== play.playerId) {
            newState = newState.updatePlayer(idx, { 
              score: (p.score || 0) - otherPlayersScore 
            });
          }
        });
      }
    });

    // 3. 寻找下一轮起始人（继承权）
    const strategy = getStrategy(newState);
    const currentWinner = newState.players[winnerIndex];
    let nextPlayerIndex: number | null = winnerIndex;

    if (currentWinner.hand.length === 0) {
      nextPlayerIndex = strategy.findNextPlayerForNewRound(
        winnerIndex,
        newState.players as any,
        newState.players.length,
        newState.teamConfig
      );
    }

    const gameEndResult = strategy.shouldGameEnd(newState.players as any, [...newState.finishOrder], newState.teamConfig);

    // 5. 结束当前轮次
    const finishedRound = currentRound.finish({
      winnerId: winnerIndex,
      winnerName: winner.name
    });
    newState = newState.updateRound(state.currentRoundIndex, finishedRound);

    if (gameEndResult.shouldEnd || nextPlayerIndex === null) {
      return newState.updateStatus(GameStatus.FINISHED).updateCurrentPlayer(-1);
    }

    const newRoundNum = newState.rounds.length + 1;
    const newRound = new RoundData({
      roundNumber: newRoundNum,
      lastPlay: null,
      lastPlayPlayerIndex: null
    });
    newState = newState.addRound(newRound);

    return newState.updateCurrentPlayer(nextPlayerIndex);
  }

  /**
   * 找下一个活跃玩家（逆时针：东→北→西→南）
   */
  private static findNextActivePlayer(state: GameState, fromIndex: number): number {
    // 从下一个玩家开始逆时针查找
    let nextIdx = getNextPlayerInOrder(fromIndex, state.players.length);
    for (let i = 0; i < state.players.length; i++) {
      if (state.players[nextIdx].hand.length > 0) {
        return nextIdx;
      }
      nextIdx = getNextPlayerInOrder(nextIdx, state.players.length);
      if (nextIdx === fromIndex) break; // 避免无限循环
    }
    return fromIndex; // 如果没找到，返回原索引
  }

  /**
   * 获取当前回合
   */
  static getCurrentRound(state: GameState): RoundData | null {
    return state.currentRound || null;
  }

  /**
   * 获取回合分数
   */
  static getRoundScore(state: GameState): number {
    return this.getCurrentRound(state)?.roundScore || 0;
  }

  /**
   * 检查是否有牌可出（便捷方法）
   */
  static hasPlayableCards(state: GameState, playerIndex: number): boolean {
    const player = state.players[playerIndex];
    if (!player || player.hand.length === 0) {
      return false; // 没手牌了，不能出
    }

    const currentRound = this.getCurrentRound(state);
    if (!currentRound) {
      return true; // 没有轮次，可以出
    }

    const lastPlayCards = currentRound.lastPlay;

    // 首家：lastPlay为null或空数组
    if (!lastPlayCards || (Array.isArray(lastPlayCards) && lastPlayCards.length === 0)) {
      return true;
    }

    // 转换为Play对象
    const cardType = getCardType(lastPlayCards);
    if (!cardType) {
      return true;
    }

    const lastPlay: Play = {
      cards: lastPlayCards,
      type: cardType.type,
      value: cardType.value
    };

    const canPlay = hasPlayableCards(player.hand, lastPlay);
    return canPlay;
  }
}

