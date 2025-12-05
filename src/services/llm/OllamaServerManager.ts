/**
 * Ollama 服务器管理器
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

export interface ServerCheckResult {
  available: boolean;
  latency?: number;
  error?: string;
  modelCount?: number;
}

interface StoredData {
  servers: OllamaServerConfig[];
  currentServerId: string;
}

const STORAGE_KEY = 'ollama_servers';

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
  private maxServers: number = 20; // 最大服务器数量

  constructor() {
    this.cleanupOldData();
    this.load();
  }

  /**
   * 清理可能存在的旧数据或损坏数据
   */
  private cleanupOldData(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored.length > 100 * 1024) { // 超过 100KB
        console.warn('Detected large server config, clearing...');
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
  }

  /**
   * 从 localStorage 加载配置
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // 检查数据大小，如果太大则清除
        if (stored.length > 100 * 1024) { // 超过 100KB
          console.warn('Server config too large, resetting to defaults');
          localStorage.removeItem(STORAGE_KEY);
          this.loadDefaults();
          return;
        }

        const data: StoredData = JSON.parse(stored);
        
        // 加载服务器列表（限制数量）
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
        this.loadDefaults();
      }
    } catch (e) {
      console.error('Failed to load Ollama server config:', e);
      localStorage.removeItem(STORAGE_KEY); // 清除损坏的数据
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
  }

  /**
   * 保存到 localStorage
   */
  private save(): void {
    try {
      // 限制保存的服务器数量（最多20个）
      const serversToSave = Array.from(this.servers.values())
        .sort((a, b) => {
          // 本地服务器始终保留
          if (a.id === 'local') return -1;
          if (b.id === 'local') return 1;
          // 收藏的优先
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          // 按最后使用时间排序
          return (b.lastUsed || 0) - (a.lastUsed || 0);
        })
        .slice(0, 20); // 最多保留20个服务器

      const data: StoredData = {
        servers: serversToSave,
        currentServerId: this.currentServerId
      };
      
      const jsonString = JSON.stringify(data);
      
      // 检查大小（如果超过 1MB，进一步减少）
      if (jsonString.length > 1024 * 1024) {
        console.warn('Server data too large, reducing to 10 servers');
        data.servers = serversToSave.slice(0, 10);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded, clearing old data');
        // 尝试只保存前5个服务器
        try {
          const minimalData: StoredData = {
            servers: Array.from(this.servers.values())
              .filter(s => s.id === 'local' || s.isFavorite || s.id === this.currentServerId)
              .slice(0, 5),
            currentServerId: this.currentServerId
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalData));
        } catch (retryError) {
          console.error('Failed to save even minimal config:', retryError);
        }
      } else {
        console.error('Failed to save Ollama server config:', e);
      }
    }
  }

  /**
   * 获取所有服务器
   */
  getAllServers(): OllamaServerConfig[] {
    return Array.from(this.servers.values());
  }

  /**
   * 获取当前选中的服务器
   */
  getCurrentServer(): OllamaServerConfig {
    const server = this.servers.get(this.currentServerId);
    if (!server) {
      // 如果当前服务器不存在，返回第一个或创建默认
      const first = this.servers.values().next().value;
      return first || PRESET_SERVERS[0];
    }
    return server;
  }

  /**
   * 设置当前服务器
   */
  setCurrentServer(id: string): boolean {
    if (this.servers.has(id)) {
      this.currentServerId = id;
      
      // 更新最后使用时间
      const server = this.servers.get(id);
      if (server) {
        server.lastUsed = Date.now();
        this.servers.set(id, server);
      }
      
      this.save();
      return true;
    }
    return false;
  }

  /**
   * 添加自定义服务器
   */
  addServer(config: Partial<OllamaServerConfig>): OllamaServerConfig {
    // 检查服务器数量限制（排除本地服务器）
    const customServersCount = Array.from(this.servers.values())
      .filter(s => s.id !== 'local').length;
    
    if (customServersCount >= this.maxServers - 1) {
      // 删除最旧的非收藏服务器
      const serversArray = Array.from(this.servers.values())
        .filter(s => s.id !== 'local' && !s.isFavorite)
        .sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));
      
      if (serversArray.length > 0) {
        this.servers.delete(serversArray[0].id);
        console.log(`Removed oldest server: ${serversArray[0].name}`);
      }
    }

    const id = config.id || `custom_${Date.now()}`;
    const newServer: OllamaServerConfig = {
      id,
      name: config.name || `${config.host || 'Unknown'}:${config.port || 11434}`,
      host: config.host || 'localhost',
      port: config.port || 11434,
      protocol: config.protocol || 'http',
      isFavorite: config.isFavorite || false,
      lastUsed: Date.now()
    };
    
    this.servers.set(id, newServer);
    this.save();
    return newServer;
  }

  /**
   * 删除服务器
   */
  removeServer(id: string): boolean {
    // 不能删除预设服务器
    if (id === 'local') {
      return false;
    }
    
    // 如果删除的是当前服务器，切换到本地
    if (id === this.currentServerId) {
      this.currentServerId = 'local';
    }
    
    const result = this.servers.delete(id);
    if (result) {
      this.save();
    }
    return result;
  }

  /**
   * 收藏/取消收藏
   */
  toggleFavorite(id: string): boolean {
    const server = this.servers.get(id);
    if (server) {
      server.isFavorite = !server.isFavorite;
      this.servers.set(id, server);
      this.save();
      return true;
    }
    return false;
  }

  /**
   * 检查服务器可用性
   */
  async checkServer(server: OllamaServerConfig): Promise<ServerCheckResult> {
    const startTime = Date.now();
    
    try {
      const url = this.getServerTagsUrl(server);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      if (!response.ok) {
        return {
          available: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      const latency = Date.now() - startTime;
      
      const result: ServerCheckResult = {
        available: true,
        latency,
        modelCount: data.models?.length || 0
      };
      
      // 更新服务器状态
      this.updateServerStatus(server.id, result);
      
      return result;
    } catch (error) {
      const result: ServerCheckResult = {
        available: false,
        error: error instanceof Error ? error.message : '连接失败'
      };
      
      // 更新服务器状态
      this.updateServerStatus(server.id, result);
      
      return result;
    }
  }

  /**
   * 更新服务器状态（检测后）
   */
  updateServerStatus(id: string, result: ServerCheckResult): void {
    const server = this.servers.get(id);
    if (server) {
      server.lastCheckStatus = result.available ? 'available' : 'unavailable';
      server.lastCheckTime = Date.now();
      server.latency = result.latency;
      this.servers.set(id, server);
      this.save();
    }
  }

  /**
   * 获取最近使用的服务器（排序）
   */
  getRecentServers(limit: number = 5): OllamaServerConfig[] {
    return Array.from(this.servers.values())
      .filter(s => s.lastUsed)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, limit);
  }

  /**
   * 获取收藏的服务器
   */
  getFavoriteServers(): OllamaServerConfig[] {
    return Array.from(this.servers.values())
      .filter(s => s.isFavorite)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
  }

  /**
   * 获取服务器完整 URL
   */
  getServerUrl(server: OllamaServerConfig): string {
    return `${server.protocol}://${server.host}:${server.port}`;
  }

  /**
   * 获取服务器 API URL
   */
  getServerApiUrl(server: OllamaServerConfig): string {
    return `${this.getServerUrl(server)}/api/chat`;
  }

  /**
   * 获取服务器 Tags URL（用于获取模型列表）
   */
  getServerTagsUrl(server: OllamaServerConfig): string {
    return `${this.getServerUrl(server)}/api/tags`;
  }

  /**
   * 解析服务器地址字符串
   * 支持格式：
   * - IP: 192.168.0.13
   * - IP:端口: 192.168.0.13:11434
   * - 域名: ollama.example.com
   * - 完整URL: http://192.168.0.13:11434
   */
  static parseServerAddress(input: string): Partial<OllamaServerConfig> {
    const trimmed = input.trim();
    
    // 尝试解析完整 URL
    try {
      const url = new URL(trimmed);
      const protocol = url.protocol.replace(':', '') as 'http' | 'https';
      // 如果没有显式指定端口，根据协议使用默认端口
      const defaultPort = protocol === 'https' ? 443 : 11434;
      return {
        protocol,
        host: url.hostname,
        port: url.port ? parseInt(url.port) : defaultPort
      };
    } catch {
      // 不是完整 URL，继续解析
    }
    
    // 解析 IP:端口 或 域名:端口
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      return {
        protocol: 'http',
        host: parts[0],
        port: parseInt(parts[1]) || 11434
      };
    }
    
    // 只有 IP 或域名
    return {
      protocol: 'http',
      host: trimmed,
      port: 11434
    };
  }
}

// 单例
let instance: OllamaServerManager | null = null;

export function getOllamaServerManager(): OllamaServerManager {
  if (!instance) {
    instance = new OllamaServerManager();
  }
  return instance;
}

