/**
 * LLM模型服务
 * 用于获取和管理可用的LLM模型
 */

/**
 * 获取Ollama中可用的模型列表
 */
export async function getAvailableOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      return models;
    }
  } catch (e) {
    console.warn('[llmModelService] 无法获取Ollama模型列表:', e);
  }
  return [];
}

/**
 * 检查Ollama服务是否可用
 */
export async function checkOllamaService(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3秒超时
    });
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

