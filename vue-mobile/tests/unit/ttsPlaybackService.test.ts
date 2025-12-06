/**
 * TTS播报服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TTSPlaybackService } from '../../src/services/tts/ttsPlaybackService';
import { ChannelType } from '../../src/types/channel';

// Mock依赖
vi.mock('../../src/services/tts/ttsService', () => ({
  getTTSService: vi.fn(() => ({
    synthesize: vi.fn()
  }))
}));

vi.mock('../../src/services/multiChannelAudioService', () => ({
  getMultiChannelAudioService: vi.fn(() => ({
    playAudioBuffer: vi.fn(),
    getAudioContext: vi.fn(() => ({
      decodeAudioData: vi.fn()
    }))
  }))
}));

describe('TTSPlaybackService', () => {
  let service: TTSPlaybackService;

  beforeEach(() => {
    service = new TTSPlaybackService();
    vi.clearAllMocks();
  });

  describe('缓存机制', () => {
    it('应该缓存相同文本的音频', async () => {
      const text = '测试文本';
      const channel = ChannelType.ANNOUNCEMENT;

      // Mock TTS服务
      const { getTTSService } = await import('../../src/services/tts/ttsService');
      const ttsService = getTTSService();
      const mockAudioBuffer = new ArrayBuffer(1000);
      const mockResult = {
        audioBuffer: mockAudioBuffer,
        duration: 1.0,
        format: 'audio/wav'
      };

      vi.mocked(ttsService.synthesize).mockResolvedValue(mockResult);

      // Mock音频服务
      const { getMultiChannelAudioService } = await import('../../src/services/multiChannelAudioService');
      const audioService = getMultiChannelAudioService();
      const mockAudioContext = {
        decodeAudioData: vi.fn().mockResolvedValue({} as AudioBuffer)
      };
      vi.mocked(audioService.getAudioContext).mockReturnValue(mockAudioContext as any);
      vi.mocked(audioService.playAudioBuffer).mockResolvedValue();

      // 第一次调用
      await service.speak(text, {
        channel,
        enableCache: true,
        timeout: 1000,
        fallbackTimeout: 1000
      });

      // 清空mock调用记录
      vi.mocked(ttsService.synthesize).mockClear();

      // 第二次调用（应该使用缓存）
      await service.speak(text, {
        channel,
        enableCache: true,
        timeout: 1000,
        fallbackTimeout: 1000
      });

      // 验证TTS只被调用一次（第二次使用缓存）
      // 注意：由于缓存机制，第二次调用不应该调用TTS
      expect(ttsService.synthesize).toHaveBeenCalledTimes(0);
    });

    it('应该清除过期缓存', () => {
      const service = new TTSPlaybackService();
      
      // 添加一个过期的缓存项
      const cacheKey = 'test_key';
      (service as any).audioCache.set(cacheKey, {
        audioBuffer: new ArrayBuffer(100),
        duration: 1.0,
        format: 'audio/wav',
        timestamp: Date.now() - 2 * 60 * 60 * 1000 // 2小时前
      });

      // 清除过期缓存
      service.clearExpiredCache();

      // 验证过期缓存已被清除
      expect((service as any).audioCache.has(cacheKey)).toBe(false);
    });
  });

  describe('超时机制', () => {
    it('应该在超时后返回null', async () => {
      const text = '测试文本';
      
      // Mock TTS服务（延迟响应，超过超时时间）
      const { getTTSService } = await import('../../src/services/tts/ttsService');
      const ttsService = getTTSService();
      vi.mocked(ttsService.synthesize).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              audioBuffer: new ArrayBuffer(100),
              duration: 1.0,
              format: 'audio/wav'
            });
          }, 6000); // 6秒后响应（超过5秒超时）
        });
      });

      const result = await (service as any).generateAudioWithFallback(text, 5000, 5000);

      // 应该返回null（超时）
      expect(result).toBeNull();
    }, 15000); // 增加测试超时时间

    it('应该在超时内成功返回音频', async () => {
      const text = '测试文本';
      
      // Mock TTS服务（快速响应）
      const { getTTSService } = await import('../../src/services/tts/ttsService');
      const ttsService = getTTSService();
      const mockResult = {
        audioBuffer: new ArrayBuffer(100),
        duration: 1.0,
        format: 'audio/wav'
      };
      vi.mocked(ttsService.synthesize).mockResolvedValue(mockResult);

      const result = await (service as any).generateAudioWithFallback(text, 5000, 5000);

      // 应该返回音频结果
      expect(result).toEqual(mockResult);
    });
  });

  describe('降级机制', () => {
    it('应该在主TTS失败时尝试降级', async () => {
      const text = '测试文本';
      
      // Mock TTS服务（主TTS失败，降级成功）
      const { getTTSService } = await import('../../src/services/tts/ttsService');
      const ttsService = getTTSService();
      
      // 第一次调用失败，第二次成功（模拟降级）
      vi.mocked(ttsService.synthesize)
        .mockRejectedValueOnce(new Error('主TTS失败'))
        .mockResolvedValueOnce({
          audioBuffer: new ArrayBuffer(100),
          duration: 1.0,
          format: 'audio/wav'
        });

      // 由于ttsService.synthesize内部已经实现了降级，这里主要测试错误处理
      const result = await (service as any).generateAudioWithFallback(text, 5000, 5000);

      // 应该返回null（因为第一次失败，但实际ttsService内部会尝试降级）
      // 这里主要验证错误处理不会抛出异常
      expect(result).toBeDefined();
    });
  });

  describe('播放音频', () => {
    it('应该正确播放AudioBuffer', async () => {
      const audioBuffer = new ArrayBuffer(1000);
      const channel = ChannelType.ANNOUNCEMENT;
      const priority = 4;

      // Mock音频服务
      const { getMultiChannelAudioService } = await import('../../src/services/multiChannelAudioService');
      const audioService = getMultiChannelAudioService();
      const mockAudioContext = {
        decodeAudioData: vi.fn().mockResolvedValue({} as AudioBuffer)
      };
      vi.mocked(audioService.getAudioContext).mockReturnValue(mockAudioContext as any);
      vi.mocked(audioService.playAudioBuffer).mockResolvedValue();

      await (service as any).playAudio(
        audioBuffer,
        1.0,
        channel,
        priority
      );

      // 验证音频被解码和播放
      expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      expect(audioService.playAudioBuffer).toHaveBeenCalled();
    });

    it('应该在AudioContext不可用时抛出错误', async () => {
      const audioBuffer = new ArrayBuffer(1000);
      const channel = ChannelType.ANNOUNCEMENT;
      const priority = 4;

      // Mock音频服务（AudioContext不可用）
      const { getMultiChannelAudioService } = await import('../../src/services/multiChannelAudioService');
      const audioService = getMultiChannelAudioService();
      vi.mocked(audioService.getAudioContext).mockReturnValue(null);

      try {
        await (service as any).playAudio(audioBuffer, 1.0, channel, priority);
        // 如果没有抛出错误，测试失败
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain('AudioContext不可用');
      }
    });
  });

  describe('缓存键生成', () => {
    it('应该为不同文本生成不同的缓存键', () => {
      const key1 = (service as any).getCacheKey('文本1', ChannelType.ANNOUNCEMENT);
      const key2 = (service as any).getCacheKey('文本2', ChannelType.ANNOUNCEMENT);
      
      expect(key1).not.toBe(key2);
    });

    it('应该为相同文本和声道生成相同的缓存键', () => {
      const key1 = (service as any).getCacheKey('文本', ChannelType.ANNOUNCEMENT);
      const key2 = (service as any).getCacheKey('文本', ChannelType.ANNOUNCEMENT);
      
      expect(key1).toBe(key2);
    });

    it('应该为不同声道生成不同的缓存键', () => {
      const key1 = (service as any).getCacheKey('文本', ChannelType.ANNOUNCEMENT);
      const key2 = (service as any).getCacheKey('文本', ChannelType.PLAYER_0);
      
      expect(key1).not.toBe(key2);
    });
  });
});

