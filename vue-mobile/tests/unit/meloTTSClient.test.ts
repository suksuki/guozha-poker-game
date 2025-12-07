/**
 * MeLo TTS客户端单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MeloTTSClient } from '../../src/services/tts/meloTTSClient';
import type { TTSServerConfig } from '../../src/services/tts/types';

// Mock fetch
global.fetch = vi.fn();

describe('MeloTTSClient', () => {
  let mockConfig: TTSServerConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      id: 'melo-1',
      name: 'MeLo TTS服务器',
      type: 'melo',
      enabled: true,
      priority: 1,
      connection: {
        host: '192.168.0.13',
        port: 7860,
        protocol: 'http'
      },
      providerConfig: {
        melo: {
          speaker: 'ZH',
          speed: 1.0
        }
      }
    };
  });

  describe('健康检查', () => {
    it('应该正确检查MeLo TTS健康状态（返回status=ok）', async () => {
      const client = new MeloTTSClient(mockConfig);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', service: 'Melo TTS', version: '1.0.0' })
      });

      const isAvailable = await client.isAvailable();

      expect(isAvailable).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://192.168.0.13:7860/health',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('应该正确处理健康检查失败（status不是ok）', async () => {
      const client = new MeloTTSClient(mockConfig);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'error', message: '服务不可用' })
      });

      const isAvailable = await client.isAvailable();

      expect(isAvailable).toBe(false);
    });

    it('应该正确处理HTTP错误', async () => {
      const client = new MeloTTSClient(mockConfig);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503
      });

      const isAvailable = await client.isAvailable();

      expect(isAvailable).toBe(false);
    });

    it('应该正确处理网络错误', async () => {
      const client = new MeloTTSClient(mockConfig);
      
      (global.fetch as any).mockRejectedValueOnce(new Error('网络错误'));

      const isAvailable = await client.isAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  describe('语音合成', () => {
    it('应该使用正确的API端点 /tts', async () => {
      const client = new MeloTTSClient(mockConfig);
      
      const mockAudioBuffer = new ArrayBuffer(1000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn(() => 'audio/wav')
        },
        arrayBuffer: async () => mockAudioBuffer
      });

      await client.synthesize('测试文本');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://192.168.0.13:7860/tts',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('应该发送正确的请求体（包含text和lang）', async () => {
      const client = new MeloTTSClient(mockConfig);
      
      const mockAudioBuffer = new ArrayBuffer(1000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn(() => 'audio/wav')
        },
        arrayBuffer: async () => mockAudioBuffer
      });

      await client.synthesize('你好世界', { lang: 'zh' });

      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.text).toBe('你好世界');
      expect(requestBody.lang).toBe('ZH');
      // speaker应该与lang相同，所以不应该包含在请求中
      expect(requestBody.speaker).toBeUndefined();
    });

    it('应该正确处理speaker参数（当speaker与lang不同时）', async () => {
      const client = new MeloTTSClient({
        ...mockConfig,
        providerConfig: {
          melo: {
            speaker: 'EN-US',
            speed: 1.0
          }
        }
      });
      
      const mockAudioBuffer = new ArrayBuffer(1000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn(() => 'audio/wav')
        },
        arrayBuffer: async () => mockAudioBuffer
      });

      await client.synthesize('Hello world', { lang: 'en' });

      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.text).toBe('Hello world');
      expect(requestBody.lang).toBe('EN');
      expect(requestBody.speaker).toBe('EN-US');
    });

    it('应该包含speed参数（如果配置了）', async () => {
      const client = new MeloTTSClient({
        ...mockConfig,
        providerConfig: {
          melo: {
            speaker: 'ZH',
            speed: 1.5
          }
        }
      });
      
      const mockAudioBuffer = new ArrayBuffer(1000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn(() => 'audio/wav')
        },
        arrayBuffer: async () => mockAudioBuffer
      });

      await client.synthesize('测试文本');

      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.speed).toBe(1.5);
    });
  });

  describe('语言转换', () => {
    it('应该正确转换语言代码', async () => {
      const client = new MeloTTSClient(mockConfig);
      
      // 测试各种语言代码转换
      const testCases = [
        { input: 'zh', expected: 'ZH' },
        { input: 'en', expected: 'EN' },
        { input: 'ja', expected: 'JP' },
        { input: 'ko', expected: 'KR' },
        { input: 'es', expected: 'ES' },
        { input: 'fr', expected: 'FR' }
      ];

      for (const { input, expected } of testCases) {
        vi.clearAllMocks();
        const mockAudioBuffer = new ArrayBuffer(1000);
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          headers: {
            get: vi.fn(() => 'audio/wav')
          },
          arrayBuffer: async () => mockAudioBuffer
        });

        await client.synthesize('测试', { lang: input as any });

        const callArgs = (global.fetch as any).mock.calls[0];
        const requestBody = JSON.parse(callArgs[1].body);
        expect(requestBody.lang).toBe(expected);
      }
    });
  });
});

