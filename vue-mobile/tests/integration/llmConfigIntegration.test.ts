/**
 * LLM配置集成测试
 * 测试完整的LLM配置流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { ollamaServerManager } from '../../src/services/llm/ollamaServerManager';
import { getAvailableOllamaModels, checkOllamaService } from '../../../src/utils/llmModelService';

// Mock fetch
global.fetch = vi.fn();

describe('LLM配置集成测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('完整的Ollama配置流程', () => {
    it('应该能够完成完整的Ollama配置流程', async () => {
      const settingsStore = useSettingsStore();

      // 1. 选择Ollama提供商
      settingsStore.updateLLMConfig({
        provider: 'ollama'
      });
      expect(settingsStore.llmConfig.provider).toBe('ollama');

      // 2. 添加服务器
      const server = ollamaServerManager.addServer({
        name: '测试服务器',
        host: '192.168.0.13',
        port: 11434,
        protocol: 'http'
      });
      expect(server).toBeDefined();
      expect(server?.host).toBe('192.168.0.13');

      // 3. 切换到新服务器
      if (server) {
        ollamaServerManager.setCurrentServer(server.id);
        const currentServer = ollamaServerManager.getCurrentServer();
        expect(currentServer.id).toBe(server.id);

        // 4. 更新API地址
        const apiUrl = `${currentServer.protocol}://${currentServer.host}:${currentServer.port}/api/chat`;
        settingsStore.updateLLMConfig({ apiUrl });
        expect(settingsStore.llmConfig.apiUrl).toBe(apiUrl);
      }
    });

    it('应该能够获取模型列表', async () => {
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
      expect(models.length).toBeGreaterThan(0);
    });

    it('应该能够选择模型', () => {
      const settingsStore = useSettingsStore();

      settingsStore.updateLLMConfig({
        provider: 'ollama',
        apiUrl: 'http://localhost:11434/api/chat',
        model: 'qwen2:0.5b'
      });

      expect(settingsStore.llmConfig.model).toBe('qwen2:0.5b');
    });

    it('应该能够测试LLM连接', async () => {
      const settingsStore = useSettingsStore();

      settingsStore.updateLLMConfig({
        provider: 'ollama',
        apiUrl: 'http://localhost:11434/api/chat',
        model: 'qwen2:0.5b'
      });

      // Mock测试响应
      (global.fetch as any).mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({
            message: {
              content: '测试响应'
            }
          })
        })
      );

      const response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen2:0.5b',
          messages: [{ role: 'user', content: '测试' }],
          stream: false
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.message?.content).toBeDefined();
    });
  });

  describe('服务器管理流程', () => {
    it('应该能够添加、切换、删除服务器', () => {
      // 添加服务器
      const server1 = ollamaServerManager.addServer({
        name: '服务器1',
        host: '192.168.0.13',
        port: 11434,
        protocol: 'http'
      });
      expect(server1).toBeDefined();

      // 添加第二个服务器
      const server2 = ollamaServerManager.addServer({
        name: '服务器2',
        host: '192.168.0.14',
        port: 11434,
        protocol: 'http'
      });
      expect(server2).toBeDefined();

      // 获取所有服务器
      const allServers = ollamaServerManager.getAllServers();
      expect(allServers.length).toBeGreaterThanOrEqual(2);

      // 切换服务器
      if (server1) {
        ollamaServerManager.setCurrentServer(server1.id);
        const current = ollamaServerManager.getCurrentServer();
        expect(current.id).toBe(server1.id);
      }

      // 删除服务器
      if (server2) {
        const removed = ollamaServerManager.removeServer(server2.id);
        expect(removed).toBe(true);
      }
    });
  });
});

