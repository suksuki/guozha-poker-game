/**
 * 系统配置类型定义
 */

/**
 * 验证配置
 */
export interface ValidationConfig {
  enabled: boolean;
  validateOnRoundEnd: boolean;
  validateOnGameEnd: boolean;
  validateAfterPlay: boolean;
  cardIntegrity: {
    enabled: boolean;
    detectDuplicates: boolean;
    strictMode: boolean;
    tolerance: number;
  };
  scoreIntegrity: {
    enabled: boolean;
    strictMode: boolean;
    tolerance: number;
  };
  output: {
    console: {
      enabled: boolean;
      level: 'none' | 'error' | 'warn' | 'info' | 'debug';
      detailed: boolean;
    };
    events: {
      enabled: boolean;
      dispatchCustomEvents: boolean;
    };
    errorHandling: {
      enabled: boolean;
      throwOnError: boolean;
      recoveryStrategy: 'none' | 'warn' | 'rollback' | 'custom';
    };
  };
}

/**
 * 事件配置
 */
export interface EventConfig {
  enabled: boolean;
  maxQueueSize: number;
  processImmediately: boolean;
}

/**
 * 追踪配置
 */
export interface TrackingConfig {
  enabled: boolean;
  cardTracker: {
    enabled: boolean;
    recordSnapshots: boolean;
  };
}

/**
 * 音频配置
 */
export interface AudioConfig {
  enabled: boolean;
  announcement: {
    enabled: boolean;
    deduplicationWindow: number;
  };
  voice: any; // VoiceConfig 类型
  sound: any; // SoundConfig 类型
}

/**
 * AI中控配置（可选）
 */
export interface AIControlConfig {
  enabled?: boolean;
  [key: string]: any; // 允许其他配置项
}

/**
 * 系统完整配置
 */
export interface SystemConfig {
  validation: ValidationConfig;
  event: EventConfig;
  tracking: TrackingConfig;
  audio: AudioConfig;
  aiControl?: AIControlConfig; // AI中控配置（可选）
}

