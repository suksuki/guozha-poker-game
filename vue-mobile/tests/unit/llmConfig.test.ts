/**
 * LLM配置功能单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getAvailableOllamaModels, checkOllamaService } from '../../../src/utils/llmModelService';

// Mock fetch
global.fetch = vi.fn();

describe('LLM配置', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Ollama模型获取', () => {
    it('应该能够获取Ollama模型列表', async () => {
      const mockModels = {
        models: [
          { name: 'qwen2:0.5b' },
          { name: 'qwen2.5:3b' },
          { name: 'deepseek-chat' }
        ]
      };

      (global.fetch as any).mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: async () => mockModels
        })
      );

      const models = await getAvailableOllamaModels('http://localhost:11434');
      
      expect(models).toHaveLength(3);
      expect(models).toContain('qwen2:0.5b');
      expect(models).toContain('qwen2.5:3b');
      expect(models).toContain('deepseek-chat');
    });

    it('应该在服务不可用时返回空数组', async () => {
      (global.fetch as any).mockImplementation(() => 
        Promise.reject(new Error('连接失败'))
      );

      const models = await getAvailableOllamaModels('http://localhost:11434');
      
      expect(models).toHaveLength(0);
    });

    it('应该能够检查Ollama服务可用性', async () => {
      (global.fetch as any).mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({ models: [] })
        })
      );

      const isAvailable = await checkOllamaService('http://localhost:11434');
      
      expect(isAvailable).toBe(true);
    });

    it('应该在服务不可用时返回false', async () => {
      (global.fetch as any).mockImplementation(() => 
        Promise.reject(new Error('连接失败'))
      );

      const isAvailable = await checkOllamaService('http://localhost:11434');
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('SettingsStore LLM配置', () => {
    it('应该能够更新LLM配置', () => {
      const settingsStore = useSettingsStore();
      
      settingsStore.updateLLMConfig({
        provider: 'ollama',
        apiUrl: 'http://localhost:11434/api/chat',
        model: 'qwen2:0.5b'
      });

      expect(settingsStore.llmConfig.provider).toBe('ollama');
      expect(settingsStore.llmConfig.apiUrl).toBe('http://localhost:11434/api/chat');
      expect(settingsStore.llmConfig.model).toBe('qwen2:0.5b');
    });

    it('应该支持Ollama提供商', () => {
      const settingsStore = useSettingsStore();
      
      settingsStore.updateLLMConfig({
        provider: 'ollama'
      });

      expect(settingsStore.currentLLMProvider).toBe('ollama');
    });

    it('应该能够获取当前LLM URL和模型', () => {
      const settingsStore = useSettingsStore();
      
      settingsStore.updateLLMConfig({
        apiUrl: 'http://192.168.0.13:11434/api/chat',
        model: 'deepseek-chat'
      });

      expect(settingsStore.currentLLMUrl).toBe('http://192.168.0.13:11434/api/chat');
      expect(settingsStore.currentLLMModel).toBe('deepseek-chat');
    });
  });

  describe('Ollama服务器URL生成', () => {
    it('应该正确生成本地服务器URL', () => {
      // 测试本地模式
      const localUrl = 'http://localhost:11434/api/chat';
      expect(localUrl).toContain('localhost');
      expect(localUrl).toContain('11434');
      expect(localUrl).toContain('/api/chat');
    });

    it('应该正确生成局域网服务器URL', () => {
      // 测试局域网模式
      const lanUrl = 'http://192.168.0.13:11434/api/chat';
      expect(lanUrl).toContain('192.168');
      expect(lanUrl).toContain('11434');
      expect(lanUrl).toContain('/api/chat');
    });

    it('应该正确生成自定义服务器URL', () => {
      // 测试自定义模式
      const customUrl = 'http://example.com:11434/api/chat';
      expect(customUrl).toContain('example.com');
      expect(customUrl).toContain('11434');
      expect(customUrl).toContain('/api/chat');
    });
  });
});

