/**
 * i18n 初始化配置
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言资源
import zhCNCommon from './locales/zh-CN/common.json';
import zhCNGame from './locales/zh-CN/game.json';
import zhCNCards from './locales/zh-CN/cards.json';
import zhCNUI from './locales/zh-CN/ui.json';
import zhCNChat from './locales/zh-CN/chat.json';
import zhCNConfig from './locales/zh-CN/config.json';

import enUSCommon from './locales/en-US/common.json';
import enUSGame from './locales/en-US/game.json';
import enUSCards from './locales/en-US/cards.json';
import enUSUI from './locales/en-US/ui.json';
import enUSChat from './locales/en-US/chat.json';
import enUSConfig from './locales/en-US/config.json';

import koKRCommon from './locales/ko-KR/common.json';
import koKRGame from './locales/ko-KR/game.json';
import koKRCards from './locales/ko-KR/cards.json';
import koKRUI from './locales/ko-KR/ui.json';
import koKRChat from './locales/ko-KR/chat.json';
import koKRConfig from './locales/ko-KR/config.json';

import jaJPCommon from './locales/ja-JP/common.json';
import jaJPGame from './locales/ja-JP/game.json';
import jaJPCards from './locales/ja-JP/cards.json';
import jaJPUI from './locales/ja-JP/ui.json';
import jaJPChat from './locales/ja-JP/chat.json';
import jaJPConfig from './locales/ja-JP/config.json';

import { defaultLanguage } from './config';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': {
        common: zhCNCommon,
        game: zhCNGame,
        cards: zhCNCards,
        ui: zhCNUI,
        chat: zhCNChat,
        config: zhCNConfig,
      },
      'en-US': {
        common: enUSCommon,
        game: enUSGame,
        cards: enUSCards,
        ui: enUSUI,
        chat: enUSChat,
        config: enUSConfig,
      },
      'ko-KR': {
        common: koKRCommon,
        game: koKRGame,
        cards: koKRCards,
        ui: koKRUI,
        chat: koKRChat,
        config: koKRConfig,
      },
      'ja-JP': {
        common: jaJPCommon,
        game: jaJPGame,
        cards: jaJPCards,
        ui: jaJPUI,
        chat: jaJPChat,
        config: jaJPConfig,
      },
    },
    fallbackLng: defaultLanguage,
    defaultNS: 'common',
    ns: ['common', 'game', 'cards', 'ui', 'chat', 'config'],
    interpolation: {
      escapeValue: false, // React 已经转义了
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: true, // 启用Suspense支持
    },
  });

export default i18n;

