/**
 * 统一LLM服务
 * 提供统一的LLM调用接口，支持多种用途
 * 从AIControlCenter的LLMService提取并扩展
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface LLMRequest {
  purpose: 'decision' | 'communication' | 'analysis' | 'training';
  prompt: string | ChatMessage[];
  context?: any;
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  priority?: number; // 优先级：数字越大优先级越高，默认根据purpose自动设置
  options?: {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
  };
}

export interface LLMResponse {
  content: string;
  tool_calls?: Array<{
    function: {
      name: string;
      arguments: string;
    };
  }>;
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
    this.maxConcurrent = config.maxConcurrent ?? 4;
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
          removed.reject(new Error('请求队列已满，请求被丢弃'));
        }
      }

      // 6. 加入队列（按优先级排序，高优先级在前）
      this.requestQueue.push(queuedRequest);
      this.requestQueue.sort((a, b) => (b.request.priority ?? 0) - (a.request.priority ?? 0));

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
      // 缓存结果
      this.requestCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      resolve(response);
    } catch (error) {
      const duration = Date.now() - startTime;
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
    maxTokens: number,
    retryWithoutTools: boolean = false
  ): Promise<LLMResponse> {

    // Ollama API格式：参数在顶层，不在options对象中
    const messages = Array.isArray(request.prompt)
      ? request.prompt
      : [{ role: 'user', content: request.prompt }];

    // Ollama parameters should be in the 'options' object for standard compliance
    const options: any = {};
    if (temperature !== undefined && temperature > 0) {
      options.temperature = temperature;
    }
    if (maxTokens !== undefined && maxTokens > 0) {
      options.num_predict = maxTokens;
    }

    const requestBody: any = {
      model: this.config.model,
      messages: messages,
      stream: false,
      options: Object.keys(options).length > 0 ? options : undefined
    };

    // Calculate prompt length for logging
    const promptLength = Array.isArray(request.prompt)
      ? request.prompt.reduce((acc, msg) => acc + msg.content.length, 0)
      : request.prompt.length;

    const promptPreview = Array.isArray(request.prompt)
      ? (request.prompt[request.prompt.length - 1]?.content.substring(0, 100) || '') + '...'
      : request.prompt.substring(0, 100) + (request.prompt.length > 100 ? '...' : '');

    // Support for tools (MCP) - skip if retryWithoutTools is true
    if (!retryWithoutTools && request.tools && request.tools.length > 0) {
      requestBody.tools = request.tools;
    }

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

        // 🔍 打印完整错误信息用于调试
        // 特殊处理 1：如果模型不支持工具调用，且我们还没有重试过，则重试一份不带工具的请求
        if (response.status === 400 && errorText.includes('does not support tools') && !retryWithoutTools) {
          return this.callOllama(request, temperature, maxTokens, true);
        }

        // 特殊处理 2：只要是 /api/chat 接口返回 400，且是因为不兼容（不是其他错误），就降级为 /api/generate
        if (response.status === 400 && this.config.endpoint.includes('/api/chat')) {
          // 如果错误信息明确说是模型找不到，就不必尝试降级了，直接报错
          if (errorText.includes('model') && (errorText.includes('not found') || errorText.includes('unknown'))) {
            throw new Error(`Ollama Model Not Found: ${this.config.model}`);
          }

          const generateEndpoint = this.config.endpoint.replace('/api/chat', '/api/generate');
          return this.callOllamaGenerate(request, generateEndpoint, temperature, maxTokens);
        }

        throw new Error(`Ollama API error (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();

      // 解析响应（Ollama返回格式：data.message.content）
      const message = data.message || {};
      const content = message.content || data.response || '';
      const toolCalls = message.tool_calls;

      // 记录LLM回复
      if (!content && !toolCalls) {
      }

      return {
        content,
        tool_calls: toolCalls,
        metadata: {
          model: data.model || this.config.model,
          done: data.done !== false,
          rawResponse: data
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 调用 Ollama /api/generate (降级模式)
   * 负责将 ChatMessage 扁平化为单一 Prompt
   */
  private async callOllamaGenerate(
    request: LLMRequest,
    endpoint: string,
    temperature: number,
    maxTokens: number
  ): Promise<LLMResponse> {
    const messages = Array.isArray(request.prompt)
      ? request.prompt
      : [{ role: 'user', content: request.prompt }];

    // 扁平化对话：[System: xxx, User: yyy] -> "System: xxx\nUser: yyy\nAssistant:"
    const flattenedPrompt = messages.map(m => {
      const roleName = m.role === 'system' ? 'SYSTEM' : (m.role === 'user' ? 'USER' : 'ASSISTANT');
      return `${roleName}: ${m.content}`;
    }).join('\n\n') + '\n\nASSISTANT:';

    const requestBody: any = {
      model: this.config.model,
      prompt: flattenedPrompt,
      stream: false,
      options: {
        temperature: temperature > 0 ? temperature : undefined,
        num_predict: maxTokens > 0 ? maxTokens : undefined
      }
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Generate API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.response || '';

      return {
        content,
        metadata: {
          model: data.model || this.config.model,
          done: true,
          rawResponse: data
        }
      };
    } catch (error) {
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
    const promptStr = typeof request.prompt === 'string'
      ? request.prompt
      : JSON.stringify(request.prompt);
    return `${request.purpose}_${this.hashString(promptStr)}`;
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

  /**
   * 动态更新配置（支持运行时配置变更）
   * @param updates 要更新的配置项
   */
  updateConfig(updates: Partial<LLMConfig>): void {
    const oldConfig = { ...this.config };

    // 更新配置
    if (updates.endpoint !== undefined) {
      this.config.endpoint = updates.endpoint;
    }
    if (updates.model !== undefined) {
      this.config.model = updates.model;
    }
    if (updates.defaultTemperature !== undefined) {
      this.config.defaultTemperature = updates.defaultTemperature;
    }
    if (updates.defaultMaxTokens !== undefined) {
      this.config.defaultMaxTokens = updates.defaultMaxTokens;
    }
    if (updates.timeout !== undefined) {
      this.config.timeout = updates.timeout;
    }
    if (updates.provider !== undefined) {
      this.config.provider = updates.provider;
    }
    if (updates.apiKey !== undefined) {
      this.config.apiKey = updates.apiKey;
    }
    if (updates.maxConcurrent !== undefined) {
      this.maxConcurrent = updates.maxConcurrent;
    }
    if (updates.maxQueueSize !== undefined) {
      this.maxQueueSize = updates.maxQueueSize;
    }
    if (updates.cacheTTL !== undefined) {
      this.cacheTTL = updates.cacheTTL;
    }

    // 清空缓存（配置变更后，旧缓存可能不再有效）
    this.clearCache();
  }

  /**
   * 获取当前配置（只读）
   */
  getConfig(): Readonly<LLMConfig> {
    return { ...this.config };
  }
}

