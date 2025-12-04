/**
 * TTS 配置持久化工具
 * 负责配置的保存和加载
 */

import { TTSServerConfig } from '../models/TTSServerConfig';
import { TTSSceneConfig, DEFAULT_SCENE_CONFIG } from '../models/TTSSceneConfig';
import { TTSGlobalSettings, DEFAULT_GLOBAL_SETTINGS } from '../models/TTSGlobalSettings';

// LocalStorage 键名
export const STORAGE_KEYS = {
  SERVERS: 'tts_servers_v2',           // v2 表示新版本
  SCENE_CONFIG: 'tts_scene_config',
  GLOBAL_SETTINGS: 'tts_global_settings',
  LEGACY_CONFIG: 'tts_config'          // 旧版本配置键
};

/**
 * 完整的 TTS 配置
 */
export interface TTSConfiguration {
  servers: TTSServerConfig[];
  sceneConfig: TTSSceneConfig;
  globalSettings: TTSGlobalSettings;
}

/**
 * 保存服务器配置
 */
export function saveServers(servers: TTSServerConfig[]): void {
  try {
    // 移除运行时状态（status），只保存持久化数据
    const serversToSave = servers.map(server => ({
      ...server,
      status: undefined  // 不保存运行时状态
    }));
    
    localStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(serversToSave));
  } catch (error) {
    console.error('[TTS Storage] 保存服务器配置失败:', error);
  }
}

/**
 * 加载服务器配置
 */
export function loadServers(): TTSServerConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SERVERS);
    if (!stored) {
      return getDefaultServers();
    }

    const servers = JSON.parse(stored) as TTSServerConfig[];
    
    // 验证配置结构
    if (!Array.isArray(servers)) {
      console.warn('[TTS Storage] 服务器配置格式无效，使用默认配置');
      return getDefaultServers();
    }

    return servers;
  } catch (error) {
    console.error('[TTS Storage] 加载服务器配置失败:', error);
    return getDefaultServers();
  }
}

/**
 * 保存场景配置
 */
export function saveSceneConfig(sceneConfig: TTSSceneConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SCENE_CONFIG, JSON.stringify(sceneConfig));
  } catch (error) {
    console.error('[TTS Storage] 保存场景配置失败:', error);
  }
}

/**
 * 加载场景配置
 */
export function loadSceneConfig(): TTSSceneConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SCENE_CONFIG);
    if (!stored) {
      return DEFAULT_SCENE_CONFIG;
    }

    const sceneConfig = JSON.parse(stored) as TTSSceneConfig;
    
    // 合并默认配置（防止新增字段丢失）
    return {
      ...DEFAULT_SCENE_CONFIG,
      ...sceneConfig
    };
  } catch (error) {
    console.error('[TTS Storage] 加载场景配置失败:', error);
    return DEFAULT_SCENE_CONFIG;
  }
}

/**
 * 保存全局设置
 */
export function saveGlobalSettings(settings: TTSGlobalSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('[TTS Storage] 保存全局设置失败:', error);
  }
}

/**
 * 加载全局设置
 */
