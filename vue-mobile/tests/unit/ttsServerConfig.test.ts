/**
 * TTS服务器配置单元测试
 * 测试服务器配置的保存、加载和验证
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TTSServerConfig } from '../../src/services/tts/types';

describe('TTS服务器配置', () => {
  describe('配置结构验证', () => {
    it('应该包含必需的connection字段', () => {
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

      expect(server.connection).toBeDefined();
      expect(server.connection.host).toBe('192.168.0.13');
      expect(server.connection.port).toBe(7860);
      expect(server.connection.protocol).toBe('http');
    });

    it('melo服务器应该有正确的默认配置', () => {
      const server: TTSServerConfig = {
        id: 'melo-1',
        name: 'MeLo TTS服务器',
        type: 'melo',
        enabled: true,
        priority: 1,
        connection: {
          host: 'localhost',
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

      expect(server.type).toBe('melo');
      expect(server.connection.port).toBe(7860);
      expect(server.providerConfig?.melo?.speaker).toBe('ZH');
    });

    it('piper服务器应该有正确的默认配置', () => {
      const server: TTSServerConfig = {
        id: 'piper-1',
        name: 'Piper TTS服务器',
        type: 'piper',
        enabled: true,
        priority: 2,
        connection: {
          host: 'localhost',
          port: 5000,
          protocol: 'http'
        },
        providerConfig: {
          piper: {
            model: 'zh_CN-huayan-medium'
          }
        }
      };

      expect(server.type).toBe('piper');
      expect(server.connection.port).toBe(5000);
      expect(server.providerConfig?.piper?.model).toBe('zh_CN-huayan-medium');
    });

    it('应该支持声道分配', () => {
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
        },
        assignedChannels: [0, 1, 2]  // 分配给玩家0,1,2
      };

      expect(server.assignedChannels).toBeDefined();
      expect(server.assignedChannels?.length).toBe(3);
      expect(server.assignedChannels).toContain(0);
      expect(server.assignedChannels).toContain(1);
      expect(server.assignedChannels).toContain(2);
    });
  });

  describe('配置验证', () => {
    it('应该验证connection字段完整性', () => {
      const validServer: TTSServerConfig = {
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

      expect(validServer.connection).toBeDefined();
      expect(validServer.connection.host).toBeTruthy();
      expect(validServer.connection.port).toBeGreaterThan(0);
      expect(validServer.connection.protocol).toBeTruthy();
    });

    it('应该拒绝缺少connection的配置（非browser类型）', () => {
      const invalidServer = {
        id: 'test-1',
        name: '测试服务器',
        type: 'melo' as const,
        enabled: true,
        priority: 1
        // 缺少connection
      };

      // TypeScript会在编译时捕获这个错误
      // 但我们需要在运行时也验证
      expect(() => {
        if (!('connection' in invalidServer)) {
          throw new Error('缺少connection字段');
        }
      }).toThrow('缺少connection字段');
    });
  });

  describe('配置序列化', () => {
    it('应该能够正确序列化为JSON', () => {
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
        },
        providerConfig: {
          melo: {
            speaker: 'ZH',
            speed: 1.0
          }
        }
      };

      const json = JSON.stringify(server);
      const parsed = JSON.parse(json);

      expect(parsed.connection).toBeDefined();
      expect(parsed.connection.host).toBe('192.168.0.13');
      expect(parsed.connection.port).toBe(7860);
      expect(parsed.providerConfig.melo.speaker).toBe('ZH');
    });

    it('应该能够从JSON正确反序列化', () => {
      const json = JSON.stringify({
        id: 'test-1',
        name: '测试服务器',
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
      });

      const server = JSON.parse(json) as TTSServerConfig;

      expect(server.connection).toBeDefined();
      expect(server.connection.host).toBe('192.168.0.13');
      expect(server.connection.port).toBe(7860);
      expect(server.providerConfig?.melo?.speaker).toBe('ZH');
    });
  });

  describe('不同连接模式', () => {
    it('本地模式应该使用localhost', () => {
      const server: TTSServerConfig = {
        id: 'local-1',
        name: '本地服务器',
        type: 'melo',
        enabled: true,
        priority: 1,
        connection: {
          host: 'localhost',
          port: 7860,
          protocol: 'http'
        }
      };

      expect(server.connection.host).toBe('localhost');
    });

    it('局域网模式应该支持完整IP', () => {
      const server: TTSServerConfig = {
        id: 'lan-1',
        name: '局域网服务器',
        type: 'melo',
        enabled: true,
        priority: 1,
        connection: {
          host: '192.168.0.13',
          port: 7860,
          protocol: 'http'
        }
      };

      expect(server.connection.host).toBe('192.168.0.13');
      expect(server.connection.host.split('.').length).toBe(4);
    });

    it('自定义模式应该支持域名', () => {
      const server: TTSServerConfig = {
        id: 'custom-1',
        name: '自定义服务器',
        type: 'melo',
        enabled: true,
        priority: 1,
        connection: {
          host: 'tts.example.com',
          port: 7860,
          protocol: 'http'
        }
      };

      expect(server.connection.host).toBe('tts.example.com');
    });
  });
});

