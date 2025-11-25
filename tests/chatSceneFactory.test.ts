/**
 * 聊天场景工厂单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatScene, ChatEventType } from '../src/types/chat';
import { ChatSceneProcessorFactory } from '../src/chat/scene/ChatSceneProcessorFactory';
import { SpontaneousChatProcessor } from '../src/chat/scene/SpontaneousChatProcessor';
import { EventDrivenChatProcessor } from '../src/chat/scene/EventDrivenChatProcessor';
import { TauntChatProcessor } from '../src/chat/scene/TauntChatProcessor';
import { IChatSceneProcessor } from '../src/chat/scene/IChatSceneProcessor';

describe('聊天场景工厂', () => {
  beforeEach(() => {
    // 每个测试前重置工厂状态（如果需要）
  });

  describe('获取场景处理器', () => {
    it('应该能够获取自发聊天处理器', () => {
      const processor = ChatSceneProcessorFactory.getProcessor(ChatScene.SPONTANEOUS);
      expect(processor).toBeInstanceOf(SpontaneousChatProcessor);
      expect(processor.scene).toBe(ChatScene.SPONTANEOUS);
    });

    it('应该能够获取事件触发处理器', () => {
      const processor = ChatSceneProcessorFactory.getProcessor(ChatScene.EVENT_DRIVEN);
      expect(processor).toBeInstanceOf(EventDrivenChatProcessor);
      expect(processor.scene).toBe(ChatScene.EVENT_DRIVEN);
    });

    it('应该能够获取对骂处理器', () => {
      const processor = ChatSceneProcessorFactory.getProcessor(ChatScene.TAUNT);
      expect(processor).toBeInstanceOf(TauntChatProcessor);
      expect(processor.scene).toBe(ChatScene.TAUNT);
    });

    it('应该为未知场景抛出错误', () => {
      // 使用类型断言来测试错误情况
      expect(() => {
        ChatSceneProcessorFactory.getProcessor('unknown' as any);
      }).toThrow('未找到场景处理器');
    });
  });

  describe('事件类型到场景的映射', () => {
    it('RANDOM 应该映射到 SPONTANEOUS', () => {
      const scene = ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.RANDOM);
      expect(scene).toBe(ChatScene.SPONTANEOUS);
    });

    it('DEALING 应该映射到 SPONTANEOUS', () => {
      const scene = ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.DEALING);
      expect(scene).toBe(ChatScene.SPONTANEOUS);
    });

    it('GOOD_PLAY 应该映射到 EVENT_DRIVEN', () => {
      const scene = ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.GOOD_PLAY);
      expect(scene).toBe(ChatScene.EVENT_DRIVEN);
    });

    it('BIG_DUN 应该映射到 EVENT_DRIVEN', () => {
      const scene = ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.BIG_DUN);
      expect(scene).toBe(ChatScene.EVENT_DRIVEN);
    });

    it('SCORE_STOLEN 应该映射到 EVENT_DRIVEN', () => {
      const scene = ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.SCORE_STOLEN);
      expect(scene).toBe(ChatScene.EVENT_DRIVEN);
    });

    it('所有其他事件类型应该映射到 EVENT_DRIVEN', () => {
      const eventTypes = [
        ChatEventType.SCORE_EATEN_CURSE,
        ChatEventType.BAD_LUCK,
        ChatEventType.WINNING,
        ChatEventType.LOSING,
        ChatEventType.FINISH_FIRST,
        ChatEventType.FINISH_MIDDLE,
        ChatEventType.FINISH_LAST,
        ChatEventType.URGE_PLAY,
        ChatEventType.DUN_PLAYED,
        ChatEventType.DEALING_GOOD_CARD,
        ChatEventType.DEALING_BAD_CARD,
        ChatEventType.DEALING_BOMB_FORMED,
        ChatEventType.DEALING_DUN_FORMED,
        ChatEventType.DEALING_HUGE_CARD,
        ChatEventType.DEALING_POOR_HAND
      ];

      eventTypes.forEach(eventType => {
        const scene = ChatSceneProcessorFactory.getSceneByEventType(eventType);
        expect(scene).toBe(ChatScene.EVENT_DRIVEN);
      });
    });
  });

  describe('注册自定义处理器', () => {
    it('应该能够注册自定义处理器', () => {
      const customProcessor: IChatSceneProcessor = {
        scene: ChatScene.SPONTANEOUS,
        description: '自定义处理器',
        buildPrompt: vi.fn(),
        processContent: vi.fn(),
        matchesEventType: vi.fn()
      };

      ChatSceneProcessorFactory.registerProcessor(ChatScene.SPONTANEOUS, customProcessor);
      const processor = ChatSceneProcessorFactory.getProcessor(ChatScene.SPONTANEOUS);
      
      expect(processor).toBe(customProcessor);
      
      // 恢复默认处理器
      ChatSceneProcessorFactory.registerProcessor(ChatScene.SPONTANEOUS, new SpontaneousChatProcessor());
    });

    it('应该能够注册事件类型映射', () => {
      ChatSceneProcessorFactory.registerEventTypeMapping(ChatEventType.GOOD_PLAY, ChatScene.SPONTANEOUS);
      const scene = ChatSceneProcessorFactory.getSceneByEventType(ChatEventType.GOOD_PLAY);
      expect(scene).toBe(ChatScene.SPONTANEOUS);
      
      // 恢复默认映射
      ChatSceneProcessorFactory.registerEventTypeMapping(ChatEventType.GOOD_PLAY, ChatScene.EVENT_DRIVEN);
    });
  });

  describe('获取已注册场景', () => {
    it('应该返回所有已注册的场景', () => {
      const scenes = ChatSceneProcessorFactory.getRegisteredScenes();
      
      expect(scenes).toContain(ChatScene.SPONTANEOUS);
      expect(scenes).toContain(ChatScene.EVENT_DRIVEN);
      expect(scenes).toContain(ChatScene.TAUNT);
      expect(scenes.length).toBeGreaterThanOrEqual(3);
    });
  });
});

