/**
 * 聊天系统
 * 
 * 职责：
 * 1. 管理聊天消息
 * 2. 处理AI/人类聊天
 * 3. 消息显示控制
 * 4. 聊天历史记录
 * 
 * 完全独立，无React依赖
 */

import { ChatMessage, ChatConfig, ChatEvent } from './types';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ChatConfig = {
  maxMessages: 50,
  messageDisplayTime: 5000,
  enableAIChat: true,
  enableHumanChat: true,
  autoScroll: true
};

/**
 * 聊天系统类
 */
export class ChatSystem {
  private config: ChatConfig;
  private messages: ChatMessage[] = [];
  private listeners: Map<string, Set<(event: ChatEvent) => void>> = new Map();
  private messageCounter: number = 0;
  
  constructor(config: Partial<ChatConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[ChatSystem] 已初始化', this.config);
  }
  
  // ==================== 消息管理 ====================
  
  /**
   * 发送消息
   */
  sendMessage(playerId: number, playerName: string, message: string, type: 'player' | 'ai' | 'system' = 'player'): void {
    // 检查是否启用
    if (type === 'ai' && !this.config.enableAIChat) return;
    if (type === 'player' && !this.config.enableHumanChat) return;
    
    const chatMessage: ChatMessage = {
      id: `msg-${++this.messageCounter}`,
      playerId,
      playerName,
      message,
      timestamp: Date.now(),
      type
    };
    
    // 添加到历史
    this.messages.push(chatMessage);
    
    // 限制消息数量
    if (this.messages.length > this.config.maxMessages) {
      this.messages.shift();
    }
    
    // 触发事件
    this.emit({ type: 'message:send', message: chatMessage });
    this.emit({ type: 'message:display', message: chatMessage });
    
    console.log(`[ChatSystem] 玩家${playerId}(${playerName}): ${message}`);
  }
  
  /**
   * 接收消息（来自外部）
   */
  receiveMessage(playerId: number, playerName: string, message: string): void {
    this.sendMessage(playerId, playerName, message, 'player');
    this.emit({ type: 'message:receive', playerId, message: { 
      id: '', playerId, playerName, message, timestamp: Date.now(), type: 'player' 
    }});
  }
  
  /**
   * 系统消息
   */
  systemMessage(message: string): void {
    this.sendMessage(-1, '系统', message, 'system');
  }
  
  /**
   * 清空消息
   */
  clearMessages(): void {
    this.messages = [];
    this.emit({ type: 'message:clear' });
    console.log('[ChatSystem] 消息已清空');
  }
  
  // ==================== 消息查询 ====================
  
  /**
   * 获取所有消息
   */
  getAllMessages(): ChatMessage[] {
    return [...this.messages];
  }
  
  /**
   * 获取最近N条消息
   */
  getRecentMessages(count: number): ChatMessage[] {
    return this.messages.slice(-count);
  }
  
  /**
   * 获取某个玩家的消息
   */
  getPlayerMessages(playerId: number): ChatMessage[] {
    return this.messages.filter(m => m.playerId === playerId);
  }
  
  // ==================== 事件系统 ====================
  
  /**
   * 监听事件
   */
  on(eventType: string, callback: (event: ChatEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // 返回取消订阅函数
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }
  
  /**
   * 触发事件
   */
  private emit(event: ChatEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }
  
  // ==================== 配置管理 ====================
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<ChatConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[ChatSystem] 配置已更新', this.config);
  }
  
  /**
   * 获取配置
   */
  getConfig(): ChatConfig {
    return { ...this.config };
  }
  
  // ==================== 统计信息 ====================
  
  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      totalMessages: this.messages.length,
      playerMessages: this.messages.filter(m => m.type === 'player').length,
      aiMessages: this.messages.filter(m => m.type === 'ai').length,
      systemMessages: this.messages.filter(m => m.type === 'system').length,
      oldestMessage: this.messages[0]?.timestamp,
      newestMessage: this.messages[this.messages.length - 1]?.timestamp
    };
  }
  
  // ==================== 工具方法 ====================
  
  /**
   * 格式化消息用于显示
   */
  formatMessage(message: ChatMessage): string {
    const time = new Date(message.timestamp).toLocaleTimeString();
    return `[${time}] ${message.playerName}: ${message.message}`;
  }
  
  /**
   * 导出聊天记录
   */
  exportHistory(): string {
    return this.messages
      .map(m => this.formatMessage(m))
      .join('\n');
  }
}

