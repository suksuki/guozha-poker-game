/**
 * LLM服务
 * 封装Ollama API调用
 */

export interface LLMConfig {
  apiUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  systemPrompt?: string;
}

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  tokens?: number;
  latency: number;
  model: string;
}

export class LLMService {
  private config: LLMConfig;
  private defaultConfig: LLMConfig = {
    apiUrl: 'http://localhost:11434/api/chat',
    model: 'qwen2.5:latest',
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 60000,
    systemPrompt: ''
  };
  
  constructor(config?: Partial<LLMConfig>) {
    this.config = { ...this.defaultConfig, ...config };
  }
  
  /**
   * 调用LLM
   */
  async call(request: LLMRequest): Promise<LLMResponse> {
    const apiUrl = this.config.apiUrl || this.defaultConfig.apiUrl!;
    const model = this.config.model || this.defaultConfig.model!;
    const timeout = request.maxTokens ? request.maxTokens * 100 : this.config.timeout || 60000;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // 构建消息
      const messages: any[] = [];
      
      // 系统提示词
      const systemPrompt = request.systemPrompt || this.config.systemPrompt;
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      // 用户提示词
      messages.push({ role: 'user', content: request.prompt });
      
      // 构建请求体
      const requestBody: any = {
        model,
        messages,
        stream: false,
        options: {
          temperature: request.temperature || this.config.temperature || 0.7,
          num_predict: request.maxTokens || this.config.maxTokens || 2000
        }
      };
      
      const startTime = Date.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      const endTime = Date.now();
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API错误: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      const latency = endTime - startTime;
      
      // 解析响应
      const content = data.message?.content || 
                     data.choices?.[0]?.message?.content || 
                     data.content || 
                     data.text || 
                     data.response || 
                     '';
      
      return {
        content: content.trim(),
        tokens: data.eval_count || data.prompt_eval_count || undefined,
        latency,
        model
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`LLM API调用超时（${timeout}ms）`);
      }
      throw error;
    }
  }
  
  /**
   * 检查服务是否可用
   */
  async checkService(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 获取可用模型列表
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
      }
    } catch (e) {
    }
    return [];
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

