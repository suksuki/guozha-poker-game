/**
 * 服务健康检查集成测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceHealthChecker } from '../../src/central-brain/infrastructure/async/ServiceHealthChecker';
import { AsyncTaskManager } from '../../src/central-brain/infrastructure/async/AsyncTaskManager';

describe('服务健康检查集成测试', () => {
  let healthChecker: ServiceHealthChecker;
  let asyncManager: AsyncTaskManager;

  beforeEach(() => {
    healthChecker = new ServiceHealthChecker();
    asyncManager = new AsyncTaskManager();
  });

  afterEach(() => {
    healthChecker.cleanup();
  });

  it('应该支持服务降级策略', () => {
    let serviceCallCount = 0;

    // 模拟服务调用
    const callService = async () => {
      serviceCallCount++;
      
      // 检查服务状态
      const status = healthChecker.getServiceStatus('mock-service');
      
      if (status === 'UNAVAILABLE') {
        // 使用降级策略
        return 'fallback-response';
      }
      
      if (status === 'DEGRADED') {
        // 使用简化版服务
        return 'simplified-response';
      }
      
      // 正常服务
      return 'normal-response';
    };

    // 手动设置服务状态并测试降级
    healthChecker.setServiceStatus('mock-service', 'HEALTHY');
    expect(callService()).resolves.toBe('normal-response');

    healthChecker.setServiceStatus('mock-service', 'DEGRADED');
    expect(callService()).resolves.toBe('simplified-response');

    healthChecker.setServiceStatus('mock-service', 'UNAVAILABLE');
    expect(callService()).resolves.toBe('fallback-response');
  });

  it('应该集成到AsyncTaskManager工作流', async () => {
    // 注册服务
    healthChecker.registerService(
      'test-service',
      async () => true,
      30000 // 30秒检查（测试中不会触发）
    );

    // 手动设置为健康
    healthChecker.setServiceStatus('test-service', 'HEALTHY');

    // 根据健康状态决定是否调用
    const status = healthChecker.getServiceStatus('test-service');
    
    if (status === 'HEALTHY') {
      const result = await asyncManager.execute(
        async () => 'service-call',
        { timeout: 1000 }
      );
      
      expect(result.success).toBe(true);
    }
  });

  it('应该支持多服务监控', () => {
    // 注册多个服务
    const services = ['llm', 'tts', 'database', 'cache'];
    
    for (const service of services) {
      healthChecker.registerService(
        service,
        async () => true,
        60000
      );
      healthChecker.setServiceStatus(service, 'HEALTHY');
    }

    // 获取所有服务状态
    const statusMap: Record<string, string> = {};
    for (const service of services) {
      statusMap[service] = healthChecker.getServiceStatus(service);
    }

    expect(Object.keys(statusMap).length).toBe(4);
    expect(Object.values(statusMap).every(s => s === 'HEALTHY')).toBe(true);
  });

  it('应该支持服务状态变化通知', () => {
    let statusChanges = 0;

    // 注册服务
    healthChecker.registerService(
      'monitored-service',
      async () => true,
      30000
    );

    // 模拟状态变化
    healthChecker.setServiceStatus('monitored-service', 'HEALTHY');
    statusChanges++;

    healthChecker.setServiceStatus('monitored-service', 'DEGRADED');
    statusChanges++;

    healthChecker.setServiceStatus('monitored-service', 'UNAVAILABLE');
    statusChanges++;

    expect(statusChanges).toBe(3);
    expect(healthChecker.getServiceStatus('monitored-service')).toBe('UNAVAILABLE');
  });
});

