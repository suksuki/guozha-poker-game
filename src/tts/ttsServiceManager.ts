/**
 * TTS 服务管理器
 * 统一管理多个 TTS 后端，支持自动降级和故障转移
 */

import { type ITTSClient, type TTSOptions, type TTSResult } from './ttsClient';
import { BrowserTTSClient } from './ttsClient';
import { LocalTTSAPIClient } from './localTTSClient';
import { EdgeTTSClient } from './localTTSClient';
import { GPTSoVITSClient } from './gptSoVITSClient';
import { CoquiTTSClient } from './coquiTTSClient';

export type TTSProvider = 'browser' | 'local' | 'edge' | 'gpt_sovits' | 'coqui';

export interface TTSProviderConfig {
  provider: TTSProvider;
  priority: number;  // 优先级（数字越小优先级越高）
  enabled: boolean;  // 是否启用
  config?: any;  // 提供者特定配置
}

/**
 * TTS 服务管理器
 */
export class TTSServiceManager {
  private providers: Map<TTSProvider, ITTSClient> = new Map();
  private providerConfigs: TTSProviderConfig[] = [];
  private healthStatus: Map<TTSProvider, boolean> = new Map();
  private healthCheckInterval: number | null = null;

  constructor() {
    this.initializeProviders();
  }

  /**
   * 初始化所有 TTS 提供者
   */
  private initializeProviders(): void {
    // 浏览器 TTS（最低优先级，作为后备）
    this.providers.set('browser', new BrowserTTSClient());

    // 本地 TTS API
    this.providers.set('local', new LocalTTSAPIClient());

    // Edge TTS
    this.providers.set('edge', new EdgeTTSClient());

    // GPT-SoVITS
    this.providers.set('gpt_sovits', new GPTSoVITSClient());

    // Coqui TTS
    this.providers.set('coqui', new CoquiTTSClient());

    // 默认配置（按优先级排序）
    this.providerConfigs = [
      { provider: 'gpt_sovits', priority: 1, enabled: true },
      { provider: 'coqui', priority: 2, enabled: true },
      { provider: 'edge', priority: 3, enabled: true },
      { provider: 'local', priority: 4, enabled: true },
      { provider: 'browser', priority: 5, enabled: true },  // 总是启用作为后备
    ];

    // 初始化健康状态
    this.providers.forEach((_, provider) => {
      this.healthStatus.set(provider, true);  // 默认假设可用
    });
  }

  /**
   * 配置提供者
   */
  configureProvider(provider: TTSProvider, config: Partial<TTSProviderConfig>): void {
    const index = this.providerConfigs.findIndex(c => c.provider === provider);
    if (index >= 0) {
      Object.assign(this.providerConfigs[index], config);
    } else {
      this.providerConfigs.push({
        provider,
        priority: 999,
        enabled: true,
        ...config,
      });
    }

    // 按优先级排序
    this.providerConfigs.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 更新提供者配置
   */
  updateProviderConfig(provider: TTSProvider, config: any): void {
    const client = this.providers.get(provider);
    if (client && 'updateConfig' in client) {
      (client as any).updateConfig(config);
    }

    const providerConfig = this.providerConfigs.find(c => c.provider === provider);
    if (providerConfig) {
      providerConfig.config = { ...providerConfig.config, ...config };
    }
  }

  /**
   * 生成语音（自动选择最佳提供者）
   */
  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    // 获取可用的提供者列表（按优先级排序）
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('没有可用的 TTS 提供者');
    }

    // 尝试每个提供者，直到成功
    let lastError: Error | null = null;

