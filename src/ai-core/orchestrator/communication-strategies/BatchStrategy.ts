/**
 * 批量策略
 * 一次LLM请求生成多个玩家的消息（JSON格式）
 * 适合：大模型（qwen2.5:3b, 7B等），更智能的上下文理解
 * 优势：一次请求，上下文共享，更连贯的对话
 */

import { CommunicationStrategy } from './CommunicationStrategy';
import { CommunicationMessage, CommunicationContext } from '../../types';
import { UnifiedLLMService } from '../../infrastructure/llm/UnifiedLLMService';

export class BatchStrategy implements CommunicationStrategy {
  name = 'batch';
  description = '批量模式：一次生成多个玩家的JSON格式消息';
  supportsBatch = true;
  recommendedModels = ['qwen2.5:3b', 'qwen2:7b', 'llama3:8b'];
  
  constructor(
    private llmService: UnifiedLLMService | null,
    private buildBatchPrompt: (players: Array<{ id: number; personality: any }>, context: CommunicationContext) => string,
    private parseBatchResponse: (response: string, players: Array<{ id: number; personality: any }>, context: CommunicationContext) => Map<number, CommunicationMessage>,
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
    // 批量策略也支持单聊，但会调用批量方法（只传一个玩家）
    const result = await this.generateBatch([playerId], context, new Map([[playerId, { personality }]]));
    return result.get(playerId) || null;
  }
  
  async generateBatch(
    playerIds: number[],
    context: CommunicationContext,
    players: Map<number, any>
  ): Promise<Map<number, CommunicationMessage>> {
    const results = new Map<number, CommunicationMessage>();
    
    if (!this.llmService) {
      // 回退到规则生成
      for (const playerId of playerIds) {
        const player = players.get(playerId);
        if (!player) continue;
        const message = this.generateRuleBased(playerId, context, player.personality);
        if (message) {
          results.set(playerId, message);
        }
      }
      return results;
    }
    
    const shouldSpeakPlayers = playerIds.map(id => ({
      id,
      personality: players.get(id)?.personality || {}
    })).filter(p => p.personality);
    
    if (shouldSpeakPlayers.length === 0) {
      return results;
    }
    
    try {
      const batchPrompt = this.buildBatchPrompt(shouldSpeakPlayers, context);
      const priority = this.getPriority(context);
      
      const response = await this.llmService.call({
        purpose: 'communication',
        prompt: batchPrompt,
        priority,
        options: {
          temperature: 0.8,
          maxTokens: shouldSpeakPlayers.length * 30
        }
      });
      
      if (!response.content || response.content.trim() === '' || response.content.trim() === '{}') {
        throw new Error('LLM返回空响应');
      }
      
      const parsedMessages = this.parseBatchResponse(
        response.content,
        shouldSpeakPlayers,
        context
      );
      
      // 如果解析失败，回退到规则生成
      if (parsedMessages.size === 0) {
        throw new Error('批量解析结果为空');
      }
      
      // 补充意图和情绪
      for (const [playerId, message] of parsedMessages) {
        const player = players.get(playerId);
        if (player) {
          message.intent = this.determineIntent(context, player.personality);
          message.emotion = this.determineEmotion(context, player.personality);
          message.reasoning = `批量模式，基于${context.trigger}触发`;
          (message as any)._metadata = {
            ...(message as any)._metadata,
            strategy: this.name
          };
        }
      }
      
      return parsedMessages;
    } catch (error) {
      console.error('[BatchStrategy] 批量生成失败，使用规则生成', {
        error: error instanceof Error ? error.message : String(error),
        playerCount: shouldSpeakPlayers.length
      });
      
      // 回退到规则生成
      for (const { id: playerId, personality } of shouldSpeakPlayers) {
        const message = this.generateRuleBased(playerId, context, personality);
        if (message) {
          results.set(playerId, message);
        }
      }
      
      return results;
    }
  }
  
  getPriority(): number {
    return 2; // 较高优先级，适合大模型
  }
}

