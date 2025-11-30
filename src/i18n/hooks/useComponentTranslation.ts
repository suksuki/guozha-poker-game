/**
 * 组件级翻译 Hook
 * 自动处理组件命名空间
 */

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { buildNamespace } from '../config';

/**
 * 组件级翻译 Hook
 * 
 * @param componentName 组件名称（如 'GameConfigPanel'）
 * @returns 翻译函数和相关状态
 */
export function useComponentTranslation(componentName: string) {
  const namespace = useMemo(
    () => buildNamespace('component', componentName),
    [componentName]
  );

  const { t, i18n } = useTranslation(namespace);

  // 包装翻译函数，自动添加命名空间前缀
  const translate = useMemo(
    () => (key: string, options?: any) => {
      return t(key, {
        ...options,
        ns: namespace,
      });
    },
    [t, namespace]
  );

  return {
    t: translate,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage.bind(i18n),
    namespace,
  };
}

