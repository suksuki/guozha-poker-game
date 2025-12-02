/**
 * LLM 可用性管理器
 * 负责检测 LLM 服务可用性，管理降级策略
 */

export type LLMAvailability = 
  | 'available'      // LLM 可用
  | 'unavailable'    // LLM 不可用（已检测，无可用服务）
  | 'checking'       // 检测中
  | 'unknown';       // 未检测（首次启动）

interface CheckCache {
  status: LLMAvailability;
  timestamp: number;
  latency?: number;
}

export class LLMAvailabilityManager {
  private status: LLMAvailability = 'unknown';
  private lastCheckTime: number = 0;
  private checkInterval: number = 60000; // 1分钟缓存
  private cache: Map<string, CheckCache> = new Map(); // 按服务器 URL 缓存
  private checkTimeout: number = 3000; // 快速超时（3秒）

  /**
   * 检测 LLM 可用性（带缓存）
   */
  async checkAvailability(serverUrl: string, forceCheck: boolean = false): Promise<boolean> {
    const now = Date.now();
    const cached = this.cache.get(serverUrl);
    
    // 使用缓存（未过期且非强制检查）
    if (!forceCheck && cached && (now - cached.timestamp < this.checkInterval)) {
      this.status = cached.status;
      return cached.status === 'available';
    }

    // 执行检测
    this.status = 'checking';
    const startTime = now;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.checkTimeout);
      
      const response = await fetch(`${serverUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      if (response.ok) {
        // 检测成功
        this.status = 'available';
        this.lastCheckTime = now;
        
        // 缓存结果
        this.cache.set(serverUrl, {
          status: 'available',
          timestamp: now,
          latency
        });
        
        return true;
      } else {
        // HTTP 错误
        this.markUnavailable(serverUrl);
        return false;
      }
    } catch (error) {
      // 网络错误、超时等
      this.markUnavailable(serverUrl);
      return false;
    }
  }

  /**
   * 获取当前状态（同步，无网络请求）
   */
  getStatus(): LLMAvailability {
    return this.status;
  }

  /**
   * 获取缓存的服务器状态
   */
  getCachedStatus(serverUrl: string): LLMAvailability {
    const cached = this.cache.get(serverUrl);
    if (cached) {
      // 检查缓存是否过期
      const now = Date.now();
      if (now - cached.timestamp < this.checkInterval) {
        return cached.status;
      }
    }
    return 'unknown';
  }

  /**
   * 获取延迟
   */
  getLatency(serverUrl: string): number | undefined {
    const cached = this.cache.get(serverUrl);
    return cached?.latency;
  }

  /**
   * 标记为不可用（调用失败时）
   */
  markUnavailable(serverUrl?: string): void {
    this.status = 'unavailable';
    
    if (serverUrl) {
      this.cache.set(serverUrl, {
        status: 'unavailable',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 重置状态（用户手动刷新时）
   */
  reset(serverUrl?: string): void {
    if (serverUrl) {
      this.cache.delete(serverUrl);
    } else {
      this.cache.clear();
    }
    this.status = 'unknown';
  }

  /**
   * 是否应该调用 LLM（核心判断函数）
   * 返回 false 时应立即跳过所有 LLM 调用
   */
  shouldUseLLM(serverUrl?: string): boolean {
    // 如果提供了服务器 URL，检查该服务器的缓存状态
    if (serverUrl) {
      const cached = this.getCachedStatus(serverUrl);
      if (cached === 'available') {
        return true;
      }
      if (cached === 'unavailable') {
        return false;
      }
      // unknown 或 checking，谨慎处理，允许尝试但可能失败
      return this.status === 'available';
    }
    
    // 没有提供服务器 URL，使用全局状态
    return this.status === 'available';
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [url, cache] of this.cache.entries()) {
      if (now - cache.timestamp > this.checkInterval * 2) {
        this.cache.delete(url);
      }
    }
  }

  /**
   * 设置检测超时时间
   */
  setCheckTimeout(timeout: number): void {
    this.checkTimeout = timeout;
  }

  /**
   * 设置缓存时间
   */
  setCacheInterval(interval: number): void {
    this.checkInterval = interval;
  }
}

// 单例
let instance: LLMAvailabilityManager | null = null;

export function getLLMAvailabilityManager(): LLMAvailabilityManager {
  if (!instance) {
    instance = new LLMAvailabilityManager();
  }
  return instance;
}

