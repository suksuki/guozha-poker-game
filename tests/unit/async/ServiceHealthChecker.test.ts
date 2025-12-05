/**
 * ServiceHealthChecker 单元测试（简化版）
 * 使用真实定时器，更可靠但稍慢
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ServiceHealthChecker,
  ServiceStatus
} from '../../../src/central-brain/infrastructure/async/ServiceHealthChecker';

describe('ServiceHealthChecker', () => {
  let checker: ServiceHealthChecker;

  beforeEach(() => {
    checker = new ServiceHealthChecker();
  });

  afterEach(() => {
    checker.cleanup();
  });

  // ========== 基础功能测试 ==========
  describe('基础功能', () => {
    it('应该成功注册服务', () => {
      checker.registerService('test-service', async () => true);
      
      expect(checker.getServiceCount()).toBe(1);
      expect(checker.getAllServiceNames()).toContain('test-service');
    });

    it('健康服务应该标记为HEALTHY', async () => {
      checker.registerService('healthy-service', async () => true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(checker.isServiceHealthy('healthy-service')).toBe(true);
      expect(checker.isServiceAvailable('healthy-service')).toBe(true);
    });

    it('失败的服务应该标记为DEGRADED', async () => {
      checker.registerService('unhealthy-service', async () => false);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(checker.getServiceStatus('unhealthy-service')).toBe(ServiceStatus.DEGRADED);
      expect(checker.isServiceAvailable('unhealthy-service')).toBe(true);
    });

    it('连续失败应该标记为UNAVAILABLE', async () => {
      checker.registerService('failed-service', async () => false, 50);
      
      // 等待3次检查
      await new Promise(resolve => setTimeout(resolve, 250));
      
      expect(checker.getServiceStatus('failed-service')).toBe(ServiceStatus.UNAVAILABLE);
      expect(checker.isServiceAvailable('failed-service')).toBe(false);
    });
  });

  // ========== 状态查询测试 ==========
  describe('状态查询', () => {
    it('应该返回服务健康信息', async () => {
      checker.registerService('test-service', async () => true);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const health = checker.getServiceHealth('test-service');
      expect(health).not.toBeNull();
      expect(health?.serviceName).toBe('test-service');
      expect(health?.status).toBe(ServiceStatus.HEALTHY);
    });

    it('未注册的服务应该返回UNAVAILABLE', () => {
      expect(checker.getServiceStatus('non-existent')).toBe(ServiceStatus.UNAVAILABLE);
      expect(checker.getServiceHealth('non-existent')).toBeNull();
    });

    it('应该返回所有服务', async () => {
      checker.registerService('service1', async () => true);
      checker.registerService('service2', async () => true);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(checker.getAllServicesHealth()).toHaveLength(2);
    });
  });

  // ========== 手动操作测试 ==========
  describe('手动操作', () => {
    it('应该支持手动设置状态', () => {
      checker.registerService('test-service', async () => true);
      
      checker.setServiceStatus('test-service', ServiceStatus.UNAVAILABLE);
      
      expect(checker.getServiceStatus('test-service')).toBe(ServiceStatus.UNAVAILABLE);
    });

    it('应该支持重置状态', async () => {
      checker.registerService('test-service', async () => false);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(checker.getServiceStatus('test-service')).toBe(ServiceStatus.DEGRADED);
      
      checker.resetServiceStatus('test-service');
      expect(checker.getServiceStatus('test-service')).toBe(ServiceStatus.HEALTHY);
    });
  });

  // ========== 清理测试 ==========
  describe('清理', () => {
    it('应该支持注销服务', () => {
      checker.registerService('test-service', async () => true);
      expect(checker.getServiceCount()).toBe(1);
      
      checker.unregisterService('test-service');
      expect(checker.getServiceCount()).toBe(0);
    });

    it('cleanup应该清理所有服务', () => {
      checker.registerService('service1', async () => true);
      checker.registerService('service2', async () => true);
      
      checker.cleanup();
      
      expect(checker.getServiceCount()).toBe(0);
    });
  });

  // ========== 统计功能测试 ==========
  describe('统计功能', () => {
    it('应该正确统计服务数量', async () => {
      checker.registerService('healthy1', async () => true);
      checker.registerService('healthy2', async () => true);
      checker.registerService('degraded', async () => false);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(checker.getServiceCount()).toBe(3);
      expect(checker.getHealthyServiceCount()).toBe(2);
      expect(checker.getUnavailableServiceCount()).toBe(0);
    });

    it('应该导出健康报告', async () => {
      checker.registerService('service1', async () => true);
      checker.registerService('service2', async () => false);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const report = checker.exportHealthReport();
      
      expect(report.totalServices).toBe(2);
      expect(report.healthyCount).toBe(1);
      expect(report.degradedCount).toBe(1);
      expect(report.services).toHaveLength(2);
    });
  });

  // ========== 边界情况测试 ==========
  describe('边界情况', () => {
    it('应该处理健康检查抛出异常', async () => {
      checker.registerService('error-service', async () => {
        throw new Error('Check failed');
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const health = checker.getServiceHealth('error-service');
      expect(health?.status).toBe(ServiceStatus.DEGRADED);
      expect(health?.errorMessage).toContain('Check failed');
    });

    it('应该处理超时', async () => {
      checker.registerService(
        'slow-service',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        },
        30000,
        { timeout: 50 }
      );
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(checker.getServiceStatus('slow-service')).toBe(ServiceStatus.DEGRADED);
    });

    it('应该处理0个服务', () => {
      expect(checker.getServiceCount()).toBe(0);
      expect(checker.getHealthyServiceCount()).toBe(0);
      
      const report = checker.exportHealthReport();
      expect(report.totalServices).toBe(0);
      expect(report.healthRate).toBe(0);
    });
  });

  // ========== 恢复测试 ==========
  describe('服务恢复', () => {
    it('服务恢复后应该变回HEALTHY', async () => {
      let isHealthy = false;
      
      checker.registerService('test-service', async () => isHealthy, 50);
      
      // 初始失败
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(checker.getServiceStatus('test-service')).toBe(ServiceStatus.DEGRADED);
      
      // 恢复
      isHealthy = true;
      await new Promise(resolve => setTimeout(resolve, 150)); // 等待2次成功检查
      
      expect(checker.getServiceStatus('test-service')).toBe(ServiceStatus.HEALTHY);
    });
  });
});

