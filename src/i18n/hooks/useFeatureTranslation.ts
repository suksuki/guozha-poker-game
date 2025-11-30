/**
 * 功能级翻译 Hook
 */

import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { buildNamespace } from '../config';

/**
 * 功能级翻译 Hook
 * 
 * @param featureName 功能名称（如 'game', 'chat'）
 * @returns 翻译函数
 */
export function useFeatureTranslation(featureName: string) {
  const namespace = useMemo(
    () => buildNamespace('feature', featureName),
    [featureName]
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

