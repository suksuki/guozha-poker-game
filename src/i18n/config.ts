/**
 * i18n 语言配置
 */

export const supportedLanguages = [
  { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ko-KR', name: '한국어', flag: '🇰🇷' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

export const defaultLanguage: SupportedLanguage = 'zh-CN';

