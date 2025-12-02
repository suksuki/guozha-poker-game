/**
 * 资源加载器
 * 负责动态加载翻译资源、缓存管理和错误处理
 */

import { SupportedLanguage, getResourcePath } from '../config';

/**
 * 翻译资源
 */
export interface TranslationResource {
  namespace: string;
  language: string;
  data: Record<string, any>;
  loadedAt: number;
}

/**
 * 资源加载器类
 */
export class ResourceLoader {
  private cache: Map<string, TranslationResource> = new Map();
  private loading: Map<string, Promise<TranslationResource>> = new Map();
  private config: {
    cacheEnabled: boolean;
    maxSize: number;
    ttl: number;
  };

  constructor(config: {
    cacheEnabled: boolean;
    maxSize: number;
    ttl: number;
  }) {
    this.config = config;
  }

  /**
   * 加载翻译资源
   */
  async load(
    namespace: string,
    language: SupportedLanguage
  ): Promise<TranslationResource> {
    const cacheKey = `${namespace}:${language}`;

    // 检查缓存
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }
    }

    // 检查是否正在加载
    const loading = this.loading.get(cacheKey);
    if (loading) {
      return loading;
    }

    // 开始加载
    const loadPromise = this.loadResource(namespace, language);
    this.loading.set(cacheKey, loadPromise);

    try {
      const resource = await loadPromise;
      
      // 缓存资源
      if (this.config.cacheEnabled) {
        this.cacheResource(cacheKey, resource);
      }
      
      return resource;
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  /**
   * 实际加载资源
   * 注意：在 Vite 中，动态导入需要使用明确的路径
   * 这里先返回一个占位实现，后续会通过工具生成正确的导入
   */
  private async loadResource(
    namespace: string,
    language: SupportedLanguage
  ): Promise<TranslationResource> {
    // TODO: 实现实际的资源加载
    // 方案1: 使用 fetch 加载 JSON 文件
    // 方案2: 使用工具生成静态导入
    // 方案3: 使用 Vite 的 glob import
    
    try {
      const resourcePath = getResourcePath(namespace, language);
      
      // 使用 fetch 加载资源（适用于开发和生产环境）
      const response = await fetch(`/${resourcePath}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load resource: ${resourcePath}`);
      }
      
      const data = await response.json();

      return {
        namespace,
        language,
        data,
        loadedAt: Date.now(),
      };
    } catch (error) {
      
      // 回退到默认语言
      if (language !== 'zh-CN') {
        try {
          return await this.loadResource(namespace, 'zh-CN');
        } catch (fallbackError) {
        }
      }
      
      // 返回空资源
      return {
        namespace,
        language,
        data: {},
        loadedAt: Date.now(),
      };
    }
  }

  /**
   * 预加载多个命名空间
   */
  async preload(
    namespaces: string[],
    language: SupportedLanguage
  ): Promise<void> {
    const loadPromises = namespaces.map(ns => this.load(ns, language));
    await Promise.all(loadPromises);
  }

  /**
   * 缓存资源
   */
  private cacheResource(key: string, resource: TranslationResource): void {
    // 检查缓存大小
    if (this.cache.size >= this.config.maxSize) {
      // 删除最旧的缓存
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, resource);
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(resource: TranslationResource): boolean {
    if (!this.config.ttl) {
      return true; // 无过期时间
    }

    const age = Date.now() - resource.loadedAt;
    return age < this.config.ttl;
  }

  /**
   * 清除缓存
   */
  clearCache(namespace?: string, language?: SupportedLanguage): void {
    if (namespace && language) {
      const key = `${namespace}:${language}`;
      this.cache.delete(key);
    } else if (namespace) {
      // 清除该命名空间的所有语言缓存
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(`${namespace}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }

  /**
   * 获取资源路径
   */
  getResourcePath(namespace: string, language: SupportedLanguage): string {
    return getResourcePath(namespace, language);
  }

  /**
   * 检查资源是否存在
   */
  async resourceExists(
    namespace: string,
    language: SupportedLanguage
  ): Promise<boolean> {
    try {
      const resourcePath = getResourcePath(namespace, language);
      const response = await fetch(`/${resourcePath}`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * 创建资源加载器实例
 */
export function createResourceLoader(config: {
  cacheEnabled: boolean;
  maxSize: number;
  ttl: number;
}): ResourceLoader {
  return new ResourceLoader(config);
}

