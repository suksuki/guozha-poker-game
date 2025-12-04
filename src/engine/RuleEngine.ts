/**
 * 规则引擎
 * 
 * 职责：
 * 1. 判断出牌是否合法
 * 2. 比较牌型大小
 * 3. 计算分数
 * 4. 游戏规则判断
 * 
 * 不负责：
 * - 游戏流程控制（在GameEngine）
 * - AI决策（在MasterAIBrain）
 * - 状态管理（在GameState）
 * 
 * 注：复用现有的cardUtils工具函数
 */

import { Card, Play, CardType } from '../types/card';
import { canBeat, isScoreCard, calculateCardsScore } from '../utils/cardUtils';

/**
 * 规则引擎类
 */
export class RuleEngine {
  
  /**
   * 判断是否可以出这些牌
   * @param cards 要出的牌
   * @param lastPlay 上一次出牌（null表示先出牌）
   * @returns 是否合法
   */
  canPlay(cards: Card[], lastPlay: Play | null): boolean {
    // 如果是第一次出牌（没有上家）
    if (!lastPlay) {
      return this.isValidPlay(cards);
    }
    
    // 需要能压过上家的牌
    const play = this.cardsToPlay(cards);
    if (!play) {
      return false;  // 不是合法牌型
    }
    
    return canBeat(play, lastPlay);
  }
  
  /**
   * 判断是否是合法牌型
   * @param cards 牌
   */
  isValidPlay(cards: Card[]): boolean {
    if (cards.length === 0) {
      return false;
    }
    
    // 单张
    if (cards.length === 1) {
      return true;
    }
    
    // 对子
    if (cards.length === 2) {
      return cards[0].rank === cards[1].rank;
    }
    
    // 三张
    if (cards.length === 3) {
      return cards.every(c => c.rank === cards[0].rank);
    }
    
    // 炸弹或墩（4张及以上）
    if (cards.length >= 4) {
      const allSameRank = cards.every(c => c.rank === cards[0].rank);
      return allSameRank;  // 必须是同点数
    }
    
    return false;
  }
  
  /**
   * 将卡牌转换为Play对象
   * @param cards 卡牌
   * @returns Play对象，如果不是合法牌型返回null
   */
  cardsToPlay(cards: Card[]): Play | null {
    if (!this.isValidPlay(cards)) {
      return null;
    }
    
    let type: CardType;
    let value: number;
    
    if (cards.length === 1) {
      type = CardType.SINGLE;
      value = cards[0].rank;
    } else if (cards.length === 2) {
      type = CardType.PAIR;
      value = cards[0].rank;
    } else if (cards.length === 3) {
      type = CardType.TRIPLE;
      value = cards[0].rank;
    } else if (cards.length >= 4 && cards.length < 7) {
      type = CardType.BOMB;
      value = cards[0].rank;
    } else {
      type = CardType.DUN;
      value = cards[0].rank;
    }
    
    return { cards, type, value };
  }
  
  /**
   * 计算分数
   * @param cards 牌
   * @returns 分数
   */
  calculateScore(cards: Card[]): number {
    const scoreCards = cards.filter(card => isScoreCard(card));
    return calculateCardsScore(scoreCards);
  }
  
  /**
   * 判断游戏是否应该结束
   * @param players 所有玩家
   * @returns 是否结束
   */
  shouldGameEnd(players: any[]): boolean {
    // 有玩家出完牌
    return players.some(p => p.hand.length === 0);
  }
  
  /**
   * 判断回合是否应该结束
   * @param passCount 连续Pass的次数
   * @param playerCount 玩家总数
   * @returns 是否结束
   */
  shouldRoundEnd(passCount: number, playerCount: number): boolean {
    // 其他所有玩家都Pass了
    return passCount >= playerCount - 1;
  }
}

