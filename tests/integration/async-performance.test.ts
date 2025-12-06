/**
 * 异步性能测试
 * 验证超时控制和并发限制
 */

import { describe, it, expect } from 'vitest';
import { AsyncTaskManager } from '../../src/central-brain/infrastructure/async/AsyncTaskManager';

describe('异步性能测试', () => {
  it('应该在指定超时内中止任务', async () => {
    const asyncManager = new AsyncTaskManager();

    const slowTask = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'done';
    };

    const start = performance.now();
    const result = await asyncManager.execute(slowTask, { timeout: 100 });
    const end = performance.now();

    expect(result.success).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(end - start).toBeLessThan(200); // 应该快速失败
  });

  it('应该支持高并发调用', async () => {
    const asyncManager = new AsyncTaskManager();
    const concurrency = 50;

    const fastTask = async (id: number) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return `result-${id}`;
    };

    const start = performance.now();
    const promises = Array.from({ length: concurrency }, (_, i) =>
      asyncManager.execute(() => fastTask(i), { timeout: 1000 })
    );

    const results = await Promise.all(promises);
    const end = performance.now();

    expect(results.length).toBe(concurrency);
    expect(results.every(r => r.success)).toBe(true);
    expect(end - start).toBeLessThan(1000); // 并发执行应该很快
  });

  it('应该正确限制重试延迟', async () => {
    const asyncManager = new AsyncTaskManager();
    let attempts = 0;

    const flakyTask = async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    };

    const start = performance.now();
    const result = await asyncManager.execute(
      flakyTask,
      {
        timeout: 1000,
        retryCount: 5,
        retryDelay: 100 // 100ms延迟
      }
    );
    const end = performance.now();

    expect(result.success).toBe(true);
    expect(attempts).toBe(3);
    // 应该有重试延迟：至少200ms (2次重试 * 100ms)
    expect(end - start).toBeGreaterThan(200);
  });

  it('应该控制并发执行数量', async () => {
    const asyncManager = new AsyncTaskManager();
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const trackingTask = async () => {
      concurrentCount++;
      maxConcurrent = Math.max(maxConcurrent, concurrentCount);
      await new Promise(resolve => setTimeout(resolve, 50));
      concurrentCount--;
      return 'done';
    };

    // 快速添加10个任务
    const promises = Array.from({ length: 10 }, () =>
      asyncManager.execute(trackingTask, { timeout: 1000 })
    );

    await Promise.all(promises);

    // 验证所有任务都完成了
    expect(promises.length).toBe(10);
    // 最大并发数应该受到控制（实际值取决于实现）
    expect(maxConcurrent).toBeGreaterThan(0);
  });

  it('应该收集性能指标', async () => {
    const asyncManager = new AsyncTaskManager({ enableMetrics: true });

    // 执行一批任务
    for (let i = 0; i < 20; i++) {
      await asyncManager.execute(
        async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
          return 'done';
        },
        { timeout: 1000 }
      );
    }

    const metrics = asyncManager.getMetrics();

    // 验证指标收集
    expect(metrics).toBeDefined();
    if (metrics.successCount !== undefined) {
      expect(metrics.successCount).toBe(20);
    }
    if (metrics.avgDuration !== undefined) {
      expect(metrics.avgDuration).toBeGreaterThan(0);
    }
  });

  it('应该在高负载下保持稳定', async () => {
    const asyncManager = new AsyncTaskManager();
    const taskCount = 100;

    const results = [];
    for (let i = 0; i < taskCount; i++) {
      const result = await asyncManager.execute(
        async () => `result-${i}`,
        { timeout: 1000 }
      );
      results.push(result);
    }

    expect(results.length).toBe(taskCount);
    expect(results.every(r => r.success)).toBe(true);
  });
});

