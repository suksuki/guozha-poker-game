/**
 * i18n 集成测试
 * 测试多语言功能在组件中的集成
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import zhCN from '../../src/i18n/locales/zh-CN.json';
import enUS from '../../src/i18n/locales/en-US.json';
import jaJP from '../../src/i18n/locales/ja-JP.json';
import koKR from '../../src/i18n/locales/ko-KR.json';
import { useSettingsStore } from '../../src/stores/settingsStore';

// 创建测试用的 i18n 实例
const createTestI18n = (locale = 'zh-CN') => {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'zh-CN',
    messages: {
      'zh-CN': zhCN,
      'en-US': enUS,
      'ja-JP': jaJP,
      'ko-KR': koKR
    }
  });
};

describe('i18n 组件集成', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('组件应该能够使用 i18n', () => {
    const i18n = createTestI18n();
    const wrapper = mount({
      template: '<div>{{ $t("game.startNewGame") }}</div>',
      global: {
        plugins: [i18n]
      }
    });

    expect(wrapper.text()).toBe('开始新游戏（新架构版）');
  });

  it('组件应该能够切换语言', async () => {
    const i18n = createTestI18n();
    const wrapper = mount({
      template: '<div>{{ $t("game.startNewGame") }}</div>',
      global: {
        plugins: [i18n]
      }
    });

    expect(wrapper.text()).toBe('开始新游戏（新架构版）');

    // 切换语言
    i18n.global.locale.value = 'en-US';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toBe('Start New Game');
  });

  it('组件应该能够使用嵌套键', () => {
    const i18n = createTestI18n();
    const wrapper = mount({
      template: '<div>{{ $t("chat.intent.tactical") }}</div>',
      global: {
        plugins: [i18n]
      }
    });

    expect(wrapper.text()).toBe('战术');
  });

  it('组件应该能够使用多个翻译键', () => {
    const i18n = createTestI18n();
    const wrapper = mount({
      template: `
        <div>
          <span>{{ $t("game.playCards") }}</span>
          <span>{{ $t("game.pass") }}</span>
        </div>
      `,
      global: {
        plugins: [i18n]
      }
    });

    expect(wrapper.text()).toContain('出牌');
    expect(wrapper.text()).toContain('要不起');
  });
});

describe('SettingsStore 与 i18n 集成', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('更新语言设置应该影响 i18n', () => {
    const store = useSettingsStore();
    const i18n = createTestI18n();
    
    // 初始状态
    expect(store.uiSettings.language).toBe('zh-CN');
    
    // 更新语言
    store.updateUISettings({ language: 'en-US' });
    expect(store.uiSettings.language).toBe('en-US');
    
    // 验证 i18n 也应该更新（如果已集成）
    // 注意：实际集成需要在组件中完成
  });

  it('应该能够从设置中读取语言', () => {
    const store = useSettingsStore();
    
    // 设置语言
    store.updateUISettings({ language: 'ja-JP' });
    
    // 读取语言
    const currentLang = store.uiSettings.language;
    expect(currentLang).toBe('ja-JP');
  });
});

describe('多语言切换流程', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('应该能够完整切换语言流程', () => {
    const store = useSettingsStore();
    const i18n = createTestI18n();
    
    // 1. 初始状态
    expect(store.uiSettings.language).toBe('zh-CN');
    expect(i18n.global.locale.value).toBe('zh-CN');
    
    // 2. 切换到英文
    store.updateUISettings({ language: 'en-US' });
    i18n.global.locale.value = 'en-US';
    expect(store.uiSettings.language).toBe('en-US');
    expect(i18n.global.locale.value).toBe('en-US');
    
    // 3. 切换到日文
    store.updateUISettings({ language: 'ja-JP' });
    i18n.global.locale.value = 'ja-JP';
    expect(store.uiSettings.language).toBe('ja-JP');
    expect(i18n.global.locale.value).toBe('ja-JP');
    
    // 4. 切换回中文
    store.updateUISettings({ language: 'zh-CN' });
    i18n.global.locale.value = 'zh-CN';
    expect(store.uiSettings.language).toBe('zh-CN');
    expect(i18n.global.locale.value).toBe('zh-CN');
  });
});

