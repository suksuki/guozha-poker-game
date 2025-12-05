/**
 * 服务健康检查器
 * 
 * 职责：
 * - 定期检查服务健康状态
 * - 追踪服务可用性
 * - 支持自动降级
 * - 提供服务状态查询
 * 
 * @example
 * ```typescript
 * const checker = new ServiceHealthChecker();
 * 
 * checker.registerService(
 *   'llm-service',
 *   async () => {
 *     const response = await fetch('http://localhost:11434/health');
 *     return response.ok;
 *   },
 *   30000 // 每30秒检查一次
 * );
 * 
 * if (checker.isServiceAvailable('llm-service')) {
 *   // 使用服务
 * } else {
 *   // 使用降级方案
 * }
 * ```
 */

/**
 * 服务状态
 */
export enum ServiceStatus {
  HEALTHY = 'healthy',        // 健康
  DEGRADED = 'degraded',      // 降级（部分功能受损）
  UNAVAILABLE = 'unavailable' // 不可用
}

/**
 * 服务健康信息
 */
export interface ServiceHealth {
  serviceName: string;
  status: ServiceStatus;
  lastCheck: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  responseTime: number | null;
  errorMessage: string | null;
  totalChecks: number;
  totalFailures: number;
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  checkInterval: number;      // 检查间隔（毫秒）
  timeout: number;            // 检查超时（毫秒）
  degradedThreshold: number;  // 降级阈值（连续失败次数）
  unavailableThreshold: number; // 不可用阈值（连续失败次数）
}

/**
 * 默认健康检查配置
 */
const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  checkInterval: 30000,      // 30秒
  timeout: 5000,             // 5秒
  degradedThreshold: 1,      // 失败1次就降级
  unavailableThreshold: 3    // 失败3次就不可用
};

/**
 * 服务健康检查器
 */
export class ServiceHealthChecker {
  private healthMap: Map<string, ServiceHealth> = new Map();
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private checkFunctions: Map<string, () => Promise<boolean>> = new Map();
  private configs: Map<string, HealthCheckConfig> = new Map();
  
  /**
   * 注册服务
   */
  registerService(
    serviceName: string,
    healthCheckFn: () => Promise<boolean>,
    checkInterval?: number,
    config?: Partial<HealthCheckConfig>
  ): void {
    console.log(`[HealthChecker] Registering service: ${serviceName}`);
    
    // 合并配置
    const fullConfig: HealthCheckConfig = {
      ...DEFAULT_HEALTH_CHECK_CONFIG,
      ...config,
      checkInterval: checkInterval || config?.checkInterval || DEFAULT_HEALTH_CHECK_CONFIG.checkInterval
    };
    
    this.configs.set(serviceName, fullConfig);
    this.checkFunctions.set(serviceName, healthCheckFn);
    
    // 初始化健康信息
    this.healthMap.set(serviceName, {
      serviceName,
      status: ServiceStatus.HEALTHY,
      lastCheck: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      responseTime: null,
      errorMessage: null,
      totalChecks: 0,
      totalFailures: 0
    });
    
    // 立即执行一次检查
    this.checkService(serviceName).catch(() => {
      // 忽略初始检查错误
    });
    
    // 设置定时检查
    const intervalId = setInterval(() => {
      this.checkService(serviceName).catch(() => {
        // 忽略定时检查错误
      });
    }, fullConfig.checkInterval);
    
    this.checkIntervals.set(serviceName, intervalId);
  }
  
  /**
   * 检查服务健康
   */
  private async checkService(serviceName: string): Promise<void> {
    const health = this.healthMap.get(serviceName);
    const checkFn = this.checkFunctions.get(serviceName);
    const config = this.configs.get(serviceName);
    
    if (!health || !checkFn || !config) {
      console.error(`[HealthChecker] Service not found: ${serviceName}`);
      return;
    }
    
    const startTime = Date.now();
    health.totalChecks++;
    
    try {
      // 执行健康检查（带超时）
      const isHealthy = await this.executeWithTimeout(
        checkFn,
        config.timeout
      );
      
      const responseTime = Date.now() - startTime;
      
      if (isHealthy) {
        // 健康
        this.handleHealthyService(health, responseTime);
      } else {
        // 不健康
        this.handleUnhealthyService(health, responseTime, new Error('Health check returned false'));
      }
      
    } catch (error) {
      // 检查失败
      const responseTime = Date.now() - startTime;
      this.handleUnhealthyService(health, responseTime, error as Error);
    }
    
    health.lastCheck = Date.now();
  }
  
