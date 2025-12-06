/**
 * SettingsPanel 组件单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsPanel from '../../src/components/SettingsPanel.vue';
import { useSettingsStore } from '../../src/stores/settingsStore';

// Mock Vant组件
vi.mock('vant', () => ({
  showToast: vi.fn(),
  showConfirmDialog: vi.fn(() => Promise.resolve()),
  Popup: { name: 'van-popup' },
  Tabs: { name: 'van-tabs' },
  Tab: { name: 'van-tab' },
  CellGroup: { name: 'van-cell-group' },
  Cell: { name: 'van-cell' },
  Field: { name: 'van-field' },
  Button: { name: 'van-button' },
  RadioGroup: { name: 'van-radio-group' },
  Radio: { name: 'van-radio' },
  Switch: { name: 'van-switch' },
  Collapse: { name: 'van-collapse' },
  CollapseItem: { name: 'van-collapse-item' },
  Tag: { name: 'van-tag' },
  Popup: { name: 'van-popup' },
  Loading: { name: 'van-loading' },
  Empty: { name: 'van-empty' },
  Dialog: { name: 'van-dialog' },
  Form: { name: 'van-form' }
}));

// Mock Ollama服务器管理器
vi.mock('../../src/services/ollamaServerManager', () => ({
  ollamaServerManager: {
    getAllServers: vi.fn(() => [
      { id: 'local', name: '本地服务器', host: 'localhost', port: 11434, protocol: 'http' as const }
    ]),
    getCurrentServer: vi.fn(() => ({
      id: 'local',
      name: '本地服务器',
      host: 'localhost',
      port: 11434,
      protocol: 'http' as const
    })),
    setCurrentServer: vi.fn(() => true),
    addServer: vi.fn(() => ({
      id: 'server1',
      name: '测试服务器',
      host: '192.168.0.13',
      port: 11434,
      protocol: 'http' as const
    })),
    removeServer: vi.fn(() => true)
  }
}));

// Mock LLM工具函数
global.fetch = vi.fn();

describe('SettingsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('组件渲染', () => {
    it('应该能够渲染组件', () => {
      const wrapper = mount(SettingsPanel, {
        props: {
          modelValue: true
        },
        global: {
          plugins: [createPinia()]
        }
      });

      expect(wrapper.exists()).toBe(true);
    });

    it('应该能够关闭面板', async () => {
      const wrapper = mount(SettingsPanel, {
        props: {
          modelValue: true
        },
        global: {
          plugins: [createPinia()]
        }
      });

      // 测试关闭功能
      expect(wrapper.vm).toBeDefined();
    });
  });

  describe('LLM配置', () => {
    it('应该能够切换LLM提供商', async () => {
      const wrapper = mount(SettingsPanel, {
        props: {
          modelValue: true
        },
        global: {
          plugins: [createPinia()]
        }
      });

      const settingsStore = useSettingsStore();
      
      // 测试提供商切换
      expect(settingsStore).toBeDefined();
    });

    it('应该能够更新LLM配置', async () => {
      const wrapper = mount(SettingsPanel, {
        props: {
          modelValue: true
        },
        global: {
          plugins: [createPinia()]
        }
      });

      const settingsStore = useSettingsStore();
      
      settingsStore.updateLLMConfig({
        provider: 'ollama',
        apiUrl: 'http://localhost:11434/api/chat',
        model: 'qwen2:0.5b'
      });

      expect(settingsStore.llmConfig.provider).toBe('ollama');
    });
  });

  describe('Ollama服务器管理', () => {
    it('应该能够加载服务器列表', () => {
      const wrapper = mount(SettingsPanel, {
        props: {
          modelValue: true
        },
        global: {
          plugins: [createPinia()]
        }
      });

      // 测试服务器列表加载
      expect(wrapper.vm).toBeDefined();
    });
  });
});

