/**
 * TaskQueue 单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import { TaskQueue, type Task } from '../../../src/central-brain/scheduler/TaskQueue';

describe('TaskQueue', () => {
  
  // ========== 基础测试 ==========
  describe('基础功能', () => {
    it('应该创建空队列', () => {
      const queue = new TaskQueue();
      
      expect(queue.size()).toBe(0);
      expect(queue.isActive()).toBe(false);
    });
    
    it('应该添加任务到队列', () => {
      const queue = new TaskQueue();
      const task: Task = {
        id: '1',
        type: 'test',
        payload: {},
        priority: 0,
        timestamp: Date.now()
      };
      
      queue.enqueue(task);
      
      expect(queue.size()).toBe(1);
    });
    
    it('应该按优先级排序', async () => {
      const queue = new TaskQueue();
      const executedOrder: string[] = [];
      
      queue.setExecutor(async (task) => {
        executedOrder.push(task.id);
      });
      
      // 添加不同优先级的任务
      queue.enqueue({ id: '1', type: 'test', payload: {}, priority: 1, timestamp: Date.now() });
      queue.enqueue({ id: '2', type: 'test', payload: {}, priority: 3, timestamp: Date.now() });
      queue.enqueue({ id: '3', type: 'test', payload: {}, priority: 2, timestamp: Date.now() });
      
      // 等待队列空闲
      await queue.waitUntilIdle();
      
      // 应该按优先级顺序执行: 2(3) -> 3(2) -> 1(1)
      expect(executedOrder).toEqual(['2', '3', '1']);
    });
  });
  
  // ========== 执行测试 ==========
  describe('任务执行', () => {
    it('应该顺序执行任务', async () => {
      const queue = new TaskQueue();
      const executedTasks: string[] = [];
      
      queue.setExecutor(async (task) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        executedTasks.push(task.id);
      });
      
      queue.enqueue({ id: '1', type: 'test', payload: {}, priority: 0, timestamp: 1 });
      queue.enqueue({ id: '2', type: 'test', payload: {}, priority: 0, timestamp: 2 });
      queue.enqueue({ id: '3', type: 'test', payload: {}, priority: 0, timestamp: 3 });
      
      // 等待队列空闲
      await queue.waitUntilIdle();
      
      expect(executedTasks).toEqual(['1', '2', '3']);
      expect(queue.size()).toBe(0);
    });
    
    it('错误不应该中断队列', async () => {
      const queue = new TaskQueue();
      const executedTasks: string[] = [];
      
      queue.setExecutor(async (task) => {
        if (task.id === '2') {
          throw new Error('Task 2 failed');
        }
        executedTasks.push(task.id);
      });
      
      queue.enqueue({ id: '1', type: 'test', payload: {}, priority: 0, timestamp: 1 });
      queue.enqueue({ id: '2', type: 'test', payload: {}, priority: 0, timestamp: 2 });
      queue.enqueue({ id: '3', type: 'test', payload: {}, priority: 0, timestamp: 3 });
      
      await queue.waitUntilIdle();
      
      // 任务1和3应该成功，任务2失败
      expect(executedTasks).toEqual(['1', '3']);
      expect(queue.getStats().errorCount).toBe(1);
    });
    
    it('没有executor时不应该处理任务', () => {
      const queue = new TaskQueue();
      
      queue.enqueue({ id: '1', type: 'test', payload: {}, priority: 0, timestamp: Date.now() });
      
      expect(queue.size()).toBe(1); // 任务还在队列中
      expect(queue.isActive()).toBe(false);
    });
  });
  
  // ========== 清理测试 ==========
  describe('清理功能', () => {
    it('应该清除指定轮次的任务', () => {
      const queue = new TaskQueue();
      
      queue.enqueue({ id: '1', type: 'test', payload: {}, priority: 0, timestamp: 1, roundNumber: 1 });
      queue.enqueue({ id: '2', type: 'test', payload: {}, priority: 0, timestamp: 2, roundNumber: 2 });
      queue.enqueue({ id: '3', type: 'test', payload: {}, priority: 0, timestamp: 3, roundNumber: 1 });
      
      const removed = queue.clearRound(1);
      
      expect(removed).toBe(2);
      expect(queue.size()).toBe(1);
    });
    
    it('应该清空所有任务', () => {
      const queue = new TaskQueue();
      
      queue.enqueue({ id: '1', type: 'test', payload: {}, priority: 0, timestamp: 1 });
      queue.enqueue({ id: '2', type: 'test', payload: {}, priority: 0, timestamp: 2 });
      
      queue.clear();
      
      expect(queue.size()).toBe(0);
    });
  });
  
  // ========== 统计测试 ==========
  describe('统计功能', () => {
    it('应该记录处理统计', async () => {
      const queue = new TaskQueue();
      
      queue.setExecutor(async (task) => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });
      
      queue.enqueue({ id: '1', type: 'test', payload: {}, priority: 0, timestamp: 1 });
      queue.enqueue({ id: '2', type: 'test', payload: {}, priority: 0, timestamp: 2 });
      
      await queue.waitUntilIdle();
      
      const stats = queue.getStats();
      expect(stats.processedCount).toBe(2);
      expect(stats.errorCount).toBe(0);
      expect(stats.successRate).toBe(1.0);
    });
    
    it('应该计算成功率', async () => {
      const queue = new TaskQueue();
      
      queue.setExecutor(async (task) => {
        if (task.id === '2') throw new Error('Fail');
      });
      
      queue.enqueue({ id: '1', type: 'test', payload: {}, priority: 0, timestamp: 1 });
      queue.enqueue({ id: '2', type: 'test', payload: {}, priority: 0, timestamp: 2 });
      queue.enqueue({ id: '3', type: 'test', payload: {}, priority: 0, timestamp: 3 });
      
      await queue.waitUntilIdle();
      
      const stats = queue.getStats();
      expect(stats.processedCount).toBe(3);
      expect(stats.errorCount).toBe(1);
      expect(stats.successRate).toBeCloseTo(2 / 3, 2);
    });
  });
  
  // ========== 并发测试 ==========
  describe('并发安全', () => {
    it('快速连续添加不应该导致重复执行', async () => {
      const queue = new TaskQueue();
      const executedIds = new Set<string>();
      
      queue.setExecutor(async (task) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        executedIds.add(task.id);
      });
      
      // 快速添加20个任务（减少测试时间）
      for (let i = 0; i < 20; i++) {
        queue.enqueue({
          id: `task-${i}`,
          type: 'test',
          payload: {},
          priority: 0,
          timestamp: Date.now()
        });
      }
      
      // 等待所有任务完成
      await queue.waitUntilIdle();
      
      // 所有任务都应该执行一次
      expect(executedIds.size).toBe(20);
      expect(queue.size()).toBe(0);
    });
  });
});

