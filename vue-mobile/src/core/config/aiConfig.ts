/**
 * AI配置文件
 * 集中管理所有AI相关配置
 */

import { AIConfig, MCTSConfig } from '../ai/types';

/**
 * 默认AI配置
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  strategy: 'balanced', // 'aggressive' | 'conservative' | 'balanced'
  algorithm: 'mcts', // 'simple' | 'mcts' | 'llm'
  mctsIterations: 50, // MCTS迭代次数（快速模式）
  perfectInformation: true, // 完全信息模式（知道所有玩家手牌）
  currentRoundScore: 0,
  playerCount: 4
};

/**
 * MCTS算法配置
 */
export const MCTS_CONFIG: MCTSConfig = {
  iterations: 50, // 默认迭代次数（快速模式）
  explorationConstant: 1.414, // UCT探索常数（√2）
  simulationDepth: 20, // 模拟深度
  perfectInformation: true,
  playerCount: 4
};

/**
 * 快速模式配置（用于快速游戏）
 */
export const FAST_MODE_CONFIG: AIConfig = {
  ...DEFAULT_AI_CONFIG,
  mctsIterations: 30, // 更少的迭代次数
  algorithm: 'mcts'
};

/**
 * 高质量模式配置（用于追求更好的AI表现）
 */
export const HIGH_QUALITY_MODE_CONFIG: AIConfig = {
  ...DEFAULT_AI_CONFIG,
  mctsIterations: 100, // 更多的迭代次数
  algorithm: 'mcts'
};

/**
 * 简单模式配置（用于快速响应）
 */
export const SIMPLE_MODE_CONFIG: AIConfig = {
  ...DEFAULT_AI_CONFIG,
  algorithm: 'simple', // 使用简单策略，不依赖MCTS
  strategy: 'balanced'
};

/**
 * 大模型配置（预留，未来使用）
 */
export interface LLMConfig {
  provider: 'openai' | 'claude' | 'custom'; // 模型提供商
  model?: string; // 模型名称
  apiKey?: string; // API密钥
  temperature?: number; // 温度参数
  maxTokens?: number; // 最大token数
  systemPrompt?: string; // 系统提示词
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: '你是一个专业的过炸牌游戏AI，需要根据当前手牌和上家出牌，选择最优的出牌策略。'
};

/**
 * 根据模式获取配置
 */
export function getAIConfigByMode(mode: 'fast' | 'normal' | 'high-quality' | 'simple'): AIConfig {
  switch (mode) {
    case 'fast':
      return { ...FAST_MODE_CONFIG };
    case 'high-quality':
      return { ...HIGH_QUALITY_MODE_CONFIG };
    case 'simple':
      return { ...SIMPLE_MODE_CONFIG };
    case 'normal':
    default:
      return { ...DEFAULT_AI_CONFIG };
  }
}

/**
 * 合并用户配置和默认配置
 */
export function mergeAIConfig(userConfig: Partial<AIConfig>): AIConfig {
  return {
    ...DEFAULT_AI_CONFIG,
    ...userConfig
  };
}

