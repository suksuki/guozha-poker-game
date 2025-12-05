/**
 * TTS 配置持久化测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveServers,
  loadServers,
  saveSceneConfig,
  loadSceneConfig,
  saveGlobalSettings,
  loadGlobalSettings,
  saveConfiguration,
  loadConfiguration,
  clearConfiguration,
  STORAGE_KEYS
} from '../../src/tts/utils/storage';
import { createDefaultServerConfig } from '../../src/tts/models/TTSServerConfig';
import { DEFAULT_SCENE_CONFIG } from '../../src/tts/models/TTSSceneConfig';
import { DEFAULT_GLOBAL_SETTINGS } from '../../src/tts/models/TTSGlobalSettings';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('TTS Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('服务器配置持久化', () => {
    it('应该能够保存服务器配置', () => {
      const servers = [
        createDefaultServerConfig('piper', 'Piper 1'),
        createDefaultServerConfig('azure', 'Azure 1')
      ];

      saveServers(servers);

      const saved = localStorageMock.getItem(STORAGE_KEYS.SERVERS);
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('Piper 1');
    });

    it('应该能够加载服务器配置', () => {
      const servers = [
        createDefaultServerConfig('piper', 'Piper 1'),
        createDefaultServerConfig('azure', 'Azure 1')
      ];

      saveServers(servers);
      const loaded = loadServers();

      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('Piper 1');
      expect(loaded[1].name).toBe('Azure 1');
    });

    it('没有保存的配置时应该返回默认服务器', () => {
      const loaded = loadServers();

      expect(loaded).toHaveLength(2); // 默认有 piper 和 browser
      expect(loaded.some(s => s.type === 'piper')).toBe(true);
      expect(loaded.some(s => s.type === 'browser')).toBe(true);
    });

    it('保存时不应该包含运行时状态', () => {
      const server = createDefaultServerConfig('piper');
      server.status = { 
        health: 'available',
        latency: 100
      };

      saveServers([server]);
      
      const saved = localStorageMock.getItem(STORAGE_KEYS.SERVERS);
      const parsed = JSON.parse(saved!);
      
      expect(parsed[0].status).toBeUndefined();
    });
  });

  describe('场景配置持久化', () => {
    it('应该能够保存场景配置', () => {
      const sceneConfig = {
        ...DEFAULT_SCENE_CONFIG,
        systemSound: {
          ...DEFAULT_SCENE_CONFIG.systemSound,
          serverIds: ['server-1', 'server-2']
        }
      };

      saveSceneConfig(sceneConfig);

      const saved = localStorageMock.getItem(STORAGE_KEYS.SCENE_CONFIG);
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.systemSound.serverIds).toContain('server-1');
    });

    it('应该能够加载场景配置', () => {
      const sceneConfig = {
        ...DEFAULT_SCENE_CONFIG,
        chatSound: {
          ...DEFAULT_SCENE_CONFIG.chatSound,
          serverIds: ['chat-server']
        }
      };

      saveSceneConfig(sceneConfig);
      const loaded = loadSceneConfig();

      expect(loaded.chatSound.serverIds).toContain('chat-server');
    });

    it('没有保存的配置时应该返回默认场景配置', () => {
      const loaded = loadSceneConfig();

      expect(loaded).toEqual(DEFAULT_SCENE_CONFIG);
    });

    it('加载时应该合并默认配置', () => {
      // 保存一个不完整的配置
      localStorageMock.setItem(STORAGE_KEYS.SCENE_CONFIG, JSON.stringify({
        systemSound: { serverIds: ['test'], fallbackToBrowser: true }
      }));

      const loaded = loadSceneConfig();

      // 应该包含所有默认字段
      expect(loaded.systemSound).toBeTruthy();
      expect(loaded.chatSound).toBeTruthy();
      expect(loaded.announcementSound).toBeTruthy();
      expect(loaded.aiDialogueSound).toBeTruthy();
    });
  });

  describe('全局设置持久化', () => {
    it('应该能够保存全局设置', () => {
      const settings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        healthCheck: {
          ...DEFAULT_GLOBAL_SETTINGS.healthCheck,
          interval: 10000
        }
      };

      saveGlobalSettings(settings);

      const saved = localStorageMock.getItem(STORAGE_KEYS.GLOBAL_SETTINGS);
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.healthCheck.interval).toBe(10000);
    });

    it('应该能够加载全局设置', () => {
      const settings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        cache: {
          ...DEFAULT_GLOBAL_SETTINGS.cache,
          maxSize: 100
        }
      };

      saveGlobalSettings(settings);
      const loaded = loadGlobalSettings();

      expect(loaded.cache.maxSize).toBe(100);
    });

    it('没有保存的配置时应该返回默认全局设置', () => {
      const loaded = loadGlobalSettings();

      expect(loaded).toEqual(DEFAULT_GLOBAL_SETTINGS);
    });

    it('加载时应该合并默认配置', () => {
      // 保存一个不完整的配置
      localStorageMock.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify({
        healthCheck: { enabled: false }
      }));

      const loaded = loadGlobalSettings();

      // 应该包含所有默认字段
      expect(loaded.healthCheck.enabled).toBe(false);
      expect(loaded.healthCheck.interval).toBe(DEFAULT_GLOBAL_SETTINGS.healthCheck.interval);
      expect(loaded.fallback).toBeTruthy();
      expect(loaded.cache).toBeTruthy();
    });
  });

  describe('完整配置持久化', () => {
    it('应该能够保存完整配置', () => {
      const config = {
        servers: [createDefaultServerConfig('piper')],
        sceneConfig: DEFAULT_SCENE_CONFIG,
        globalSettings: DEFAULT_GLOBAL_SETTINGS
      };

      saveConfiguration(config);

      expect(localStorageMock.getItem(STORAGE_KEYS.SERVERS)).toBeTruthy();
      expect(localStorageMock.getItem(STORAGE_KEYS.SCENE_CONFIG)).toBeTruthy();
      expect(localStorageMock.getItem(STORAGE_KEYS.GLOBAL_SETTINGS)).toBeTruthy();
    });

    it('应该能够加载完整配置', () => {
      const config = {
        servers: [
          createDefaultServerConfig('piper', 'Test Piper'),
          createDefaultServerConfig('azure', 'Test Azure')
        ],
        sceneConfig: {
          ...DEFAULT_SCENE_CONFIG,
          systemSound: {
            ...DEFAULT_SCENE_CONFIG.systemSound,
            serverIds: ['test-id']
          }
        },
        globalSettings: {
          ...DEFAULT_GLOBAL_SETTINGS,
          healthCheck: {
            ...DEFAULT_GLOBAL_SETTINGS.healthCheck,
            interval: 20000
          }
        }
      };

      saveConfiguration(config);
      const loaded = loadConfiguration();

      expect(loaded.servers).toHaveLength(2);
      expect(loaded.servers[0].name).toBe('Test Piper');
      expect(loaded.sceneConfig.systemSound.serverIds).toContain('test-id');
      expect(loaded.globalSettings.healthCheck.interval).toBe(20000);
    });

    it('应该能够清除所有配置', () => {
      const config = {
        servers: [createDefaultServerConfig('piper')],
        sceneConfig: DEFAULT_SCENE_CONFIG,
        globalSettings: DEFAULT_GLOBAL_SETTINGS
      };

      saveConfiguration(config);
      clearConfiguration();

      expect(localStorageMock.getItem(STORAGE_KEYS.SERVERS)).toBeNull();
      expect(localStorageMock.getItem(STORAGE_KEYS.SCENE_CONFIG)).toBeNull();
      expect(localStorageMock.getItem(STORAGE_KEYS.GLOBAL_SETTINGS)).toBeNull();
    });
  });

  describe('配置迁移', () => {
    it('应该能够从旧版本迁移配置', () => {
      // 模拟旧版本配置
      const legacyConfig = {
        enablePiper: true,
        piperConfig: {
          baseUrl: 'http://localhost:5000',
          model: 'zh_CN-huayan-medium'
        },
        enableBrowser: true
      };

      localStorageMock.setItem(STORAGE_KEYS.LEGACY_CONFIG, JSON.stringify(legacyConfig));

      const loaded = loadConfiguration();

      // 应该迁移成功
      expect(loaded.servers.length).toBeGreaterThan(0);
      expect(loaded.servers.some(s => s.type === 'piper')).toBe(true);
      expect(loaded.servers.some(s => s.type === 'browser')).toBe(true);

      // 旧配置应该被删除
      expect(localStorageMock.getItem(STORAGE_KEYS.LEGACY_CONFIG)).toBeNull();
    });
  });

  describe('错误处理', () => {
    it('配置格式无效时应该返回默认配置', () => {
      localStorageMock.setItem(STORAGE_KEYS.SERVERS, 'invalid json');

      const loaded = loadServers();

      // 应该返回默认服务器
      expect(loaded).toHaveLength(2);
    });

    it('配置不是数组时应该返回默认配置', () => {
      localStorageMock.setItem(STORAGE_KEYS.SERVERS, JSON.stringify({ invalid: 'structure' }));

      const loaded = loadServers();

      // 应该返回默认服务器
      expect(loaded).toHaveLength(2);
    });
  });
});

