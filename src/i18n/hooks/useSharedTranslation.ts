/**
 * 共享翻译 Hook
 */

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { buildNamespace } from '../config';

/**
 * 共享翻译 Hook
 * 
 * @param category 分类名称（如 'common', 'ui'）
 * @returns 翻译函数
 */
export function useSharedTranslation(category: string) {
  const namespace = useMemo(
    () => buildNamespace('shared', category),
    [category]
  );

  const { t } = useTranslation(namespace);

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
    namespace,
  };
}

