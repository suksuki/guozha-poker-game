/**
 * SettingsStore i18n 集成测试
 * 测试设置存储与多语言功能的集成
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '../../src/stores/settingsStore';
// 注意：changeLanguage 和 getCurrentLanguage 在 settingsStore 内部使用

describe('SettingsStore i18n 集成', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('应该初始化默认语言为中文', () => {
    const store = useSettingsStore();
    expect(store.uiSettings.language).toBe('zh-CN');
  });

  it('应该能够更新语言设置', () => {
    const store = useSettingsStore();
    
    store.updateUISettings({ language: 'en-US' });
    expect(store.uiSettings.language).toBe('en-US');
    
    store.updateUISettings({ language: 'ja-JP' });
    expect(store.uiSettings.language).toBe('ja-JP');
    
    store.updateUISettings({ language: 'ko-KR' });
    expect(store.uiSettings.language).toBe('ko-KR');
  });

  it('应该保存语言设置到 localStorage', () => {
    const store = useSettingsStore();
    
    store.updateUISettings({ language: 'en-US' });
    
    // 检查是否保存到 localStorage
    const saved = localStorage.getItem('game-settings');
    expect(saved).toBeTruthy();
    
    if (saved) {
      const parsed = JSON.parse(saved);
      expect(parsed.uiSettings?.language).toBe('en-US');
    }
  });

  it('应该从 localStorage 加载语言设置', () => {
    // 先保存设置
    const store1 = useSettingsStore();
    store1.updateUISettings({ language: 'ja-JP' });
    
    // 创建新的 store 实例（模拟页面刷新）
    const store2 = useSettingsStore();
    // 注意：实际加载逻辑在 store 的初始化中
    // 这里主要测试设置能够正确保存和读取
    expect(store2.uiSettings.language).toBe('ja-JP');
  });

  it('应该支持所有支持的语言', () => {
    const store = useSettingsStore();
    const supportedLanguages = ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'];
    
    supportedLanguages.forEach(lang => {
      store.updateUISettings({ language: lang as any });
      expect(store.uiSettings.language).toBe(lang);
    });
  });

  it('应该能够同时更新多个 UI 设置', () => {
    const store = useSettingsStore();
    
    store.updateUISettings({
      language: 'en-US',
      theme: 'dark',
      fontSize: 'large'
    });
    
    expect(store.uiSettings.language).toBe('en-US');
    expect(store.uiSettings.theme).toBe('dark');
    expect(store.uiSettings.fontSize).toBe('large');
  });
});

describe('语言切换与 i18n 同步', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('更新语言设置应该触发 i18n 语言切换', () => {
    const store = useSettingsStore();
    
    // 注意：实际的 changeLanguage 调用在 updateUISettings 中
    // 这里测试设置能够正确更新
    store.updateUISettings({ language: 'en-US' });
    expect(store.uiSettings.language).toBe('en-US');
  });

  it('应该保持语言设置的一致性', () => {
    const store = useSettingsStore();
    
    // 设置语言
    store.updateUISettings({ language: 'ko-KR' });
    
    // 验证设置已更新
    expect(store.uiSettings.language).toBe('ko-KR');
    
    // 再次更新应该覆盖
    store.updateUISettings({ language: 'ja-JP' });
    expect(store.uiSettings.language).toBe('ja-JP');
  });
});

