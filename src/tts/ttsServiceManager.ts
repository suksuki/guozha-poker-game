/**
 * TTS 服务管理器
 * 统一管理多个 TTS 后端，支持自动降级和故障转移
 */

import { type ITTSClient, type TTSOptions, type TTSResult } from './ttsClient';
import { BrowserTTSClient } from './ttsClient';
import { PiperTTSClient } from './piperTTSClient';
import { AzureSpeechTTSClient } from './azureSpeechTTSClient';

export type TTSProvider = 'browser' | 'piper' | 'azure';

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

    // Piper TTS（轻量级本地TTS）
    this.providers.set('piper', new PiperTTSClient());

    // Azure Speech Service（云端高质量TTS，支持多语言）
    this.providers.set('azure', new AzureSpeechTTSClient());

    // 默认配置（按优先级排序）
    this.providerConfigs = [
      { provider: 'azure', priority: 0, enabled: false },  // 最高优先级（需要 API Key，默认禁用）
      { provider: 'piper', priority: 1, enabled: true },  // 第二优先级（轻量级本地TTS）
      { provider: 'browser', priority: 2, enabled: true },  // 总是启用作为后备
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

    console.log(`[TTSServiceManager] 可用提供者列表:`, availableProviders.map(p => ({
      provider: p.provider,
      priority: p.priority,
      enabled: p.enabled,
      healthy: this.healthStatus.get(p.provider)
    })));

    if (availableProviders.length === 0) {
      throw new Error('没有可用的 TTS 提供者');
    }

    // 尝试每个提供者，直到成功
    let lastError: Error | null = null;

    for (const providerConfig of availableProviders) {
      const provider = providerConfig.provider;
      const client = this.providers.get(provider);

      if (!client) {
        console.warn(`[TTSServiceManager] 提供者 ${provider} 的客户端不存在`);
        continue;
      }

      try {
        console.log(`[TTSServiceManager] 尝试使用提供者: ${provider} (优先级: ${providerConfig.priority})`);
        const result = await client.synthesize(text, options);
        
        // 标记为健康
        this.healthStatus.set(provider, true);
        console.log(`[TTSServiceManager] ✅ 提供者 ${provider} 成功生成音频`);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[TTSServiceManager] ❌ 提供者 ${provider} 失败:`, lastError.message);
        
        // 标记为不健康
        this.healthStatus.set(provider, false);
        
        // 继续尝试下一个提供者
        continue;
      }
    }

    // 所有提供者都失败了
    console.error(`[TTSServiceManager] ❌ 所有提供者都失败了，最后错误:`, lastError);
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

    // 检查提供者是否启用
    const config = this.providerConfigs.find(c => c.provider === provider);
    if (config && !config.enabled) {
      console.warn(`[TTSServiceManager] ⚠️ 提供者 ${provider} 未启用，尝试强制使用`);
      // 如果指定了提供者但未启用，仍然尝试使用（可能是临时禁用）
    }

    console.log(`[TTSServiceManager] 🎯 使用指定提供者 ${provider} 生成语音: "${text.substring(0, 30)}..."`);
    
    try {
      const result = await client.synthesize(text, options);
      this.healthStatus.set(provider, true);
      console.log(`[TTSServiceManager] ✅ 提供者 ${provider} 成功生成音频: ${(result.audioBuffer.byteLength / 1024).toFixed(2)} KB`);
      return result;
    } catch (error) {
      this.healthStatus.set(provider, false);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[TTSServiceManager] ❌ 提供者 ${provider} 生成失败:`, errorMsg);
      // 如果指定了提供者但失败，直接抛出错误，不要回退到其他提供者
      // 这样调用者可以知道指定的提供者不可用
      throw error;
    }
  }

  /**
   * 获取可用的提供者列表
   */
  private getAvailableProviders(): TTSProviderConfig[] {
    const available = this.providerConfigs.filter(config => {
      // 检查是否启用
      if (!config.enabled) {
        console.log(`[TTSServiceManager] 提供者 ${config.provider} 未启用`);
        return false;
      }

      // 检查健康状态（如果已知不健康，跳过）
      const isHealthy = this.healthStatus.get(config.provider);
      if (isHealthy === false) {
        console.log(`[TTSServiceManager] 提供者 ${config.provider} 标记为不健康，跳过`);
        return false;
      }

      return true;
    });
    
    // 按优先级排序
    available.sort((a, b) => a.priority - b.priority);
    
    return available;
  }

  /**
   * 检查提供者健康状态
   */
  async checkProviderHealth(provider: TTSProvider): Promise<boolean> {
    // 只检查已启用的提供者
    const config = this.providerConfigs.find(c => c.provider === provider);
    if (!config || !config.enabled) {
      // 未启用的提供者直接返回 false，不检查
      this.healthStatus.set(provider, false);
      return false;
    }

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
        // 静默失败，不输出错误日志（只对启用的提供者输出警告）
        if (config.enabled) {
          console.warn(`[TTSServiceManager] 提供者 ${provider} 健康检查失败（已禁用）`);
        }
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
      // 静默失败，不输出错误日志（只对启用的提供者输出警告）
      if (config.enabled) {
        console.warn(`[TTSServiceManager] 提供者 ${provider} 测试合成失败（已禁用）`);
      }
      this.healthStatus.set(provider, false);
      return false;
    }
  }

  /**
   * 检查所有提供者健康状态
   * 只检查已启用的提供者
   */
  async checkAllProvidersHealth(): Promise<void> {
    // 只检查已启用的提供者
    const enabledProviders = this.providerConfigs
      .filter(config => config.enabled)
      .map(config => config.provider);
    
    const healthChecks = enabledProviders.map(provider => this.checkProviderHealth(provider));
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
   * 获取提供者客户端实例
   */
  getProvider(provider: TTSProvider): ITTSClient | undefined {
    return this.providers.get(provider);
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