  /**
   * 处理健康的服务
   */
  private handleHealthyService(health: ServiceHealth, responseTime: number): void {
    const previousStatus = health.status;
    
    health.consecutiveFailures = 0;
    health.consecutiveSuccesses++;
    health.responseTime = responseTime;
    health.errorMessage = null;
    
    // 恢复到健康状态（需要连续成功）
    if (health.consecutiveSuccesses >= 2) {
      health.status = ServiceStatus.HEALTHY;
      
      if (previousStatus !== ServiceStatus.HEALTHY) {
        console.log(`[HealthChecker] ✅ ${health.serviceName} recovered to HEALTHY (${responseTime}ms)`);
      }
    } else if (previousStatus === ServiceStatus.UNAVAILABLE) {
      // 从不可用恢复，先标记为降级
      health.status = ServiceStatus.DEGRADED;
      console.log(`[HealthChecker] ⚠️ ${health.serviceName} recovered to DEGRADED (${responseTime}ms)`);
    }
  }
  
  /**
   * 处理不健康的服务
   */
  private handleUnhealthyService(
    health: ServiceHealth,
    responseTime: number,
    error: Error
  ): void {
    const config = this.configs.get(health.serviceName)!;
    const previousStatus = health.status;
    
    health.consecutiveFailures++;
    health.consecutiveSuccesses = 0;
    health.responseTime = responseTime;
    health.errorMessage = error.message;
    health.totalFailures++;
    
    // 根据连续失败次数调整状态
    if (health.consecutiveFailures >= config.unavailableThreshold) {
      health.status = ServiceStatus.UNAVAILABLE;
      
      if (previousStatus !== ServiceStatus.UNAVAILABLE) {
        console.error(`[HealthChecker] ❌ ${health.serviceName} is UNAVAILABLE (failures: ${health.consecutiveFailures})`);
      }
    } else if (health.consecutiveFailures >= config.degradedThreshold) {
      health.status = ServiceStatus.DEGRADED;
      
      if (previousStatus === ServiceStatus.HEALTHY) {
        console.warn(`[HealthChecker] ⚠️ ${health.serviceName} is DEGRADED (failures: ${health.consecutiveFailures})`);
      }
    }
  }
  
