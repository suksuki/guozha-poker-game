/**
 * TTS服务管理器
 * 支持多种TTS后端，异步调用，自动降级
 * 支持根据声道选择不同的TTS服务器
 */

import { ITTSClient, TTSOptions, TTSResult, TTSProvider, TTSServerConfig } from './types';
import { BrowserTTSClient } from './browserTTSClient';
import { PiperTTSClient } from './piperTTSClient';
import { MeloTTSClient } from './meloTTSClient';
import { ChannelType } from '../../types/channel';

// 重新导出类型供外部使用
export type { TTSOptions, TTSResult, TTSServerConfig, TTSProvider } from './types';

export class TTSService {
  private serverClients: Map<string, ITTSClient> = new Map();  // 每个服务器一个客户端
  private servers: TTSServerConfig[] = [];
  private browserClient: BrowserTTSClient;

  constructor() {
    // 初始化浏览器TTS客户端（作为后备）
    this.browserClient = new BrowserTTSClient();
  }

  /**
   * 添加TTS服务器配置
   */
  addServer(server: TTSServerConfig): void {
    const index = this.servers.findIndex(s => s.id === server.id);
    if (index >= 0) {
      this.servers[index] = server;
    } else {
      this.servers.push(server);
    }
    // 按优先级排序
    this.servers.sort((a, b) => a.priority - b.priority);

    // 创建或更新客户端
    this.updateClient(server);
  }

  /**
   * 更新服务器客户端
   */
  private updateClient(server: TTSServerConfig): void {
    if (server.type === 'browser') {
      // 浏览器TTS使用共享实例
      return;
    }

    let client: ITTSClient;
    if (server.type === 'piper') {
      client = new PiperTTSClient(server);
    } else if (server.type === 'melo') {
      client = new MeloTTSClient(server);
    } else {
      return;
    }

    this.serverClients.set(server.id, client);
  }

  /**
   * 移除TTS服务器
   */
  removeServer(serverId: string): void {
    this.servers = this.servers.filter(s => s.id !== serverId);
    this.serverClients.delete(serverId);
  }

  /**
   * 生成语音（异步）
   * 支持根据声道选择不同的TTS服务器
   * @param text 文本
   * @param options 选项
   * @param channel 声道（可选，如果指定则优先选择分配给该声道的服务器）
   */
  async synthesize(
    text: string,
    options: TTSOptions = {},
    channel?: ChannelType
  ): Promise<TTSResult> {
    // 如果指定了声道，优先选择分配给该声道的服务器
    let candidateServers = this.servers.filter(s => s.enabled);

    if (channel !== undefined) {
      // 查找分配给该声道的服务器
      const assignedServers = candidateServers.filter(s =>
        s.assignedChannels && s.assignedChannels.includes(channel)
      );

      if (assignedServers.length > 0) {
        candidateServers = assignedServers;
      }
    }

    // 确保按优先级排序（优先级数字越小，优先级越高）
    candidateServers.sort((a, b) => a.priority - b.priority);

    // 排除浏览器TTS，优先使用服务器TTS
    const serverOnlyServers = candidateServers.filter(s => s.type !== 'browser');
    const browserServer = candidateServers.find(s => s.type === 'browser');

    // 先尝试所有非浏览器服务器（按优先级）
    for (const server of serverOnlyServers) {
      try {
        const client = this.serverClients.get(server.id);
        if (client && await client.isAvailable()) {
          return await client.synthesize(text, options);
        } else {
        }
      } catch (error) {
        continue;
      }
    }

    // 所有服务器都失败，使用浏览器TTS作为后备
    if (browserServer && await this.browserClient.isAvailable()) {
      return await this.browserClient.synthesize(text, options);
    }

    throw new Error('没有可用的TTS服务');
  }

  /**
   * 使用指定服务器生成语音
   */
  async synthesizeWithServer(
    serverId: string,
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server || !server.enabled) {
      throw new Error(`TTS服务器 ${serverId} 不可用`);
    }

    let client: ITTSClient | undefined;
    if (server.type === 'browser') {
      client = this.browserClient;
    } else {
      client = this.serverClients.get(serverId);
    }

    if (!client) {
      throw new Error(`TTS服务器 ${serverId} 的客户端不存在`);
    }

    if (!(await client.isAvailable())) {
      throw new Error(`TTS服务器 ${serverId} 不可用`);
    }

    return await client.synthesize(text, options);
  }

  /**
   * 获取所有服务器配置
   */
  getServers(): TTSServerConfig[] {
    return [...this.servers];
  }

  /**
   * 获取启用的服务器
   */
  getEnabledServers(): TTSServerConfig[] {
    return this.servers.filter(s => s.enabled);
  }
}

// 单例实例
let ttsServiceInstance: TTSService | null = null;

/**
 * 获取TTS服务单例
 */
export function getTTSService(): TTSService {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSService();
  }
  return ttsServiceInstance;
}

