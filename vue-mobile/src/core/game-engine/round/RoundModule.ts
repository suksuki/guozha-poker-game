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
import { Player, Card, RoundPlayRecord } from '@/core/types/card';
import { calculateCardsScore, hasPlayableCards } from '@/core/utils/cardUtils';

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
    
    // 计算本次出牌的分数（5/10/K）
    const scoreGained = calculateCardsScore(cards);
    
    // 计算墩数（如果出牌>=7张）
    const dunCount = cards.length >= 7 ? this.calculateDunCountInternal(cards.length) : 0;
    
    // 创建出牌记录
    const playRecord: RoundPlayRecord = {
      playerId: playerIndex,
      playerName: player.name,
      cards,
      scoreCards: cards.filter(c => calculateCardsScore([c]) > 0),
      score: scoreGained
    };
    
    // 添加出牌记录
    let updatedRound = roundData.addPlay(playRecord);
    
    // 累加本回合分数（重要：分数累加到roundScore，不是玩家score！）
    updatedRound = new RoundData({
      ...updatedRound,
      roundScore: (updatedRound.roundScore || 0) + scoreGained
    });
    
    
    // 更新玩家手牌和墩数（注意：不在这里更新分数！分数在回合结束时给赢家）
    const updatedPlayers = players.map((p, idx) => {
      if (idx === playerIndex) {
        // 从手牌中移除出的牌
        const newHand = p.hand.filter(
          handCard => !cards.some(playedCard => playedCard.id === handCard.id)
        );
        
        // 如果出了墩，累加墩数
        const newDunCount = (p.dunCount || 0) + dunCount;
        
        if (dunCount > 0) {
        }
        
        return { ...p, hand: newHand, dunCount: newDunCount };
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
    
    // 注意：不要在这里结束回合！
    // 回合应该在接风轮触发时结束（在processPass中处理）
    // 这里删除了错误的checkRoundEnd逻辑
    
    return {
      updatedRound,
      updatedPlayers,
      scoreGained,
      isRoundEnd: false // 回合不在这里结束
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
   * 计算墩数（内部方法）
   */
  private static calculateDunCountInternal(cardCount: number): number {
    if (cardCount < 7) return 0;
    // 7张=1墩, 8张=2墩, 9张=4墩, 10张=8墩...
    return Math.pow(2, cardCount - 7);
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
   * 找到下一个活跃玩家（纯函数，顺时针：东→南→西→北）
   */
  private static findNextActivePlayer(
    currentPlayerIndex: number,
    players: readonly Player[]
  ): number {
    // 玩家位置映射（按顺时针：东→南→西→北）
    // 物理索引：0=南, 1=东, 2=北, 3=西
    // 游戏顺序：1(东) → 0(南) → 3(西) → 2(北) → 1(东)
    const PLAYER_ORDER = [1, 0, 3, 2]; // [东, 南, 西, 北]
    const REVERSE_ORDER: number[] = []; // 反向映射
    PLAYER_ORDER.forEach((orderIdx, physicalIdx) => {
      REVERSE_ORDER[orderIdx] = physicalIdx;
    });
    
    const toGameOrder = (physicalIndex: number): number => REVERSE_ORDER[physicalIndex] ?? physicalIndex;
    const toPhysicalIndex = (gameOrderIndex: number): number => PLAYER_ORDER[gameOrderIndex] ?? gameOrderIndex;
    const getNextPlayerInOrder = (currentPhysicalIndex: number, playerCount: number): number => {
      const currentGameOrder = toGameOrder(currentPhysicalIndex);
      const nextGameOrder = (currentGameOrder + 1) % playerCount;
      return toPhysicalIndex(nextGameOrder);
    };
    
    const totalPlayers = players.length;
    let nextIndex = getNextPlayerInOrder(currentPlayerIndex, totalPlayers);
    
    for (let i = 0; i < totalPlayers; i++) {
      const nextPlayer = players[nextIndex];
      
      // 如果玩家还有牌，就是下一个活跃玩家
      if (nextPlayer.hand.length > 0) {
        return nextIndex;
      }
      
      nextIndex = getNextPlayerInOrder(nextIndex, totalPlayers);
      if (nextIndex === currentPlayerIndex) break; // 避免无限循环
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

