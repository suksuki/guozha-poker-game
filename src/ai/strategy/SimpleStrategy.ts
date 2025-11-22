/**
 * 简单策略实现
 */

import { Card, Play } from '../../types/card';
import { IAIStrategy } from './IAIStrategy';
import { AIConfig } from '../types';
import { simpleAIStrategy } from '../simpleStrategy';

export class SimpleStrategy implements IAIStrategy {
  readonly name = 'simple';
  readonly description = '基于启发式规则的简单AI策略';

  choosePlay(
    hand: Card[],
    lastPlay: Play | null,
    config: AIConfig
  ): Card[] | null {
    const strategy = config.strategy || 'balanced';
    return simpleAIStrategy(hand, lastPlay, strategy);
  }
}

