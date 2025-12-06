/**
 * LLM+TTS异步调用链集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AsyncTaskManager } from '../../src/central-brain/infrastructure/async/AsyncTaskManager';
import { ServiceHealthChecker } from '../../src/central-brain/infrastructure/async/ServiceHealthChecker';
import { LLMServiceWrapper } from '../../src/central-brain/services/LLMServiceWrapper';
import { TTSServiceWrapper } from '../../src/central-brain/services/TTSServiceWrapper';

describe('LLM+TTS异步调用链测试', () => {
  let asyncManager: AsyncTaskManager;
  let healthChecker: ServiceHealthChecker;
  let llmWrapper: LLMServiceWrapper;
  let ttsWrapper: TTSServiceWrapper;

  beforeEach(() => {
    asyncManager = new AsyncTaskManager({ enableMetrics: true });
    healthChecker = new ServiceHealthChecker();
    llmWrapper = new LLMServiceWrapper(asyncManager, healthChecker);
    ttsWrapper = new TTSServiceWrapper(asyncManager, healthChecker);
  });

  it('应该完成LLM到TTS的完整调用链', async () => {
    // Mock LLM服务
    const mockLLMService = vi.fn(async () => '玩家应该出一张A');
    
    // Mock TTS服务
    const mockTTSService = vi.fn(async () => new ArrayBuffer(100));

    // 步骤1: 调用LLM获取决策
    const llmResult = await asyncManager.execute(
      mockLLMService,
      { timeout: 5000 }
    );

    expect(llmResult.success).toBe(true);
    expect(llmResult.data).toBe('玩家应该出一张A');

    // 步骤2: 将LLM结果转为语音
    const ttsResult = await asyncManager.execute(
      mockTTSService,
      { timeout: 3000 }
    );

    expect(ttsResult.success).toBe(true);
    expect(ttsResult.data).toBeInstanceOf(ArrayBuffer);

    // 验证调用链完整
    expect(mockLLMService).toHaveBeenCalledTimes(1);
    expect(mockTTSService).toHaveBeenCalledTimes(1);
  });

  it('应该处理LLM失败时的降级', async () => {
    const mockLLM = vi.fn(async () => {
      throw new Error('LLM service unavailable');
    });

    const fallbackResponse = '请稍候';

    const result = await asyncManager.execute(
      mockLLM,
      {
        timeout: 5000,
        retryCount: 2,
        fallback: async () => fallbackResponse
      }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe(fallbackResponse);
  });

  it('应该处理TTS失败时的降级', async () => {
    const mockTTS = vi.fn(async () => {
      throw new Error('TTS service unavailable');
    });

    const silentAudio = new ArrayBuffer(0);

    const result = await asyncManager.execute(
      mockTTS,
      {
        timeout: 3000,
        retryCount: 2,
        fallback: async () => silentAudio
      }
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe(silentAudio);
  });

  it('应该支持并发调用链', async () => {
    const mockService = vi.fn(async (input: string) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return `processed: ${input}`;
    });

    // 并发执行多个调用链
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        asyncManager.execute(
          () => mockService(`request-${i}`),
          { timeout: 1000 }
        )
      );
    }

    const results = await Promise.all(promises);

    expect(results.length).toBe(5);
    expect(results.every(r => r.success)).toBe(true);
    expect(mockService).toHaveBeenCalledTimes(5);
  });
});

