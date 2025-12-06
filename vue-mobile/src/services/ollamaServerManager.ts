/**
 * Ollama 服务器管理器（Vue Mobile版本）
 * 管理多个 Ollama 服务器配置，支持添加、删除、收藏等功能
 */

export interface OllamaServerConfig {
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  host: string;                  // IP 或域名
  port: number;                  // 端口（默认 11434）
  protocol: 'http' | 'https';   // 协议
  isFavorite: boolean;           // 是否收藏
  lastUsed?: number;             // 最后使用时间戳
  lastCheckStatus?: 'available' | 'unavailable' | 'checking';
  lastCheckTime?: number;        // 最后检测时间
  latency?: number;              // 延迟（毫秒）
}

interface StoredData {
  servers: OllamaServerConfig[];
  currentServerId: string;
}

const STORAGE_KEY = 'ollama_servers_mobile';

// 预设服务器
const PRESET_SERVERS: OllamaServerConfig[] = [
  {
    id: 'local',
    name: '本地服务器',
    host: 'localhost',
    port: 11434,
    protocol: 'http',
    isFavorite: true
  }
];

export class OllamaServerManager {
  private servers: Map<string, OllamaServerConfig> = new Map();
  private currentServerId: string = 'local';
  private maxServers: number = 20;

  constructor() {
    this.load();
  }

  /**
   * 从 localStorage 加载配置
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredData = JSON.parse(stored);
        
        // 加载服务器列表
        const serversToLoad = data.servers.slice(0, 20);
        serversToLoad.forEach(server => {
          this.servers.set(server.id, server);
        });
        
        // 确保本地服务器存在
        if (!this.servers.has('local')) {
          this.servers.set('local', PRESET_SERVERS[0]);
        }
        
        // 加载当前服务器
        if (data.currentServerId && this.servers.has(data.currentServerId)) {
          this.currentServerId = data.currentServerId;
        }
      } else {
        // 初始化默认服务器
        this.loadDefaults();
      }
    } catch (error) {
      console.error('加载Ollama服务器配置失败:', error);
      this.loadDefaults();
    }
  }

  /**
   * 加载默认配置
   */
  private loadDefaults(): void {
    PRESET_SERVERS.forEach(server => {
      this.servers.set(server.id, server);
    });
    this.currentServerId = 'local';
    this.save();
  }

  /**
   * 保存到 localStorage
   */
  private save(): void {
    try {
      const data: StoredData = {
        servers: Array.from(this.servers.values()),
        currentServerId: this.currentServerId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('保存Ollama服务器配置失败:', error);
    }
  }

  /**
   * 添加服务器
   */
  addServer(config: Partial<OllamaServerConfig>): OllamaServerConfig | null {
    if (this.servers.size >= this.maxServers) {
      console.warn('服务器数量已达上限');
      return null;
    }

    const id = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const server: OllamaServerConfig = {
      id,
      name: config.name || `${config.host}:${config.port}`,
      host: config.host || 'localhost',
      port: config.port || 11434,
      protocol: config.protocol || 'http',
      isFavorite: config.isFavorite || false
    };

    this.servers.set(id, server);
    this.save();
    return server;
  }

  /**
   * 删除服务器
   */
  removeServer(serverId: string): boolean {
    if (serverId === 'local') {
      return false; // 不能删除本地服务器
    }

    if (this.servers.has(serverId)) {
      this.servers.delete(serverId);
      
      // 如果删除的是当前服务器，切换到本地服务器
      if (this.currentServerId === serverId) {
        this.currentServerId = 'local';
      }
      
      this.save();
      return true;
    }
    return false;
  }

  /**
   * 设置当前服务器
   */
  setCurrentServer(serverId: string): boolean {
    if (this.servers.has(serverId)) {
      const server = this.servers.get(serverId)!;
      server.lastUsed = Date.now();
      this.currentServerId = serverId;
      this.save();
      return true;
    }
    return false;
  }

  /**
   * 获取当前服务器
   */
  getCurrentServer(): OllamaServerConfig {
    return this.servers.get(this.currentServerId) || PRESET_SERVERS[0];
  }

  /**
   * 获取所有服务器
   */
  getAllServers(): OllamaServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * 获取最近使用的服务器
   */
  getRecentServers(): OllamaServerConfig[] {
    return Array.from(this.servers.values())
      .filter(s => s.lastUsed)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, 5);
  }

  /**
   * 切换收藏状态
   */
  toggleFavorite(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (server) {
      server.isFavorite = !server.isFavorite;
      this.save();
      return true;
    }
    return false;
  }

  /**
   * 更新服务器状态
   */
  updateServerStatus(serverId: string, status: {
    lastCheckStatus?: 'available' | 'unavailable' | 'checking';
    latency?: number;
    lastCheckTime?: number;
  }): void {
    const server = this.servers.get(serverId);
    if (server) {
      Object.assign(server, status);
      this.save();
    }
  }
}

// 单例
export const ollamaServerManager = new OllamaServerManager();

