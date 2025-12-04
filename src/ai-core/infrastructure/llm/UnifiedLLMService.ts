/**
 * 统一LLM服务
 * 提供统一的LLM调用接口，支持多种用途
 * 从AIControlCenter的LLMService提取并扩展
 */

export interface LLMRequest {
  purpose: 'decision' | 'communication' | 'analysis';
  prompt: string;
  context?: any;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
  };
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface LLMConfig {
  provider: 'ollama' | 'openai' | 'claude' | 'custom';
  endpoint: string;
  model: string;
  apiKey?: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  timeout: number;
  retryCount: number;
}

/**
 * 统一LLM服务类
 */
export class UnifiedLLMService {
  private config: LLMConfig;
  private requestCache: Map<string, LLMResponse> = new Map();
  private requestCount: number = 0;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }
  
  /**
   * 调用LLM
   */
  async call(request: LLMRequest): Promise<LLMResponse> {
    // 检查缓存
    const cacheKey = this.getCacheKey(request);
    if (this.requestCache.has(cacheKey)) {
      console.log('[UnifiedLLMService] 使用缓存结果');
      return this.requestCache.get(cacheKey)!;
    }
    
    // 实际调用
    this.requestCount++;
    console.log(`[UnifiedLLMService] 调用LLM (${request.purpose}) #${this.requestCount}`);
    
    const startTime = Date.now();
    
    try {
      const response = await this.performRequest(request);
      const duration = Date.now() - startTime;
      
      console.log(`[UnifiedLLMService] 响应完成 (${duration}ms)`);
      
      // 缓存结果
      this.requestCache.set(cacheKey, response);
      
      return response;
    } catch (error) {
      console.error('[UnifiedLLMService] 调用失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量调用
   */
  async batchCall(requests: LLMRequest[]): Promise<LLMResponse[]> {
    return Promise.all(requests.map(req => this.call(req)));
  }
  
  /**
   * 实际执行请求
   */
  private async performRequest(request: LLMRequest): Promise<LLMResponse> {
    const temperature = request.options?.temperature ?? this.config.defaultTemperature;
    const maxTokens = request.options?.maxTokens ?? this.config.defaultMaxTokens;
    
    // 根据provider调用不同的API
    switch (this.config.provider) {
      case 'ollama':
        return await this.callOllama(request, temperature, maxTokens);
      
      case 'openai':
        return await this.callOpenAI(request, temperature, maxTokens);
      
      case 'custom':
        return await this.callCustom(request, temperature, maxTokens);
      
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }
  
  /**
   * 调用Ollama
   */
  private async callOllama(
    request: LLMRequest,
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.message?.content || '',
      metadata: {
        model: data.model,
        done: data.done
      }
    };
  }
  
  /**
   * 调用OpenAI
   */
  private async callOpenAI(
    request: LLMRequest,
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    // TODO: 实现OpenAI调用
    throw new Error('OpenAI not implemented yet');
  }
  
  /**
   * 调用自定义API
   */
  private async callCustom(
    request: LLMRequest,
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    // TODO: 实现自定义API调用
    throw new Error('Custom API not implemented yet');
  }
  
  /**
   * 获取缓存键
   */
  private getCacheKey(request: LLMRequest): string {
    return `${request.purpose}_${this.hashString(request.prompt)}`;
  }
  
  /**
   * 简单哈希函数
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
  
  /**
   * 清空缓存
   */
  clearCache(): void {
    this.requestCache.clear();
    console.log('[UnifiedLLMService] 缓存已清空');
  }
  
  /**
   * 获取统计
   */
  getStatistics(): any {
    return {
      totalRequests: this.requestCount,
      cacheSize: this.requestCache.size,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }
  
  /**
   * 计算缓存命中率
   */
  private calculateCacheHitRate(): number {
    // 简化实现
    return this.requestCache.size / Math.max(this.requestCount, 1);
  }
}

