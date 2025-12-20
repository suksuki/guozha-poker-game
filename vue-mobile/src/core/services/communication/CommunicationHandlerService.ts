/**
 * 沟通处理服务
 * 处理人类玩家的消息，理解意图，并触发AI策略调整
 */

import { Player } from '../../types/card';
import { ChatMessage } from '../../types/chat';
import { MultiPlayerGameState } from '../../utils/gameStateUtils';
import { nluUnderstandingService, NLUUnderstandingResult } from './NLUUnderstandingService';
import { RealTimeStrategyManager } from './RealTimeStrategyManager';

/**
 * 沟通处理服务类
 */
export class CommunicationHandlerService {
  private strategyManager: RealTimeStrategyManager;
  private processedMessages: Set<string> = new Set(); // 已处理的消息ID

  constructor() {
    this.strategyManager = new RealTimeStrategyManager();
  }

  /**
   * 处理人类玩家的消息
   */
  async processHumanMessage(
    message: ChatMessage,
    humanPlayer: Player,
    gameState: MultiPlayerGameState
  ): Promise<NLUUnderstandingResult | null> {
    // 避免重复处理
    const messageId = `${message.playerId}-${message.timestamp}`;
    if (this.processedMessages.has(messageId)) {
      return null;
    }
    this.processedMessages.add(messageId);

    // 只处理人类玩家的消息
    if (message.playerId !== humanPlayer.id) {
      return null;
    }

    try {
      // 1. 理解消息
      const understanding = await nluUnderstandingService.understandMessage(
        message,
        gameState
      );

      // 2. 找到队友
      const teammate = this.findTeammate(humanPlayer, gameState);
      if (!teammate) {
        return understanding;
      }

      // 3. 调整AI策略
      await this.strategyManager.processHumanMessage(
        understanding,
        teammate.id,
        gameState
      );
      return understanding;
    } catch (error) {
      return null;
    }
  }

  /**
   * 查找队友
   */
  private findTeammate(
    humanPlayer: Player,
    gameState: MultiPlayerGameState
  ): Player | null {
    // 如果玩家有teamId，找到同队的其他玩家
    if (humanPlayer.teamId !== undefined && humanPlayer.teamId !== null) {
      return gameState.players.find(
        p => p.id !== humanPlayer.id && 
             p.teamId === humanPlayer.teamId &&
             p.type === 'ai'
      ) || null;
    }

    // 如果没有团队模式，找到第一个AI玩家作为"队友"
    return gameState.players.find(p => p.type === 'ai') || null;
  }

  /**
   * 获取策略管理器
   */
  getStrategyManager(): RealTimeStrategyManager {
    return this.strategyManager;
  }

  /**
   * 清空已处理的消息记录（新游戏开始时）
   */
  clearProcessedMessages(): void {
    this.processedMessages.clear();
  }
}

// 导出单例实例
export const communicationHandlerService = new CommunicationHandlerService();

