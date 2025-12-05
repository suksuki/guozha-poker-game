/**
 * i18n 框架初始化
 * 集成新框架和现有 i18next
 */

import i18n from './index.legacy';
import { createTranslationManager, createResourceLoader } from './core';
import { defaultFrameworkConfig, I18nFrameworkConfig } from './config';

/**
 * 框架实例
 */
let translationManager: ReturnType<typeof createTranslationManager> | null = null;
let resourceLoader: ReturnType<typeof createResourceLoader> | null = null;

/**
 * 初始化 i18n 框架
 */
export async function initI18nFramework(
  config?: Partial<I18nFrameworkConfig>
): Promise<void> {
  const frameworkConfig = {
    ...defaultFrameworkConfig,
    ...config,
  };

  // 创建资源加载器
  resourceLoader = createResourceLoader({
    cacheEnabled: frameworkConfig.cache.enabled,
    maxSize: frameworkConfig.cache.maxSize,
    ttl: frameworkConfig.cache.ttl,
  });

  // 创建翻译管理器
  translationManager = createTranslationManager(i18n, frameworkConfig);

  // 初始化管理器
  await translationManager.init();
}

/**
 * 获取翻译管理器实例
 */
export function getTranslationManager() {
  if (!translationManager) {
    throw new Error('i18n framework not initialized. Call initI18nFramework() first.');
  }
  return translationManager;
}

/**
 * 获取资源加载器实例
 */
export function getResourceLoader() {
  if (!resourceLoader) {
    throw new Error('i18n framework not initialized. Call initI18nFramework() first.');
  }
  return resourceLoader;
}

/**
 * 检查框架是否已初始化
 */
export function isFrameworkInitialized(): boolean {
  return translationManager !== null && resourceLoader !== null;
}
