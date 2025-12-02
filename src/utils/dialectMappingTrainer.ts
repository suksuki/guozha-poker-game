/**
 * 方言映射训练工具
 * 使用LLM批量生成方言映射对，扩展映射表
 */

import { LLMChatConfig } from '../config/chatConfig';
import { trainMappingWithLLM, addMappings, getMappingTable } from './nanchangDialectMapper';

export interface MappingTrainingResult {
  success: boolean;
  mappings: Array<{ mandarin: string; nanchang: string }>;
  added: number;
  skipped: number;
  errors: string[];
}

/**
 * 训练方言映射（批量生成映射对）
 * @param texts 要训练的普通话文本数组
 * @param llmConfig LLM配置（可选）
 * @param autoAdd 是否自动添加到映射表（默认true）
 * @returns 训练结果
 */
export async function trainDialectMapping(
  texts: string[],
  llmConfig?: LLMChatConfig,
  autoAdd: boolean = true
): Promise<MappingTrainingResult> {
  const result: MappingTrainingResult = {
    success: false,
    mappings: [],
    added: 0,
    skipped: 0,
    errors: []
  };

  try {
    
    // 调用LLM生成映射
    const mappings = await trainMappingWithLLM(texts, llmConfig);
    
    if (mappings.length === 0) {
      result.errors.push('LLM未返回有效映射');
      return result;
    }

    result.mappings = mappings;
    result.success = true;

    // 自动添加到映射表
    if (autoAdd) {
      const existingMappings = getMappingTable();
      mappings.forEach(({ mandarin, nanchang }) => {
        if (existingMappings[mandarin]) {
          result.skipped++;
        } else {
          result.added++;
        }
      });
      
      addMappings(mappings);
    } else {
    }

    return result;
  } catch (error) {
    result.errors.push((error as Error).message);
    return result;
  }
}

/**
 * 从训练数据中提取需要映射的文本
 * @param samples 训练样本数组
 * @returns 需要映射的文本数组（去重）
 */
export function extractTextsForTraining(samples: Array<{ processedContent: string }>): string[] {
  const texts = new Set<string>();
  
  samples.forEach(sample => {
    if (sample.processedContent) {
      // 提取文本中的词汇（简单分词）
      const words = sample.processedContent
        .replace(/[。！？，、]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0 && /[\u4e00-\u9fa5]/.test(w));
      
      words.forEach(word => {
        if (word.length <= 10) { // 只处理10字以内的文本
          texts.add(word);
        }
      });
    }
  });
  
  return Array.from(texts);
}

/**
 * 批量训练映射（从训练数据中提取文本）
 * @param samples 训练样本数组
 * @param llmConfig LLM配置（可选）
 * @param batchSize 每批处理的文本数量（默认20）
 * @returns 训练结果
 */
export async function batchTrainFromSamples(
  samples: Array<{ processedContent: string }>,
  llmConfig?: LLMChatConfig,
  batchSize: number = 20
): Promise<MappingTrainingResult> {
  const texts = extractTextsForTraining(samples);
  
  if (texts.length === 0) {
    return {
      success: false,
      mappings: [],
      added: 0,
      skipped: 0,
      errors: ['未找到需要训练的文本']
    };
  }

  // 分批处理
  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }

  
  const allMappings: Array<{ mandarin: string; nanchang: string }> = [];
  let totalAdded = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const result = await trainDialectMapping(batches[i], llmConfig, true);
    
    if (result.success) {
      allMappings.push(...result.mappings);
      totalAdded += result.added;
      totalSkipped += result.skipped;
    } else {
      errors.push(...result.errors);
    }
    
    // 批次间延迟，避免过载
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    success: errors.length === 0,
    mappings: allMappings,
    added: totalAdded,
    skipped: totalSkipped,
    errors
  };
}

// 在开发环境中暴露到全局
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).dialectMappingTrainer = {
    train: trainDialectMapping,
    batchTrain: batchTrainFromSamples,
    extractTexts: extractTextsForTraining
  };
}

