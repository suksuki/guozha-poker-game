/**
 * 聊天场景处理器工厂
 * 负责创建和管理不同场景的处理器
 */

import { IChatSceneProcessor } from './IChatSceneProcessor';
import { ChatScene, ChatEventType } from '../../types/chat';
import { SpontaneousChatProcessor } from './SpontaneousChatProcessor';
import { EventDrivenChatProcessor } from './EventDrivenChatProcessor';
import { TauntChatProcessor } from './TauntChatProcessor';

/**
 * 场景处理器工厂
 * 支持注册自定义处理器，便于扩展
 */
export class ChatSceneProcessorFactory {
  private static processors: Map<ChatScene, IChatSceneProcessor> = new Map();
  private static eventTypeToScene: Map<ChatEventType, ChatScene> = new Map();

  // 初始化默认处理器
  static {
    const spontaneousProcessor = new SpontaneousChatProcessor();
    const eventDrivenProcessor = new EventDrivenChatProcessor();
    const tauntProcessor = new TauntChatProcessor();

    this.processors.set(ChatScene.SPONTANEOUS, spontaneousProcessor);
    this.processors.set(ChatScene.EVENT_DRIVEN, eventDrivenProcessor);
    this.processors.set(ChatScene.TAUNT, tauntProcessor);

    // 初始化事件类型到场景的映射
    this.eventTypeToScene.set(ChatEventType.RANDOM, ChatScene.SPONTANEOUS);
    this.eventTypeToScene.set(ChatEventType.DEALING, ChatScene.SPONTANEOUS);
    
    // 所有其他事件类型都映射到 EVENT_DRIVEN
    Object.values(ChatEventType).forEach(eventType => {
      if (eventType !== ChatEventType.RANDOM && eventType !== ChatEventType.DEALING) {
        this.eventTypeToScene.set(eventType, ChatScene.EVENT_DRIVEN);
      }
    });
  }

  /**
   * 获取场景处理器
   * @param scene 场景类型
   * @returns 场景处理器
   */
  static getProcessor(scene: ChatScene): IChatSceneProcessor {
    const processor = this.processors.get(scene);
    if (!processor) {
      throw new Error(`未找到场景处理器: ${scene}`);
    }
    return processor;
  }

  /**
   * 根据事件类型获取场景
   * @param eventType 事件类型
   * @returns 场景类型
   */
  static getSceneByEventType(eventType: ChatEventType): ChatScene {
    return this.eventTypeToScene.get(eventType) || ChatScene.EVENT_DRIVEN;
  }

  /**
   * 注册自定义场景处理器
   * @param scene 场景类型
   * @param processor 处理器实例
   */
  static registerProcessor(scene: ChatScene, processor: IChatSceneProcessor): void {
    this.processors.set(scene, processor);
  }

  /**
   * 注册事件类型到场景的映射
   * @param eventType 事件类型
   * @param scene 场景类型
   */
  static registerEventTypeMapping(eventType: ChatEventType, scene: ChatScene): void {
    this.eventTypeToScene.set(eventType, scene);
  }

  /**
   * 获取所有已注册的场景
   * @returns 场景类型数组
   */
  static getRegisteredScenes(): ChatScene[] {
    return Array.from(this.processors.keys());
  }
}

