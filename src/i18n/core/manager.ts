/**
 * 翻译管理器
 * 负责管理所有翻译资源、命名空间和语言切换
 */

import i18n, { i18n as I18nType } from 'i18next';
import { NamespaceInfo, I18nFrameworkConfig, parseNamespace } from '../config';

/**
 * 命名空间注册信息
 */
interface NamespaceRegistry {
  [fullName: string]: NamespaceInfo;
}

/**
 * 翻译管理器类
 */
export class TranslationManager {
  private i18nInstance: I18nType;
  private config: I18nFrameworkConfig;
  private namespaces: NamespaceRegistry = {};
  private languageChangeListeners: Set<(language: string) => void> = new Set();

  constructor(i18nInstance: I18nType, config: I18nFrameworkConfig) {
    this.i18nInstance = i18nInstance;
    this.config = config;
  }

  /**
   * 初始化管理器
   */
  async init(): Promise<void> {
    // 设置默认语言
    if (!this.i18nInstance.language) {
      await this.i18nInstance.changeLanguage(this.config.defaultLanguage);
    }

    // 预加载关键命名空间
    if (this.config.preloadNamespaces.length > 0) {
      await this.preloadNamespaces(this.config.preloadNamespaces);
    }
  }

  /**
   * 注册命名空间
   */
  registerNamespace(namespace: string, info?: NamespaceInfo): void {
    const namespaceInfo = info || parseNamespace(namespace);
    
    if (!namespaceInfo) {
      throw new Error(`Invalid namespace: ${namespace}`);
    }

    this.namespaces[namespace] = namespaceInfo;
  }

  /**
   * 获取命名空间信息
   */
  getNamespace(namespace: string): NamespaceInfo | null {
    return this.namespaces[namespace] || parseNamespace(namespace);
  }

  /**
   * 获取翻译
   */
  translate(
    key: string,
    options?: {
      namespace?: string;
      defaultValue?: string;
      interpolation?: Record<string, any>;
    }
  ): string {
    const namespace = options?.namespace;
    const fullKey = namespace ? `${namespace}:${key}` : key;

    // 尝试获取翻译
    let translation = this.i18nInstance.t(fullKey, {
      defaultValue: options?.defaultValue || key,
      ...options?.interpolation,
    });

    // 开发模式下检查翻译是否存在
    if (this.config.devMode && translation === fullKey) {
    }

    return translation;
  }

  /**
   * 检查翻译是否存在
   */
  hasTranslation(key: string, namespace?: string): boolean {
    const fullKey = namespace ? `${namespace}:${key}` : key;
    return this.i18nInstance.exists(fullKey);
  }

  /**
   * 切换语言
   */
  async changeLanguage(language: string): Promise<void> {
    await this.i18nInstance.changeLanguage(language);
    
    // 通知所有监听者
    this.languageChangeListeners.forEach(listener => {
      listener(language);
    });
  }

  /**
   * 获取当前语言
   */
  getCurrentLanguage(): string {
    return this.i18nInstance.language || this.config.defaultLanguage;
  }

  /**
   * 添加语言切换监听器
   */
  onLanguageChange(listener: (language: string) => void): () => void {
    this.languageChangeListeners.add(listener);
    
    // 返回取消监听的函数
    return () => {
      this.languageChangeListeners.delete(listener);
    };
  }

  /**
   * 预加载命名空间
   */
  async preloadNamespaces(namespaces: string[]): Promise<void> {
    const currentLanguage = this.getCurrentLanguage();
    
    // 这里会调用 ResourceLoader 来加载资源
    // 暂时先注册命名空间
    namespaces.forEach(ns => {
      this.registerNamespace(ns);
    });
  }

  /**
   * 获取 i18n 实例（用于高级操作）
   */
  getI18nInstance(): I18nType {
    return this.i18nInstance;
  }
}

/**
 * 创建翻译管理器实例
 */
export function createTranslationManager(
  i18nInstance: I18nType,
  config: I18nFrameworkConfig
): TranslationManager {
  return new TranslationManager(i18nInstance, config);
}

