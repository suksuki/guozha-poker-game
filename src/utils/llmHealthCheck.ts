/**
 * LLM健康检查工具
 * 用于检测LLM服务是否可用，自动选择合适的聊天策略
 */

/**
 * LLM健康检查结果
 */
export interface LLMHealthStatus {
  available: boolean;
  modelCount: number;
  models: string[];
  error?: string;
  responseTime?: number;
}

/**
 * 检查LLM服务是否可用
 * @param apiUrl LLM API基础地址
 * @param timeout 超时时间（毫秒）
 * @returns 健康状态
 */
export async function checkLLMAvailability(
  apiUrl: string = 'http://localhost:11434',
  timeout: number = 3000
): Promise<LLMHealthStatus> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // 尝试获取模型列表（轻量级检测）
    const tagsUrl = `${apiUrl}/api/tags`;
    
    const response = await fetch(tagsUrl, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      const hasModels = models.length > 0;
      
      if (hasModels) {      } else {
      }
      
      return {
        available: hasModels,
        modelCount: models.length,
        models,
        responseTime
      };
    }
    
    return {
      available: false,
      modelCount: 0,
      models: [],
      error: `HTTP ${response.status}`,
      responseTime
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      return {
        available: false,
        modelCount: 0,
        models: [],
        error: '连接超时',
        responseTime
      };
    }
    
    return {
      available: false,
      modelCount: 0,
      models: [],
      error: error.message || '连接失败',
      responseTime
    };
  }
}

/**
 * 获取推荐的聊天策略
 * @param apiUrl LLM API地址
 * @param timeout 检测超时时间
 * @returns 推荐的策略名称
 */
export async function getRecommendedChatStrategy(
  apiUrl?: string,
  timeout?: number
): Promise<'llm' | 'rule-based'> {
  
  const status = await checkLLMAvailability(apiUrl, timeout);
  
  if (status.available) {
    return 'llm';
  } else {
    return 'rule-based';
  }
}

/**
 * 找到最佳的可用模型
 * @param apiUrl LLM API地址
 * @param preferredModels 优先选择的模型名称列表
 * @returns 最佳模型名称，如果没有则返回null
 */
export async function findBestAvailableModel(
  apiUrl: string = 'http://localhost:11434',
  preferredModels: string[] = ['qwen2:0.5b', 'qwen2:1.5b', 'qwen', 'deepseek', 'llama3']
): Promise<string | null> {
  const status = await checkLLMAvailability(apiUrl);
  
  if (!status.available || status.models.length === 0) {
    return null;
  }
  
  // 1. 优先匹配完全相同的模型
  for (const preferred of preferredModels) {
    if (status.models.includes(preferred)) {
      return preferred;
    }
  }
  
  // 2. 尝试前缀匹配（例如 qwen2:0.5b 可以匹配 qwen2）
  for (const preferred of preferredModels) {
    const matched = status.models.find(m => m.startsWith(preferred));
    if (matched) {      return matched;
    }
  }
  
  // 3. 选择包含聊天关键词的模型
  const chatModels = status.models.filter(m => 
    m.includes('chat') || 
    m.includes('qwen') || 
    m.includes('deepseek') ||
    m.includes('llama')
  );
  
  if (chatModels.length > 0) {
    return chatModels[0];
  }
  
  // 4. 使用第一个可用模型
  return status.models[0];
}

/**
 * 检查特定模型是否可用
 * @param modelName 模型名称
 * @param apiUrl LLM API地址
 * @returns 是否可用
 */
export async function checkModelAvailable(
  modelName: string,
  apiUrl: string = 'http://localhost:11434'
): Promise<boolean> {
  const status = await checkLLMAvailability(apiUrl);
  return status.available && status.models.includes(modelName);
}

