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
}

export interface PassResult {
  updatedRound: RoundData;
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

    // 累加本回合分数
    updatedRound = new RoundData({
      ...updatedRound,
      roundScore: (updatedRound.roundScore || 0) + scoreGained
    });

    // 更新玩家手牌和墩数
    const updatedPlayers = players.map((p, idx) => {
      if (idx === playerIndex) {
        // 关键修复：计件移除算法，解决多副牌 ID 可能不一致的问题
        // 关键修复：计件移除算法，增加类型容错（防止 Rank 值作为 string 传入）
        let newHand = [...p.hand];

        for (const playedCard of cards) {
          const cardIdx = newHand.findIndex(h => {
            // 1. 完全一致匹配
            if (h.id === playedCard.id) return true;

            // 2. 特性匹配（容错：Rank 可能是 string 型数字，Suit 可能是 string）
            const rankMatch = String(h.rank) === String(playedCard.rank);
            const suitMatch = String(h.suit) === String(playedCard.suit);

            return rankMatch && suitMatch;
          });

          if (cardIdx !== -1) {
            newHand.splice(cardIdx, 1);
          } else {
            // 极其关键：如果有一张牌在手牌中找不到，说明算法/同步出问题了，拒绝此次出牌
            throw new Error(`玩家 ${p.name} 手中没有这出这张牌: ${playedCard.suit} ${playedCard.rank}`);
          }
        }

        // 如果出了墩，累加墩数
        const newDunCount = (p.dunCount || 0) + dunCount;


        return { ...p, hand: newHand, dunCount: newDunCount };
      }
      return p;
    });

    return {
      updatedRound,
      updatedPlayers,
      scoreGained
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

    return {
      updatedRound: roundData
    };
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
      type: 'unknown' as any,
      cards: roundData.lastPlay,
      value: 0
    });
  }

  /**
   * 获取轮次统计信息（纯函数）
   */
  static getRoundStats(roundData: RoundData) {
    return {
      playCount: roundData.getPlayCount(),
      totalScore: roundData.totalScore,
      duration: roundData.getDuration(),
      isFinished: roundData.isFinished
    };
  }
}

