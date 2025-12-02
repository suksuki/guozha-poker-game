/**
 * ChatService 集成 QuarrelVoiceService 示例
 * 展示如何在现有的 ChatService 中集成 QuarrelVoiceService
 * 
 * 注意：这是一个示例文件，展示集成方式
 * 实际使用时，可以直接修改 chatService.ts
 */

import { ChatService } from './chatService';
import { getQuarrelVoiceService, updateMainFightRoles } from './quarrelVoiceService';
import { submitChatMessageToQuarrel } from '../utils/quarrelVoiceHelper';
import { ChatMessage, ChatEventType } from '../types/chat';
import { Player } from '../types/card';
import { ChatContext } from '../chat/strategy/IChatStrategy';
import { MultiPlayerGameState } from '../utils/gameStateUtils';

/**
 * 扩展的 ChatService，集成 QuarrelVoiceService
 */
class ChatServiceWithQuarrel extends ChatService {
  private quarrelService = getQuarrelVoiceService();
  private useQuarrelForTaunt: boolean = true;  // 对骂场景使用QuarrelVoiceService
  private useQuarrelForReply: boolean = true;  // 回复场景使用QuarrelVoiceService
  private quarrelInitialized: boolean = false;

  constructor(...args: any[]) {
    super(...args);
    this.initQuarrelService();
  }

  /**
   * 初始化 QuarrelVoiceService
   */
  private async initQuarrelService(): Promise<void> {
    try {
      await this.quarrelService.init();
      this.quarrelInitialized = true;
    } catch (error) {
      this.useQuarrelForTaunt = false;
      this.useQuarrelForReply = false;
    }
  }

  /**
   * 重写 triggerTaunt 方法，使用 QuarrelVoiceService
   */
  async triggerTaunt(
    player: Player,
    targetPlayer?: Player,
    context?: ChatContext,
    fullGameState?: MultiPlayerGameState
  ): Promise<ChatMessage | null> {
    // 先生成对骂内容（原有逻辑）
    const message = await super.triggerTaunt(player, targetPlayer, context, fullGameState);

    if (!message) {
      return null;
    }

    // 如果启用QuarrelVoiceService且有目标玩家，使用它播放
    if (this.useQuarrelForTaunt && this.quarrelInitialized && targetPlayer) {
      try {
        // 设置主吵架双方
        updateMainFightRoles([
          player.id.toString(),
          targetPlayer.id.toString()
        ]);

        // 提交到QuarrelVoiceService
        await submitChatMessageToQuarrel(message, player, {
          priority: 'MAIN_FIGHT',
          civility: (this as any).config?.civilityLevel || 2,
          onStart: () => {
          },
          onEnd: () => {
          },
          onError: (error) => {
            // 回退到原有服务
            this.playMessageWithOriginalService(message, player);
          }
        });

        // 目标玩家可能回复（60%概率）
        if (Math.random() < 0.6) {
          const replyMessage = await this.triggerReply(
            targetPlayer,
            message,
            0.6,
            fullGameState
          );

          if (replyMessage) {
            await submitChatMessageToQuarrel(replyMessage, targetPlayer, {
              priority: 'MAIN_FIGHT',
              civility: (this as any).config?.civilityLevel || 2,
            });
          }
        }
      } catch (error) {
        // 回退到原有的语音服务
        await this.playMessageWithOriginalService(message, player);
      }
    } else {
      // 使用原有的语音服务
      await this.playMessageWithOriginalService(message, player);
    }

    return message;
  }

  /**
   * 重写 triggerReply 方法，使用 QuarrelVoiceService
   */
  async triggerReply(
    player: Player,
    originalMessage: ChatMessage,
    probability?: number,
    fullGameState?: MultiPlayerGameState
  ): Promise<ChatMessage | null> {
    // 先生成回复内容（原有逻辑）
    const message = await super.triggerReply(player, originalMessage, probability, fullGameState);

    if (!message) {
      return null;
    }

    // 如果启用QuarrelVoiceService，使用它播放
    if (this.useQuarrelForReply && this.quarrelInitialized) {
      try {
        // 检查原消息是否是主吵架
        const originalPlayer = (fullGameState?.players || []).find(
          p => p.id === originalMessage.playerId
        );

        if (originalPlayer) {
          // 设置主吵架双方
          updateMainFightRoles([
            originalPlayer.id.toString(),
            player.id.toString()
          ]);
        }

        await submitChatMessageToQuarrel(message, player, {
          priority: originalMessage.eventType === ChatEventType.TAUNT ? 'MAIN_FIGHT' : 'NORMAL_CHAT',
          civility: (this as any).config?.civilityLevel || 2,
        });
      } catch (error) {
        await this.playMessageWithOriginalService(message, player);
      }
    } else {
      await this.playMessageWithOriginalService(message, player);
    }

    return message;
  }

  /**
   * 原有的播放方法（作为回退）
   */
  private async playMessageWithOriginalService(message: ChatMessage, player: Player): Promise<void> {
    // 这里应该调用原有的语音服务
    // 由于原有服务可能通过其他方式播放，这里只是占位
  }

  /**
   * 更新 QuarrelVoiceService 配置
   */
  updateQuarrelConfig(config: {
    useQuarrelForTaunt?: boolean;
    useQuarrelForReply?: boolean;
  }): void {
    if (config.useQuarrelForTaunt !== undefined) {
      this.useQuarrelForTaunt = config.useQuarrelForTaunt;
    }
    if (config.useQuarrelForReply !== undefined) {
      this.useQuarrelForReply = config.useQuarrelForReply;
    }
  }
}

/**
 * 创建集成了 QuarrelVoiceService 的 ChatService 实例
 */
export function createChatServiceWithQuarrel(...args: any[]): ChatServiceWithQuarrel {
  return new ChatServiceWithQuarrel(...args);
}

