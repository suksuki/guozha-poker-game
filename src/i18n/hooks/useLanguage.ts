/**
 * 语言切换 Hook
 */

import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { SupportedLanguage, supportedLanguages } from '../config';

/**
 * 语言切换 Hook
 * 
 * @returns 当前语言和切换函数
 */
export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback(
    async (language: SupportedLanguage) => {
      await i18n.changeLanguage(language);
    },
    [i18n]
  );

  return {
    currentLanguage: i18n.language as SupportedLanguage,
    changeLanguage,
    supportedLanguages,
    isLanguage: (lang: string) => i18n.language === lang,
  };
}

