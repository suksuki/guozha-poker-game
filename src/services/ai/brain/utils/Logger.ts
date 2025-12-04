/**
 * 日志工具
 * 统一的日志记录
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志配置
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
}

/**
 * 日志器类
 */
export class Logger {
  private config: LoggerConfig;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableFile: false,
      ...config
    };
  }
  
  /**
   * Debug日志
   */
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
  
  /**
   * Info日志
   */
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }
  
  /**
   * Warning日志
   */
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }
  
  /**
   * Error日志
   */
  error(message: string, data?: any): void {
    this.log('error', message, data);
  }
  
  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 检查日志级别
    if (this.levelPriority[level] < this.levelPriority[this.config.level]) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // 控制台输出
    if (this.config.enableConsole) {
      switch (level) {
        case 'debug':
        case 'info':
          console.log(logMessage, data || '');
          break;
        case 'warn':
          console.warn(logMessage, data || '');
          break;
        case 'error':
          console.error(logMessage, data || '');
          break;
      }
    }
    
    // 文件输出
    if (this.config.enableFile) {
      this.writeToFile(logMessage, data);
    }
  }
  
  /**
   * 写入文件
   */
  private writeToFile(message: string, data?: any): void {
    // TODO: 实现文件写入
    // 在Node.js环境中可以使用fs模块
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 默认日志器实例
export const defaultLogger = new Logger();

