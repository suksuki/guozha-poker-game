/**
 * TTS服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TTSService, getTTSService } from '../../src/services/tts/ttsService';
import { BrowserTTSClient } from '../../src/services/tts/browserTTSClient';
import type { TTSServerConfig } from '../../src/services/tts/types';

// Mock BrowserTTSClient
vi.mock('../../src/services/tts/browserTTSClient', () => {
  return {
    BrowserTTSClient: vi.fn().mockImplementation(() => ({
      isAvailable: vi.fn().mockResolvedValue(true),
      synthesize: vi.fn().mockResolvedValue({
        audioBuffer: new ArrayBuffer(0),
        duration: 1.0,
        format: 'audio/wav'
      })
    }))
  };
});

describe('TTSService', () => {
  let service: TTSService;

  beforeEach(() => {
    service = new TTSService();
  });

  describe('服务器管理', () => {
    it('应该能够添加melo服务器', () => {
      const server: TTSServerConfig = {
        id: 'test-1',
        name: '测试服务器',
        type: 'melo',
        enabled: true,
        priority: 1,
        connection: {
          host: '192.168.0.13',
          port: 7860,
          protocol: 'http'
        }
      };

      service.addServer(server);
      const servers = service.getServers();

      expect(servers.length).toBe(1);
      expect(servers[0].id).toBe('test-1');
      expect(servers[0].connection.host).toBe('192.168.0.13');
    });

    it('应该能够添加piper服务器', () => {
      const server: TTSServerConfig = {
        id: 'test-2',
        name: 'Piper服务器',
        type: 'piper',
        enabled: true,
        priority: 2,
        connection: {
          host: 'localhost',
          port: 5000,
          protocol: 'http'
        }
      };

      service.addServer(server);
      const servers = service.getServers();

      expect(servers.length).toBe(1);
      expect(servers[0].type).toBe('piper');
      expect(servers[0].connection.port).toBe(5000);
    });

    it('应该按优先级排序服务器', () => {
      const server1: TTSServerConfig = {
        id: 'test-1',
        name: '服务器1',
        type: 'melo',
        enabled: true,
        priority: 3,
        connection: {
          host: 'localhost',
          port: 7860,
          protocol: 'http'
        }
      };

      const server2: TTSServerConfig = {
        id: 'test-2',
        name: '服务器2',
        type: 'piper',
        enabled: true,
        priority: 1,
        connection: {
          host: 'localhost',
          port: 5000,
          protocol: 'http'
        }
      };

      service.addServer(server1);
      service.addServer(server2);

      const servers = service.getServers();
      expect(servers[0].priority).toBe(1); // 优先级高的在前
      expect(servers[1].priority).toBe(3);
    });

    it('应该能够移除服务器', () => {
      const server: TTSServerConfig = {
        id: 'test-1',
        name: '测试服务器',
        type: 'melo',
        enabled: true,
        priority: 1,
        connection: {
          host: 'localhost',
          port: 7860,
          protocol: 'http'
        }
      };

      service.addServer(server);
      expect(service.getServers().length).toBe(1);

      service.removeServer('test-1');
      expect(service.getServers().length).toBe(0);
    });

    it('应该只返回启用的服务器', () => {
      const server1: TTSServerConfig = {
        id: 'test-1',
        name: '服务器1',
        type: 'melo',
        enabled: true,
        priority: 1,
        connection: {
          host: 'localhost',
          port: 7860,
          protocol: 'http'
        }
      };

      const server2: TTSServerConfig = {
        id: 'test-2',
        name: '服务器2',
        type: 'piper',
        enabled: false,
        priority: 2,
        connection: {
          host: 'localhost',
          port: 5000,
          protocol: 'http'
        }
      };

      service.addServer(server1);
      service.addServer(server2);

      const enabledServers = service.getEnabledServers();
      expect(enabledServers.length).toBe(1);
      expect(enabledServers[0].id).toBe('test-1');
    });
  });

  describe('语音合成', () => {
    it('应该使用浏览器TTS作为后备', async () => {
      const result = await service.synthesize('测试文本');

      expect(result).toBeDefined();
      expect(result.audioBuffer).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('应该尝试使用配置的服务器', async () => {
      // Mock piper和melo客户端
      vi.mock('../../src/services/tts/piperTTSClient', () => ({
        PiperTTSClient: vi.fn().mockImplementation(() => ({
          isAvailable: vi.fn().mockResolvedValue(true),
          synthesize: vi.fn().mockResolvedValue({
            audioBuffer: new ArrayBuffer(0),
            duration: 1.0,
            format: 'audio/wav'
          })
        }))
      }));

      const server: TTSServerConfig = {
        id: 'test-1',
        name: '测试服务器',
        type: 'melo',
        enabled: true,
        priority: 1,
        connection: {
          host: 'localhost',
          port: 7860,
          protocol: 'http'
        }
      };

      service.addServer(server);
      
      // 由于我们mock了客户端，应该能够成功
      const result = await service.synthesize('测试文本');
      expect(result).toBeDefined();
    });

    it('如果所有服务器都失败，应该抛出错误', async () => {
      // Mock BrowserTTSClient失败
      const mockClient = {
        isAvailable: vi.fn().mockResolvedValue(false),
        synthesize: vi.fn().mockRejectedValue(new Error('失败'))
      };

      // @ts-ignore
      service['clients'].set('browser', mockClient);

      await expect(service.synthesize('测试')).rejects.toThrow();
    });
  });

  describe('单例模式', () => {
    it('getTTSService应该返回同一个实例', () => {
      const service1 = getTTSService();
      const service2 = getTTSService();

      expect(service1).toBe(service2);
    });
  });
});

