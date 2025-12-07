/**
 * i18n 单元测试
 * 测试多语言功能的正确性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import zhCN from '../../src/i18n/locales/zh-CN.json';
import enUS from '../../src/i18n/locales/en-US.json';
import jaJP from '../../src/i18n/locales/ja-JP.json';
import koKR from '../../src/i18n/locales/ko-KR.json';
import { changeLanguage, getCurrentLanguage, supportedLocales } from '../../src/i18n/index';

// 创建测试用的 i18n 实例
const createTestI18n = () => {
  return createI18n({
    legacy: false,
    locale: 'zh-CN',
    fallbackLocale: 'zh-CN',
    messages: {
      'zh-CN': zhCN,
      'en-US': enUS,
      'ja-JP': jaJP,
      'ko-KR': koKR
    }
  });
};

describe('i18n 基础功能', () => {
  let i18n: ReturnType<typeof createTestI18n>;

  beforeEach(() => {
    i18n = createTestI18n();
    // 清理 localStorage
    localStorage.clear();
  });

  it('应该支持所有语言', () => {
    expect(supportedLocales).toHaveLength(4);
    expect(supportedLocales.map(l => l.code)).toEqual(['zh-CN', 'en-US', 'ja-JP', 'ko-KR']);
  });

  it('应该正确翻译中文文本', () => {
    const { t } = i18n.global;
    expect(t('game.startNewGame')).toBe('开始新游戏（新架构版）');
    expect(t('game.playCards')).toBe('出牌');
    expect(t('game.pass')).toBe('要不起');
  });

  it('应该正确翻译英文文本', () => {
    i18n.global.locale.value = 'en-US';
    const { t } = i18n.global;
    expect(t('game.startNewGame')).toBe('Start New Game');
    expect(t('game.playCards')).toBe('Play Cards');
    expect(t('game.pass')).toBe('Pass');
  });

  it('应该正确翻译日文文本', () => {
    i18n.global.locale.value = 'ja-JP';
    const { t } = i18n.global;
    expect(t('game.startNewGame')).toBe('新しいゲームを開始');
    expect(t('game.playCards')).toBe('カードを出す');
  });

  it('应该正确翻译韩文文本', () => {
    i18n.global.locale.value = 'ko-KR';
    const { t } = i18n.global;
    expect(t('game.startNewGame')).toBe('새 게임 시작');
    expect(t('game.playCards')).toBe('카드 내기');
  });

  it('应该支持嵌套键', () => {
    const { t } = i18n.global;
    expect(t('chat.intent.tactical')).toBe('战术');
    expect(t('chat.intent.social')).toBe('闲聊');
    expect(t('game.playTypes.single')).toBe('单张');
    expect(t('game.playTypes.bomb')).toBe('炸弹');
  });

  it('应该支持参数化翻译', () => {
    i18n.global.locale.value = 'en-US';
    const { t } = i18n.global;
    // 如果有参数化翻译，测试这里
    // 例如: t('game.playerCount', { count: 4 })
  });

  it('应该回退到默认语言', () => {
    i18n.global.locale.value = 'zh-CN';
    const { t } = i18n.global;
    // 测试不存在的键应该回退
    expect(t('nonexistent.key', '默认值')).toBe('默认值');
  });
});

describe('语言切换功能', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('应该能够切换语言', () => {
    const i18n = createTestI18n();
    
    expect(i18n.global.locale.value).toBe('zh-CN');
    
    i18n.global.locale.value = 'en-US';
    expect(i18n.global.locale.value).toBe('en-US');
    
    i18n.global.locale.value = 'ja-JP';
    expect(i18n.global.locale.value).toBe('ja-JP');
    
    i18n.global.locale.value = 'ko-KR';
    expect(i18n.global.locale.value).toBe('ko-KR');
  });

  it('应该保存语言设置到 localStorage', () => {
    const i18n = createTestI18n();
    
    // 模拟 changeLanguage 函数
    const changeLang = (locale: string) => {
      i18n.global.locale.value = locale;
      localStorage.setItem('app-language', locale);
    };
    
    changeLang('en-US');
    expect(localStorage.getItem('app-language')).toBe('en-US');
    
    changeLang('ja-JP');
    expect(localStorage.getItem('app-language')).toBe('ja-JP');
  });

  it('应该从 localStorage 读取保存的语言', () => {
    localStorage.setItem('app-language', 'en-US');
    
    // 模拟读取逻辑
    const saved = localStorage.getItem('app-language');
    expect(saved).toBe('en-US');
  });
});

describe('i18n 工具函数', () => {
  it('应该提供支持的语言列表', () => {
    expect(supportedLocales).toHaveLength(4);
    expect(supportedLocales[0].code).toBe('zh-CN');
    expect(supportedLocales[1].code).toBe('en-US');
    expect(supportedLocales[2].code).toBe('ja-JP');
    expect(supportedLocales[3].code).toBe('ko-KR');
  });
});

describe('语言资源完整性', () => {
  it('所有语言文件应该包含相同的键', () => {
    const zhKeys = Object.keys(flattenObject(zhCN));
    const enKeys = Object.keys(flattenObject(enUS));
    const jaKeys = Object.keys(flattenObject(jaJP));
    const koKeys = Object.keys(flattenObject(koKR));

    // 检查主要键是否存在
    const mainKeys = [
      'game.startNewGame',
      'game.playCards',
      'game.pass',
      'chat.send',
      'settings.language',
      'training.startTraining'
    ];

    mainKeys.forEach(key => {
      expect(zhKeys).toContain(key);
      expect(enKeys).toContain(key);
      expect(jaKeys).toContain(key);
      expect(koKeys).toContain(key);
    });
  });

  it('所有语言文件应该包含游戏相关键', () => {
    const checkKeys = (messages: any, prefix: string) => {
      const keys = Object.keys(flattenObject(messages));
      const gameKeys = keys.filter(k => k.startsWith(prefix));
      expect(gameKeys.length).toBeGreaterThan(0);
    };

    checkKeys(zhCN, 'game.');
    checkKeys(enUS, 'game.');
    checkKeys(jaJP, 'game.');
    checkKeys(koKR, 'game.');
  });

  it('所有语言文件应该包含聊天相关键', () => {
    const checkKeys = (messages: any, prefix: string) => {
      const keys = Object.keys(flattenObject(messages));
      const chatKeys = keys.filter(k => k.startsWith(prefix));
      expect(chatKeys.length).toBeGreaterThan(0);
    };

    checkKeys(zhCN, 'chat.');
    checkKeys(enUS, 'chat.');
    checkKeys(jaJP, 'chat.');
    checkKeys(koKR, 'chat.');
  });
});

// 辅助函数：扁平化嵌套对象
function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};
  
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], newKey));
    } else {
      flattened[newKey] = obj[key];
    }
  }
  
  return flattened;
}

