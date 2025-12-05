/**
 * TTS 全局设置模型
 */

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  enabled: boolean;                  // 是否启用定期健康检查
  interval: number;                  // 检查间隔（毫秒）
  timeout: number;                   // 单次检查超时（毫秒）
  retryCount: number;                // 失败重试次数
  exponentialBackoff: boolean;       // 是否使用指数退避
}

/**
 * 回退策略配置
 */
export interface FallbackConfig {
  autoFallback: boolean;             // 自动回退到下一个可用服务器
  fallbackDelay: number;             // 回退延迟（毫秒）
  maxRetries: number;                // 最大重试次数
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;                  // 启用音频缓存
  maxSize: number;                   // 最大缓存大小（MB）
  ttl: number;                       // 缓存过期时间（毫秒）
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  preload: boolean;                  // 预加载常用语音
  concurrent: number;                // 最大并发请求数
}

/**
 * TTS 全局设置
 */
export interface TTSGlobalSettings {
  // 健康检查配置
  healthCheck: HealthCheckConfig;
  
  // 回退策略
  fallback: FallbackConfig;
  
  // 缓存配置
  cache: CacheConfig;
  
  // 性能配置
  performance: PerformanceConfig;
}

/**
 * 默认全局设置
 */
export const DEFAULT_GLOBAL_SETTINGS: TTSGlobalSettings = {
  healthCheck: {
    enabled: true,
    interval: 5 * 60 * 1000,         // 5分钟
    timeout: 5000,                   // 5秒
    retryCount: 2,
    exponentialBackoff: true
  },
  fallback: {
    autoFallback: true,
    fallbackDelay: 100,              // 100ms
    maxRetries: 3
  },
  cache: {
    enabled: true,
    maxSize: 50,                     // 50MB
    ttl: 24 * 60 * 60 * 1000        // 24小时
  },
  performance: {
    preload: false,
    concurrent: 3
  }
};

/**
 * 计算指数退避延迟
 */
export function getBackoffDelay(retryCount: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // 最大30秒
}

