/**
 * 系统应用核心类
 * 负责管理所有系统模块的生命周期、配置和依赖关系
 */

import { SystemModule, SystemContext, ModuleStatus } from './types/SystemModule';
import { SystemConfig } from './types/SystemConfig';
import { loadSystemConfig, saveSystemConfigToLocalStorage } from './config/configLoader';
import { DefaultSystemConfig } from './config/defaultConfig';

/**
 * 系统状态
 */
export interface SystemStatus {
  initialized: boolean;
  started: boolean;
  modules: Record<string, ModuleStatus>;
  errors: Array<{ module: string; error: Error }>;
}

/**
 * 系统应用上下文实现
 */
class SystemContextImpl implements SystemContext {
  constructor(
    private modules: Map<string, SystemModule>,
    private config: SystemConfig
  ) {}
  
  getModule<T>(name: string): T | null {
    const module = this.modules.get(name);
    return (module as any) || null;
  }
  
  hasModule(name: string): boolean {
    return this.modules.has(name);
  }
  
  getConfig(): SystemConfig {
    return this.config;
  }
}

/**
 * 系统应用类（单例）
 */
export class SystemApplication {
  private static instance: SystemApplication | null = null;
  
  private modules: Map<string, SystemModule> = new Map();
  private config: SystemConfig = DefaultSystemConfig;
  private context: SystemContext;
  private initialized = false;
  private started = false;
  private errors: Array<{ module: string; error: Error }> = [];
  
  private constructor() {
    this.context = new SystemContextImpl(this.modules, this.config);
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): SystemApplication {
    if (!SystemApplication.instance) {
      SystemApplication.instance = new SystemApplication();
    }
    return SystemApplication.instance;
  }
  
  /**
   * 重置系统应用（主要用于测试）
   */
  reset(): void {
    this.modules.clear();
    this.config = DefaultSystemConfig;
    this.context = new SystemContextImpl(this.modules, this.config);
    this.initialized = false;
    this.started = false;
    this.errors = [];
  }
  
  /**
   * 注册模块
   */
  registerModule(module: SystemModule): void {
    if (this.modules.has(module.name)) {
      console.warn(`[SystemApplication] 模块 ${module.name} 已注册，将被覆盖`);
    }
    
    this.modules.set(module.name, module);
    console.log(`[SystemApplication] 模块 ${module.name} 已注册`);
  }
  
  /**
   * 获取模块
   */
  getModule<T extends SystemModule>(name: string): T | null {
    const module = this.modules.get(name);
    return (module as T) || null;
  }
  
  /**
   * 检查是否有模块
   */
  hasModule(name: string): boolean {
    return this.modules.has(name);
  }
  
  /**
   * 初始化系统应用
   */
  async initialize(config?: Partial<SystemConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('[SystemApplication] 系统已经初始化，跳过');
      const currentStatus = this.getStatus();
      console.warn('[SystemApplication] 当前模块状态:', currentStatus);
      
      // 检查是否有未初始化的模块
      const uninitialized = Object.entries(currentStatus.modules)
        .filter(([_, status]) => !status.initialized)
        .map(([name]) => name);
      
      if (uninitialized.length > 0) {
        console.warn('[SystemApplication] ⚠️ 发现未初始化的模块，尝试重新初始化:', uninitialized);
        // 重置初始化状态，允许重新初始化
        this.initialized = false;
        // 继续执行初始化流程
      } else {
        return;
      }
    }
    
    console.log('[SystemApplication] 开始初始化系统应用...');
    console.log('[SystemApplication] 已注册模块数:', this.modules.size);
    console.log('[SystemApplication] 已注册模块:', Array.from(this.modules.keys()));
    
    // 加载配置
    this.config = loadSystemConfig(config);
    this.context = new SystemContextImpl(this.modules, this.config);
    console.log('[SystemApplication] 配置已加载');
    
    // 初始化模块（按依赖顺序）
    const initOrder = this.resolveInitOrder();
    this.errors = [];
    
    console.log('[SystemApplication] 初始化顺序:', initOrder);
    
    if (initOrder.length === 0) {
      console.warn('[SystemApplication] ⚠️ 没有模块需要初始化！');
      this.initialized = true;
      return;
    }
    
    for (const moduleName of initOrder) {
      const module = this.modules.get(moduleName);
      if (!module) {
        console.warn(`[SystemApplication] 模块 ${moduleName} 未找到，跳过`);
        continue;
      }
      
      try {
        console.log(`[SystemApplication] 开始初始化模块: ${module.name}`);
        const moduleConfig = this.getModuleConfig(module.name);
        console.log(`[SystemApplication] 模块 ${module.name} 配置:`, moduleConfig);
        
        const startTime = Date.now();
        await module.initialize(moduleConfig, this.context);
        const duration = Date.now() - startTime;
        
        console.log(`[SystemApplication] ✅ 模块 ${module.name} 初始化成功 (耗时: ${duration}ms)`);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.errors.push({ module: module.name, error: err });
        
        console.error(`[SystemApplication] ❌ 模块 ${module.name} 初始化失败:`, err);
        console.error('错误堆栈:', err.stack);
        
        if (this.isCriticalModule(module.name)) {
          console.error(`[SystemApplication] 关键模块 ${module.name} 初始化失败，中断初始化`);
          throw err;
        } else {
          console.warn(`[SystemApplication] 模块 ${module.name} 初始化失败，继续初始化其他模块`);
        }
      }
    }
    
