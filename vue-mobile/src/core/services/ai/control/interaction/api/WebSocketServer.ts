/**
 * WebSocket服务器
 * 提供实时事件推送
 */

import { AIControlCenter } from '../../AIControlCenter';
import { EventBus } from '../../events/EventBus';

/**
 * WebSocket消息
 */
export interface WebSocketMessage {
  type: string;
  action?: string;
  data?: any;
  timestamp: number;
}

/**
 * WebSocket连接
 */
export interface WebSocketConnection {
  id: string;
  send: (message: WebSocketMessage) => void;
  subscribedEvents: Set<string>;
}

/**
 * WebSocket服务器（简化版，实际应该使用ws或socket.io）
 */
export class WebSocketServer {
  private connections: Map<string, WebSocketConnection> = new Map();
  private aiControl: AIControlCenter;
  private eventBus: EventBus;
  
  constructor() {
    this.aiControl = AIControlCenter.getInstance();
    this.eventBus = this.aiControl.getEventBus();
    this.setupEventListeners();
  }
  
  /**
   * 初始化（需要在AI中控系统初始化后调用）
   */
  initialize(): void {
    this.setupEventListeners();
  }
  
  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 监听特定事件
    const events = [
      'monitor:data',
      'monitor:error',
      'monitor:performance',
      'analysis:complete',
      'optimization:suggestion',
      'execute:complete'
    ];
    
    events.forEach(event => {
      this.eventBus.on(event, (data: any) => {
        this.broadcast({
          type: event,
          data,
          timestamp: Date.now()
        }, [event]);
      });
    });
  }
  
  /**
   * 添加连接
   */
  addConnection(connection: WebSocketConnection): void {
    this.connections.set(connection.id, connection);
    
    // 发送欢迎消息
    connection.send({
      type: 'connected',
      data: { message: '连接成功' },
      timestamp: Date.now()
    });
  }
  
  /**
   * 移除连接
   */
  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }
  
  /**
   * 处理消息
   */
  handleMessage(connectionId: string, message: WebSocketMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }
    
    switch (message.action) {
      case 'subscribe':
        // 订阅事件
        if (message.data?.events && Array.isArray(message.data.events)) {
          message.data.events.forEach((event: string) => {
            connection.subscribedEvents.add(event);
          });
          connection.send({
            type: 'subscribed',
            data: { events: Array.from(connection.subscribedEvents) },
            timestamp: Date.now()
          });
        }
        break;
        
      case 'unsubscribe':
        // 取消订阅
        if (message.data?.events && Array.isArray(message.data.events)) {
          message.data.events.forEach((event: string) => {
            connection.subscribedEvents.delete(event);
          });
          connection.send({
            type: 'unsubscribed',
            data: { events: Array.from(connection.subscribedEvents) },
            timestamp: Date.now()
          });
        }
        break;
        
      case 'ping':
        // 心跳
        connection.send({
          type: 'pong',
          timestamp: Date.now()
        });
        break;
        
      default:
    }
  }
  
  /**
   * 广播消息
   */
  private broadcast(message: WebSocketMessage, eventTypes: string[]): void {
    this.connections.forEach((connection) => {
      // 检查是否订阅了该事件
      const subscribed = eventTypes.some(event => 
        connection.subscribedEvents.has(event) || 
        connection.subscribedEvents.has('*')
      );
      
      if (subscribed) {
        try {
          connection.send(message);
        } catch (error) {
          this.removeConnection(connection.id);
        }
      }
    });
  }
  
  /**
   * 发送系统状态
   */
  broadcastSystemStatus(): void {
    const status = {
      resourceStatus: this.aiControl.getResourceStatus(),
      monitoring: true // 可以从AI中控系统获取
    };
    
    this.broadcast({
      type: 'system:status',
      data: status,
      timestamp: Date.now()
    }, ['system:status', '*']);
  }
  
  /**
   * 获取连接数
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

// 单例实例
let webSocketServerInstance: WebSocketServer | null = null;

/**
 * 获取WebSocket服务器实例
 */
export function getWebSocketServer(): WebSocketServer {
  if (!webSocketServerInstance) {
    webSocketServerInstance = new WebSocketServer();
    // 延迟初始化事件监听（确保AI中控系统已初始化）
    setTimeout(() => {
      webSocketServerInstance?.initialize();
    }, 100);
  }
  return webSocketServerInstance;
}

