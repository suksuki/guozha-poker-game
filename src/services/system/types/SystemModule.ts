/**
 * 系统模块接口定义
 */

/**
 * 系统上下文，提供给模块使用
 */
export interface SystemContext {
  getModule<T>(name: string): T | null;
  hasModule(name: string): boolean;
  getConfig(): any;
}

/**
 * 模块状态
 */
export interface ModuleStatus {
  initialized: boolean;
  enabled: boolean;
  error?: Error;
}

/**
 * 系统模块接口
 * 所有系统模块都必须实现这个接口
 */
export interface SystemModule {
  /** 模块名称（唯一标识） */
  name: string;
  
  /** 依赖的其他模块名称列表 */
  dependencies?: string[];
  
  /**
   * 初始化模块
   * @param config 模块配置
   * @param context 系统上下文
   */
  initialize(config: any, context: SystemContext): Promise<void>;
  
  /**
   * 配置模块
   * @param config 新的配置（部分）
   */
  configure(config: any): void;
  
  /**
   * 关闭模块，清理资源
   */
  shutdown(): Promise<void>;
  
  /**
   * 获取模块状态
   */
  getStatus(): ModuleStatus;
  
  /**
   * 检查模块是否启用
   */
  isEnabled(): boolean;
}

