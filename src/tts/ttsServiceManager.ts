// @ts-nocheck
/**
 * TTS 服务管理器 (重构版本)
 * 统一管理多个 TTS 后端，支持场景化配置、自动降级和故障转移
 */

import { type ITTSClient, type TTSOptions, type TTSResult } from './ttsClient';
import { BrowserTTSClient } from './ttsClient';
import { PiperTTSClient } from './piperTTSClient';
import { AzureSpeechTTSClient } from './azureSpeechTTSClient';
import { MeloTTSClient } from './meloTTSClient';
import { TTSServerManager } from './manager/TTSServerManager';
import { TTSClientFactory } from './manager/TTSClientFactory';
import { TTSServerConfig, TTSServerType } from './models/TTSServerConfig';
import { TTSSceneConfig, TTSSceneType, DEFAULT_SCENE_CONFIG, getSceneConfig } from './models/TTSSceneConfig';
import { TTSGlobalSettings, DEFAULT_GLOBAL_SETTINGS } from './models/TTSGlobalSettings';
import { 
  loadConfiguration, 
  saveConfiguration, 
  saveServers, 
  saveSceneConfig, 
  saveGlobalSettings 
} from './utils/storage';

// 保留旧的类型定义以保持向后兼容
export type TTSProvider = 'browser' | 'piper' | 'azure' | 'melo';

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
  // 新架构组件
  private serverManager: TTSServerManager;
  private sceneConfig: TTSSceneConfig;
  private globalSettings: TTSGlobalSettings;
  private clientCache: Map<string, ITTSClient> = new Map();

  // 向后兼容的旧属性
  private providers: Map<TTSProvider, ITTSClient> = new Map();
  private providerConfigs: TTSProviderConfig[] = [];
  private healthStatus: Map<TTSProvider, boolean> = new Map();
  private healthCheckInterval: number | null = null;

  constructor(useNewArchitecture: boolean = true) {
    if (useNewArchitecture) {
      // 使用新架构
      this.initializeNewArchitecture();
    } else {
      // 使用旧架构（向后兼容）
      this.initializeProviders();
    }
  }

  /**
   * 初始化新架构
   */
  private initializeNewArchitecture(): void {
    // 从存储加载配置
    const config = loadConfiguration();
    
    // 初始化服务器管理器
    this.globalSettings = config.globalSettings;
    this.serverManager = new TTSServerManager(this.globalSettings);
    
    // 加载服务器配置
    config.servers.forEach(server => {
      this.serverManager.addServer(server);
    });
    
    // 加载场景配置
    this.sceneConfig = config.sceneConfig;
    
    // 启动健康检查
    if (this.globalSettings.healthCheck.enabled) {
      this.serverManager.startHealthCheck(this.globalSettings.healthCheck.interval);
    }
  }

  /**
   * 初始化旧架构（向后兼容）
   */
  private initializeProviders(): void {
    // 浏览器 TTS（最低优先级，作为后备）
    this.providers.set('browser', new BrowserTTSClient());

    // MeLo TTS（高质量多语言TTS）
    this.providers.set('melo', new MeloTTSClient());

    // Piper TTS（轻量级本地TTS）
    this.providers.set('piper', new PiperTTSClient());

    // Azure Speech Service（云端高质量TTS，支持多语言）
    this.providers.set('azure', new AzureSpeechTTSClient());

    // 默认配置（按优先级排序）
    this.providerConfigs = [
      { provider: 'melo', priority: 0, enabled: true },  // 最高优先级（高质量多语言TTS）
      { provider: 'azure', priority: 1, enabled: false },  // 第二优先级（需要 API Key，默认禁用）
      { provider: 'piper', priority: 2, enabled: true },  // 第三优先级（轻量级本地TTS）
      { provider: 'browser', priority: 3, enabled: true },  // 总是启用作为后备
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

  // ==================== 新架构方法 ====================

  /**
   * 场景化语音合成（新方法）
   * @param scene 场景类型
   * @param text 文本
   * @param options 选项
   */
  async synthesizeForScene(
    scene: TTSSceneType,
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    if (!this.serverManager) {
      // 回退到旧方法
      return this.synthesize(text, options);
    }

    const sceneTTSConfig = getSceneConfig(this.sceneConfig, scene);
    const serverIds = sceneTTSConfig.serverIds;

    // 如果场景没有配置特定服务器，使用全局优先级
    const serversToTry = serverIds.length > 0
      ? serverIds.map(id => this.serverManager.getServer(id)).filter((s): s is TTSServerConfig => s !== undefined)
      : this.serverManager.getEnabledServersByPriority();

    let lastError: Error | null = null;

    // 按优先级尝试每个服务器
    for (const server of serversToTry) {
      // 跳过禁用的服务器
      if (!server.enabled) {
        continue;
      }

      // 跳过不健康的服务器（除非是第一次尝试）
      if (server.status?.health === 'unavailable') {
        continue;
      }

      try {
        const result = await this.synthesizeWithServer(server.id, text, options);
        
        // 成功，记录使用
        this.serverManager.markServerUsed(server.id);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 继续尝试下一个服务器
        continue;
      }
    }

    // 如果启用了浏览器回退
    if (sceneTTSConfig.fallbackToBrowser) {
      try {
        return await this.synthesizeWithBrowser(text, options);
      } catch (error) {
        // 浏览器TTS也失败了
      }
    }

    // 所有服务器都失败了
    throw lastError || new Error(`场景 ${scene} 的所有 TTS 服务器都不可用`);
  }

  /**
   * 使用指定服务器生成语音
   */
  async synthesizeWithServer(
    serverId: string,
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    const server = this.serverManager.getServer(serverId);
    if (!server) {
      throw new Error(`服务器 ${serverId} 不存在`);
    }

    if (!server.enabled) {
      throw new Error(`服务器 ${serverId} 已禁用`);
    }

    // 获取或创建客户端
    let client = this.clientCache.get(serverId);
    if (!client) {
      client = TTSClientFactory.createClient(server);
      this.clientCache.set(serverId, client);
    }

    try {
      const result = await client.synthesize(text, options);
      
      // 成功，记录使用
      this.serverManager.markServerUsed(serverId);
      
      return result;
    } catch (error) {
      // 失败时不抛出错误，让调用者决定是否回退
      throw error;
    }
  }

  /**
   * 使用浏览器 TTS 生成语音
   */
  private async synthesizeWithBrowser(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    // 查找浏览器TTS服务器
    const browserServers = this.serverManager.findServersByType('browser');
    if (browserServers.length > 0 && browserServers[0].enabled) {
      return this.synthesizeWithServer(browserServers[0].id, text, options);
    }

    // 降级到旧的浏览器TTS客户端
    const browserClient = new BrowserTTSClient();
    return browserClient.synthesize(text, options);
  }

  /**
   * 生成语音（自动选择最佳提供者）
   * 向后兼容方法，优先使用新架构
   */
  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    // 如果有新架构，使用系统场景
    if (this.serverManager) {
      return this.synthesizeForScene('system', text, options);
    }

    // 旧架构实现（向后兼容）
    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new Error('没有可用的 TTS 提供者');
    }

    let lastError: Error | null = null;

    for (const providerConfig of availableProviders) {
      const provider = providerConfig.provider;
      const client = this.providers.get(provider);

      if (!client) {
        continue;
      }

      try {
        const result = await client.synthesize(text, options);
        this.healthStatus.set(provider, true);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.healthStatus.set(provider, false);
        continue;
      }
    }

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
      // 如果指定了提供者但未启用，仍然尝试使用（可能是临时禁用）
    }
    
    try {
      const result = await client.synthesize(text, options);
      this.healthStatus.set(provider, true);
      return result;
    } catch (error) {
      this.healthStatus.set(provider, false);
      const errorMsg = error instanceof Error ? error.message : String(error);
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
        return false;
      }

      // 检查健康状态（如果已知不健康，跳过）
      const isHealthy = this.healthStatus.get(config.provider);
      if (isHealthy === false) {
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
    // 新架构
    if (this.clientCache) {
      this.clientCache.forEach((client) => {
        if ('clearCache' in client && typeof (client as any).clearCache === 'function') {
          (client as any).clearCache();
        }
      });
    }

    // 旧架构（向后兼容）
    this.providers.forEach((client) => {
      if ('clearCache' in client && typeof (client as any).clearCache === 'function') {
        (client as any).clearCache();
      }
    });
  }

  // ==================== 新架构配置管理方法 ====================

  /**
   * 获取服务器管理器
   */
  getServerManager(): TTSServerManager {
    return this.serverManager;
  }

  /**
   * 更新场景配置
   */
  updateSceneConfig(updates: Partial<TTSSceneConfig>): void {
    this.sceneConfig = {
      ...this.sceneConfig,
      ...updates
    };
    saveSceneConfig(this.sceneConfig);
  }

  /**
   * 获取场景配置
   */
  getSceneConfig(): TTSSceneConfig {
    return { ...this.sceneConfig };
  }

  /**
   * 更新全局设置
   */
  updateGlobalSettings(updates: Partial<TTSGlobalSettings>): void {
    this.globalSettings = {
      ...this.globalSettings,
      ...updates,
      healthCheck: {
        ...this.globalSettings.healthCheck,
        ...(updates.healthCheck || {})
      },
      fallback: {
        ...this.globalSettings.fallback,
        ...(updates.fallback || {})
      },
      cache: {
        ...this.globalSettings.cache,
        ...(updates.cache || {})
      },
      performance: {
        ...this.globalSettings.performance,
        ...(updates.performance || {})
      }
    };
    
    saveGlobalSettings(this.globalSettings);
    
    // 更新服务器管理器的全局设置
    if (this.serverManager) {
      this.serverManager.updateGlobalSettings(this.globalSettings);
    }
  }

  /**
   * 获取全局设置
   */
  getGlobalSettings(): TTSGlobalSettings {
    return { ...this.globalSettings };
  }

  /**
   * 保存所有配置
   */
  saveAllConfiguration(): void {
    if (this.serverManager) {
      const servers = this.serverManager.getAllServers();
      saveConfiguration({
        servers,
        sceneConfig: this.sceneConfig,
        globalSettings: this.globalSettings
      });
    }
  }

  /**
   * 测试服务器连接
   */
  async testServerConnection(serverId: string): Promise<boolean> {
    if (!this.serverManager) {
      return false;
    }

    const result = await this.serverManager.checkServerHealth(serverId);
    return result.available;
  }

  /**
   * 测试服务器语音合成
   */
  async testServerSynthesis(serverId: string, testText: string = '测试语音合成'): Promise<boolean> {
    try {
      await this.synthesizeWithServer(serverId, testText, { useCache: false });
      return true;
    } catch (error) {
      console.error(`[TTS] 服务器 ${serverId} 语音合成测试失败:`, error);
      return false;
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    if (this.serverManager) {
      return this.serverManager.getStatistics();
    }
    
    // 旧架构统计（向后兼容）
    const enabled = this.providerConfigs.filter(c => c.enabled);
    const available = enabled.filter(c => this.healthStatus.get(c.provider));
    
    return {
      total: this.providerConfigs.length,
      enabled: enabled.length,
      available: available.length,
      unavailable: enabled.length - available.length,
      byType: {
        melo: this.providerConfigs.filter(c => c.provider === 'melo').length,
        piper: this.providerConfigs.filter(c => c.provider === 'piper').length,
        azure: this.providerConfigs.filter(c => c.provider === 'azure').length,
        browser: this.providerConfigs.filter(c => c.provider === 'browser').length
      }
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.serverManager) {
      this.serverManager.dispose();
    }
    
    this.clientCache.clear();
    
    // 旧架构清理
    this.stopHealthCheck();
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

// @ts-nocheck
