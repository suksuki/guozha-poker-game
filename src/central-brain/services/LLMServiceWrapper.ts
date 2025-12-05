/**
 * LLM服务封装
 * 使用AsyncTaskManager处理超时/重试/降级
 */

import { AsyncTaskManager } from '../infrastructure/async/AsyncTaskManager';

export interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  text: string;
  tokens: number;
  model: string;
}

export class LLMServiceWrapper {
  private asyncManager: AsyncTaskManager;
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.asyncManager = new AsyncTaskManager();
  }
  
  async generateText(request: LLMRequest): Promise<LLMResponse> {
    const result = await this.asyncManager.execute(
      () => this.callLLMAPI(request),
      {
        timeout: 30000,
        retryCount: 2,
        retryDelay: 1000,
        fallback: () => this.getFallbackResponse(request),
        enableMetrics: true
      }
    );
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error?.message || 'LLM call failed');
  }
  
  private async callLLMAPI(request: LLMRequest): Promise<LLMResponse> {
    // 实际LLM API调用（示例）
    return {
      text: `Response to: ${request.prompt}`,
      tokens: 100,
      model: 'gpt-3.5'
    };
  }
  
  private getFallbackResponse(request: LLMRequest): LLMResponse {
    return {
      text: '服务暂时不可用，请稍后重试',
      tokens: 0,
      model: 'fallback'
    };
  }
  
  getMetrics() {
    return this.asyncManager.getMetrics();
  }
}

