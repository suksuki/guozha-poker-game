/**
 * i18n 初始化配置（原有系统，保持向后兼容）
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言资源（从新结构 i18n-resources/）
// 注意：为了保持向后兼容，这里仍然使用旧的命名空间名称
import zhCNCommon from '../../i18n-resources/shared/common/zh-CN.json';
import zhCNGame from '../../i18n-resources/feature/game/zh-CN.json';
import zhCNCards from '../../i18n-resources/feature/cards/zh-CN.json';
import zhCNUI from '../../i18n-resources/shared/ui/zh-CN.json';
import zhCNChat from '../../i18n-resources/feature/chat/zh-CN.json';
import zhCNConfig from '../../i18n-resources/feature/config/zh-CN.json';
import zhCNGameRules from '../../i18n-resources/feature/gameRules/zh-CN.json';

import enUSCommon from '../../i18n-resources/shared/common/en-US.json';
import enUSGame from '../../i18n-resources/feature/game/en-US.json';
import enUSCards from '../../i18n-resources/feature/cards/en-US.json';
import enUSUI from '../../i18n-resources/shared/ui/en-US.json';
import enUSChat from '../../i18n-resources/feature/chat/en-US.json';
import enUSConfig from '../../i18n-resources/feature/config/en-US.json';
import enUSGameRules from '../../i18n-resources/feature/gameRules/en-US.json';

import koKRCommon from '../../i18n-resources/shared/common/ko-KR.json';
import koKRGame from '../../i18n-resources/feature/game/ko-KR.json';
import koKRCards from '../../i18n-resources/feature/cards/ko-KR.json';
import koKRUI from '../../i18n-resources/shared/ui/ko-KR.json';
import koKRChat from '../../i18n-resources/feature/chat/ko-KR.json';
import koKRConfig from '../../i18n-resources/feature/config/ko-KR.json';
import koKRGameRules from '../../i18n-resources/feature/gameRules/ko-KR.json';

import jaJPCommon from '../../i18n-resources/shared/common/ja-JP.json';
import jaJPGame from '../../i18n-resources/feature/game/ja-JP.json';
import jaJPCards from '../../i18n-resources/feature/cards/ja-JP.json';
import jaJPUI from '../../i18n-resources/shared/ui/ja-JP.json';
import jaJPChat from '../../i18n-resources/feature/chat/ja-JP.json';
import jaJPConfig from '../../i18n-resources/feature/config/ja-JP.json';
import jaJPGameRules from '../../i18n-resources/feature/gameRules/ja-JP.json';

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
        gameRules: zhCNGameRules,
      },
      'en-US': {
        common: enUSCommon,
        game: enUSGame,
        cards: enUSCards,
        ui: enUSUI,
        chat: enUSChat,
        config: enUSConfig,
        gameRules: enUSGameRules,
      },
      'ko-KR': {
        common: koKRCommon,
        game: koKRGame,
        cards: koKRCards,
        ui: koKRUI,
        chat: koKRChat,
        config: koKRConfig,
        gameRules: koKRGameRules,
      },
      'ja-JP': {
        common: jaJPCommon,
        game: jaJPGame,
        cards: jaJPCards,
        ui: jaJPUI,
        chat: jaJPChat,
        config: jaJPConfig,
        gameRules: jaJPGameRules,
      },
    },
    fallbackLng: defaultLanguage,
    defaultNS: 'common',
    ns: ['common', 'game', 'cards', 'ui', 'chat', 'config', 'gameRules'],
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