  /**
   * 执行带超时的健康检查
   */
  private async executeWithTimeout(
    checkFn: () => Promise<boolean>,
    timeout: number
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeout}ms`));
      }, timeout);
      
      try {
        const result = await checkFn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  /**
   * 获取服务状态
   */
  getServiceStatus(serviceName: string): ServiceStatus {
    const health = this.healthMap.get(serviceName);
    return health?.status || ServiceStatus.UNAVAILABLE;
  }
  
  /**
   * 获取服务健康信息
   */
  getServiceHealth(serviceName: string): ServiceHealth | null {
    const health = this.healthMap.get(serviceName);
    return health ? { ...health } : null;
  }
  
  /**
   * 获取所有服务健康信息
   */
  getAllServicesHealth(): ServiceHealth[] {
    return Array.from(this.healthMap.values()).map(h => ({ ...h }));
  }
  
  /**
   * 判断服务是否可用
   */
  isServiceAvailable(serviceName: string): boolean {
    const status = this.getServiceStatus(serviceName);
    return status === ServiceStatus.HEALTHY || status === ServiceStatus.DEGRADED;
  }
  
  /**
   * 判断服务是否健康
   */
  isServiceHealthy(serviceName: string): boolean {
    const status = this.getServiceStatus(serviceName);
    return status === ServiceStatus.HEALTHY;
  }
  
  /**
   * 手动触发健康检查
   */
  async checkNow(serviceName: string): Promise<boolean> {
    await this.checkService(serviceName);
    return this.isServiceAvailable(serviceName);
  }
  
  /**
   * 更新服务配置
   */
  updateServiceConfig(serviceName: string, config: Partial<HealthCheckConfig>): void {
    const currentConfig = this.configs.get(serviceName);
    if (!currentConfig) {
      console.warn(`[HealthChecker] Service not found: ${serviceName}`);
      return;
    }
    
    this.configs.set(serviceName, {
      ...currentConfig,
      ...config
    });
    
    // 如果checkInterval变化，重新设置定时器
    if (config.checkInterval !== undefined) {
      this.resetCheckInterval(serviceName, config.checkInterval);
    }
  }
  
  /**
   * 重置检查间隔
   */
  private resetCheckInterval(serviceName: string, newInterval: number): void {
    // 清除旧定时器
    const oldInterval = this.checkIntervals.get(serviceName);
    if (oldInterval) {
      clearInterval(oldInterval);
    }
    
    // 设置新定时器
    const checkFn = this.checkFunctions.get(serviceName);
    if (checkFn) {
      const newIntervalId = setInterval(() => {
        this.checkService(serviceName).catch(() => {});
      }, newInterval);
      
      this.checkIntervals.set(serviceName, newIntervalId);
    }
  }
  
  /**
   * 手动标记服务状态（用于测试或特殊场景）
   */
  setServiceStatus(serviceName: string, status: ServiceStatus, reason?: string): void {
    const health = this.healthMap.get(serviceName);
    if (!health) {
      console.warn(`[HealthChecker] Service not found: ${serviceName}`);
      return;
    }
    
    health.status = status;
    if (reason) {
      health.errorMessage = reason;
    }
    
    console.log(`[HealthChecker] Manually set ${serviceName} to ${status}: ${reason || 'no reason'}`);
  }
  
  /**
   * 重置服务状态
   */
  resetServiceStatus(serviceName: string): void {
    const health = this.healthMap.get(serviceName);
    if (!health) {
      console.warn(`[HealthChecker] Service not found: ${serviceName}`);
      return;
    }
    
    health.status = ServiceStatus.HEALTHY;
    health.consecutiveFailures = 0;
    health.consecutiveSuccesses = 0;
    health.errorMessage = null;
    
    console.log(`[HealthChecker] Reset ${serviceName} to HEALTHY`);
  }
  
  /**
   * 注销服务
   */
  unregisterService(serviceName: string): void {
    const intervalId = this.checkIntervals.get(serviceName);
    if (intervalId) {
      clearInterval(intervalId);
      this.checkIntervals.delete(serviceName);
    }
    
    this.healthMap.delete(serviceName);
    this.checkFunctions.delete(serviceName);
    this.configs.delete(serviceName);
    
    console.log(`[HealthChecker] Unregistered service: ${serviceName}`);
  }
  
  /**
   * 获取服务数量
   */
  getServiceCount(): number {
    return this.healthMap.size;
  }
  
  /**
   * 获取健康服务数量
   */
  getHealthyServiceCount(): number {
    return Array.from(this.healthMap.values())
      .filter(h => h.status === ServiceStatus.HEALTHY)
      .length;
  }
  
  /**
   * 获取不可用服务数量
   */
  getUnavailableServiceCount(): number {
    return Array.from(this.healthMap.values())
      .filter(h => h.status === ServiceStatus.UNAVAILABLE)
      .length;
  }
  
  /**
   * 获取所有服务名称
   */
  getAllServiceNames(): string[] {
    return Array.from(this.healthMap.keys());
  }
  
  /**
   * 清理所有服务
   */
  cleanup(): void {
    console.log('[HealthChecker] Cleaning up all services...');
    
    // 清除所有定时器
    this.checkIntervals.forEach(intervalId => clearInterval(intervalId));
    this.checkIntervals.clear();
    
    // 清除所有数据
    this.healthMap.clear();
    this.checkFunctions.clear();
    this.configs.clear();
    
    console.log('[HealthChecker] Cleanup completed');
  }
  
  /**
   * 导出健康报告
   */
  exportHealthReport(): HealthReport {
    const services = this.getAllServicesHealth();
    const total = services.length;
    const healthy = services.filter(s => s.status === ServiceStatus.HEALTHY).length;
    const degraded = services.filter(s => s.status === ServiceStatus.DEGRADED).length;
    const unavailable = services.filter(s => s.status === ServiceStatus.UNAVAILABLE).length;
    
    return {
      timestamp: Date.now(),
      totalServices: total,
      healthyCount: healthy,
      degradedCount: degraded,
      unavailableCount: unavailable,
      healthRate: total > 0 ? healthy / total : 0,
      services
    };
  }
}

/**
 * 健康报告
 */
export interface HealthReport {
  timestamp: number;
  totalServices: number;
  healthyCount: number;
  degradedCount: number;
  unavailableCount: number;
  healthRate: number;
  services: ServiceHealth[];
}

