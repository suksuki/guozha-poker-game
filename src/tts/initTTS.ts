/**
 * TTS 系统初始化
 * 在应用启动时配置 TTS 服务管理器
 */

import { getTTSServiceManager } from './ttsServiceManager';
import { MeloTTSClient } from './meloTTSClient';
import { PiperTTSClient } from './piperTTSClient';
import { AzureSpeechTTSClient } from './azureSpeechTTSClient';

export interface TTSInitConfig {
  enableMelo?: boolean;  // MeLo TTS（高质量多语言TTS）
  meloConfig?: {
    baseUrl?: string;
    timeout?: number;
    retryCount?: number;
    defaultSpeaker?: string;
  };
  enablePiper?: boolean;  // Piper TTS（轻量级本地TTS）
  piperConfig?: {
    baseUrl?: string;
    timeout?: number;
    retryCount?: number;
  };
  enableAzure?: boolean;  // Azure Speech Service（云端高质量TTS，支持多语言）
  azureConfig?: {
    subscriptionKey?: string;
    region?: string;
    voiceName?: string;
    timeout?: number;
    retryCount?: number;
  };
  enableBrowser?: boolean;  // 总是启用作为后备
}

/**
 * 初始化 TTS 系统
 */
export async function initTTS(config: TTSInitConfig = {}): Promise<void> {
  const ttsManager = getTTSServiceManager();

  // 配置 MeLo TTS（高质量多语言TTS）
  if (config.enableMelo !== false) {  // 默认启用
    const meloBaseUrl = config.meloConfig?.baseUrl || 'http://localhost:7860';
    
    const meloClient = new MeloTTSClient({
      baseUrl: meloBaseUrl,
      timeout: config.meloConfig?.timeout || 30000,
      retryCount: config.meloConfig?.retryCount || 2,
      defaultSpeaker: config.meloConfig?.defaultSpeaker || 'ZH',
    });

    // 检查服务是否可用
    try {
      const isHealthy = await meloClient.checkHealth();
      
      if (isHealthy) {
        ttsManager.configureProvider('melo', {
          provider: 'melo',
          priority: 0,  // 最高优先级（高质量多语言TTS）
          enabled: true,
          config: config.meloConfig,
        });
        console.log('[TTS] ✅ MeLo TTS 服务可用:', meloBaseUrl);
      } else {
        ttsManager.configureProvider('melo', {
          provider: 'melo',
          enabled: false,
        });
        console.log('[TTS] ⚠️ MeLo TTS 服务不可用:', meloBaseUrl);
      }
    } catch (error) {
      ttsManager.configureProvider('melo', {
        provider: 'melo',
        priority: 0,
        enabled: true,
        config: config.meloConfig,
      });
      console.log('[TTS] ⚠️ MeLo TTS 健康检查失败，但仍启用:', error);
    }
  }

  // 配置 Azure Speech Service（如果启用）
  if (config.enableAzure) {
    // 确保 Subscription Key 和 Region 被传递，如果没有则尝试从环境变量读取
    const azureKey = config.azureConfig?.subscriptionKey || 
                    (import.meta.env?.VITE_AZURE_SPEECH_KEY as string | undefined) ||
                    (typeof window !== 'undefined' && (window as any).AZURE_SPEECH_KEY) ||
                    null;
    
    const azureRegion = config.azureConfig?.region || 
                       (import.meta.env?.VITE_AZURE_SPEECH_REGION as string | undefined) ||
                       (typeof window !== 'undefined' && (window as any).AZURE_SPEECH_REGION) ||
                       'eastus';
    
    if (!azureKey) {
      ttsManager.configureProvider('azure', {
        provider: 'azure',
        enabled: false,
      });
    } else {
      
      // 从 localStorage 读取保存的语音选择
      const savedVoiceName = typeof window !== 'undefined' 
        ? localStorage.getItem('azure_voice_name') 
        : null;
      
      const azureClient = new AzureSpeechTTSClient({
        subscriptionKey: azureKey,
        region: azureRegion,
        voiceName: config.azureConfig?.voiceName || savedVoiceName || undefined,
        timeout: config.azureConfig?.timeout || 30000,
        retryCount: config.azureConfig?.retryCount || 2,
      });

      // 检查服务是否可用（需要 Subscription Key）
      try {
        const isHealthy = await azureClient.checkHealth();
        
        if (isHealthy) {
          ttsManager.configureProvider('azure', {
            provider: 'azure',
            priority: 0,  // 最高优先级（高质量云端TTS，支持多语言）
            enabled: true,
            config: { ...config.azureConfig, subscriptionKey: azureKey, region: azureRegion },
          });
        } else {
          ttsManager.configureProvider('azure', {
            provider: 'azure',
            enabled: false,
          });
        }
      } catch (error) {
        ttsManager.configureProvider('azure', {
          provider: 'azure',
          enabled: false,
        });
      }
    }
  }

  // 配置 Piper TTS（轻量级本地TTS）
  if (config.enablePiper !== false) {  // 默认启用
    const piperBaseUrl = config.piperConfig?.baseUrl || 'http://localhost:5000';
    
    const piperClient = new PiperTTSClient({
      baseUrl: piperBaseUrl,
      timeout: config.piperConfig?.timeout || 10000,
      retryCount: config.piperConfig?.retryCount || 2,
    });

    // 检查服务是否可用
    try {
      const isHealthy = await piperClient.checkHealth();
      
      if (isHealthy) {
        ttsManager.configureProvider('piper', {
          provider: 'piper',
          priority: 1,  // 第二优先级（轻量级本地TTS）
          enabled: true,
          config: config.piperConfig,
        });
      } else {
        ttsManager.configureProvider('piper', {
          provider: 'piper',
          enabled: false,
        });
      }
    } catch (error) {
      ttsManager.configureProvider('piper', {
        provider: 'piper',
        priority: 1,
        enabled: true,
        config: config.piperConfig,
      });
    }
  }

  // 浏览器 TTS（总是启用作为后备）
  ttsManager.configureProvider('browser', {
    provider: 'browser',
    priority: 2,
    enabled: config.enableBrowser !== false,  // 默认启用
  });

  // 启动健康检查
  ttsManager.startHealthCheck(5 * 60 * 1000);  // 每5分钟检查一次

}

/**
 * 从环境变量或配置读取 TTS 配置
 */
export function getTTSConfigFromEnv(): TTSInitConfig {
  // 可以从环境变量、localStorage 或配置文件读取
  const stored = localStorage.getItem('tts_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // 解析失败，使用默认配置
    }
  }

  // 默认配置
  return {
    enableAzure: false,  // 默认不启用，需要配置 Subscription Key
    enablePiper: true,  // 默认启用 Piper TTS（轻量级本地TTS）
    enableBrowser: true,  // 默认启用浏览器 TTS（作为后备）
  };
}

/**
 * 保存 TTS 配置
 */
export function saveTTSConfig(config: TTSInitConfig): void {
  localStorage.setItem('tts_config', JSON.stringify(config));
}

