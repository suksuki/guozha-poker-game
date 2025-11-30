/**
 * i18n 框架入口
 * 集成新框架和现有 i18next（向后兼容）
 */

// 导入并初始化原有 i18n 系统（保持向后兼容）
import './index.legacy';
export { default as i18n } from './index.legacy';

// 导出新框架核心
export * from './core';
export * from './hooks';
export * from './config';

// 导出类型
export type {
  I18nFrameworkConfig,
  NamespaceInfo,
  NamespaceType,
  LoadStrategy,
} from './config';

// 导出原有配置（向后兼容）
export {
  supportedLanguages,
  defaultLanguage,
  type SupportedLanguage,
} from './config';
