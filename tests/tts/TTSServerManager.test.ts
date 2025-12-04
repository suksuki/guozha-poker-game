/**
 * TTSServerManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TTSServerManager } from '../../src/tts/manager/TTSServerManager';
import { TTSServerConfig, createDefaultServerConfig } from '../../src/tts/models/TTSServerConfig';
import { DEFAULT_GLOBAL_SETTINGS } from '../../src/tts/models/TTSGlobalSettings';

describe('TTSServerManager', () => {
  let manager: TTSServerManager;

  beforeEach(() => {
    manager = new TTSServerManager(DEFAULT_GLOBAL_SETTINGS);
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('服务器管理', () => {
    it('应该能够添加服务器', () => {
      const config = createDefaultServerConfig('piper', '测试Piper');
      const id = manager.addServer(config);

      expect(id).toBeTruthy();
      expect(manager.getServer(id)).toBeTruthy();
      expect(manager.getServer(id)?.name).toBe('测试Piper');
    });

    it('应该能够更新服务器', () => {
      const config = createDefaultServerConfig('piper');
      const id = manager.addServer(config);

      manager.updateServer(id, { name: '更新后的名称' });
      
      const updated = manager.getServer(id);
      expect(updated?.name).toBe('更新后的名称');
    });

    it('应该能够删除服务器', () => {
      const config = createDefaultServerConfig('piper');
      const id = manager.addServer(config);

      manager.removeServer(id);
      
      expect(manager.getServer(id)).toBeUndefined();
    });

    it('应该能够获取所有服务器', () => {
      const config1 = createDefaultServerConfig('piper', 'Piper 1');
      const config2 = createDefaultServerConfig('azure', 'Azure 1');
      
      manager.addServer(config1);
      manager.addServer(config2);

      const allServers = manager.getAllServers();
      expect(allServers).toHaveLength(2);
    });

    it('应该能够获取已启用的服务器', () => {
      const config1 = createDefaultServerConfig('piper');
      config1.enabled = true;
      
      const config2 = createDefaultServerConfig('azure');
      config2.enabled = false;

      manager.addServer(config1);
      manager.addServer(config2);

      const enabledServers = manager.getEnabledServers();
      expect(enabledServers).toHaveLength(1);
      expect(enabledServers[0].type).toBe('piper');
    });

    it('应该能够按类型查找服务器', () => {
      const config1 = createDefaultServerConfig('piper', 'Piper 1');
      const config2 = createDefaultServerConfig('piper', 'Piper 2');
      const config3 = createDefaultServerConfig('azure', 'Azure 1');

      manager.addServer(config1);
      manager.addServer(config2);
      manager.addServer(config3);

      const piperServers = manager.findServersByType('piper');
      expect(piperServers).toHaveLength(2);
    });
  });

  describe('优先级管理', () => {
    it('应该能够按优先级排序服务器', () => {
      const config1 = createDefaultServerConfig('piper');
      config1.priority = 2;
      
      const config2 = createDefaultServerConfig('azure');
      config2.priority = 1;

      const config3 = createDefaultServerConfig('browser');
      config3.priority = 3;

      manager.addServer(config1);
      manager.addServer(config2);
      manager.addServer(config3);

      const sorted = manager.getServersByPriority();
      expect(sorted[0].priority).toBe(1);
      expect(sorted[1].priority).toBe(2);
      expect(sorted[2].priority).toBe(3);
    });

    it('应该能够设置单个服务器的优先级', () => {
      const config = createDefaultServerConfig('piper');
      config.priority = 5;
      const id = manager.addServer(config);

      manager.setPriority(id, 1);

      const updated = manager.getServer(id);
      expect(updated?.priority).toBe(1);
    });

    it('应该能够重新排序服务器优先级', () => {
      const id1 = manager.addServer(createDefaultServerConfig('piper'));
      const id2 = manager.addServer(createDefaultServerConfig('azure'));
      const id3 = manager.addServer(createDefaultServerConfig('browser'));

      // 重新排序：browser, piper, azure
      manager.reorderPriority([id3, id1, id2]);

      const sorted = manager.getServersByPriority();
      expect(sorted[0].type).toBe('browser');
      expect(sorted[1].type).toBe('piper');
      expect(sorted[2].type).toBe('azure');
    });

    it('应该支持实时调整优先级（模拟UI操作）', () => {
      const lanPiper = createDefaultServerConfig('piper', '局域网Piper');
      lanPiper.priority = 10; // 初始优先级较低
      const id = manager.addServer(lanPiper);

      // 模拟用户点击优先级编辑，改为1
      manager.setPriority(id, 1);

      const updated = manager.getServer(id);
      expect(updated?.priority).toBe(1);

      // 验证排序
      const sorted = manager.getServersByPriority();
      expect(sorted[0].id).toBe(id);
    });

    it('数字越小优先级越高', () => {
      const server1 = createDefaultServerConfig('piper');
      server1.priority = 1;
      const id1 = manager.addServer(server1);

      const server2 = createDefaultServerConfig('azure');
      server2.priority = 10;
      const id2 = manager.addServer(server2);

      const sorted = manager.getEnabledServersByPriority();
      expect(sorted[0].id).toBe(id1); // 优先级1应该排第一
      expect(sorted[1].id).toBe(id2); // 优先级10应该排第二
    });
  });

  describe('健康检查', () => {
    it('禁用的服务器应该被标记为disabled', async () => {
      const config = createDefaultServerConfig('piper');
      config.enabled = false;
      const id = manager.addServer(config);

      const result = await manager.checkServerHealth(id);

      expect(result.available).toBe(false);
      expect(result.errorMessage).toContain('禁用');
      
      const server = manager.getServer(id);
      expect(server?.status?.health).toBe('disabled');
    });

    it('浏览器TTS应该总是可用', async () => {
      const config = createDefaultServerConfig('browser');
      const id = manager.addServer(config);

      const result = await manager.checkServerHealth(id);

      expect(result.available).toBe(true);
      
      const server = manager.getServer(id);
      expect(server?.status?.health).toBe('available');
    });

    it('只应该检查已启用的服务器', async () => {
      const config1 = createDefaultServerConfig('piper');
      config1.enabled = true;
      
      const config2 = createDefaultServerConfig('azure');
      config2.enabled = false;

      manager.addServer(config1);
      manager.addServer(config2);

      // Mock fetch to always succeed
      global.fetch = vi.fn().mockResolvedValue({
        ok: true
      } as Response);

      const results = await manager.checkAllEnabledServers();

      // 只应该检查1个启用的服务器
      expect(results.size).toBe(1);
    });
  });

  describe('启用/禁用功能', () => {
    it('应该能够切换服务器启用状态', () => {
      const config = createDefaultServerConfig('piper');
      config.enabled = true;
      const id = manager.addServer(config);

      manager.toggleServer(id);
      expect(manager.getServer(id)?.enabled).toBe(false);

      manager.toggleServer(id);
      expect(manager.getServer(id)?.enabled).toBe(true);
    });

    it('禁用服务器时应该更新启用状态', () => {
      const config = createDefaultServerConfig('piper');
      config.enabled = true;
      const id = manager.addServer(config);

      manager.toggleServer(id);

      const server = manager.getServer(id);
      expect(server?.enabled).toBe(false);
      
      // 如果状态存在，应该是disabled
      if (server?.status) {
        expect(server.status.health).toBe('disabled');
      }
    });
  });

  describe('收藏功能', () => {
    it('应该能够切换收藏状态', () => {
      const config = createDefaultServerConfig('piper');
      const id = manager.addServer(config);

      expect(manager.getServer(id)?.metadata.isFavorite).toBe(false);

      manager.toggleFavorite(id);
      expect(manager.getServer(id)?.metadata.isFavorite).toBe(true);

      manager.toggleFavorite(id);
      expect(manager.getServer(id)?.metadata.isFavorite).toBe(false);
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const config1 = createDefaultServerConfig('piper');
      config1.enabled = true;
      config1.status = { health: 'available' };

      const config2 = createDefaultServerConfig('azure');
      config2.enabled = true;
      config2.status = { health: 'unavailable' };

      const config3 = createDefaultServerConfig('browser');
      config3.enabled = false;

      manager.addServer(config1);
      manager.addServer(config2);
      manager.addServer(config3);

      const stats = manager.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(2);
      expect(stats.available).toBe(1);
      expect(stats.unavailable).toBe(1);
      expect(stats.byType.piper).toBe(1);
      expect(stats.byType.azure).toBe(1);
      expect(stats.byType.browser).toBe(1);
    });
  });

  describe('全局设置', () => {
    it('应该能够更新全局设置', () => {
      manager.updateGlobalSettings({
        healthCheck: {
          enabled: false,
          interval: 10000,
          timeout: 3000,
          retryCount: 1,
          exponentialBackoff: false
        }
      });

      const settings = manager.getGlobalSettings();
      expect(settings.healthCheck.enabled).toBe(false);
      expect(settings.healthCheck.interval).toBe(10000);
    });
  });

  describe('使用记录', () => {
    it('应该能够记录服务器使用', () => {
      const config = createDefaultServerConfig('piper');
      const id = manager.addServer(config);

      const beforeUse = manager.getServer(id)?.metadata.lastUsed;
      expect(beforeUse).toBeUndefined();

      manager.markServerUsed(id);

      const afterUse = manager.getServer(id)?.metadata.lastUsed;
      expect(afterUse).toBeTruthy();
      expect(typeof afterUse).toBe('number');
    });
  });

  describe('清理', () => {
    it('应该能够正确清理资源', () => {
      manager.addServer(createDefaultServerConfig('piper'));
      manager.addServer(createDefaultServerConfig('azure'));

      manager.dispose();

      const stats = manager.getStatistics();
      expect(stats.total).toBe(0);
    });
  });
});

