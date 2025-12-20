/**
 * TTS 服务器管理器
 * 负责管理所有 TTS 服务器的配置、状态和健康检查
 */

import {
  TTSServerConfig,
  TTSServerType,
  ServerHealthResult,
  generateServerId,
  createDefaultServerConfig,
  getFullUrl
} from '../models/TTSServerConfig';
import { TTSGlobalSettings, DEFAULT_GLOBAL_SETTINGS, getBackoffDelay } from '../models/TTSGlobalSettings';

export class TTSServerManager {
  private servers: Map<string, TTSServerConfig> = new Map();
  private healthCheckTimer: number | null = null;
  private globalSettings: TTSGlobalSettings;
  private retryCounters: Map<string, number> = new Map(); // 记录每个服务器的重试次数

  constructor(globalSettings?: TTSGlobalSettings) {
    this.globalSettings = globalSettings || DEFAULT_GLOBAL_SETTINGS;
  }

  // ==================== 服务器管理 ====================

  /**
   * 添加服务器
   */
  addServer(config: Omit<TTSServerConfig, 'id' | 'metadata'> & { 
    metadata?: Partial<TTSServerConfig['metadata']> 
  }): string {
    const id = generateServerId();
    const server: TTSServerConfig = {
      ...config,
      id,
      metadata: {
        createdAt: Date.now(),
        isFavorite: false,
        ...config.metadata
      }
    };
    
    this.servers.set(id, server);
    return id;
  }

