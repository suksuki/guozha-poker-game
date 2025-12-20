/**
 * 系统应用模块统一导出
 */

export { SystemApplication } from './SystemApplication';
export type { SystemStatus } from './SystemApplication';
export type { SystemModule, SystemContext, ModuleStatus } from './types/SystemModule';
export type { SystemConfig, ValidationConfig, EventConfig, TrackingConfig, AudioConfig } from './types/SystemConfig';
export { DefaultSystemConfig } from './config/defaultConfig';
export { loadSystemConfig, saveSystemConfigToLocalStorage } from './config/configLoader';

// 模块导出
export { ValidationModule } from './modules/validation/ValidationModule';
export type { ValidationContext, ValidationResult, CardValidationResult, ScoreValidationResult } from './modules/validation/types';
export { EventModule } from './modules/event/EventModule';
export { registerAllModules } from './modules/registerModules';