    this.initialized = true;
    
    // 验证所有模块状态
    const finalStatus = this.getStatus();
    const uninitializedModules = Object.entries(finalStatus.modules)
      .filter(([_, status]) => !status.initialized)
      .map(([name]) => name);
    
    console.log('[SystemApplication] 系统应用初始化完成', {
      modulesCount: this.modules.size,
      initializedModules: Object.entries(finalStatus.modules)
        .filter(([_, status]) => status.initialized)
        .map(([name]) => name),
      uninitializedModules,
      errorsCount: this.errors.length,
      errors: this.errors.map(e => ({ module: e.module, message: e.error.message }))
    });
    
    if (uninitializedModules.length > 0) {
      console.warn('[SystemApplication] ⚠️ 以下模块未初始化:', uninitializedModules);
    }
  }
  
  /**
   * 启动系统应用
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error('[SystemApplication] 系统未初始化，无法启动');
    }
    
    if (this.started) {
      console.warn('[SystemApplication] 系统已经启动，跳过');
      return;
    }
    
    // 启动所有模块
    for (const module of this.modules.values()) {
      if (module.isEnabled()) {
        try {
          // 如果模块有 start 方法，调用它
          if (typeof (module as any).start === 'function') {
            await (module as any).start();
          }
        } catch (error) {
          console.warn(`[SystemApplication] 模块 ${module.name} 启动失败`, error);
        }
      }
    }
    
    this.started = true;
    console.log('[SystemApplication] 系统应用启动完成');
  }
  
  /**
   * 关闭系统应用
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    // 按相反顺序关闭模块
    const shutdownOrder = this.resolveInitOrder().reverse();
    
    for (const moduleName of shutdownOrder) {
      const module = this.modules.get(moduleName);
      if (module) {
        try {
          await module.shutdown();
        } catch (error) {
          console.warn(`[SystemApplication] 模块 ${module.name} 关闭失败`, error);
        }
      }
    }
    
    this.started = false;
    this.initialized = false;
    console.log('[SystemApplication] 系统应用已关闭');
  }
  
  /**
   * 配置系统应用
   */
  configure(config: Partial<SystemConfig>): void {
    // 深度合并配置
    this.config = this.deepMerge(this.config, config);
    this.context = new SystemContextImpl(this.modules, this.config);
    
    // 通知所有模块配置已更新
    for (const module of this.modules.values()) {
      try {
        const moduleConfig = this.getModuleConfig(module.name);
        module.configure(moduleConfig);
      } catch (error) {
        console.warn(`[SystemApplication] 模块 ${module.name} 配置更新失败`, error);
      }
    }
    
    // 保存配置到 localStorage
    saveSystemConfigToLocalStorage(this.config);
    
    console.log('[SystemApplication] 配置已更新');
  }
  
  /**
   * 获取配置
   */
  getConfig(): SystemConfig {
    return { ...this.config };
  }
  
  /**
   * 获取系统状态
   */
  getStatus(): SystemStatus {
    const modules: Record<string, ModuleStatus> = {};
    for (const [name, module] of this.modules.entries()) {
      modules[name] = module.getStatus();
    }
    
    return {
      initialized: this.initialized,
      started: this.started,
      modules,
      errors: [...this.errors]
    };
  }
  
  /**
   * 解析模块初始化顺序（拓扑排序）
   */
  private resolveInitOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    const visit = (moduleName: string) => {
      if (visiting.has(moduleName)) {
        throw new Error(`[SystemApplication] 检测到循环依赖: ${moduleName}`);
      }
      
      if (visited.has(moduleName)) {
        return;
      }
      
      visiting.add(moduleName);
      
      const module = this.modules.get(moduleName);
      if (module && module.dependencies) {
        for (const dep of module.dependencies) {
          if (!this.modules.has(dep)) {
            throw new Error(`[SystemApplication] 模块 ${moduleName} 依赖的模块 ${dep} 不存在`);
          }
          visit(dep);
        }
      }
      
      visiting.delete(moduleName);
      visited.add(moduleName);
      order.push(moduleName);
    };
    
    for (const moduleName of this.modules.keys()) {
      if (!visited.has(moduleName)) {
        visit(moduleName);
      }
    }
    
    return order;
  }
  
  /**
   * 获取模块配置
   */
  private getModuleConfig(moduleName: string): any {
    const configMap: Record<string, string> = {
      'validation': 'validation',
      'event': 'event',
      'tracking': 'tracking',
      'audio': 'audio',
      'ai-control': 'aiControl', // 添加ai-control配置映射
    };
    
    const configKey = configMap[moduleName];
    if (configKey && this.config[configKey as keyof SystemConfig]) {
      return this.config[configKey as keyof SystemConfig];
    }
    
    // 如果没有找到配置，返回空对象（模块可以使用默认配置）
    return {};
  }
  
  /**
   * 检查是否为关键模块
   */
  private isCriticalModule(name: string): boolean {
    // 关键模块：事件模块（其他模块可能依赖它）
    return name === 'event';
  }
  
  /**
   * 深度合并对象
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof target[key] === 'object' &&
          target[key] !== null &&
          !Array.isArray(target[key])
        ) {
          result[key] = this.deepMerge(target[key] as any, source[key] as any);
        } else {
          result[key] = source[key] as any;
        }
      }
    }
    
    return result;
  }
}

