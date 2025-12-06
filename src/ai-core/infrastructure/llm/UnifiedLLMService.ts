/**
 * 统一LLM服务
 * 提供统一的LLM调用接口，支持多种用途
 * 从AIControlCenter的LLMService提取并扩展
 */

export interface LLMRequest {
  purpose: 'decision' | 'communication' | 'analysis' | 'training';
  prompt: string;
  context?: any;
  priority?: number; // 优先级：数字越大优先级越高，默认根据purpose自动设置
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
  maxConcurrent?: number; // 最大并发数，默认2
  maxQueueSize?: number; // 最大队列长度，默认20
  cacheTTL?: number; // 缓存TTL（毫秒），默认5000
}

/**
 * 队列中的请求项
 */
interface QueuedRequest {
  request: LLMRequest;
  resolve: (response: LLMResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
  cacheKey: string;
}

/**
 * 统一LLM服务类
 */
export class UnifiedLLMService {
  private config: LLMConfig;
  private requestCache: Map<string, { response: LLMResponse; timestamp: number }> = new Map();
  private requestCount: number = 0;
  
  // 队列相关
  private requestQueue: QueuedRequest[] = [];
  private activeRequests: Set<string> = new Set(); // 正在处理的请求（按cacheKey）
  private pendingRequests: Map<string, QueuedRequest[]> = new Map(); // 等待相同prompt的请求
  private currentConcurrent: number = 0;
  private maxConcurrent: number;
  private maxQueueSize: number;
  private cacheTTL: number;
  
  // 默认优先级映射
  private readonly defaultPriorities: Record<string, number> = {
    'decision': 5,
    'analysis': 4,
    'communication': 2, // 默认通信优先级，实际会根据子类型调整
    'training': 0
  };
  
  constructor(config: LLMConfig) {
    this.config = config;
    this.maxConcurrent = config.maxConcurrent ?? 2;
    this.maxQueueSize = config.maxQueueSize ?? 20;
    this.cacheTTL = config.cacheTTL ?? 5000;
    
    // 启动队列处理器
    this.startQueueProcessor();
    
    // 定期清理过期缓存
    setInterval(() => this.cleanExpiredCache(), 10000); // 每10秒清理一次
  }
  
  /**
   * 调用LLM（异步队列处理）
   */
  async call(request: LLMRequest): Promise<LLMResponse> {
    const cacheKey = this.getCacheKey(request);
    
    // 1. 检查缓存
    const cached = this.requestCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      console.log('[UnifiedLLMService] 使用缓存结果');
      return cached.response;
    }
    
    // 2. 检查是否正在处理相同请求
    if (this.activeRequests.has(cacheKey)) {
      // 等待相同请求完成
      return this.waitForPendingRequest(cacheKey);
    }
    
    // 3. 确定优先级
    const priority = request.priority ?? this.getDefaultPriority(request.purpose);
    
    // 4. 创建队列项
    return new Promise<LLMResponse>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        request: { ...request, priority },
        resolve,
        reject,
        timestamp: Date.now(),
        cacheKey
      };
      
      // 5. 检查队列是否已满
      if (this.requestQueue.length >= this.maxQueueSize) {
        // 按优先级排序，移除最低优先级的请求
        this.requestQueue.sort((a, b) => (b.request.priority ?? 0) - (a.request.priority ?? 0));
        const removed = this.requestQueue.pop();
        if (removed) {
          console.warn(`[UnifiedLLMService] 队列已满(${this.maxQueueSize})，丢弃低优先级请求 (priority=${removed.request.priority})`);
          removed.reject(new Error('请求队列已满，请求被丢弃'));
        }
      }
      
      // 6. 加入队列（按优先级排序，高优先级在前）
      this.requestQueue.push(queuedRequest);
      this.requestQueue.sort((a, b) => (b.request.priority ?? 0) - (a.request.priority ?? 0));
      
      console.log(`[UnifiedLLMService] 请求已加入队列`, {
        purpose: request.purpose,
        priority,
        queueLength: `${this.requestQueue.length}/${this.maxQueueSize}`,
        endpoint: this.config.endpoint
      });
      
