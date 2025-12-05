/**
 * 游戏引擎类型定义
 * 所有接口和类型都在这里，方便查看和理解
 */

import { Card, Play } from '../types/card';

// ==================== 玩家相关 ====================

/**
 * 玩家类型
 */
export type PlayerType = 'human' | 'ai';

/**
 * AI性格类型
 */
export type PersonalityType = 'aggressive' | 'conservative' | 'balanced' | 'adaptive';

/**
 * 玩家接口
 * 代表游戏中的一个玩家（人类或AI）
 */
export interface IPlayer {
  /** 玩家ID（0-3） */
  id: number;
  
  /** 玩家名称 */
  name: string;
  
  /** 玩家类型 */
  type: PlayerType;
  
  /** AI性格（仅AI玩家有效） */
  personality?: PersonalityType;
  
  /** 手牌 */
  hand: Card[];
  
  /** 当前分数 */
  score: number;
  
  /** 是否已出完牌 */
  finished: boolean;
}

// ==================== 游戏状态相关 ====================

/**
 * 游戏阶段
 */
export type GamePhase = 'not_started' | 'playing' | 'finished';

/**
 * 回合阶段
 */
export type RoundPhase = 'waiting' | 'playing' | 'finished';

/**
 * 游戏状态接口
 * 包含所有游戏数据
 */
export interface IGameState {
  /** 游戏阶段 */
  phase: GamePhase;
  
  /** 所有玩家 */
  players: IPlayer[];
  
  /** 当前玩家ID */
  currentPlayerId: number;
  
  /** 回合号 */
  roundNumber: number;
  
  /** 回合阶段 */
  roundPhase: RoundPhase;
  
  /** 上一次出牌 */
  lastPlay: Play | null;
  
  /** 上一次出牌的玩家ID */
  lastPlayerId: number | null;
  
  /** 本轮分数 */
  currentRoundScore: number;
  
  /** 游戏获胜者ID（游戏结束时） */
  winnerId: number | null;
}

// ==================== 引擎配置相关 ====================

/**
 * 游戏引擎配置
 */
export interface GameEngineConfig {
  /** 渲染器（负责显示） */
  renderer: IRenderer;
  
  /** 玩家总数 */
  playerCount: 4;
  
  /** AI玩家ID列表 */
  aiPlayerIds: number[];
  
  /** 玩家名称（可选） */
  playerNames?: string[];
  
  /** AI配置 */
  aiConfig?: AIEngineConfig;
}

/**
 * AI引擎配置
 */
export interface AIEngineConfig {
  /** AI性格列表（与aiPlayerIds对应） */
  personalities?: PersonalityType[];
  
  /** 是否启用LLM */
  enableLLM?: boolean;
  
  /** LLM配置 */
  llmEndpoint?: string;
  llmModel?: string;
  
  /** 是否收集训练数据 */
  enableDataCollection?: boolean;
}

// ==================== 渲染器相关 ====================

/**
 * 渲染器接口
 * 任何渲染技术都实现这个接口
 */
export interface IRenderer {
  /**
   * 渲染游戏状态
   * @param state 当前游戏状态
   */
  render(state: IGameState): void;
  
  /**
   * 显示AI思考状态
   * @param playerId AI玩家ID
   */
  showAIThinking(playerId: number): void;
  
  /**
   * 显示聊天消息
   * @param playerId 说话的玩家ID
   * @param playerName 玩家名称
   * @param message 消息内容
   * @param displayTime 显示时间(ms)
   */
  showMessage(playerId: number, playerName: string, message: string, displayTime?: number): void;
  
  /**
   * 清空聊天消息
   */
  clearMessages?(): void;
  
  /**
   * 显示聊天输入框
   * @param onSubmit 提交回调
   */
  showChatInput?(onSubmit: (message: string) => void): void;
  
  /**
   * 隐藏聊天输入框
   */
  hideChatInput?(): void;
  
  /**
   * 等待人类玩家输入
   * @returns 玩家选择的卡牌
   */
  waitForHumanInput(): Promise<Card[] | null>;
  
  /**
   * 显示游戏结束
   * @param winnerId 获胜者ID
   */
  showGameEnd(winnerId: number): void;
}

// ==================== 事件相关 ====================

/**
 * 游戏事件类型
 */
export type GameEventType = 
  | 'game:start'        // 游戏开始
  | 'game:end'          // 游戏结束
  | 'round:start'       // 回合开始
  | 'round:end'         // 回合结束
  | 'turn:start'        // 玩家回合开始
  | 'turn:end'          // 玩家回合结束
  | 'play:made'         // 出牌
  | 'message:sent';     // 消息发送

/**
 * 游戏事件
 */
export interface GameEvent {
  type: GameEventType;
  data?: any;
  timestamp: number;
}

