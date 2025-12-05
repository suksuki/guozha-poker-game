/**
 * 玩家类
 * 
 * 职责：
 * 1. 存储玩家基本信息
 * 2. 管理玩家手牌
 * 3. 提供玩家操作接口
 * 
 * 不负责：
 * - AI决策（在MasterAIBrain）
 * - 游戏规则（在RuleEngine）
 * - 状态管理（在GameState）
 */

import { Card } from '../types/card';
import { IPlayer, PlayerType, PersonalityType } from './types';

/**
 * 玩家类
 */
export class Player implements IPlayer {
  /** 玩家ID */
  id: number;
  
  /** 玩家名称 */
  name: string;
  
  /** 玩家类型（人类/AI） */
  type: PlayerType;
  
  /** AI性格（仅AI玩家） */
  personality?: PersonalityType;
  
  /** 手牌 */
  hand: Card[];
  
  /** 当前分数 */
  score: number;
  
  /** 是否已出完牌 */
  finished: boolean;
  
  /**
   * 创建玩家
   * @param id 玩家ID
   * @param name 玩家名称
   * @param type 玩家类型
   * @param personality AI性格（可选）
   */
  constructor(
    id: number,
    name: string,
    type: PlayerType,
    personality?: PersonalityType
  ) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.personality = personality;
    this.hand = [];
    this.score = 0;
    this.finished = false;
    
    console.log(`[Player] 创建玩家${id}: ${name} (${type}${personality ? '-' + personality : ''})`);
  }
  
  // ==================== 手牌管理 ====================
  
  /**
   * 获取手牌数量
   */
  getHandSize(): number {
    return this.hand.length;
  }
  
  /**
   * 是否有牌
   */
  hasCards(): boolean {
    return this.hand.length > 0;
  }
  
  /**
   * 是否是AI
   */
  isAI(): boolean {
    return this.type === 'ai';
  }
  
  /**
   * 是否是人类
   */
  isHuman(): boolean {
    return this.type === 'human';
  }
  
  /**
   * 添加手牌
   * @param cards 要添加的牌
   */
  addCards(cards: Card[]): void {
    this.hand.push(...cards);
  }
  
  /**
   * 移除手牌
   * @param cards 要移除的牌
   */
  removeCards(cards: Card[]): void {
    this.hand = this.hand.filter(card => 
      !cards.some(c => c.id === card.id)
    );
  }
  
  /**
   * 清空手牌
   */
  clearHand(): void {
    this.hand = [];
  }
  
  // ==================== 分数管理 ====================
  
  /**
   * 增加分数
   * @param points 分数
   */
  addScore(points: number): void {
    this.score += points;
  }
  
  /**
   * 重置分数
   */
  resetScore(): void {
    this.score = 0;
  }
  
  // ==================== 状态管理 ====================
  
  /**
   * 标记为已出完牌
   */
  finish(): void {
    this.finished = true;
    console.log(`[Player] 玩家${this.id}出完牌`);
  }
  
  /**
   * 重置玩家状态
   */
  reset(): void {
    this.hand = [];
    this.score = 0;
    this.finished = false;
  }
  
  /**
   * 导出玩家数据
   */
  export(): IPlayer {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      personality: this.personality,
      hand: [...this.hand],
      score: this.score,
      finished: this.finished
    };
  }
}

