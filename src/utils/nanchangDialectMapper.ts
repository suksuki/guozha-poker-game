/**
 * 南昌话文本映射工具
 * 将普通话文本转换为南昌话文本，用于模拟南昌话发音
 * 使用普通话TTS播放南昌话文本
 * 
 * 主要使用映射表进行转换（快速、同步）
 * LLM用于训练模式：批量生成映射对，扩展映射表
 */

import { LLMChatConfig, DEFAULT_LLM_CHAT_CONFIG } from '../config/chatConfig';

// 南昌话词汇映射表（普通话 -> 南昌话）
// 这是主要的数据源，通过LLM训练逐步扩展
let NANCHANG_MAPPING: Record<string, string> = {
  // 常用词汇
  '厉害': '恰噶',
  '很好': '恰噶',
  '不错': '恰噶',
  '好的': '好个',
  '可以': '可以',
  '不行': '不行',
  '要不起': '要不起',
  '出牌': '出牌',
  '等等': '等等',
  '等等我': '等等我',
  '好牌': '好牌',
  '这手不错': '这手恰噶',
  '这手很好': '这手恰噶',
  
  // 脏话映射（用于对骂场景）
  '逼': '别',
  '傻逼': '傻别',
  '蠢逼': '蠢别',
  '装逼': '装别',
  '牛逼': '牛别',
  '妈的': '娘个',
  '他妈的': '他娘个',
  '操': '操',
  '靠': '靠',
  '滚': '滚',
  '滚蛋': '滚蛋',
  '去死': '去死',
  '死': '死',
  '笨蛋': '笨蛋',
  '白痴': '白痴',
  '蠢货': '蠢货',
  
  // 语气词
  '啊': '啊',
  '呀': '呀',
  '呢': '呢',
  '吧': '吧',
  '哦': '哦',
  
  // 常用短语
  '我也要不起': '我也要不起',
  '我也要': '我也要',
  '不要': '不要',
  '要了': '要了',
  '赢了': '赢了',
  '输了': '输了',
  '好运气': '好运气',
  '真倒霉': '真倒霉',
  
  // 游戏相关
  '炸弹': '炸弹',
  '对子': '对子',
  '三张': '三张',
  '单张': '单张',
  '墩': '墩',
  '大墩': '大墩',
  '小墩': '小墩',
};

// 脏话列表（用于检测是否需要映射）
const SWEAR_WORDS = ['逼', '傻逼', '蠢逼', '装逼', '牛逼', '妈的', '他妈的', '操', '靠'];

// 映射表文件路径（用于保存和加载）
const MAPPING_FILE_KEY = 'nanchang_dialect_mapping';

/**
 * 从本地存储加载映射表
 */
function loadMappingFromStorage(): void {
  try {
    const stored = localStorage.getItem(MAPPING_FILE_KEY);
    if (stored) {
      const loaded = JSON.parse(stored);
      // 合并到现有映射表（本地存储的优先级更高）
      NANCHANG_MAPPING = { ...NANCHANG_MAPPING, ...loaded };
    }
  } catch (error) {
  }
}

/**
 * 保存映射表到本地存储
 */
function saveMappingToStorage(): void {
  try {
    localStorage.setItem(MAPPING_FILE_KEY, JSON.stringify(NANCHANG_MAPPING));
  } catch (error) {
  }
}

// 初始化时加载映射表
if (typeof window !== 'undefined') {
  loadMappingFromStorage();
}

/**
 * 使用LLM训练生成映射对（用于扩展映射表）
 * @param texts 要训练的普通话文本数组
 * @param llmConfig LLM配置（可选）
 * @returns 映射对数组 [{mandarin: string, nanchang: string}]
 */
