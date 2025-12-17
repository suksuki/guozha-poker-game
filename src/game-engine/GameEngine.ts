/**
 * GameEngine - 游戏引擎（Facade层）
 * 
 * 职责：
 * - 协调各个模块（RoundModule, ScoreModule, Rules等）
 * - 提供统一的游戏操作API
 * - 处理复杂的业务流程
 * 
 * 设计原则：
 * - 纯函数，无副作用
 * - 接受state，返回newState
 * - 不持有状态
 */

import { GameState } from './state/GameState';
import { RoundModule, RoundData } from './round';
import { GameFlowModule } from './modules/GameFlowModule';
import type { Card, Play } from '../types/card';
import { hasPlayableCards, getCardType, findPlayableCards } from '../utils/cardUtils';

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
 * 游戏引擎
 */
/**
 * 玩家位置映射（按顺时针：东→南→西→北）
 * 物理索引：0=南, 1=东, 2=北, 3=西
 * 游戏顺序：1(东) → 0(南) → 3(西) → 2(北) → 1(东)
 */
const PLAYER_ORDER = [1, 0, 3, 2]; // [东, 南, 西, 北]
const REVERSE_ORDER: number[] = []; // 反向映射
PLAYER_ORDER.forEach((orderIdx, physicalIdx) => {
  REVERSE_ORDER[orderIdx] = physicalIdx;
});

/**
 * 将物理索引转换为游戏顺序索引
 */
function toGameOrder(physicalIndex: number): number {
  return REVERSE_ORDER[physicalIndex] ?? physicalIndex;
}

/**
 * 将游戏顺序索引转换为物理索引
 */
function toPhysicalIndex(gameOrderIndex: number): number {
  return PLAYER_ORDER[gameOrderIndex] ?? gameOrderIndex;
}

/**
 * 获取顺时针下一个玩家（按游戏顺序：东→南→西→北）
 */
