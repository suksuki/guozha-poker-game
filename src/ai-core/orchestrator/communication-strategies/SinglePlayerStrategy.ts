/**
 * 单聊策略
 * 逐个玩家生成，每次只要求纯文本输出
 * 适合：小模型（qwen2:0.5b, chat4B等），快速响应
 * 优势：格式要求低，容错性强，易于训练
 */

import { CommunicationStrategy } from './CommunicationStrategy';
import { CommunicationMessage, CommunicationContext } from '../../types';
import { UnifiedLLMService } from '../../infrastructure/llm/UnifiedLLMService';

export class SinglePlayerStrategy implements CommunicationStrategy {
  name = 'single-player';
  description = '单聊模式：逐个玩家生成纯文本消息';
  supportsBatch = false;
  recommendedModels = ['qwen2:0.5b', 'qwen2:1.5b', 'chat4b'];
  
  constructor(
    private llmService: UnifiedLLMService | null,
    private buildPrompt: (playerId: number, context: CommunicationContext, personality: any) => string,
    private parseResponse: (response: string) => string,
    private generateRuleBased: (playerId: number, context: CommunicationContext, personality: any) => CommunicationMessage | null,
    private getPriority: (context: CommunicationContext) => number,
    private determineIntent: (context: CommunicationContext, personality: any) => string,
    private determineEmotion: (context: CommunicationContext, personality: any) => string
  ) {}
  
  async generateSingle(
    playerId: number,
    context: CommunicationContext,
    personality: any
  ): Promise<CommunicationMessage | null> {
    if (!this.llmService) {
      return this.generateRuleBased(playerId, context, personality);
    }
    
    try {
      const prompt = this.buildPrompt(playerId, context, personality);
      const priority = this.getPriority(context);
      
      const response = await this.llmService.call({
        purpose: 'communication',
        prompt,
        priority,
        options: {
          temperature: 0.8,
          maxTokens: 50
        }
      });
      
      const rawResponse = response.content;
      const content = this.parseResponse(rawResponse);
      
      if (!content || content.length === 0) {
        return this.generateRuleBased(playerId, context, personality);
      }
      
      return {
        content,
        intent: this.determineIntent(context, personality),
        emotion: this.determineEmotion(context, personality),
        reasoning: `单聊模式，基于${context.trigger}触发`,
        timestamp: Date.now(),
        _metadata: {
          rawResponse,
          fullPrompt: prompt,
          strategy: this.name
        }
      };
    } catch (error) {
      console.error(`[SinglePlayerStrategy] 生成失败，使用规则生成`, {
        playerId,
        error: error instanceof Error ? error.message : String(error)
      });
      return this.generateRuleBased(playerId, context, personality);
    }
  }
  
  getPriority(): number {
    return 1; // 默认优先级，适合小模型
  }
}

