/**
 * 大模型策略实现（预留接口）
 * 未来可以接入OpenAI、Claude等大模型
 */

import { Card, Play } from '../../types/card';
import { IAIStrategy } from './IAIStrategy';
import { AIConfig } from '../types';

export class LLMStrategy implements IAIStrategy {
  readonly name = 'llm';
  readonly description = '基于大语言模型的AI策略（预留接口）';

  async choosePlay(
    hand: Card[],
    lastPlay: Play | null,
    config: AIConfig
  ): Promise<Card[] | null> {
    // TODO: 实现大模型调用逻辑
    // 示例：
    // 1. 构建提示词，描述当前游戏状态
    // 2. 调用大模型API（OpenAI、Claude等）
    // 3. 解析返回结果，转换为Card[]
    
    throw new Error('LLM策略尚未实现，请使用其他策略');
  }
}