function getNextPlayerInOrder(currentPhysicalIndex: number, playerCount: number): number {
  const currentGameOrder = toGameOrder(currentPhysicalIndex);
  const nextGameOrder = (currentGameOrder + 1) % playerCount;
  return toPhysicalIndex(nextGameOrder);
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
        
        console.log(`🎉 ${updatedPlayer.name} 出完牌！排名：第${rank}名`);
      }
      
      // 检查游戏是否结束（在切换玩家前）
      if (GameFlowModule.checkGameEnd(newState)) {
        newState = GameFlowModule.endGame(newState, newState.finishOrder[0]);
        console.log('🎊 游戏结束！');
        return { newState, success: true, message: '出牌成功，游戏结束' };
      }
      
      // 切换到下一个玩家（顺时针：东→南→西→北）
      let nextPlayerIndex = getNextPlayerInOrder(playerIndex, newState.players.length);
      let attempts = 0;
      
      console.log(`🔄 [出牌后] 玩家${playerIndex}(${newState.players[playerIndex].name}) -> 玩家${nextPlayerIndex}(${newState.players[nextPlayerIndex].name})（顺时针：东→南→西→北）`);
      
      // 跳过已完成的玩家
      while (newState.players[nextPlayerIndex].hand.length === 0 && attempts < newState.players.length) {
        nextPlayerIndex = getNextPlayerInOrder(nextPlayerIndex, newState.players.length);
        attempts++;
      }
      
      console.log(`✅ 下一个出牌者: 玩家${nextPlayerIndex}(${newState.players[nextPlayerIndex].name})`);
      newState = newState.updateCurrentPlayer(nextPlayerIndex);
      
      return { newState, success: true, message: '出牌成功' };
      
    } catch (error: any) {
      console.error('❌ GameEngine.playCards失败:', error);
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
      const hasPlayable = this.hasPlayableCards(state, playerIndex);
      
      if (hasPlayable) {
        return { 
          newState: state, 
          success: false, 
          error: '个人赛规则：有牌可出时不能不要！必须出牌！' 
        };
      }
      
      // 接风轮不能不要
      if (currentRound.isTakeoverRound) {
        return { newState: state, success: false, error: '接风轮必须出牌' };
      }
      
      // 调用RoundModule处理不要
      const result = RoundModule.processPass(
        currentRound,
        playerIndex,
        state.players
      );
      
      let newState = state;
      newState = newState.updateRound(state.currentRoundIndex, result.updatedRound);
      
      // 如果触发接风轮，处理接风逻辑（不一定结束回合！）
      if (result.isTakeover) {
        console.log(`🎯 触发接风轮！`);
        newState = this.handleTakeover(newState);
      } else {
        // 切换到下一个玩家（顺时针：东→南→西→北）
        let nextPlayerIndex = getNextPlayerInOrder(playerIndex, newState.players.length);
        let attempts = 0;
        
        console.log(`🔄 [不要后] 玩家${playerIndex}(${newState.players[playerIndex].name}) -> 玩家${nextPlayerIndex}(${newState.players[nextPlayerIndex].name})（顺时针：东→南→西→北）`);
        
        while (newState.players[nextPlayerIndex].hand.length === 0 && attempts < newState.players.length) {
          nextPlayerIndex = getNextPlayerInOrder(nextPlayerIndex, newState.players.length);
          attempts++;
        }
        
        // 检查是否所有剩余玩家都无法压过（避免死循环）
        const currentRound = this.getCurrentRound(newState);
        if (currentRound && currentRound.lastPlay && currentRound.lastPlay.length > 0) {
          const lastPlayCards = currentRound.lastPlay;
          const cardType = getCardType(lastPlayCards);
          if (cardType) {
            const lastPlay: Play = {
              cards: lastPlayCards,
              type: cardType.type,
              value: cardType.value
            };
            
            // 检查下一个玩家是否能压过
            const nextPlayer = newState.players[nextPlayerIndex];
            const canBeat = hasPlayableCards(nextPlayer.hand, lastPlay);
            
            if (!canBeat) {
              // 检查是否已经循环了一圈（所有剩余玩家都不能压）
              let allCannotBeat = true;
              let checkIdx = nextPlayerIndex;
              for (let i = 0; i < newState.players.length; i++) {
                const player = newState.players[checkIdx];
                if (player.hand.length > 0) {
                  if (hasPlayableCards(player.hand, lastPlay)) {
                    allCannotBeat = false;
                    break;
                  }
                }
                // 按顺时针顺序检查下一个玩家
                checkIdx = getNextPlayerInOrder(checkIdx, newState.players.length);
                if (checkIdx === nextPlayerIndex) break; // 避免无限循环
              }
              
              if (allCannotBeat && currentRound.lastPlayPlayerIndex !== null) {
                // 所有剩余玩家都不能压，触发接风
                console.log(`🚨 所有剩余玩家都无法压过lastPlay，自动触发接风！`);
                newState = this.handleTakeover(newState);
                return { newState, success: true, message: '不要，触发接风' };
              }
            }
          }
        }
        
        console.log(`✅ 下一个出牌者: 玩家${nextPlayerIndex}(${newState.players[nextPlayerIndex].name})`);
        newState = newState.updateCurrentPlayer(nextPlayerIndex);
      }
      
      return { newState, success: true, message: '不要' };
      
    } catch (error: any) {
      console.error('❌ GameEngine.pass失败:', error);
      return { newState: state, success: false, error: error.message };
    }
  }
  
  /**
   * 处理接风（不一定开启新轮！）
   */
  private static handleTakeover(state: GameState): GameState {
    const currentRound = this.getCurrentRound(state);
    if (!currentRound) return state;
    
    const winnerIndex = currentRound.lastPlayPlayerIndex || 0;
    const winner = state.players[winnerIndex];
    
    console.log('🏆 触发接风！赢家:', winner.name);
    
    // 1. 赢家获得本轮所有手牌分（5/10/K）
    const roundScore = currentRound.roundScore || 0;
    let newState = state;
    let winnerNewScore = (winner.score || 0) + roundScore;
    
    console.log(`💰 ${winner.name} 获得本轮手牌分: ${roundScore}分`);
    
    // 2. 结算本轮所有墩分
    console.log('🏆 开始结算墩分...');
    const roundPlays = currentRound.plays;
    
    roundPlays.forEach(play => {
      if (play.cards.length >= 7) {
        const dunCount = Math.pow(2, play.cards.length - 7);
        const dunPlayerScore = dunCount * 30 * 3;
        const otherPlayersScore = dunCount * 30;
        
        console.log(`🏆 玩家${play.playerId}出${play.cards.length}张(${dunCount}墩), +${dunPlayerScore}分，其他人各-${otherPlayersScore}分`);
        
        if (play.playerId === winnerIndex) {
          winnerNewScore += dunPlayerScore;
        } else {
          const dunPlayer = newState.players[play.playerId];
          const dunPlayerNewScore = (dunPlayer.score || 0) + dunPlayerScore;
          newState = newState.updatePlayer(play.playerId, { score: dunPlayerNewScore });
        }
        
        newState.players.forEach((p, idx) => {
          if (idx !== play.playerId) {
            const playerScore = (p.score || 0) - otherPlayersScore;
            newState = newState.updatePlayer(idx, { score: playerScore });
          }
        });
      }
    });
    
    // 更新赢家分数
    newState = newState.updatePlayer(winnerIndex, { score: winnerNewScore });
    
    console.log(`✅ ${winner.name} 本轮最终得分: ${winnerNewScore}`);
    newState.players.forEach((p, idx) => {
      console.log(`   玩家${idx} ${p.name}: ${p.score}分, ${p.dunCount}墩, 手牌:${p.hand.length}张`);
    });
    
    // 3. 找下一个出牌者
    let nextPlayerIndex: number;
    let shouldStartNewRound = false;
    
    if (winner.hand.length > 0) {
      // 情况1: 赢家还有牌 → 赢家继续
      nextPlayerIndex = winnerIndex;
      shouldStartNewRound = true; // 赢家接风，开启新轮
      console.log(`♻️ ${winner.name}还有牌，开启新轮，清空lastPlay`);
    } else {
      // 情况2: 赢家已出完 → 找剩余活跃玩家
      console.log(`🔍 ${winner.name}已出完，寻找下一个出牌者...`);
      
      const activePlayers = newState.players.filter(p => p.hand.length > 0);
      const lastPlayCards = currentRound.lastPlay;
      
      console.log(`   剩余活跃玩家: ${activePlayers.map(p => p.name).join(', ')}`);
      
      if (lastPlayCards && lastPlayCards.length > 0) {
        // 检查是否有人能压过lastPlay
        const cardType = getCardType(lastPlayCards);
        if (cardType) {
          const lastPlay = {
            cards: lastPlayCards,
            type: cardType.type,
            value: cardType.value
          };
          
          // 2a: 寻找能压过的活跃玩家（按顺时针顺序：东→南→西→北）
          let foundPlayer: number | null = null;
          let checkIdx = getNextPlayerInOrder(winnerIndex, newState.players.length);
          for (let i = 0; i < newState.players.length; i++) {
            const player = newState.players[checkIdx];
            
            if (player.hand.length > 0) {
              const canBeat = hasPlayableCards(player.hand, lastPlay);
              console.log(`   检查玩家${checkIdx}(${player.name}): 能压过=${canBeat}`);
              
              if (canBeat) {
                foundPlayer = checkIdx;
                break;
              }
            }
            
            // 移动到下一个玩家（顺时针）
            checkIdx = getNextPlayerInOrder(checkIdx, newState.players.length);
            if (checkIdx === winnerIndex) break; // 避免无限循环
          }
          
          if (foundPlayer !== null) {
            // 2a: 有人能压 → 这一轮继续！
            nextPlayerIndex = foundPlayer;
            shouldStartNewRound = false;
            console.log(`✅ 玩家${foundPlayer}能压过，本轮继续，lastPlay保持`);
          } else {
            // 2b: 没人能压 → 新轮开始
            nextPlayerIndex = this.findNextActivePlayer(newState, winnerIndex);
            shouldStartNewRound = true;
            console.log(`🆕 没人能压过，新轮开始，清空lastPlay`);
          }
        } else {
          // lastPlay无效，开启新轮
          nextPlayerIndex = this.findNextActivePlayer(newState, winnerIndex);
          shouldStartNewRound = true;
        }
      } else {
        // 没有lastPlay，开启新轮
        nextPlayerIndex = this.findNextActivePlayer(newState, winnerIndex);
        shouldStartNewRound = true;
      }
    }
    
    // 4. 根据情况更新状态
    if (shouldStartNewRound) {
      // 结束当前轮
      const finishedRound = currentRound.finish({
        winnerId: winnerIndex,
        winnerName: winner.name
      });
      newState = newState.updateRound(state.currentRoundIndex, finishedRound);
      
      // 创建新轮（明确清空lastPlay）
      const newRound = new RoundData({ 
        roundNumber: newState.rounds.length + 1,
        lastPlay: null,  // 明确设置为null，确保首家判断正确
        lastPlayPlayerIndex: null
      });
      newState = newState.addRound(newRound);
      console.log(`🆕 新轮${newState.rounds.length}开始，玩家${nextPlayerIndex}首家出牌（lastPlay已清空）`);
    } else {
      // 本轮继续
      console.log(`♻️ 本轮继续，玩家${nextPlayerIndex}继续出牌`);
    }
    
    newState = newState.updateCurrentPlayer(nextPlayerIndex);
    
    return newState;
  }
  
  /**
   * 找下一个活跃玩家（顺时针：东→南→西→北）
   */
  private static findNextActivePlayer(state: GameState, fromIndex: number): number {
    // 从下一个玩家开始顺时针查找
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
    return state.currentRound;
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
      console.log(`🔍 [hasPlayableCards] 玩家${playerIndex}(${player?.name || '?'}): 无手牌，不能出`);
      return false; // 没手牌了，不能出
    }
    
    const currentRound = this.getCurrentRound(state);
    if (!currentRound) {
      console.log(`🔍 [hasPlayableCards] 玩家${playerIndex}(${player.name}): 无轮次，可以出`);
      return true; // 没有轮次，可以出
    }
    
    const lastPlayCards = currentRound.lastPlay;
    
    // 调试日志
    console.log(`🔍 [hasPlayableCards] 玩家${playerIndex}(${player.name}), lastPlay:`, 
      lastPlayCards ? `${lastPlayCards.length}张` : 'null', 
      `手牌数:${player.hand.length}`);
    
    // 首家：lastPlay为null或空数组
    if (!lastPlayCards || (Array.isArray(lastPlayCards) && lastPlayCards.length === 0)) {
      console.log(`  ✅ 首家（lastPlay=${lastPlayCards ? '[]' : 'null'}），可以出任何牌`);
      return true;
    }
    
    // 转换为Play对象
    const cardType = getCardType(lastPlayCards);
    if (!cardType) {
      console.log(`  ✅ lastPlay无效，可以出任何牌`);
      return true;
    }
    
    const lastPlay: Play = {
      cards: lastPlayCards,
      type: cardType.type,
      value: cardType.value
    };
    
    const canPlay = hasPlayableCards(player.hand, lastPlay);
    console.log(`  ${canPlay ? '✅' : '❌'} ${canPlay ? '有牌可出' : '无牌可出'}`);
    return canPlay;
  }
}

