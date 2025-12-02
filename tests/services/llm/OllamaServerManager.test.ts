/**
 * OllamaServerManager 测试
 * 测试服务器配置管理功能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OllamaServerManager, OllamaServerConfig } from '../../../src/services/llm/OllamaServerManager';

describe('OllamaServerManager', () => {
  let manager: OllamaServerManager;
  const STORAGE_KEY = 'ollama_servers';

  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear();
    // 创建新实例
    manager = new OllamaServerManager();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('初始化', () => {
    it('应该加载预设的本地服务器', () => {
      const servers = manager.getAllServers();
      expect(servers.length).toBeGreaterThan(0);
      
      const localServer = servers.find(s => s.id === 'local');
      expect(localServer).toBeDefined();
      expect(localServer?.host).toBe('localhost');
      expect(localServer?.port).toBe(11434);
    });

    it('应该将本地服务器设为默认当前服务器', () => {
      const currentServer = manager.getCurrentServer();
      expect(currentServer.id).toBe('local');
    });
  });

  describe('添加服务器', () => {
    it('应该能添加新的服务器', () => {
      const newServer = manager.addServer({
        name: '测试服务器',
        host: '192.168.0.13',
        port: 11434,
        protocol: 'http'
      });

      expect(newServer.id).toBeDefined();
      expect(newServer.name).toBe('测试服务器');
      expect(newServer.host).toBe('192.168.0.13');
      expect(newServer.lastUsed).toBeDefined();

      const servers = manager.getAllServers();
      expect(servers.length).toBeGreaterThan(1);
    });

    it('应该自动生成服务器名称', () => {
      const newServer = manager.addServer({
        host: '192.168.1.100',
        port: 8080
      });

      expect(newServer.name).toBe('192.168.1.100:8080');
    });

    it('添加的服务器应该持久化到 localStorage', () => {
      manager.addServer({
        name: '持久化测试',
        host: '10.0.0.1',
        port: 11434
      });

      // 创建新实例（模拟重启）
      const newManager = new OllamaServerManager();
      const servers = newManager.getAllServers();
      
      const persistedServer = servers.find(s => s.name === '持久化测试');
      expect(persistedServer).toBeDefined();
      expect(persistedServer?.host).toBe('10.0.0.1');
    });
  });

  describe('删除服务器', () => {
    it('应该能删除自定义服务器', () => {
      const newServer = manager.addServer({
        host: '192.168.0.13',
        port: 11434
      });

      const result = manager.removeServer(newServer.id);
      expect(result).toBe(true);

      const servers = manager.getAllServers();
      const deletedServer = servers.find(s => s.id === newServer.id);
      expect(deletedServer).toBeUndefined();
    });

    it('不应该能删除本地服务器', () => {
      const result = manager.removeServer('local');
      expect(result).toBe(false);

      const servers = manager.getAllServers();
      const localServer = servers.find(s => s.id === 'local');
      expect(localServer).toBeDefined();
    });

    it('删除当前服务器应自动切换到本地', () => {
      const newServer = manager.addServer({
        host: '192.168.0.13',
        port: 11434
      });

      manager.setCurrentServer(newServer.id);
      expect(manager.getCurrentServer().id).toBe(newServer.id);

      manager.removeServer(newServer.id);
      expect(manager.getCurrentServer().id).toBe('local');
    });
  });

  describe('切换服务器', () => {
    it('应该能切换到存在的服务器', () => {
      const newServer = manager.addServer({
        host: '192.168.0.13',
        port: 11434
      });

      const result = manager.setCurrentServer(newServer.id);
      expect(result).toBe(true);
      expect(manager.getCurrentServer().id).toBe(newServer.id);
    });

    it('切换服务器应更新最后使用时间', () => {
      const newServer = manager.addServer({
        host: '192.168.0.13',
        port: 11434
      });

      const beforeTime = Date.now();
      manager.setCurrentServer(newServer.id);
      const afterTime = Date.now();

      const server = manager.getAllServers().find(s => s.id === newServer.id);
      expect(server?.lastUsed).toBeDefined();
      expect(server!.lastUsed!).toBeGreaterThanOrEqual(beforeTime);
      expect(server!.lastUsed!).toBeLessThanOrEqual(afterTime);
    });

    it('切换到不存在的服务器应失败', () => {
      const result = manager.setCurrentServer('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('收藏功能', () => {
    it('应该能收藏/取消收藏服务器', () => {
      const newServer = manager.addServer({
        host: '192.168.0.13',
        port: 11434,
        isFavorite: false
      });

      expect(newServer.isFavorite).toBe(false);

      manager.toggleFavorite(newServer.id);
      let server = manager.getAllServers().find(s => s.id === newServer.id);
      expect(server?.isFavorite).toBe(true);

      manager.toggleFavorite(newServer.id);
      server = manager.getAllServers().find(s => s.id === newServer.id);
      expect(server?.isFavorite).toBe(false);
    });

    it('应该能获取收藏的服务器列表', () => {
      manager.addServer({
        name: '收藏1',
        host: '192.168.0.1',
        port: 11434,
        isFavorite: true
      });

      manager.addServer({
        name: '收藏2',
        host: '192.168.0.2',
        port: 11434,
        isFavorite: true
      });

      manager.addServer({
        name: '未收藏',
        host: '192.168.0.3',
        port: 11434,
        isFavorite: false
      });

      const favorites = manager.getFavoriteServers();
      expect(favorites.length).toBeGreaterThanOrEqual(2);
      expect(favorites.every(s => s.isFavorite)).toBe(true);
    });
  });

  describe('最近使用', () => {
    it('应该按最后使用时间排序', async () => {
      const server1 = manager.addServer({
        name: '服务器1',
        host: '192.168.0.1',
        port: 11434
      });

      // 等待1毫秒确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));

      const server2 = manager.addServer({
        name: '服务器2',
        host: '192.168.0.2',
        port: 11434
      });

      manager.setCurrentServer(server1.id);
      await new Promise(resolve => setTimeout(resolve, 10));
      manager.setCurrentServer(server2.id);

      const recent = manager.getRecentServers(5);
      expect(recent[0].id).toBe(server2.id);
      expect(recent[1].id).toBe(server1.id);
    });

    it('应该限制返回的数量', () => {
      for (let i = 0; i < 10; i++) {
        manager.addServer({
          host: `192.168.0.${i}`,
          port: 11434
        });
      }

      const recent = manager.getRecentServers(3);
      expect(recent.length).toBeLessThanOrEqual(3);
    });
  });

  describe('URL 生成', () => {
    it('应该正确生成服务器 URL', () => {
      const server: OllamaServerConfig = {
        id: 'test',
        name: '测试',
        host: '192.168.0.13',
        port: 11434,
        protocol: 'http',
        isFavorite: false
      };

      const url = manager.getServerUrl(server);
      expect(url).toBe('http://192.168.0.13:11434');
    });

    it('应该正确生成 API URL', () => {
      const server: OllamaServerConfig = {
        id: 'test',
        name: '测试',
        host: '192.168.0.13',
        port: 11434,
        protocol: 'http',
        isFavorite: false
      };

      const apiUrl = manager.getServerApiUrl(server);
      expect(apiUrl).toBe('http://192.168.0.13:11434/api/chat');
    });

    it('应该正确生成 Tags URL', () => {
      const server: OllamaServerConfig = {
        id: 'test',
        name: '测试',
        host: '192.168.0.13',
        port: 11434,
        protocol: 'http',
        isFavorite: false
      };

      const tagsUrl = manager.getServerTagsUrl(server);
      expect(tagsUrl).toBe('http://192.168.0.13:11434/api/tags');
    });

    it('应该支持 HTTPS 协议', () => {
      const server: OllamaServerConfig = {
        id: 'test',
        name: '测试',
        host: 'ollama.example.com',
        port: 443,
        protocol: 'https',
        isFavorite: false
      };

      const url = manager.getServerUrl(server);
      expect(url).toBe('https://ollama.example.com:443');
    });
  });

  describe('地址解析', () => {
    it('应该解析简单 IP 地址', () => {
      const result = OllamaServerManager.parseServerAddress('192.168.0.13');
      expect(result.protocol).toBe('http');
      expect(result.host).toBe('192.168.0.13');
      expect(result.port).toBe(11434);
    });

    it('应该解析 IP:端口 格式', () => {
      const result = OllamaServerManager.parseServerAddress('192.168.0.13:8080');
      expect(result.protocol).toBe('http');
      expect(result.host).toBe('192.168.0.13');
      expect(result.port).toBe(8080);
    });

    it('应该解析域名', () => {
      const result = OllamaServerManager.parseServerAddress('ollama.example.com');
      expect(result.protocol).toBe('http');
      expect(result.host).toBe('ollama.example.com');
      expect(result.port).toBe(11434);
    });

    it('应该解析完整 HTTP URL', () => {
      const result = OllamaServerManager.parseServerAddress('http://192.168.0.13:11434');
      expect(result.protocol).toBe('http');
      expect(result.host).toBe('192.168.0.13');
      expect(result.port).toBe(11434);
    });

    it('应该解析完整 HTTPS URL', () => {
      const result = OllamaServerManager.parseServerAddress('https://ollama.example.com:443');
      expect(result.protocol).toBe('https');
      expect(result.host).toBe('ollama.example.com');
      expect(result.port).toBe(443);
    });
  });

  describe('状态更新', () => {
    it('应该能更新服务器状态', () => {
      const server = manager.addServer({
        host: '192.168.0.13',
        port: 11434
      });

      manager.updateServerStatus(server.id, {
        available: true,
        latency: 45
      });

      const updatedServer = manager.getAllServers().find(s => s.id === server.id);
      expect(updatedServer?.lastCheckStatus).toBe('available');
      expect(updatedServer?.latency).toBe(45);
      expect(updatedServer?.lastCheckTime).toBeDefined();
    });

    it('应该能标记服务器不可用', () => {
      const server = manager.addServer({
        host: '192.168.0.13',
        port: 11434
      });

      manager.updateServerStatus(server.id, {
        available: false,
        error: 'Connection timeout'
      });

      const updatedServer = manager.getAllServers().find(s => s.id === server.id);
      expect(updatedServer?.lastCheckStatus).toBe('unavailable');
    });
  });
});

