/**
 * 通信策略接口
 * 支持不同的LLM沟通模式：
 * - 单聊模式：逐个玩家生成（适合小模型，快速响应）
 * - 批量模式：一次生成多个玩家（适合大模型，更智能）
 * - 混合模式：根据模型性能自动选择
 */

import { CommunicationMessage, CommunicationContext } from '../../types';

export interface CommunicationStrategy {
  /**
   * 策略名称
   */
  name: string;
  
  /**
   * 策略描述
   */
  description: string;
  
  /**
   * 是否支持批量生成
   */
  supportsBatch: boolean;
  
  /**
   * 推荐使用的模型（可选）
   */
  recommendedModels?: string[];
  
  /**
   * 生成单个玩家的消息
   */
  generateSingle(
    playerId: number,
    context: CommunicationContext,
    personality: any
  ): Promise<CommunicationMessage | null>;
  
  /**
   * 批量生成多个玩家的消息（如果支持）
   */
  generateBatch?(
    playerIds: number[],
    context: CommunicationContext,
    players: Map<number, any>
  ): Promise<Map<number, CommunicationMessage>>;
  
  /**
   * 获取策略的优先级（用于自动选择）
   */
  getPriority(): number;
}

