/**
 * RoundModule - 轮次业务逻辑（纯函数）
 * 
 * 职责：
 * - 处理出牌逻辑（processPlay）
 * - 处理要不起逻辑（processPass）
 * - 判断轮次结束（checkRoundEnd）
 * - 判断接风轮（checkTakeover）
 * 
 * 设计原则：
 * 1. 所有方法都是纯函数
 * 2. 接受状态作为输入，返回新状态
 * 3. 无副作用，无异步
 * 4. 易于测试
 */

import { RoundData } from './RoundData';
import { Player, Card, RoundPlayRecord } from '../../types/card';
import { calculateCardsScore, hasPlayableCards } from '../../utils/cardUtils';

/**
 * 出牌结果
 */
export interface PlayResult {
  updatedRound: RoundData;
  updatedPlayers: Player[];
  scoreGained: number;
  isRoundEnd: boolean;
}

/**
 * 要不起结果
 */
export interface PassResult {
  updatedRound: RoundData;
  isTakeover: boolean; // 是否进入接风轮
}

/**
 * RoundModule - 轮次业务逻辑模块
 */
export class RoundModule {
  
  /**
   * 处理出牌（纯函数）
   * 
   * @param roundData 当前轮次数据
   * @param playerIndex 出牌玩家索引
   * @param cards 出的牌
   * @param players 所有玩家
   * @returns 出牌结果
   */
  static processPlay(
    roundData: RoundData,
    playerIndex: number,
    cards: Card[],
    players: readonly Player[]
  ): PlayResult {
    // 验证
    if (roundData.isFinished) {
      throw new Error('轮次已结束，无法出牌');
    }
    
    if (playerIndex < 0 || playerIndex >= players.length) {
      throw new Error(`无效的玩家索引: ${playerIndex}`);
    }
    
    const player = players[playerIndex];
    
    // 计算分数
    const scoreGained = calculateCardsScore(cards);
    
    // 创建出牌记录
    const playRecord: RoundPlayRecord = {
      playerId: playerIndex,
      playerName: player.name,
      cards,
      scoreCards: cards.filter(c => calculateCardsScore([c]) > 0),
      score: scoreGained
    };
    
    // 更新轮次数据
    let updatedRound = roundData.addPlay(playRecord);
    
    // 更新玩家手牌
    const updatedPlayers = players.map((p, idx) => {
      if (idx === playerIndex) {
        // 从手牌中移除出的牌
        const newHand = p.hand.filter(
          handCard => !cards.some(playedCard => playedCard.id === handCard.id)
        );
        return { ...p, hand: newHand };
      }
      return p;
    });
    
    // 如果是接风轮，检查是否结束接风
    if (updatedRound.isTakeoverRound) {
      // 如果出牌者是接风终点，取消接风轮
      if (playerIndex === updatedRound.takeoverEndPlayerIndex) {
        updatedRound = updatedRound.updateTakeover({
          isTakeoverRound: false,
          takeoverStartPlayerIndex: null,
          takeoverEndPlayerIndex: null
        });
      }
    }
    
    // 检查轮次是否结束
    const isRoundEnd = this.checkRoundEnd(updatedRound, updatedPlayers);
    
    if (isRoundEnd) {
      // 找到获胜者（第一个出完的玩家）
      const winner = updatedPlayers.find(p => p.hand.length === 0);
      if (winner) {
        updatedRound = updatedRound.finish({
          winnerId: winner.id,
          winnerName: winner.name
        });
      }
    }
    
    return {
      updatedRound,
      updatedPlayers,
      scoreGained,
      isRoundEnd
    };
  }
  
  /**
   * 处理要不起（纯函数）
   * 
   * @param roundData 当前轮次数据
   * @param playerIndex 玩家索引
   * @param players 所有玩家
   * @returns 要不起结果
   */
  static processPass(
    roundData: RoundData,
    playerIndex: number,
    players: readonly Player[]
  ): PassResult {
    // 验证
    if (roundData.isFinished) {
      throw new Error('轮次已结束，无法要不起');
    }
    
    let updatedRound = roundData;
    let isTakeover = false;
    
    // 检查是否触发接风轮
    // 规则：如果要不起的玩家的下一个玩家就是上次出牌的人，进入接风轮
    if (roundData.lastPlayPlayerIndex !== null) {
      const nextPlayerIndex = this.findNextActivePlayer(playerIndex, players);
      
      if (nextPlayerIndex === roundData.lastPlayPlayerIndex) {
        // 进入接风轮：从刚要不起的玩家（playerIndex）开始，到出牌玩家为止
        updatedRound = updatedRound.updateTakeover({
          isTakeoverRound: true,
          takeoverStartPlayerIndex: playerIndex,
          takeoverEndPlayerIndex: roundData.lastPlayPlayerIndex
        });
        isTakeover = true;
      }
    }
    
    return {
      updatedRound,
      isTakeover
    };
  }
  
  /**
   * 检查轮次是否结束（纯函数）
   * 
   * 结束条件：有玩家出完所有牌
   * 
   * @param roundData 轮次数据
   * @param players 所有玩家
   * @returns 是否结束
   */
  static checkRoundEnd(
    roundData: RoundData,
    players: readonly Player[]
  ): boolean {
    // 如果有玩家手牌为空，轮次结束
    return players.some(p => p.hand.length === 0);
  }
  
  /**
   * 检查是否在接风轮中（纯函数）
   */
  static isInTakeoverRound(roundData: RoundData): boolean {
    return roundData.isTakeoverRound;
  }
  
  /**
   * 检查玩家是否可以出牌（纯函数）
   * 
   * @param roundData 轮次数据
   * @param playerIndex 玩家索引
   * @param players 所有玩家
   * @returns 是否可以出牌
   */
  static canPlayerPlay(
    roundData: RoundData,
    playerIndex: number,
    players: readonly Player[]
  ): boolean {
    if (roundData.isFinished) {
      return false;
    }
    
    const player = players[playerIndex];
    if (!player || player.hand.length === 0) {
      return false;
    }
    
    // 如果还没有人出牌，第一个玩家可以出任意牌
    if (roundData.lastPlay === null) {
      return true;
    }
    
    // 检查是否有可以打出的牌
    return hasPlayableCards(player.hand, {
      type: 'single' as any, // 临时类型
      cards: roundData.lastPlay,
      value: 0
    });
  }
  
  /**
   * 找到下一个活跃玩家（纯函数）
   */
  private static findNextActivePlayer(
    currentPlayerIndex: number,
    players: readonly Player[]
  ): number {
    const totalPlayers = players.length;
    
    for (let i = 1; i <= totalPlayers; i++) {
      const nextIndex = (currentPlayerIndex + i) % totalPlayers;
      const nextPlayer = players[nextIndex];
      
      // 如果玩家还有牌，就是下一个活跃玩家
      if (nextPlayer.hand.length > 0) {
        return nextIndex;
      }
    }
    
    // 如果没有活跃玩家，返回-1
    return -1;
  }
  
  /**
   * 获取轮次统计信息（纯函数）
   */
  static getRoundStats(roundData: RoundData) {
    return {
      playCount: roundData.getPlayCount(),
      totalScore: roundData.totalScore,
      duration: roundData.getDuration(),
      isFinished: roundData.isFinished,
      isTakeoverRound: roundData.isTakeoverRound
    };
  }
}

