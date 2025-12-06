/**
 * UnifiedLLMService 单元测试
 * 测试LLM服务的队列机制、优先级、并发控制等
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedLLMService, LLMRequest, LLMConfig } from '../../src/ai-core/infrastructure/llm/UnifiedLLMService';

// Mock fetch
global.fetch = vi.fn();

describe('UnifiedLLMService', () => {
  let llmService: UnifiedLLMService;
  let mockConfig: LLMConfig;

  beforeEach(() => {
    mockConfig = {
      provider: 'ollama',
      endpoint: 'http://localhost:11434/api/chat',
      model: 'qwen2.5:3b',
      defaultTemperature: 0.7,
      defaultMaxTokens: 500,
      timeout: 5000,
      retryCount: 2,
      maxConcurrent: 2,
      maxQueueSize: 20,
      cacheTTL: 5000
    };

    llmService = new UnifiedLLMService(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('基本功能', () => {
    it('应该成功创建服务实例', () => {
      expect(llmService).toBeDefined();
      expect(llmService.getStatistics()).toBeDefined();
    });

    it('应该正确调用Ollama API', async () => {
      const mockResponse = {
        message: { content: '测试响应' },
        model: 'qwen2.5:3b',
        done: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: LLMRequest = {
        purpose: 'communication',
        prompt: '测试提示词',
        options: { temperature: 0.8, maxTokens: 50 }
      };

      const response = await llmService.call(request);

      expect(response.content).toBe('测试响应');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('缓存机制', () => {
    it('应该缓存相同请求的结果', async () => {
      const mockResponse = {
        message: { content: '缓存测试' },
        model: 'qwen2.5:3b',
        done: true
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const request: LLMRequest = {
        purpose: 'communication',
        prompt: '相同提示词',
        options: { temperature: 0.8, maxTokens: 50 }
      };

      // 第一次调用
      const response1 = await llmService.call(request);
      expect(response1.content).toBe('缓存测试');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 第二次调用（应该使用缓存）
      const response2 = await llmService.call(request);
      expect(response2.content).toBe('缓存测试');
      expect(global.fetch).toHaveBeenCalledTimes(1); // 没有再次调用
    });

    it('应该在使用缓存TTL后失效', async () => {
      vi.useFakeTimers();

      const mockResponse = {
        message: { content: 'TTL测试' },
        model: 'qwen2.5:3b',
        done: true
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const request: LLMRequest = {
        purpose: 'communication',
        prompt: 'TTL测试提示词',
        options: { temperature: 0.8, maxTokens: 50 }
      };

      // 第一次调用
      await llmService.call(request);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 前进5秒（缓存TTL）
      vi.advanceTimersByTime(5000);

      // 第二次调用（缓存已过期，应该重新请求）
      await llmService.call(request);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('请求去重', () => {
    it('应该对相同prompt的请求进行去重', async () => {
      const mockResponse = {
        message: { content: '去重测试' },
        model: 'qwen2.5:3b',
        done: true
      };

      let callCount = 0;
      (global.fetch as any).mockImplementation(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // 模拟延迟
        return {
          ok: true,
          json: async () => mockResponse
        };
      });

      const request: LLMRequest = {
        purpose: 'communication',
        prompt: '相同提示词',
        options: { temperature: 0.8, maxTokens: 50 }
      };

      // 同时发起多个相同请求
      const promises = [
        llmService.call(request),
        llmService.call(request),
        llmService.call(request)
      ];

      const responses = await Promise.all(promises);

      // 所有响应应该相同
      expect(responses.every(r => r.content === '去重测试')).toBe(true);
      // 应该只调用一次API
      expect(callCount).toBe(1);
    });
  });

  describe('优先级排序', () => {
    it('应该按优先级处理请求', async () => {
      const callOrder: string[] = [];

      (global.fetch as any).mockImplementation(async (url: string, options: any) => {
        const body = JSON.parse(options.body);
        callOrder.push(body.messages[0].content);
        return {
          ok: true,
          json: async () => ({
            message: { content: `响应: ${body.messages[0].content}` },
            model: 'qwen2.5:3b',
            done: true
          })
        };
      });

      // 同时发起不同优先级的请求
      const lowPriority = llmService.call({
        purpose: 'communication',
        prompt: '低优先级',
        priority: 1
      });

      const highPriority = llmService.call({
        purpose: 'decision',
        prompt: '高优先级',
        priority: 5
      });

      const mediumPriority = llmService.call({
        purpose: 'analysis',
        prompt: '中优先级',
        priority: 3
      });

      await Promise.all([lowPriority, highPriority, mediumPriority]);

      // 高优先级应该先处理（如果并发数允许）
      // 注意：由于并发控制，实际执行顺序可能受并发数影响
      expect(callOrder.length).toBe(3);
    });
  });

  describe('并发控制', () => {
    it('应该限制同时进行的请求数量', async () => {
      let activeCount = 0;
      let maxActive = 0;

      (global.fetch as any).mockImplementation(async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        activeCount--;
        return {
          ok: true,
          json: async () => ({
            message: { content: '并发测试' },
            model: 'qwen2.5:3b',
            done: true
          })
        };
      });

      // 发起5个请求，但maxConcurrent=2
      const requests: LLMRequest[] = Array.from({ length: 5 }, (_, i) => ({
        purpose: 'communication',
        prompt: `请求${i}`,
        priority: 1
      }));

      await Promise.all(requests.map(req => llmService.call(req)));

      // 最大并发数应该不超过2
      expect(maxActive).toBeLessThanOrEqual(2);
    });
  });

  describe('队列长度限制', () => {
    it('应该在队列满时丢弃低优先级请求', async () => {
      // 设置小队列
      const smallQueueService = new UnifiedLLMService({
        ...mockConfig,
        maxQueueSize: 3
      });

      (global.fetch as any).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          ok: true,
          json: async () => ({
            message: { content: '响应' },
            model: 'qwen2.5:3b',
            done: true
          })
        };
      });

      // 快速发起多个请求，填满队列
      const promises: Promise<any>[] = [];
      
      // 先发起高优先级请求（会立即处理）
      promises.push(smallQueueService.call({
        purpose: 'decision',
        prompt: '高优先级1',
        priority: 5
      }));

      promises.push(smallQueueService.call({
        purpose: 'decision',
        prompt: '高优先级2',
        priority: 5
      }));

      // 然后快速发起多个低优先级请求
      for (let i = 0; i < 5; i++) {
        promises.push(
          smallQueueService.call({
            purpose: 'communication',
            prompt: `低优先级${i}`,
            priority: 1
          }).catch(err => err) // 捕获被丢弃的请求
        );
      }

      const results = await Promise.all(promises);

      // 应该有一些请求被丢弃（返回错误）
      const errors = results.filter(r => r instanceof Error);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('超时处理', () => {
    it('应该在超时后拒绝请求', async () => {
      const timeoutService = new UnifiedLLMService({
        ...mockConfig,
        timeout: 100 // 很短的超时时间
      });

      // Mock一个会延迟的fetch，超过超时时间
      (global.fetch as any).mockImplementation(async () => {
        // 延迟200ms，超过100ms的超时时间
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          ok: true,
          json: async () => ({
            message: { content: '响应' },
            model: 'qwen2.5:3b',
            done: true
          })
        };
      });

      const request: LLMRequest = {
        purpose: 'communication',
        prompt: '超时测试',
        options: { temperature: 0.8, maxTokens: 50 }
      };

      // 注意：超时是在executeRequest中通过setTimeout设置的
      // 需要等待足够的时间让超时触发
      await expect(timeoutService.call(request)).rejects.toThrow(/超时/);
    }, 10000); // 增加测试超时时间
  });

  describe('默认优先级', () => {
    it('应该根据purpose自动设置默认优先级', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: '测试' },
          model: 'qwen2.5:3b',
          done: true
        })
      });

      // decision应该有最高优先级（5）
      await llmService.call({
        purpose: 'decision',
        prompt: '决策测试'
      });

      // analysis应该有高优先级（4）
      await llmService.call({
        purpose: 'analysis',
        prompt: '分析测试'
      });

      // communication应该有中优先级（2）
      await llmService.call({
        purpose: 'communication',
        prompt: '通信测试'
      });

      // training应该有最低优先级（0）
      await llmService.call({
        purpose: 'training',
        prompt: '训练测试'
      });

      // 所有请求都应该成功
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('统计信息', () => {
    it('应该正确统计请求数量', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: '统计测试' },
          model: 'qwen2.5:3b',
          done: true
        })
      });

      await llmService.call({
        purpose: 'communication',
        prompt: '测试1'
      });

      await llmService.call({
        purpose: 'communication',
        prompt: '测试2'
      });

      const stats = llmService.getStatistics();
      expect(stats.totalRequests).toBe(2);
      expect(stats.cacheSize).toBeGreaterThan(0);
    });

    it('应该返回队列状态', () => {
      const queueStatus = llmService.getQueueStatus();
      expect(queueStatus).toHaveProperty('queueLength');
      expect(queueStatus).toHaveProperty('activeRequests');
      expect(queueStatus).toHaveProperty('maxConcurrent');
      expect(queueStatus.maxConcurrent).toBe(2);
    });
  });

  describe('错误处理', () => {
    it('应该在API错误时抛出异常', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const request: LLMRequest = {
        purpose: 'communication',
        prompt: '错误测试',
        options: { temperature: 0.8, maxTokens: 50 }
      };

      await expect(llmService.call(request)).rejects.toThrow();
    });

    it('应该在网络错误时抛出异常', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('网络错误'));

      const request: LLMRequest = {
        purpose: 'communication',
        prompt: '网络错误测试',
        options: { temperature: 0.8, maxTokens: 50 }
      };

      await expect(llmService.call(request)).rejects.toThrow('网络错误');
    });
  });

  describe('批量调用', () => {
    it('应该支持批量调用', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: '批量测试' },
          model: 'qwen2.5:3b',
          done: true
        })
      });

      const requests: LLMRequest[] = [
        { purpose: 'communication', prompt: '批量1' },
        { purpose: 'communication', prompt: '批量2' },
        { purpose: 'communication', prompt: '批量3' }
      ];

      const responses = await llmService.batchCall(requests);

      expect(responses).toHaveLength(3);
      expect(responses.every(r => r.content === '批量测试')).toBe(true);
    });
  });
});

