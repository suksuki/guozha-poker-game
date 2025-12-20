/**
 * Vue i18n 配置
 * 支持中文、英文、日文、韩文
 */

import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';
import koKR from './locales/ko-KR.json';

export type SupportedLocale = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR';

export const supportedLocales: { code: SupportedLocale; name: string; flag: string }[] = [
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' }
];

// 从 localStorage 读取保存的语言设置
const getSavedLanguage = (): SupportedLocale => {
  try {
    const saved = localStorage.getItem('app-language');
    if (saved && supportedLocales.some(locale => locale.code === saved)) {
      return saved as SupportedLocale;
    }
  } catch (error) {
  }
  
  // 默认使用浏览器语言
  const browserLang = navigator.language || 'zh-CN';
  if (browserLang.startsWith('zh')) return 'zh-CN';
  if (browserLang.startsWith('en')) return 'en-US';
  if (browserLang.startsWith('ja')) return 'ja-JP';
  if (browserLang.startsWith('ko')) return 'ko-KR';
  
  return 'zh-CN';
};

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: getSavedLanguage(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
    'ja-JP': jaJP,
    'ko-KR': koKR
  }
});

// 切换语言
export const changeLanguage = (locale: SupportedLocale): void => {
  i18n.global.locale.value = locale;
  try {
    localStorage.setItem('app-language', locale);
  } catch (error) {
  }
};

// 获取当前语言
export const getCurrentLanguage = (): SupportedLocale => {
  return i18n.global.locale.value as SupportedLocale;
};

export default i18n;

