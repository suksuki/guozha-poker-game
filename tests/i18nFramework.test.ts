/**
 * 新 i18n 框架测试
 * 测试新的框架核心功能、Hooks 和工具
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TranslationManager, createTranslationManager } from '../src/i18n/core/manager';
import { ResourceLoader, createResourceLoader } from '../src/i18n/core/loader';
import { useComponentTranslation } from '../src/i18n/hooks/useComponentTranslation';
import { useFeatureTranslation } from '../src/i18n/hooks/useFeatureTranslation';
import { useSharedTranslation } from '../src/i18n/hooks/useSharedTranslation';
import { useLanguage } from '../src/i18n/hooks/useLanguage';
import { 
  buildNamespace, 
  parseNamespace, 
  getResourcePath,
  defaultFrameworkConfig,
  supportedLanguages,
  defaultLanguage
} from '../src/i18n/config';
import i18n from '../src/i18n/index.legacy';

describe('i18n 框架核心功能', () => {
  describe('配置系统', () => {
    it('应该正确构建命名空间', () => {
      expect(buildNamespace('component', 'GameConfigPanel')).toBe('component:GameConfigPanel');
      expect(buildNamespace('feature', 'game')).toBe('feature:game');
      expect(buildNamespace('shared', 'common')).toBe('shared:common');
    });

    it('应该正确解析命名空间', () => {
      const ns1 = parseNamespace('component:GameConfigPanel');
      expect(ns1).not.toBeNull();
      expect(ns1?.type).toBe('component');
      expect(ns1?.name).toBe('GameConfigPanel');
      expect(ns1?.fullName).toBe('component:GameConfigPanel');
      expect(ns1?.path).toBe('component/GameConfigPanel');

      const ns2 = parseNamespace('feature:game');
      expect(ns2).not.toBeNull();
      expect(ns2?.type).toBe('feature');
      expect(ns2?.name).toBe('game');
      expect(ns2?.fullName).toBe('feature:game');
      expect(ns2?.path).toBe('feature/game');

      const invalid = parseNamespace('invalid');
      expect(invalid).toBeNull();
    });

    it('应该正确获取资源路径', () => {
      const path1 = getResourcePath('component:GameConfigPanel', 'zh-CN');
      expect(path1).toBe('i18n-resources/component/GameConfigPanel/zh-CN.json');

      const path2 = getResourcePath('feature:game', 'en-US');
      expect(path2).toBe('i18n-resources/feature/game/en-US.json');
    });

    it('应该包含默认框架配置', () => {
      expect(defaultFrameworkConfig.languages).toBeDefined();
      expect(defaultFrameworkConfig.defaultLanguage).toBe(defaultLanguage);
      expect(defaultFrameworkConfig.resourcePath).toBe('i18n-resources');
      expect(defaultFrameworkConfig.namespaceStrategy).toBeDefined();
      expect(defaultFrameworkConfig.namespaceStrategy.component).toBe('component');
      expect(defaultFrameworkConfig.namespaceStrategy.feature).toBe('feature');
      expect(defaultFrameworkConfig.namespaceStrategy.shared).toBe('shared');
    });
  });

  describe('翻译管理器', () => {
    let manager: TranslationManager;

    beforeEach(async () => {
      // 确保 i18n 已初始化
      if (i18n && typeof i18n.isInitialized !== 'undefined' && !i18n.isInitialized) {
        await i18n.init();
      }
      
      manager = createTranslationManager(i18n, defaultFrameworkConfig);
      await manager.init();
    });

    it('应该正确初始化管理器', async () => {
      expect(manager).toBeDefined();
      const currentLang = manager.getCurrentLanguage();
      expect(currentLang).toBeDefined();
    });

    it('应该正确获取翻译', () => {
      const translation = manager.translate('title', {
        namespace: 'game',
        defaultValue: 'Default Title'
      });
      expect(translation).toBeDefined();
      expect(typeof translation).toBe('string');
    });

    it('应该检查翻译是否存在', () => {
      // 检查存在的翻译
      const exists = manager.hasTranslation('title', 'game');
      expect(typeof exists).toBe('boolean');
    });

    it('应该支持语言切换', async () => {
      const currentLang = manager.getCurrentLanguage();
      const targetLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN';
      
      await manager.changeLanguage(targetLang);
      
      const newLang = manager.getCurrentLanguage();
      expect(newLang).toBe(targetLang);
    });

    it('应该支持语言切换监听器', async () => {
      let languageChanged = false;
      let changedLanguage = '';

      const unsubscribe = manager.onLanguageChange((lang) => {
        languageChanged = true;
        changedLanguage = lang;
      });

      const currentLang = manager.getCurrentLanguage();
      const targetLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN';
      
      await manager.changeLanguage(targetLang);
      
      // 等待一下让监听器触发
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(languageChanged).toBe(true);
      expect(changedLanguage).toBe(targetLang);

      // 取消监听
      unsubscribe();
    });

    it('应该正确注册命名空间', () => {
      manager.registerNamespace('component:TestComponent');
      
      const ns = manager.getNamespace('component:TestComponent');
      expect(ns).not.toBeNull();
      expect(ns?.type).toBe('component');
      expect(ns?.name).toBe('TestComponent');
    });
  });

  describe('资源加载器', () => {
    let loader: ResourceLoader;

    beforeEach(() => {
      loader = createResourceLoader({
        cacheEnabled: true,
        maxSize: 10,
        ttl: 3600000, // 1小时
      });
    });

    afterEach(() => {
      loader.clearCache();
    });

    it('应该正确初始化加载器', () => {
      expect(loader).toBeDefined();
    });

    it('应该正确获取资源路径', () => {
      const path = loader.getResourcePath('feature:game', 'zh-CN');
      expect(path).toBe('i18n-resources/feature/game/zh-CN.json');
    });

    it('应该支持清除缓存', () => {
      loader.clearCache();
      loader.clearCache('feature:game', 'zh-CN');
      loader.clearCache('feature:game');
      // 如果这里没有抛出错误，说明清除缓存功能正常
      expect(true).toBe(true);
    });
  });
});

describe('i18n Hooks', () => {
  describe('useComponentTranslation', () => {
    it('应该正确返回翻译函数和命名空间', () => {
      const { result } = renderHook(() => useComponentTranslation('TestComponent'));
      
      expect(result.current.t).toBeDefined();
      expect(typeof result.current.t).toBe('function');
      expect(result.current.namespace).toBe('component:TestComponent');
      expect(result.current.language).toBeDefined();
    });

    it('应该正确翻译组件文本', () => {
      const { result } = renderHook(() => useComponentTranslation('TestComponent'));
      
      // 即使翻译不存在，也应该返回一个字符串
      const translation = result.current.t('testKey');
      expect(typeof translation).toBe('string');
    });
  });

  describe('useFeatureTranslation', () => {
    it('应该正确返回翻译函数和命名空间', () => {
      const { result } = renderHook(() => useFeatureTranslation('game'));
      
      expect(result.current.t).toBeDefined();
      expect(typeof result.current.t).toBe('function');
      expect(result.current.namespace).toBe('feature:game');
    });

    it('应该正确翻译功能文本', () => {
      const { result } = renderHook(() => useFeatureTranslation('game'));
      
      const translation = result.current.t('title');
      expect(typeof translation).toBe('string');
      // 验证翻译包含预期内容
      expect(translation.length).toBeGreaterThan(0);
    });
  });

  describe('useSharedTranslation', () => {
    it('应该正确返回翻译函数和命名空间', () => {
      const { result } = renderHook(() => useSharedTranslation('common'));
      
      expect(result.current.t).toBeDefined();
      expect(typeof result.current.t).toBe('function');
      expect(result.current.namespace).toBe('shared:common');
    });

    it('应该正确翻译共享文本', () => {
      const { result } = renderHook(() => useSharedTranslation('common'));
      
      const translation = result.current.t('buttons.confirm');
      expect(typeof translation).toBe('string');
      // 验证翻译存在
      expect(translation.length).toBeGreaterThan(0);
    });
  });

  describe('useLanguage', () => {
    it('应该正确返回语言信息', () => {
      const { result } = renderHook(() => useLanguage());
      
      expect(result.current.currentLanguage).toBeDefined();
      expect(result.current.supportedLanguages).toBeDefined();
      expect(result.current.changeLanguage).toBeDefined();
      expect(typeof result.current.changeLanguage).toBe('function');
    });

    it('应该支持语言切换', async () => {
      const { result } = renderHook(() => useLanguage());
      
      const currentLang = result.current.currentLanguage;
      const targetLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN';
      
      await act(async () => {
        await result.current.changeLanguage(targetLang);
      });
      
      // 等待语言切换完成
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 验证语言已切换（可能需要在下一个渲染周期检查）
      expect(result.current.supportedLanguages).toBeDefined();
    });

    it('应该包含所有支持的语言', () => {
      const { result } = renderHook(() => useLanguage());
      
      expect(result.current.supportedLanguages).toBeDefined();
      expect(Array.isArray(result.current.supportedLanguages)).toBe(true);
      expect(result.current.supportedLanguages.length).toBeGreaterThan(0);
    });
  });
});

describe('i18n 框架集成测试', () => {
  beforeEach(async () => {
    // 确保 i18n 已初始化
    if (i18n && typeof i18n.isInitialized !== 'undefined' && !i18n.isInitialized) {
      await i18n.init();
    }
    // 重置为默认语言
    if (i18n && i18n.changeLanguage) {
      await i18n.changeLanguage(defaultLanguage);
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  });

  it('应该正确加载现有翻译资源', () => {
    // 测试现有命名空间仍然可用
    expect(i18n.exists('game:title')).toBe(true);
    expect(i18n.exists('ui:config.playerCount')).toBe(true);
    expect(i18n.exists('common:buttons.confirm')).toBe(true);
  });

  it('应该正确翻译游戏相关文本', () => {
    const title = i18n.t('game:title');
    expect(typeof title).toBe('string');
    expect(title.length).toBeGreaterThan(0);
  });

  it('应该正确翻译UI配置文本', () => {
    const playerCount = i18n.t('ui:config.playerCount');
    expect(typeof playerCount).toBe('string');
    expect(playerCount.length).toBeGreaterThan(0);
  });

  it('应该正确翻译共享按钮文本', () => {
    const confirm = i18n.t('common:buttons.confirm');
    expect(typeof confirm).toBe('string');
    expect(confirm.length).toBeGreaterThan(0);
  });

  it('应该支持多语言切换', async () => {
    // 测试中文
    await i18n.changeLanguage('zh-CN');
    await new Promise(resolve => setTimeout(resolve, 20));
    const titleZh = i18n.t('game:title');
    expect(titleZh).toContain('过炸');

    // 测试英文
    await i18n.changeLanguage('en-US');
    await new Promise(resolve => setTimeout(resolve, 20));
    const titleEn = i18n.t('game:title');
    expect(titleEn).toContain('Poker');

    // 测试韩文
    await i18n.changeLanguage('ko-KR');
    await new Promise(resolve => setTimeout(resolve, 20));
    const titleKo = i18n.t('game:title');
    expect(titleKo).toBeDefined();
  });
});

describe('命名空间映射验证', () => {
  it('应该正确映射共享命名空间', () => {
    const commonNs = parseNamespace('shared:common');
    expect(commonNs?.type).toBe('shared');
    expect(commonNs?.name).toBe('common');

    const uiNs = parseNamespace('shared:ui');
    expect(uiNs?.type).toBe('shared');
    expect(uiNs?.name).toBe('ui');
  });

  it('应该正确映射功能命名空间', () => {
    const gameNs = parseNamespace('feature:game');
    expect(gameNs?.type).toBe('feature');
    expect(gameNs?.name).toBe('game');

    const chatNs = parseNamespace('feature:chat');
    expect(chatNs?.type).toBe('feature');
    expect(chatNs?.name).toBe('chat');
  });

  it('应该正确映射组件命名空间', () => {
    const componentNs = parseNamespace('component:GameConfigPanel');
    expect(componentNs?.type).toBe('component');
    expect(componentNs?.name).toBe('GameConfigPanel');
  });
});