    for (const providerConfig of availableProviders) {
      const provider = providerConfig.provider;
      const client = this.providers.get(provider);

      if (!client) {
        continue;
      }

      try {
        console.log(`[TTSServiceManager] 使用提供者: ${provider}`);
        const result = await client.synthesize(text, options);
        
        // 标记为健康
        this.healthStatus.set(provider, true);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[TTSServiceManager] 提供者 ${provider} 失败:`, lastError);
        
        // 标记为不健康
        this.healthStatus.set(provider, false);
        
        // 继续尝试下一个提供者
        continue;
      }
    }

    // 所有提供者都失败了
    throw lastError || new Error('所有 TTS 提供者都失败了');
  }

  /**
   * 使用指定提供者生成语音
   */
  async synthesizeWithProvider(
    provider: TTSProvider,
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    const client = this.providers.get(provider);
    if (!client) {
      throw new Error(`TTS 提供者 ${provider} 不存在`);
    }

    try {
      const result = await client.synthesize(text, options);
      this.healthStatus.set(provider, true);
      return result;
    } catch (error) {
      this.healthStatus.set(provider, false);
      throw error;
    }
  }

  /**
   * 获取可用的提供者列表
   */
  private getAvailableProviders(): TTSProviderConfig[] {
    return this.providerConfigs.filter(config => {
      // 检查是否启用
      if (!config.enabled) {
        return false;
      }

      // 检查健康状态（如果已知不健康，跳过）
      const isHealthy = this.healthStatus.get(config.provider);
      if (isHealthy === false) {
        return false;
      }

      return true;
    });
  }

  /**
   * 检查提供者健康状态
   */
  async checkProviderHealth(provider: TTSProvider): Promise<boolean> {
    const client = this.providers.get(provider);
    if (!client) {
      return false;
    }

    // 如果客户端有 checkHealth 方法，使用它
    if ('checkHealth' in client && typeof (client as any).checkHealth === 'function') {
      try {
        const isHealthy = await (client as any).checkHealth();
        this.healthStatus.set(provider, isHealthy);
        return isHealthy;
      } catch (error) {
        // 静默失败，不输出错误日志
        this.healthStatus.set(provider, false);
        return false;
      }
    }

    // 否则，尝试生成一个测试音频
    try {
      await client.synthesize('test', { useCache: false });
      this.healthStatus.set(provider, true);
      return true;
    } catch (error) {
      // 静默失败，不输出错误日志
      this.healthStatus.set(provider, false);
      return false;
    }
  }

  /**
   * 检查所有提供者健康状态
   */
  async checkAllProvidersHealth(): Promise<void> {
    const providers = Array.from(this.providers.keys());
    const healthChecks = providers.map(provider => this.checkProviderHealth(provider));
    await Promise.allSettled(healthChecks);
  }

  /**
   * 启动健康检查（定期检查提供者状态）
   */
  startHealthCheck(interval: number = 60000): void {
    if (this.healthCheckInterval) {
      this.stopHealthCheck();
    }

    // 立即检查一次
    this.checkAllProvidersHealth();

    // 定期检查
    this.healthCheckInterval = window.setInterval(() => {
      this.checkAllProvidersHealth();
    }, interval);
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 获取提供者状态
   */
  getProviderStatus(): Record<TTSProvider, { enabled: boolean; healthy: boolean }> {
    const status: Record<string, { enabled: boolean; healthy: boolean }> = {};
    
    this.providers.forEach((_, provider) => {
      const config = this.providerConfigs.find(c => c.provider === provider);
      const healthy = this.healthStatus.get(provider) ?? true;
      
      status[provider] = {
        enabled: config?.enabled ?? true,
        healthy,
      };
    });

    return status as Record<TTSProvider, { enabled: boolean; healthy: boolean }>;
  }

  /**
   * 清空所有提供者的缓存
   */
  clearAllCaches(): void {
    this.providers.forEach((client) => {
      if ('clearCache' in client && typeof (client as any).clearCache === 'function') {
        (client as any).clearCache();
      }
    });
  }
}

// 单例实例
let ttsServiceManagerInstance: TTSServiceManager | null = null;

/**
 * 获取 TTS 服务管理器实例
 */
export function getTTSServiceManager(): TTSServiceManager {
  if (!ttsServiceManagerInstance) {
    ttsServiceManagerInstance = new TTSServiceManager();
    // 启动健康检查（每5分钟检查一次）
    ttsServiceManagerInstance.startHealthCheck(5 * 60 * 1000);
  }
  return ttsServiceManagerInstance;
}