export async function trainMappingWithLLM(
  texts: string[],
  llmConfig?: LLMChatConfig
): Promise<Array<{ mandarin: string; nanchang: string }>> {
  const config = llmConfig || DEFAULT_LLM_CHAT_CONFIG;
  const apiUrl = config.apiUrl || 'http://localhost:11434/api/chat';
  const model = config.model || 'qwen2.5:7b';
  
  const prompt = `你是一个南昌话方言转换专家。请为以下普通话文本生成地道的南昌话映射。

要求：
1. 保持原意不变
2. 使用地道的南昌话表达
3. 脏话要映射（如：逼 -> 别，妈的 -> 娘个）
4. 返回JSON格式：{"mandarin": "普通话", "nanchang": "南昌话"}
5. 如果文本已经是南昌话或无法转换，nanchang字段返回原文

示例：
- {"mandarin": "厉害", "nanchang": "恰噶"}
- {"mandarin": "很好", "nanchang": "恰噶"}
- {"mandarin": "傻逼", "nanchang": "傻别"}
- {"mandarin": "他妈的", "nanchang": "他娘个"}

要训练的文本（每行一个）：
${texts.join('\n')}

请返回JSON数组格式，每个映射一个对象：
`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        options: {
          temperature: 0.3,
        }
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const content = data.message?.content || data.response || '';
    
    // 尝试解析JSON
    try {
      // 提取JSON部分（可能包含markdown代码块）
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const mappings = JSON.parse(jsonStr);
      
      if (Array.isArray(mappings)) {
        return mappings;
      }
    } catch (parseError) {
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * 添加映射到映射表（并保存到本地存储）
 * @param mandarin 普通话文本
 * @param nanchang 南昌话文本
 */
export function addMapping(mandarin: string, nanchang: string): void {
  if (mandarin && nanchang && mandarin !== nanchang) {
    NANCHANG_MAPPING[mandarin] = nanchang;
    saveMappingToStorage();
  }
}

/**
 * 批量添加映射到映射表
 * @param mappings 映射对数组
 */
export function addMappings(mappings: Array<{ mandarin: string; nanchang: string }>): void {
  let added = 0;
  mappings.forEach(({ mandarin, nanchang }) => {
    if (mandarin && nanchang && mandarin !== nanchang) {
      NANCHANG_MAPPING[mandarin] = nanchang;
      added++;
    }
  });
  if (added > 0) {
    saveMappingToStorage();
  }
}

/**
 * 获取当前映射表（用于导出）
 */
export function getMappingTable(): Record<string, string> {
  return { ...NANCHANG_MAPPING };
}

/**
 * 清空映射表（仅清空本地存储的，保留内置的）
 */
export function clearCustomMappings(): void {
  try {
    localStorage.removeItem(MAPPING_FILE_KEY);
    // 重新加载内置映射表
    NANCHANG_MAPPING = {
      // 常用词汇
      '厉害': '恰噶',
      '很好': '恰噶',
      '不错': '恰噶',
      '好的': '好个',
      '可以': '可以',
      '不行': '不行',
      '要不起': '要不起',
      '出牌': '出牌',
      '等等': '等等',
      '等等我': '等等我',
      '好牌': '好牌',
      '这手不错': '这手恰噶',
      '这手很好': '这手恰噶',
      
      // 脏话映射
      '逼': '别',
      '傻逼': '傻别',
      '蠢逼': '蠢别',
      '装逼': '装别',
      '牛逼': '牛别',
      '妈的': '娘个',
      '他妈的': '他娘个',
      '操': '操',
      '靠': '靠',
      '滚': '滚',
      '滚蛋': '滚蛋',
      '去死': '去死',
      '死': '死',
      '笨蛋': '笨蛋',
      '白痴': '白痴',
      '蠢货': '蠢货',
      
      // 语气词
      '啊': '啊',
      '呀': '呀',
      '呢': '呢',
      '吧': '吧',
      '哦': '哦',
      
      // 常用短语
      '我也要不起': '我也要不起',
      '我也要': '我也要',
      '不要': '不要',
      '要了': '要了',
      '赢了': '赢了',
      '输了': '输了',
      '好运气': '好运气',
      '真倒霉': '真倒霉',
      
      // 游戏相关
      '炸弹': '炸弹',
      '对子': '对子',
      '三张': '三张',
      '单张': '单张',
      '墩': '墩',
      '大墩': '大墩',
      '小墩': '小墩',
    };
  } catch (error) {
  }
}

/**
 * 使用映射表将普通话文本转换为南昌话文本（回退方案）
 * @param text 普通话文本
 * @returns 南昌话文本
 */
function convertWithMapping(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  let result = text;
  
  // 按长度从长到短排序，优先匹配长词
  const sortedKeys = Object.keys(NANCHANG_MAPPING).sort((a, b) => b.length - a.length);
  
  // 逐个替换
  for (const key of sortedKeys) {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, NANCHANG_MAPPING[key]);
  }
  
  return result;
}

/**
 * 将普通话文本转换为南昌话文本（使用映射表）
 * @param text 普通话文本
 * @returns 南昌话文本
 */
export function convertToNanchangDialect(text: string): string {
  return convertWithMapping(text);
}


/**
 * 检查文本是否包含脏话
 * @param text 文本
 * @returns 是否包含脏话
 */
export function containsSwearWords(text: string): boolean {
  return SWEAR_WORDS.some(word => text.includes(word));
}

/**
 * 批量转换文本（用于测试）
 * @param texts 文本数组
 * @returns 转换后的文本数组
 */
export function convertBatchToNanchangDialect(texts: string[]): string[] {
  return texts.map(text => convertToNanchangDialect(text));
}

// 测试用例（用于开发时验证）
if (import.meta.env.DEV) {
  const testCases = [
    '厉害',
    '这手不错',
    '要不起',
    '傻逼',
    '牛逼',
    '他妈的',
    '我也要不起',
    '好牌',
  ];
  
  testCases.forEach(test => {
    const converted = convertToNanchangDialect(test);
  });
}