export function loadGlobalSettings(): TTSGlobalSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS);
    if (!stored) {
      return DEFAULT_GLOBAL_SETTINGS;
    }

    const settings = JSON.parse(stored) as TTSGlobalSettings;
    
    // 合并默认配置（防止新增字段丢失）
    return {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...settings,
      healthCheck: {
        ...DEFAULT_GLOBAL_SETTINGS.healthCheck,
        ...(settings.healthCheck || {})
      },
      fallback: {
        ...DEFAULT_GLOBAL_SETTINGS.fallback,
        ...(settings.fallback || {})
      },
      cache: {
        ...DEFAULT_GLOBAL_SETTINGS.cache,
        ...(settings.cache || {})
      },
      performance: {
        ...DEFAULT_GLOBAL_SETTINGS.performance,
        ...(settings.performance || {})
      }
    };
  } catch (error) {
    console.error('[TTS Storage] 加载全局设置失败:', error);
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

/**
 * 保存完整配置
 */
export function saveConfiguration(config: TTSConfiguration): void {
  saveServers(config.servers);
  saveSceneConfig(config.sceneConfig);
  saveGlobalSettings(config.globalSettings);
}

/**
 * 加载完整配置
 */
export function loadConfiguration(): TTSConfiguration {
  // 检查是否需要从旧版本迁移
  const needsMigration = !localStorage.getItem(STORAGE_KEYS.SERVERS) && 
                         localStorage.getItem(STORAGE_KEYS.LEGACY_CONFIG);
  
  if (needsMigration) {
    migrateFromLegacyConfig();
  }

  return {
    servers: loadServers(),
    sceneConfig: loadSceneConfig(),
    globalSettings: loadGlobalSettings()
  };
}

/**
 * 清除所有配置
 */
export function clearConfiguration(): void {
  localStorage.removeItem(STORAGE_KEYS.SERVERS);
  localStorage.removeItem(STORAGE_KEYS.SCENE_CONFIG);
  localStorage.removeItem(STORAGE_KEYS.GLOBAL_SETTINGS);
}

/**
 * 获取默认服务器配置
 */
function getDefaultServers(): TTSServerConfig[] {
  return [
    {
      id: 'default-piper',
      name: '本地 Piper TTS',
      type: 'piper',
      enabled: true,
      priority: 1,
      connection: {
        host: 'localhost',
        port: 5000,
        protocol: 'http'
      },
      providerConfig: {
        piper: {
          model: 'zh_CN-huayan-medium'
        }
      },
      metadata: {
        createdAt: Date.now(),
        isFavorite: true
      }
    },
    {
      id: 'default-browser',
      name: '浏览器 TTS',
      type: 'browser',
      enabled: true,
      priority: 2,
      connection: {
        host: 'browser',
        port: 0,
        protocol: 'http'
      },
      providerConfig: {
        browser: {
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0
        }
      },
      metadata: {
        createdAt: Date.now(),
        isFavorite: false
      }
    }
  ];
}

/**
 * 从旧版本配置迁移
 */
function migrateFromLegacyConfig(): void {
  try {
    const legacyConfigStr = localStorage.getItem(STORAGE_KEYS.LEGACY_CONFIG);
    if (!legacyConfigStr) {
      return;
    }

    console.log('[TTS Storage] 检测到旧版本配置，正在迁移...');
    
    const legacyConfig = JSON.parse(legacyConfigStr);
    const servers: TTSServerConfig[] = [];

    // 迁移 Piper 配置
    if (legacyConfig.enablePiper !== false) {
      servers.push({
        id: 'migrated-piper',
        name: '本地 Piper TTS (已迁移)',
        type: 'piper',
        enabled: true,
        priority: 1,
        connection: {
          host: legacyConfig.piperConfig?.baseUrl?.includes('://') 
            ? new URL(legacyConfig.piperConfig.baseUrl).hostname 
            : 'localhost',
          port: legacyConfig.piperConfig?.baseUrl?.includes('://') 
            ? parseInt(new URL(legacyConfig.piperConfig.baseUrl).port || '5000') 
            : 5000,
          protocol: 'http'
        },
        providerConfig: {
          piper: {
            model: legacyConfig.piperConfig?.model || 'zh_CN-huayan-medium'
          }
        },
        metadata: {
          createdAt: Date.now(),
          isFavorite: true
        }
      });
    }

    // 迁移 Azure 配置
    if (legacyConfig.enableAzure && legacyConfig.azureConfig?.subscriptionKey) {
      servers.push({
        id: 'migrated-azure',
        name: 'Azure Speech TTS (已迁移)',
        type: 'azure',
        enabled: true,
        priority: 0,
        connection: {
          host: 'api.cognitive.microsoft.com',
          port: 443,
          protocol: 'https'
        },
        providerConfig: {
          azure: {
            subscriptionKey: legacyConfig.azureConfig.subscriptionKey,
            region: legacyConfig.azureConfig.region || 'eastus',
            voiceName: legacyConfig.azureConfig.voiceName || 'zh-CN-XiaoxiaoNeural'
          }
        },
        metadata: {
          createdAt: Date.now(),
          isFavorite: false
        }
      });
    }

    // 浏览器 TTS
    if (legacyConfig.enableBrowser !== false) {
      servers.push({
        id: 'migrated-browser',
        name: '浏览器 TTS (已迁移)',
        type: 'browser',
        enabled: true,
        priority: 2,
        connection: {
          host: 'browser',
          port: 0,
          protocol: 'http'
        },
        providerConfig: {
          browser: {}
        },
        metadata: {
          createdAt: Date.now(),
          isFavorite: false
        }
      });
    }

    // 保存迁移后的配置
    saveServers(servers);
    
    // 删除旧配置
    localStorage.removeItem(STORAGE_KEYS.LEGACY_CONFIG);
    
    console.log('[TTS Storage] 配置迁移完成');
  } catch (error) {
    console.error('[TTS Storage] 配置迁移失败:', error);
  }
}

/**
 * 导出配置为 JSON
 */
export function exportConfiguration(): string {
  const config = loadConfiguration();
  return JSON.stringify(config, null, 2);
}

/**
 * 从 JSON 导入配置
 */
export function importConfiguration(jsonStr: string): boolean {
  try {
    const config = JSON.parse(jsonStr) as TTSConfiguration;
    
    // 验证配置结构
    if (!config.servers || !Array.isArray(config.servers)) {
      throw new Error('无效的配置格式');
    }

    saveConfiguration(config);
    return true;
  } catch (error) {
    console.error('[TTS Storage] 导入配置失败:', error);
    return false;
  }
}

