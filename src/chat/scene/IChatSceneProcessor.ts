/**
 * 聊天场景处理器接口
 * 采用策略模式，支持不同场景的差异化处理
 */

import { Player } from '../../types/card';
import { ChatEventType, ChatScene } from '../../types/chat';
import { ChatContext } from '../strategy/IChatStrategy';
import { ChatSceneConfig } from '../../config/chatConfig';

/**
 * 场景处理器接口
 * 每个场景都有独立的提示词构建和内容处理逻辑
 */
export interface IChatSceneProcessor {
  /**
   * 场景类型
   */
  readonly scene: ChatScene;

  /**
   * 场景描述
   */
  readonly description: string;

  /**
   * 构建提示词
   * @param player 玩家
   * @param eventType 事件类型（如果是事件触发场景）
   * @param context 上下文信息
   * @param config 场景配置
   * @returns 构建好的提示词
   */
  buildPrompt(
    player: Player,
    eventType: ChatEventType | undefined,
    context: ChatContext | undefined,
    config: ChatSceneConfig
  ): string;

  /**
   * 处理LLM返回的内容
   * @param content LLM返回的原始内容
   * @param config 场景配置
   * @returns 处理后的内容
   */
  processContent(content: string, config: ChatSceneConfig): string;

  /**
   * 判断事件类型是否属于此场景
   * @param eventType 事件类型
   * @returns 是否属于此场景
   */
  matchesEventType?(eventType: ChatEventType): boolean;
}

