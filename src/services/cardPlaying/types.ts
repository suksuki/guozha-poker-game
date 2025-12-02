/**
 * 打牌系统服务类型定义
 */

import { Card, Play } from '../../types/card';

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误消息（如果无效） */
  error?: string;
  /** 验证的牌型（如果有效） */
  play?: Play;
}

/**
 * 验证选项
 */
export interface ValidationOptions {
  /** 是否允许空手牌 */
  allowEmpty?: boolean;
  /** 是否检查手牌中是否包含这些牌 */
  checkInHand?: boolean;
  /** 玩家手牌（用于检查） */
  playerHand?: Card[];
}

/**
 * 选牌结果
 */
export interface SelectionResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息（如果失败） */
  error?: string;
  /** 当前选中的牌 */
  selectedCards: Card[];
}

/**
 * 选牌模式
 */
export type SelectionMode = 'card' | 'rank';

/**
 * 选牌状态（基于Card对象）
 */
export interface CardSelectionState {
  /** 选中的牌 */
  selectedCards: Card[];
  /** 高亮的牌（可出牌提示） */
  highlightedCards: Card[];
}

/**
 * 选牌状态（基于rank）
 */
export interface RankSelectionState {
  /** 选中的牌：Map<rank, count> */
  selection: Map<number, number>;
  /** 可出牌的点数 */
  playableRanks: number[];
}

/**
 * 出牌选项
 */
export interface PlayOptions {
  /** 是否等待最短间隔 */
  waitForMinInterval?: boolean;
  /** 是否启用超时检测 */
  enableTimeout?: boolean;
  /** 超时回调 */
  onTimeout?: () => void;
  /** 处理开始回调 */
  onStart?: () => void;
  /** 处理完成回调 */
  onComplete?: (result: PlayResult) => void;
  /** 处理失败回调 */
  onError?: (error: Error) => void;
}

/**
 * 出牌结果
 */
export interface PlayResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息（如果失败） */
  error?: string;
  /** 出牌的Play对象（如果成功） */
  play?: Play;
  /** 出牌记录 */
  playRecord?: import('../../types/card').RoundPlayRecord;
}

/**
 * AI建议选项
 */
export interface SuggestOptions {
  /** 策略类型 */
  strategy?: 'aggressive' | 'conservative' | 'balanced';
  /** 算法类型 */
  algorithm?: 'simple' | 'mcts';
  /** MCTS迭代次数 */
  mctsIterations?: number;
}

/**
 * AI建议结果
 */
export interface SuggestResult {
  /** 建议的牌 */
  cards: Card[];
  /** 牌型 */
  type: string;
  /** 牌型值 */
  value: number;
  /** 解释说明（可选） */
  explanation?: string;
}

/**
 * 单个建议方案
 */
export interface PlaySuggestion {
  /** 建议的牌 */
  cards: Card[];
  /** 牌型 */
  type: string;
  /** 牌型值 */
  value: number;
  /** 推荐度评分（1-5星） */
  rating: number;
  /** 主要原因 */
  mainReason: string;
  /** 详细理由 */
  detailedReason: string;
  /** 优点列表 */
  advantages: string[];
  /** 缺点列表 */
  disadvantages: string[];
  /** 风险评估（低/中/高） */
  riskLevel: 'low' | 'medium' | 'high';
  /** 预期收益 */
  expectedBenefit: string;
  /** 置信度（0-1） */
  confidence: number;
}

/**
 * 多个建议结果
 */
export interface MultipleSuggestionsResult {
  /** 建议列表（按推荐度排序） */
  suggestions: PlaySuggestion[];
  /** 最佳建议（第一个） */
  best: PlaySuggestion | null;
  /** 建议总数 */
  total: number;
  /** 生成时间戳 */
  timestamp: number;
}

/**
 * 打牌服务配置
 */
export interface CardPlayingServiceConfig {
  /** 验证服务 */
  validationService?: import('./ValidationService').ValidationService;
  /** 选牌服务 */
  cardSelectorService?: import('./CardSelectorService').CardSelectorService;
  /** 出牌执行服务 */
  playExecutorService?: import('./PlayExecutorService').PlayExecutorService;
  /** AI建议服务 */
  aiSuggesterService?: import('./AISuggesterService').AISuggesterService;
}

