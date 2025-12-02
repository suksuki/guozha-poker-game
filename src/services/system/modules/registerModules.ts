/**
 * 模块注册函数
 * 统一注册所有系统模块
 */

import { SystemApplication } from '../SystemApplication';
import { ValidationModule } from './validation/ValidationModule';
import { EventModule } from './event/EventModule';
import { TrackingModule } from './tracking/TrackingModule';
import { AudioModule } from './audio/AudioModule';
import { AIControlModule } from './ai-control/AIControlModule';

/**
 * 注册所有核心模块
 */
export function registerAllModules(systemApp: SystemApplication): void {
  // 最先注册AI中控模块（最高优先级，无依赖）
  systemApp.registerModule(new AIControlModule());
  
  // 先注册事件模块（无依赖）
  systemApp.registerModule(new EventModule());
  
  // 再注册其他模块（依赖事件模块）
  systemApp.registerModule(new ValidationModule());
  systemApp.registerModule(new TrackingModule());
  systemApp.registerModule(new AudioModule());
}

/**
 * 注册开发环境模块（可选）
 */
export function registerDevModules(systemApp: SystemApplication): void {
  // 开发环境模块可以在这里注册
  // 例如：监控模块、调试模块等
}

