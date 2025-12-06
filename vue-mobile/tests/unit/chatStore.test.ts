/**
 * 聊天消息Store单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../../src/stores/chatStore';
import { setActivePinia, createPinia } from 'pinia';

describe('ChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('消息管理', () => {
    it('应该能够添加消息', () => {
      const chatStore = useChatStore();
      
      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '测试消息',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      expect(chatStore.messages.length).toBe(1);
      expect(chatStore.messages[0].content).toBe('测试消息');
    });

    it('应该限制消息数量', () => {
      const chatStore = useChatStore();
      
      // 添加超过最大数量的消息
      for (let i = 0; i < 60; i++) {
        chatStore.addMessage({
          playerId: 1,
          playerName: 'AI玩家1',
          content: `消息${i}`,
          intent: 'social_chat',
          timestamp: Date.now()
        });
      }

      // 应该只保留最多50条消息
      expect(chatStore.messages.length).toBeLessThanOrEqual(50);
    });

    it('应该返回最近的消息', () => {
      const chatStore = useChatStore();
      
      // 添加多条消息
      for (let i = 0; i < 15; i++) {
        chatStore.addMessage({
          playerId: 1,
          playerName: 'AI玩家1',
          content: `消息${i}`,
          intent: 'social_chat',
          timestamp: Date.now()
        });
      }

      // 应该只返回最近10条
      expect(chatStore.recentMessages.length).toBeLessThanOrEqual(10);
    });

    it('应该按玩家分组消息', () => {
      const chatStore = useChatStore();
      
      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '消息1',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      chatStore.addMessage({
        playerId: 2,
        playerName: 'AI玩家2',
        content: '消息2',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      const messagesByPlayer = chatStore.messagesByPlayer;
      expect(messagesByPlayer.has(1)).toBe(true);
      expect(messagesByPlayer.has(2)).toBe(true);
      expect(messagesByPlayer.get(1)?.length).toBe(1);
      expect(messagesByPlayer.get(2)?.length).toBe(1);
    });

    it('应该能够获取玩家的最新消息', () => {
      const chatStore = useChatStore();
      
      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '第一条',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '第二条',
        intent: 'social_chat',
        timestamp: Date.now() + 1000
      });

      const latest = chatStore.getLatestMessageByPlayer(1);
      expect(latest).toBeDefined();
      expect(latest?.content).toBe('第二条');
    });

    it('应该能够清空消息', () => {
      const chatStore = useChatStore();
      
      chatStore.addMessage({
        playerId: 1,
        playerName: 'AI玩家1',
        content: '测试',
        intent: 'social_chat',
        timestamp: Date.now()
      });

      expect(chatStore.messages.length).toBe(1);
      
      chatStore.clearMessages();
      
      expect(chatStore.messages.length).toBe(0);
    });
  });
});

