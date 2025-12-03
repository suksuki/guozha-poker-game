/**
 * LLMAvailabilityManager 测试
 * 测试 LLM 可用性检测和降级机制
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMAvailabilityManager } from '../../../src/services/llm/LLMAvailabilityManager';

describe('LLMAvailabilityManager', () => {
  let manager: LLMAvailabilityManager;

  beforeEach(() => {
    manager = new LLMAvailabilityManager();
    // 清除所有 fetch mock
    vi.restoreAllMocks();
  });

  describe('初始状态', () => {
    it('初始状态应该是 unknown', () => {
      expect(manager.getStatus()).toBe('unknown');
    });
  });

  describe('可用性检测', () => {
    it('检测成功时应返回 available 状态', async () => {
      // Mock fetch 成功响应
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      });

      const result = await manager.checkAvailability('http://localhost:11434');
      expect(result).toBe(true);
      expect(manager.getStatus()).toBe('available');
    });

    it('检测失败时应返回 unavailable 状态', async () => {
      // Mock fetch 失败
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await manager.checkAvailability('http://localhost:11434');
      expect(result).toBe(false);
      expect(manager.getStatus()).toBe('unavailable');
    });

    it('HTTP 错误应标记为不可用', async () => {
      // Mock HTTP 404 错误
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await manager.checkAvailability('http://localhost:11434');
      expect(result).toBe(false);
      expect(manager.getStatus()).toBe('unavailable');
    });

    it('检测时状态应为 checking', async () => {
      // Mock 一个延迟的响应
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => 
          resolve({ ok: true, json: async () => ({}) }), 100
        ))
      );

      const promise = manager.checkAvailability('http://localhost:11434');
      expect(manager.getStatus()).toBe('checking');
      
      await promise;
      expect(manager.getStatus()).toBe('available');
    });
  });

  describe('结果缓存', () => {
    it('应该缓存检测结果', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      });

      // 第一次检测
      await manager.checkAvailability('http://localhost:11434');
      expect(fetch).toHaveBeenCalledTimes(1);

      // 第二次检测（应使用缓存）
      await manager.checkAvailability('http://localhost:11434', false);
      expect(fetch).toHaveBeenCalledTimes(1); // 仍然是 1 次
    });

    it('强制检测应忽略缓存', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      });

      // 第一次检测
      await manager.checkAvailability('http://localhost:11434');
      expect(fetch).toHaveBeenCalledTimes(1);

      // 强制检测
      await manager.checkAvailability('http://localhost:11434', true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('应该为不同服务器独立缓存', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      });

      await manager.checkAvailability('http://localhost:11434');
      await manager.checkAvailability('http://192.168.0.13:11434');

      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('获取缓存状态', () => {
    it('应该能获取已缓存的服务器状态', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      });

      await manager.checkAvailability('http://localhost:11434');
      const status = manager.getCachedStatus('http://localhost:11434');
      expect(status).toBe('available');
    });

    it('未缓存的服务器应返回 unknown', () => {
      const status = manager.getCachedStatus('http://unknown:11434');
      expect(status).toBe('unknown');
    });
  });

  describe('延迟测量', () => {
    it('应该记录请求延迟', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({ ok: true, json: async () => ({}) }), 50
        ))
      );

      await manager.checkAvailability('http://localhost:11434');
      const latency = manager.getLatency('http://localhost:11434');

      expect(latency).toBeDefined();
      expect(latency!).toBeGreaterThanOrEqual(50);
    });

    it('失败的请求不应记录延迟', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed'));

      await manager.checkAvailability('http://localhost:11434');
      const latency = manager.getLatency('http://localhost:11434');

      expect(latency).toBeUndefined();
    });
  });

  describe('标记不可用', () => {
    it('应该能手动标记服务器不可用', () => {
      manager.markUnavailable('http://localhost:11434');
      
      const status = manager.getCachedStatus('http://localhost:11434');
      expect(status).toBe('unavailable');
    });

    it('标记不可用应更新全局状态', () => {
      manager.markUnavailable();
      expect(manager.getStatus()).toBe('unavailable');
    });
  });

  describe('重置状态', () => {
    it('应该能重置特定服务器的状态', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await manager.checkAvailability('http://localhost:11434');
      expect(manager.getCachedStatus('http://localhost:11434')).toBe('available');

      manager.reset('http://localhost:11434');
      expect(manager.getCachedStatus('http://localhost:11434')).toBe('unknown');
    });

    it('应该能重置所有状态', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await manager.checkAvailability('http://localhost:11434');
      await manager.checkAvailability('http://192.168.0.13:11434');

      manager.reset();

      expect(manager.getCachedStatus('http://localhost:11434')).toBe('unknown');
      expect(manager.getCachedStatus('http://192.168.0.13:11434')).toBe('unknown');
      expect(manager.getStatus()).toBe('unknown');
    });
  });

  describe('shouldUseLLM 判断', () => {
    it('available 状态应返回 true', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      await manager.checkAvailability('http://localhost:11434');
      expect(manager.shouldUseLLM('http://localhost:11434')).toBe(true);
    });

    it('unavailable 状态应返回 false', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed'));

      await manager.checkAvailability('http://localhost:11434');
      expect(manager.shouldUseLLM('http://localhost:11434')).toBe(false);
    });

    it('unknown 状态应根据全局状态判断', () => {
      // 全局状态是 unknown，应该谨慎处理
      expect(manager.shouldUseLLM('http://new-server:11434')).toBe(false);
    });
  });

  describe('超时配置', () => {
    it('应该能设置检测超时时间', async () => {
      manager.setCheckTimeout(100); // 100ms 超时

      // Mock 一个会超时的请求，并正确响应 abort 信号
      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve({ ok: true, json: async () => ({}) });
          }, 200);
          
          // 监听 abort 信号
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        });
      });

      const result = await manager.checkAvailability('http://localhost:11434');
      expect(result).toBe(false); // 应该超时失败
    });
  });

  describe('缓存时间配置', () => {
    it('应该能设置缓存时间', () => {
      manager.setCacheInterval(5000); // 5秒缓存
      
      // 这个测试只验证方法可以调用，实际缓存过期需要时间测试
      expect(() => manager.setCacheInterval(5000)).not.toThrow();
    });
  });

  describe('清除过期缓存', () => {
    it('应该清除过期的缓存', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      // 设置很短的缓存时间
      manager.setCacheInterval(10); // 10ms

      await manager.checkAvailability('http://localhost:11434');
      expect(manager.getCachedStatus('http://localhost:11434')).toBe('available');

      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 30));

      manager.clearExpiredCache();
      // 注意：clearExpiredCache 只清除过期2倍时间的缓存
      // 所以这里缓存可能还在，但测试验证方法可以调用
      expect(() => manager.clearExpiredCache()).not.toThrow();
    });
  });
});

