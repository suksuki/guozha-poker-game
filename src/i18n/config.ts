/**
 * i18n 语言配置和框架配置
 */

export const supportedLanguages = [
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

export const defaultLanguage: SupportedLanguage = 'zh-CN';

/**
 * 命名空间类型
 */
export type NamespaceType = 'component' | 'feature' | 'shared';

/**
 * 命名空间信息
 */
export interface NamespaceInfo {
  type: NamespaceType;
  name: string;
  fullName: string;
  path: string;
}

/**
 * 加载策略
 */
export type LoadStrategy = 'eager' | 'lazy';

/**
 * i18n 框架配置
 */
export interface I18nFrameworkConfig {
  // 支持的语言
  languages: typeof supportedLanguages;
  
  // 默认语言
  defaultLanguage: SupportedLanguage;
  
  // 回退语言
  fallbackLanguage: SupportedLanguage;
  
  // 资源路径（相对于项目根目录）
  resourcePath: string;
  
  // 命名空间策略
  namespaceStrategy: {
    component: string;
    feature: string;
    shared: string;
  };
  
  // 加载策略
  loadStrategy: LoadStrategy;
  
  // 预加载的命名空间（关键翻译）
  preloadNamespaces: string[];
  
  // 开发模式
  devMode: boolean;
  
  // 缓存配置
  cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number; // 缓存过期时间（毫秒）
  };
}

/**
 * 默认框架配置
 */
export const defaultFrameworkConfig: I18nFrameworkConfig = {
  languages: supportedLanguages,
  defaultLanguage: 'zh-CN',
  fallbackLanguage: 'zh-CN',
  resourcePath: 'i18n-resources',
  namespaceStrategy: {
    component: 'component',
    feature: 'feature',
    shared: 'shared',
  },
  loadStrategy: 'lazy',
  preloadNamespaces: [
    'shared:common',
    'shared:ui',
    'feature:game',
  ],
  devMode: typeof import.meta !== 'undefined' && import.meta.env?.DEV || process.env.NODE_ENV === 'development' || false,
  cache: {
    enabled: true,
    maxSize: 100, // 最多缓存100个命名空间
    ttl: 3600000, // 1小时
  },
};

/**
 * 构建命名空间全名
 */
export function buildNamespace(
  type: NamespaceType,
  name: string
): string {
  const prefix = defaultFrameworkConfig.namespaceStrategy[type];
  return `${prefix}:${name}`;
}

/**
 * 解析命名空间
 */
export function parseNamespace(fullName: string): NamespaceInfo | null {
  const [type, ...nameParts] = fullName.split(':');
  
  if (!type || nameParts.length === 0) {
    return null;
  }
  
  const name = nameParts.join(':');
  const validTypes: NamespaceType[] = ['component', 'feature', 'shared'];
  
  if (!validTypes.includes(type as NamespaceType)) {
    return null;
  }
  
  return {
    type: type as NamespaceType,
    name,
    fullName,
    path: `${type}/${name}`,
  };
}

/**
 * 获取资源文件路径
 */
export function getResourcePath(
  namespace: string,
  language: SupportedLanguage
): string {
  const info = parseNamespace(namespace);
  if (!info) {
    throw new Error(`Invalid namespace: ${namespace}`);
  }
  
  return `${defaultFrameworkConfig.resourcePath}/${info.path}/${language}.json`;
}
