/**
 * TTS 客户端工厂
 * 根据服务器配置创建相应的 TTS 客户端
 */

import { TTSServerConfig } from '../models/TTSServerConfig';
import { ITTSClient } from '../ttsClient';
import { BrowserTTSClient } from '../ttsClient';
import { MeloTTSClient } from '../meloTTSClient';
import { PiperTTSClient } from '../piperTTSClient';
import { AzureSpeechTTSClient } from '../azureSpeechTTSClient';
import { getFullUrl } from '../models/TTSServerConfig';

export class TTSClientFactory {
  private static clientCache: Map<string, ITTSClient> = new Map();

  /**
   * 根据服务器配置创建 TTS 客户端
   */
  static createClient(config: TTSServerConfig): ITTSClient {
    // 检查缓存
    if (this.clientCache.has(config.id)) {
      const cached = this.clientCache.get(config.id)!;
      // 更新客户端配置（如果支持）
      this.updateClientConfig(cached, config);
      return cached;
    }

    // 创建新客户端
    let client: ITTSClient;
    
    switch (config.type) {
      case 'melo':
        client = this.createMeloClient(config);
        break;
      case 'piper':
        client = this.createPiperClient(config);
        break;
      case 'azure':
        client = this.createAzureClient(config);
        break;
      case 'browser':
        client = this.createBrowserClient(config);
        break;
      default:
        throw new Error(`不支持的 TTS 类型: ${config.type}`);
    }

    // 缓存客户端
    this.clientCache.set(config.id, client);
    return client;
  }

  /**
   * 创建 MeLo TTS 客户端
   */
  static createMeloClient(config: TTSServerConfig): MeloTTSClient {
    const baseUrl = getFullUrl(config.connection);
    const meloConfig = config.providerConfig.melo;

    return new MeloTTSClient({
      baseUrl,
      timeout: 30000,
      retryCount: 2,
      defaultSpeaker: meloConfig?.speaker || 'ZH'
    });
  }

  /**
   * 创建 Piper TTS 客户端
   */
  static createPiperClient(config: TTSServerConfig): PiperTTSClient {
    const baseUrl = getFullUrl(config.connection);
    const piperConfig = config.providerConfig.piper;

    return new PiperTTSClient({
      baseUrl,
      model: piperConfig?.model || 'zh_CN-huayan-medium',
      timeout: 10000,
      retryCount: 2
    });
  }

  /**
   * 创建 Azure Speech TTS 客户端
   */
  static createAzureClient(config: TTSServerConfig): AzureSpeechTTSClient {
    const azureConfig = config.providerConfig.azure;

    if (!azureConfig || !azureConfig.subscriptionKey) {
      throw new Error('Azure TTS 需要配置 subscriptionKey');
    }

    return new AzureSpeechTTSClient({
      subscriptionKey: azureConfig.subscriptionKey,
      region: azureConfig.region,
      voiceName: azureConfig.voiceName,
      voiceStyle: azureConfig.voiceStyle,
      rate: azureConfig.rate,
      pitch: azureConfig.pitch,
      timeout: 30000,
      retryCount: 2
    });
  }

  /**
   * 创建浏览器 TTS 客户端
   */
  static createBrowserClient(config: TTSServerConfig): BrowserTTSClient {
    const browserConfig = config.providerConfig.browser;

    return new BrowserTTSClient({
      voice: browserConfig?.voice,
      rate: browserConfig?.rate || 1.0,
      pitch: browserConfig?.pitch || 1.0,
      volume: browserConfig?.volume || 1.0
    });
  }

  /**
   * 更新客户端配置（如果客户端支持）
   */
  private static updateClientConfig(client: ITTSClient, config: TTSServerConfig): void {
    if ('updateConfig' in client && typeof (client as any).updateConfig === 'function') {
      const updateConfig: any = {};

      switch (config.type) {
        case 'melo':
          updateConfig.baseUrl = getFullUrl(config.connection);
          updateConfig.defaultSpeaker = config.providerConfig.melo?.speaker;
          break;
        case 'piper':
          updateConfig.baseUrl = getFullUrl(config.connection);
          updateConfig.model = config.providerConfig.piper?.model;
          break;
        case 'azure':
          const azureConfig = config.providerConfig.azure;
          if (azureConfig) {
            updateConfig.subscriptionKey = azureConfig.subscriptionKey;
            updateConfig.region = azureConfig.region;
            updateConfig.voiceName = azureConfig.voiceName;
            updateConfig.voiceStyle = azureConfig.voiceStyle;
            updateConfig.rate = azureConfig.rate;
            updateConfig.pitch = azureConfig.pitch;
          }
          break;
        case 'browser':
          const browserConfig = config.providerConfig.browser;
          if (browserConfig) {
            updateConfig.voice = browserConfig.voice;
            updateConfig.rate = browserConfig.rate;
            updateConfig.pitch = browserConfig.pitch;
            updateConfig.volume = browserConfig.volume;
          }
          break;
      }

      (client as any).updateConfig(updateConfig);
    }
  }

  /**
   * 获取已缓存的客户端
   */
  static getClient(serverId: string): ITTSClient | undefined {
    return this.clientCache.get(serverId);
  }

  /**
   * 移除缓存的客户端
   */
  static removeClient(serverId: string): void {
    this.clientCache.delete(serverId);
  }

  /**
   * 清除所有缓存的客户端
   */
  static clearCache(): void {
    this.clientCache.clear();
  }
}

