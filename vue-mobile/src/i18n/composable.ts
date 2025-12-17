/**
 * i18n composable
 * 提供便捷的 i18n 使用方式
 */

import { useI18n as useVueI18n } from 'vue-i18n';
import { changeLanguage, getCurrentLanguage, type SupportedLocale } from './index';

export function useI18n() {
  const { t, locale } = useVueI18n();
  
  return {
    t,
    locale,
    currentLanguage: getCurrentLanguage(),
    changeLanguage: (lang: SupportedLocale) => {
      changeLanguage(lang);
      locale.value = lang;
    },
    supportedLocales: [
      { code: 'zh-CN' as SupportedLocale, name: '中文', flag: '🇨🇳' },
      { code: 'en-US' as SupportedLocale, name: 'English', flag: '🇺🇸' },
      { code: 'ja-JP' as SupportedLocale, name: '日本語', flag: '🇯🇵' },
      { code: 'ko-KR' as SupportedLocale, name: '한국어', flag: '🇰🇷' }
    ]
  };
}

