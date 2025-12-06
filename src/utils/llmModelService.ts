/**
 * LLM模型服务
 * 用于获取和管理可用的LLM模型
 */

/**
 * 获取Ollama中可用的模型列表
 * @param baseUrl - Ollama服务器基础URL（默认为localhost:11434）
 */
export async function getAvailableOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      return models;
    }
  } catch (e) {
  }
  return [];
}

/**
 * 检查Ollama服务是否可用
 * @param baseUrl - Ollama服务器基础URL（默认为localhost:11434）
 */
export async function checkOllamaService(baseUrl: string = 'http://localhost:11434', timeout: number = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 过滤适合聊天的模型（优先选择包含chat、qwen、deepseek等的模型）
 */
export function filterChatModels(models: string[]): string[] {
  const chatKeywords = ['chat', 'qwen', 'deepseek', 'llama', 'mistral', 'gemma'];
  return models.filter(model => 
    chatKeywords.some(keyword => model.toLowerCase().includes(keyword.toLowerCase()))
  );
}

