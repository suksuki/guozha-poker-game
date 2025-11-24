/**
 * 聊天内容库测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChatEventType } from '../src/types/chat';
import { getChatContent, getRandomChat, getTaunt } from '../src/utils/chatContent';
import i18n from '../src/i18n';

describe('聊天内容库', () => {
  beforeEach(async () => {
    // 确保测试使用中文语言
    await i18n.changeLanguage('zh-CN');
  });
  describe('getChatContent', () => {
    it('应该返回普通话的随机闲聊内容', () => {
      const content = getChatContent(ChatEventType.RANDOM, 'mandarin');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回粤语的随机闲聊内容', () => {
      const content = getChatContent(ChatEventType.RANDOM, 'cantonese');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回大墩反应（普通话）', () => {
      const content = getChatContent(ChatEventType.BIG_DUN, 'mandarin');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
      // 应该包含惊讶相关的内容（墩、大、了等）
      expect(content).toMatch(/[哇天太厉墩大了]/);
    });

    it('应该返回大墩反应（粤语）', () => {
      const content = getChatContent(ChatEventType.BIG_DUN, 'cantonese');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回分牌被捡走反应（普通话）', () => {
      const content = getChatContent(ChatEventType.SCORE_STOLEN, 'mandarin');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
      // 应该包含抱怨相关的内容（分、被、捡、走、可惜、气、哎呀等）
      expect(content).toMatch(/[分被捡走可惜气哎呀]/);
    });

    it('应该返回分牌被捡走反应（粤语）', () => {
      const content = getChatContent(ChatEventType.SCORE_STOLEN, 'cantonese');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回好牌反应（普通话）', () => {
      const content = getChatContent(ChatEventType.GOOD_PLAY, 'mandarin');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回好牌反应（粤语）', () => {
      const content = getChatContent(ChatEventType.GOOD_PLAY, 'cantonese');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回对骂内容（普通话）', () => {
      const content = getChatContent(ChatEventType.RANDOM, 'mandarin', true);
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回对骂内容（粤语）', () => {
      const content = getChatContent(ChatEventType.RANDOM, 'cantonese', true);
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('多次调用应该返回不同的内容（随机性）', () => {
      const contents = new Set();
      for (let i = 0; i < 20; i++) {
        contents.add(getChatContent(ChatEventType.RANDOM, 'mandarin'));
      }
      // 由于是随机的，应该至少有几个不同的内容
      expect(contents.size).toBeGreaterThan(1);
    });
  });

  describe('getRandomChat', () => {
    it('应该返回普通话随机闲聊', () => {
      const content = getRandomChat('mandarin');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回粤语随机闲聊', () => {
      const content = getRandomChat('cantonese');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('getTaunt', () => {
    it('应该返回普通话对骂内容', () => {
      const content = getTaunt('mandarin');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('应该返回粤语对骂内容', () => {
      const content = getTaunt('cantonese');
      expect(content).toBeTruthy();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });
  });
});

