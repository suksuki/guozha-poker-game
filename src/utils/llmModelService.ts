/**
 * LLM模型服务
 * 用于获取和管理可用的LLM模型
 */

/**
 * 获取Ollama中可用的模型列表
 * @param serverUrl Ollama 服务器完整 URL（如 http://192.168.0.13:11434）
 * @param timeout 超时时间（毫秒），默认 3000ms
 */
export async function getAvailableOllamaModels(
  serverUrl: string = 'http://localhost:11434',
  timeout: number = 3000
): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${serverUrl}/api/tags`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      return models;
    }
  } catch (e) {
    console.warn(`Failed to fetch models from ${serverUrl}:`, e);
  }
  return [];
}

/**
 * 检查Ollama服务是否可用
 * @param serverUrl Ollama 服务器完整 URL（如 http://192.168.0.13:11434）
 * @param timeout 超时时间（毫秒），默认 3000ms
 */
export async function checkOllamaService(
  serverUrl: string = 'http://localhost:11434',
  timeout: number = 3000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${serverUrl}/api/tags`, {
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

