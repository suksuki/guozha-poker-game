/**
 * 配置加载器
 */

import { SystemConfig, DefaultSystemConfig } from './defaultConfig';
import type { SystemConfig as ISystemConfig } from '../types/SystemConfig';

/**
 * 加载系统配置
 * 优先级：override > localStorage > env > default
 */
export function loadSystemConfig(override?: Partial<ISystemConfig>): ISystemConfig {
  // 1. 从默认配置开始
  let config: ISystemConfig = { ...DefaultSystemConfig };
  
  // 2. 从环境变量加载配置
  const envConfig = loadFromEnv();
  config = deepMerge(config, envConfig);
  
  // 3. 从 localStorage 加载用户配置
  const userConfig = loadFromLocalStorage();
  config = deepMerge(config, userConfig);
  
  // 4. 应用覆盖配置
  if (override) {
    config = deepMerge(config, override);
  }
  
  return config;
}

/**
 * 从 localStorage 加载配置
 */
function loadFromLocalStorage(): Partial<ISystemConfig> {
  try {
    const saved = localStorage.getItem('systemConfig');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
  }
  return {};
}

/**
 * 从环境变量加载配置
 */
function loadFromEnv(): Partial<ISystemConfig> {
  return {
    validation: {
      enabled: import.meta.env.VITE_VALIDATION_ENABLED !== 'false',
      validateOnRoundEnd: import.meta.env.VITE_VALIDATE_ON_ROUND_END !== 'false',
      validateOnGameEnd: import.meta.env.VITE_VALIDATE_ON_GAME_END !== 'false',
      validateAfterPlay: import.meta.env.VITE_VALIDATE_AFTER_PLAY === 'true',
      cardIntegrity: {
        enabled: import.meta.env.VITE_CARD_INTEGRITY_ENABLED !== 'false',
        detectDuplicates: import.meta.env.VITE_DETECT_DUPLICATES !== 'false',
        strictMode: import.meta.env.VITE_STRICT_MODE !== 'false',
        tolerance: parseFloat(import.meta.env.VITE_TOLERANCE || '0'),
      },
      scoreIntegrity: {
        enabled: import.meta.env.VITE_SCORE_INTEGRITY_ENABLED !== 'false',
        strictMode: import.meta.env.VITE_SCORE_STRICT_MODE !== 'false',
        tolerance: parseFloat(import.meta.env.VITE_SCORE_TOLERANCE || '0.01'),
      },
      output: {
        console: {
          enabled: import.meta.env.VITE_CONSOLE_OUTPUT_ENABLED !== 'false',
          level: (import.meta.env.VITE_CONSOLE_LEVEL as any) || 'warn',
          detailed: import.meta.env.VITE_CONSOLE_DETAILED === 'true',
        },
        events: {
          enabled: import.meta.env.VITE_EVENT_OUTPUT_ENABLED !== 'false',
          dispatchCustomEvents: import.meta.env.VITE_DISPATCH_EVENTS !== 'false',
        },
        errorHandling: {
          enabled: import.meta.env.VITE_ERROR_HANDLING_ENABLED !== 'false',
          throwOnError: import.meta.env.VITE_THROW_ON_ERROR === 'true',
          recoveryStrategy: (import.meta.env.VITE_RECOVERY_STRATEGY as any) || 'warn',
        },
      },
    },
    event: {
      enabled: import.meta.env.VITE_EVENT_ENABLED !== 'false',
      maxQueueSize: parseInt(import.meta.env.VITE_EVENT_MAX_QUEUE_SIZE || '50'),
      processImmediately: import.meta.env.VITE_EVENT_PROCESS_IMMEDIATELY !== 'false',
    },
    tracking: {
      enabled: import.meta.env.VITE_TRACKING_ENABLED !== 'false',
      cardTracker: {
        enabled: import.meta.env.VITE_CARD_TRACKER_ENABLED !== 'false',
        recordSnapshots: import.meta.env.VITE_CARD_TRACKER_SNAPSHOTS !== 'false',
      },
    },
    audio: {
      enabled: import.meta.env.VITE_AUDIO_ENABLED !== 'false',
      announcement: {
        enabled: import.meta.env.VITE_ANNOUNCEMENT_ENABLED !== 'false',
        deduplicationWindow: parseInt(import.meta.env.VITE_ANNOUNCEMENT_DEDUP_WINDOW || '500'),
      },
      voice: {},
      sound: {},
    },
  } as Partial<ISystemConfig>;
}

/**
 * 保存配置到 localStorage
 */
export function saveSystemConfigToLocalStorage(config: ISystemConfig): void {
  try {
    localStorage.setItem('systemConfig', JSON.stringify(config));
  } catch (error) {
  }
}

/**
 * 深度合并对象
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key] as any, source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }
  
  return result;
}

