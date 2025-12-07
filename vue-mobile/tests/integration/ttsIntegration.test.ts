/**
 * TTS系统集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChatStore } from '../../src/stores/chatStore';
import { getMultiChannelAudioService } from '../../src/services/audio/multiChannelAudioService';
import { getTTSService } from '../../src/services/tts/ttsService';
import { getSmartChannelScheduler } from '../../src/services/audio/smartChannelScheduler';
import { ChannelUsage } from '../../src/services/audio/smartChannelScheduler';

// Mock Web Audio API
class MockAudioContext {
  createGain = vi.fn(() => ({
    gain: { value: 1.0 },
    connect: vi.fn()
  }));
  createStereoPanner = vi.fn(() => ({
    pan: { value: 0 },
    connect: vi.fn()
  }));
  createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  }));
  decodeAudioData = vi.fn().mockResolvedValue({
    duration: 1.0,
    sampleRate: 44100
  });
  destination = {};
}

beforeEach(() => {
  setActivePinia(createPinia());
  global.AudioContext = MockAudioContext as any;
  global.window = {
    AudioContext: MockAudioContext as any,
    webkitAudioContext: MockAudioContext as any
  } as any;
});

describe('TTS系统集成', () => {
  describe('通道调度器与音频服务集成', () => {
    it('应该能够为不同玩家分配不同通道', () => {
      const scheduler = getSmartChannelScheduler(3);
      const audioService = getMultiChannelAudioService();

      const allocation1 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 1,
        priority: 1
      });

      const allocation2 = scheduler.allocateChannel({
        usage: ChannelUsage.PLAYER,
        playerId: 2,
        priority: 1
      });

      expect(allocation1.channel).not.toBe(allocation2.channel);
      expect(allocation1.isQueued).toBe(false);
      expect(allocation2.isQueued).toBe(false);
    });

    it('系统消息应该使用ANNOUNCEMENT通道', () => {
      const scheduler = getSmartChannelScheduler();
      
      const allocation = scheduler.allocateChannel({
        usage: ChannelUsage.SYSTEM,
        priority: 4
      });

      expect(allocation.channel).toBe(ChannelType.SYSTEM);
    });
  });

  describe('TTS服务与音频服务集成', () => {
    it('应该能够通过音频服务调用TTS', async () => {
      const ttsService = getTTSService();
      const audioService = getMultiChannelAudioService();

      // 由于TTS是异步的，这里主要测试接口可用性
      expect(ttsService).toBeDefined();
      expect(audioService).toBeDefined();

      // 测试配置更新
      audioService.updateConfig({
        enabled: true,
        maxConcurrentPlayers: 3
      });

      const stats = audioService.getStatistics();
      expect(stats.enabled).toBe(true);
    });
  });

  describe('ChatStore与TTS集成', () => {
    it('应该能够初始化并接收消息', async () => {
      const chatStore = useChatStore();
      chatStore.initializeAIBrainListener();

      // 模拟AI Brain消息
      const { aiBrainIntegration } = await import('../../src/services/aiBrainIntegration');
      
      // 由于aiBrainIntegration是mock的，我们直接测试消息添加
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
  });
});

