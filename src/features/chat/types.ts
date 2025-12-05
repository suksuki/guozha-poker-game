/**
 * 聊天系统类型定义
 */

export interface ChatMessage {
  id: string;
  playerId: number;
  playerName: string;
  message: string;
  timestamp: number;
  type: 'system' | 'player' | 'ai';
}

export interface ChatConfig {
  maxMessages: number;           // 最大消息数
  messageDisplayTime: number;    // 消息显示时间（ms）
  enableAIChat: boolean;         // 启用AI聊天
  enableHumanChat: boolean;      // 启用人类聊天
  autoScroll: boolean;           // 自动滚动
}

export type ChatEventType = 
  | 'message:send'
  | 'message:receive'
  | 'message:display'
  | 'message:clear';

export interface ChatEvent {
  type: ChatEventType;
  message?: ChatMessage;
  playerId?: number;
}