      // 7. 触发队列处理
      this.processQueue();
    });
  }
  
  /**
   * 等待正在处理的相同请求
   */
  private waitForPendingRequest(cacheKey: string): Promise<LLMResponse> {
    return new Promise<LLMResponse>((resolve, reject) => {
      if (!this.pendingRequests.has(cacheKey)) {
        this.pendingRequests.set(cacheKey, []);
      }
      
      const pending = this.pendingRequests.get(cacheKey)!;
      pending.push({
        request: {} as LLMRequest, // 占位，不会使用
        resolve,
        reject,
        timestamp: Date.now(),
        cacheKey
      });
      
      // 设置超时（30秒）
      setTimeout(() => {
        const index = pending.findIndex(p => p.resolve === resolve);
        if (index >= 0) {
          pending.splice(index, 1);
          reject(new Error('等待相同请求超时'));
        }
      }, 30000);
    });
  }
  
  /**
   * 获取默认优先级
   */
  private getDefaultPriority(purpose: string): number {
    return this.defaultPriorities[purpose] ?? 1;
  }
  
  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    // 如果已达到最大并发数，等待
    if (this.currentConcurrent >= this.maxConcurrent) {
      return;
    }
    
    // 如果队列为空，返回
    if (this.requestQueue.length === 0) {
      return;
    }
    
    // 取出最高优先级的请求
    const queuedRequest = this.requestQueue.shift();
    if (!queuedRequest) {
      return;
    }
    
    // 增加并发计数
    this.currentConcurrent++;
    this.activeRequests.add(queuedRequest.cacheKey);
    
    // 异步处理请求
    this.executeRequest(queuedRequest).finally(() => {
      this.currentConcurrent--;
      this.activeRequests.delete(queuedRequest.cacheKey);
      
      // 处理等待相同请求的其他请求
      const pending = this.pendingRequests.get(queuedRequest.cacheKey);
      if (pending && pending.length > 0) {
        const cached = this.requestCache.get(queuedRequest.cacheKey);
        if (cached) {
          pending.forEach(p => p.resolve(cached.response));
          this.pendingRequests.delete(queuedRequest.cacheKey);
        }
      }
      
      // 继续处理队列
      this.processQueue();
    });
  }
  
  /**
   * 执行请求
   */
  private async executeRequest(queuedRequest: QueuedRequest): Promise<void> {
    const { request, resolve, reject, cacheKey } = queuedRequest;
    
    this.requestCount++;
    console.log(`[UnifiedLLMService] 执行请求`, {
      purpose: request.purpose,
      priority: request.priority,
      requestNumber: this.requestCount,
      endpoint: this.config.endpoint,
      model: this.config.model
    });
    
    const startTime = Date.now();
    
    try {
      // 设置超时
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, timeoutReject) => {
        timeoutId = setTimeout(() => {
          timeoutReject(new Error(`LLM请求超时 (${this.config.timeout}ms)`));
        }, this.config.timeout);
      });
      
      const response = await Promise.race([
        this.performRequest(request),
        timeoutPromise
      ]);
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[UnifiedLLMService] 请求完成`, {
        purpose: request.purpose,
        duration: `${duration}ms`,
        endpoint: this.config.endpoint,
        responseLength: response.content.length,
        responsePreview: response.content.substring(0, 100) + (response.content.length > 100 ? '...' : ''),
        fullResponse: response.content
      });
      
      // 缓存结果
      this.requestCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });
      
      resolve(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[UnifiedLLMService] 请求失败`, {
        purpose: request.purpose,
        duration: `${duration}ms`,
        endpoint: this.config.endpoint,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * 启动队列处理器（定期检查队列）
   */
  private startQueueProcessor(): void {
    // 每100ms检查一次队列
    setInterval(() => {
      if (this.currentConcurrent < this.maxConcurrent && this.requestQueue.length > 0) {
        this.processQueue();
      }
    }, 100);
  }
  
  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.requestCache.delete(key);
      }
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
   * 注意：Ollama API的参数应该在顶层，不在options对象中
   */
  private async callOllama(
    request: LLMRequest,
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    // Ollama API格式：参数在顶层，不在options对象中
    const requestBody: any = {
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
      stream: false
    };
    
    // 添加可选参数（Ollama支持这些参数在顶层）
    if (temperature !== undefined && temperature > 0) {
      requestBody.temperature = temperature;
    }
    if (maxTokens !== undefined && maxTokens > 0) {
      requestBody.num_predict = maxTokens;
    }
    
    console.log(`[UnifiedLLMService] 调用Ollama API`, {
      url: this.config.endpoint,
      model: this.config.model,
      temperature,
      num_predict: maxTokens,
      promptLength: request.prompt.length,
      promptPreview: request.prompt.substring(0, 100) + (request.prompt.length > 100 ? '...' : '')
    });
    
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[UnifiedLLMService] Ollama API错误`, {
          url: this.config.endpoint,
          status: response.status,
          error: errorText
        });
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      // 解析响应（Ollama返回格式：data.message.content）
      const content = data.message?.content || data.response || '';
      
      // 记录LLM回复
      console.log(`[UnifiedLLMService] LLM回复`, {
        url: this.config.endpoint,
        model: data.model || this.config.model,
        contentLength: content.length,
        content: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        fullResponse: content
      });
      
      if (!content) {
        console.warn('[UnifiedLLMService] Ollama返回空内容', {
          url: this.config.endpoint,
          rawResponse: data
        });
      }
      
      return {
        content,
        metadata: {
          model: data.model || this.config.model,
          done: data.done !== false,
          rawResponse: data
        }
      };
    } catch (error) {
      console.error('[UnifiedLLMService] Ollama调用异常', {
        url: this.config.endpoint,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
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
    // 包含purpose和prompt的哈希，确保相同prompt使用相同缓存
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
      queueSize: this.requestQueue.length,
      activeRequests: this.currentConcurrent,
      maxConcurrent: this.maxConcurrent,
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
  
  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    queueLength: number;
    activeRequests: number;
    maxConcurrent: number;
  } {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.currentConcurrent,
      maxConcurrent: this.maxConcurrent
    };
  }
}

