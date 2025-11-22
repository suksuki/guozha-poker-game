/**
 * AI策略接口
 * 所有AI算法都需要实现这个接口，以便可以灵活替换
 */

import { Card, Play } from '../../types/card';
import { AIConfig } from '../types';

/**
 * AI策略接口
 * 定义了AI选择出牌的标准方法
 */
export interface IAIStrategy {
  /**
   * 选择出牌
   * @param hand 当前手牌
   * @param lastPlay 上家出牌（如果为null，表示可以自由出牌）
   * @param config AI配置
   * @returns 选择的牌，如果返回null表示要不起
   */
  choosePlay(
    hand: Card[],
    lastPlay: Play | null,
    config: AIConfig
  ): Promise<Card[] | null> | Card[] | null;
  
  /**
   * 策略名称
   */
  readonly name: string;
  
  /**
   * 策略描述
   */
  readonly description: string;
}