  /**
   * 更新服务器配置
   */
  updateServer(id: string, updates: Partial<TTSServerConfig>): void {
    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`服务器 ${id} 不存在`);
    }

    const updated: TTSServerConfig = {
      ...server,
      ...updates,
      id: server.id, // 保持ID不变
      metadata: {
        ...server.metadata,
        ...(updates.metadata || {})
      }
    };

    this.servers.set(id, updated);
  }

  /**
   * 删除服务器
   */
  removeServer(id: string): void {
    this.servers.delete(id);
    this.retryCounters.delete(id);
  }

  /**
   * 获取服务器
   */
  getServer(id: string): TTSServerConfig | undefined {
    return this.servers.get(id);
  }

  /**
   * 获取所有服务器
   */
  getAllServers(): TTSServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * 获取已启用的服务器
   */
  getEnabledServers(): TTSServerConfig[] {
    return this.getAllServers().filter(server => server.enabled);
  }

  /**
   * 根据类型查找服务器
   */
  findServersByType(type: TTSServerType): TTSServerConfig[] {
    return this.getAllServers().filter(server => server.type === type);
  }

  /**
   * 查找可用的服务器（已启用且健康）
   */
  findAvailableServers(): TTSServerConfig[] {
    return this.getEnabledServers().filter(server => 
      server.status?.health === 'available'
    );
  }

  /**
   * 按优先级排序获取服务器
   */
  getServersByPriority(): TTSServerConfig[] {
    return this.getAllServers().sort((a, b) => a.priority - b.priority);
  }

  /**
   * 按优先级排序获取已启用的服务器
   */
  getEnabledServersByPriority(): TTSServerConfig[] {
    return this.getEnabledServers().sort((a, b) => a.priority - b.priority);
  }

  // ==================== 优先级管理 ====================

  /**
   * 重新排序服务器优先级
   */
  reorderPriority(serverIds: string[]): void {
    serverIds.forEach((id, index) => {
      const server = this.servers.get(id);
      if (server) {
        this.updateServer(id, { priority: index + 1 });
      }
    });
  }

  /**
   * 调整单个服务器的优先级
   */
  setPriority(id: string, priority: number): void {
    this.updateServer(id, { priority });
  }

  // ==================== 健康检查 ====================

  /**
   * 检查单个服务器的健康状态
   */
  async checkServerHealth(id: string): Promise<ServerHealthResult> {
    const server = this.servers.get(id);
    if (!server) {
      return { available: false, errorMessage: '服务器不存在' };
    }

    // 如果服务器被禁用，不检查
    if (!server.enabled) {
      this.updateServerStatus(id, {
        health: 'disabled',
        lastCheckTime: Date.now()
      });
      return { available: false, errorMessage: '服务器已禁用' };
    }

    // 更新状态为检查中
    this.updateServerStatus(id, {
      health: 'checking',
      lastCheckTime: Date.now()
    });

    try {
      const startTime = Date.now();
      const result = await this.performHealthCheck(server);
      const latency = Date.now() - startTime;

      if (result.available) {
        // 成功，重置重试计数器
        this.retryCounters.set(id, 0);
        
        this.updateServerStatus(id, {
          health: 'available',
          latency,
          lastCheckTime: Date.now(),
          errorMessage: undefined
        });
      } else {
        // 失败，增加重试计数器
        const retryCount = (this.retryCounters.get(id) || 0) + 1;
        this.retryCounters.set(id, retryCount);
        
        this.updateServerStatus(id, {
          health: 'unavailable',
          lastCheckTime: Date.now(),
          errorMessage: result.errorMessage
        });
      }

      return { ...result, latency };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 失败，增加重试计数器
      const retryCount = (this.retryCounters.get(id) || 0) + 1;
      this.retryCounters.set(id, retryCount);
      
      this.updateServerStatus(id, {
        health: 'unavailable',
        lastCheckTime: Date.now(),
        errorMessage
      });

      return { available: false, errorMessage };
    }
  }

  /**
   * 执行实际的健康检查
   */
  private async performHealthCheck(server: TTSServerConfig): Promise<ServerHealthResult> {
    const { type, connection } = server;
    
    // 浏览器 TTS 总是可用
    if (type === 'browser') {
      return { available: true };
    }

    const baseUrl = getFullUrl(connection);
    const healthUrl = `${baseUrl}/health`;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.globalSettings.healthCheck.timeout);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        return { available: true };
      } else {
        return { 
          available: false, 
          errorMessage: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { available: false, errorMessage: '连接超时' };
        }
        return { available: false, errorMessage: error.message };
      }
      return { available: false, errorMessage: String(error) };
    }
  }

  /**
   * 检查所有已启用的服务器
   */
  async checkAllEnabledServers(): Promise<Map<string, ServerHealthResult>> {
    const enabledServers = this.getEnabledServers();
    
    if (enabledServers.length === 0) {
      return new Map();
    }

    const results = await Promise.allSettled(
      enabledServers.map(server => 
        this.checkServerHealth(server.id).then(result => ({ 
          id: server.id, 
          result 
        }))
      )
    );

    const resultMap = new Map<string, ServerHealthResult>();
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        resultMap.set(result.value.id, result.value.result);
      }
    });

    return resultMap;
  }

  /**
   * 启动健康检查定时器
   */
  startHealthCheck(interval?: number): void {
    this.stopHealthCheck(); // 先停止已有的定时器

    const checkInterval = interval || this.globalSettings.healthCheck.interval;
    
    // 立即执行一次检查
    this.checkAllEnabledServers();

    // 设置定时器
    this.healthCheckTimer = window.setInterval(() => {
      // 只在有启用的服务器时才检查
      const hasEnabledServers = this.getEnabledServers().length > 0;
      if (hasEnabledServers) {
        this.checkAllEnabledServers();
      }
    }, checkInterval);
  }

  /**
   * 停止健康检查定时器
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * 更新服务器状态
   */
  private updateServerStatus(id: string, status: Partial<TTSServerConfig['status']>): void {
    const server = this.servers.get(id);
    if (server) {
      this.servers.set(id, {
        ...server,
        status: {
          ...server.status,
          ...status
        } as TTSServerConfig['status']
      });
    }
  }

  // ==================== 全局设置 ====================

  /**
   * 更新全局设置
   */
  updateGlobalSettings(settings: Partial<TTSGlobalSettings>): void {
    this.globalSettings = {
      ...this.globalSettings,
      ...settings,
      healthCheck: {
        ...this.globalSettings.healthCheck,
        ...(settings.healthCheck || {})
      },
      fallback: {
        ...this.globalSettings.fallback,
        ...(settings.fallback || {})
      },
      cache: {
        ...this.globalSettings.cache,
        ...(settings.cache || {})
      },
      performance: {
        ...this.globalSettings.performance,
        ...(settings.performance || {})
      }
    };

    // 如果健康检查设置改变，重新启动定时器
    if (settings.healthCheck) {
      if (this.globalSettings.healthCheck.enabled && this.healthCheckTimer === null) {
        this.startHealthCheck();
      } else if (!this.globalSettings.healthCheck.enabled && this.healthCheckTimer !== null) {
        this.stopHealthCheck();
      }
    }
  }

  /**
   * 获取全局设置
   */
  getGlobalSettings(): TTSGlobalSettings {
    return { ...this.globalSettings };
  }

  // ==================== 实用方法 ====================

  /**
   * 切换服务器启用状态
   */
  toggleServer(id: string): void {
    const server = this.servers.get(id);
    if (server) {
      this.updateServer(id, { enabled: !server.enabled });
      
      // 如果禁用，更新状态
      if (!server.enabled) {
        this.updateServerStatus(id, {
          health: 'disabled'
        });
      }
    }
  }

  /**
   * 切换收藏状态
   */
  toggleFavorite(id: string): void {
    const server = this.servers.get(id);
    if (server) {
      this.updateServer(id, {
        metadata: {
          ...server.metadata,
          isFavorite: !server.metadata.isFavorite
        }
      });
    }
  }

  /**
   * 记录服务器使用
   */
  markServerUsed(id: string): void {
    const server = this.servers.get(id);
    if (server) {
      this.updateServer(id, {
        metadata: {
          ...server.metadata,
          lastUsed: Date.now()
        }
      });
    }
  }

  /**
   * 获取服务器统计信息
   */
  getStatistics() {
    const all = this.getAllServers();
    const enabled = this.getEnabledServers();
    const available = this.findAvailableServers();
    
    return {
      total: all.length,
      enabled: enabled.length,
      available: available.length,
      unavailable: enabled.length - available.length,
      byType: {
        piper: this.findServersByType('piper').length,
        azure: this.findServersByType('azure').length,
        browser: this.findServersByType('browser').length
      }
    };
  }

  /**
   * 清理：停止所有定时器
   */
  dispose(): void {
    this.stopHealthCheck();
    this.servers.clear();
    this.retryCounters.clear();
  }
}

