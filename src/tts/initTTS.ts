/**
 * TTS 系统初始化
 * 在应用启动时配置 TTS 服务管理器
 */

import { getTTSServiceManager } from './ttsServiceManager';
import { PiperTTSClient } from './piperTTSClient';
import { AzureSpeechTTSClient } from './azureSpeechTTSClient';

export interface TTSInitConfig {
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
      console.warn('[initTTS] ⚠️ Azure Speech Service 已启用但未找到 Subscription Key，将跳过初始化');
      console.warn('[initTTS] 💡 提示：请设置环境变量 VITE_AZURE_SPEECH_KEY 和 VITE_AZURE_SPEECH_REGION');
      ttsManager.configureProvider('azure', {
        provider: 'azure',
        enabled: false,
      });
    } else {
      console.log('[initTTS] 🔑 找到 Azure Speech Service Subscription Key，长度:', azureKey.length);
      console.log('[initTTS] 🌍 Azure 区域:', azureRegion);
      
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
        console.log('[initTTS] 🔍 开始 Azure Speech Service 健康检查...');
        const isHealthy = await azureClient.checkHealth();
        console.log(`[initTTS] Azure Speech Service 健康检查结果: ${isHealthy ? '✅ 可用' : '❌ 不可用'}`);
        
        if (isHealthy) {
          ttsManager.configureProvider('azure', {
            provider: 'azure',
            priority: 0,  // 最高优先级（高质量云端TTS，支持多语言）
            enabled: true,
            config: { ...config.azureConfig, subscriptionKey: azureKey, region: azureRegion },
          });
          console.log('[initTTS] ✅ Azure Speech Service 已启用（最高优先级）');
        } else {
          console.warn('[initTTS] ⚠️ Azure Speech Service 服务不可用（可能是 Subscription Key 无效或网络问题），已禁用');
          console.warn('[initTTS] 💡 提示：请检查 Subscription Key 和 Region 是否正确');
          ttsManager.configureProvider('azure', {
            provider: 'azure',
            enabled: false,
          });
        }
      } catch (error) {
        console.error('[initTTS] ❌ Azure Speech Service 健康检查失败:', error);
        console.warn('[initTTS] ⚠️ Azure Speech Service 健康检查失败，已禁用');
        console.warn('[initTTS] 错误详情:', error instanceof Error ? error.message : String(error));
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
    console.log(`[initTTS] 正在检查 Piper TTS 服务: ${piperBaseUrl}`);
    
    const piperClient = new PiperTTSClient({
      baseUrl: piperBaseUrl,
      timeout: config.piperConfig?.timeout || 10000,
      retryCount: config.piperConfig?.retryCount || 2,
    });

    // 检查服务是否可用
    try {
      const isHealthy = await piperClient.checkHealth();
      console.log(`[initTTS] Piper TTS 健康检查结果: ${isHealthy ? '✅ 可用' : '❌ 不可用'}`);
      
      if (isHealthy) {
        ttsManager.configureProvider('piper', {
          provider: 'piper',
          priority: 1,  // 第二优先级（轻量级本地TTS）
          enabled: true,
          config: config.piperConfig,
        });
        console.log('[initTTS] ✅ Piper TTS 已启用');
      } else {
        console.warn('[initTTS] ⚠️ Piper TTS 服务不可用，已禁用');
        ttsManager.configureProvider('piper', {
          provider: 'piper',
          enabled: false,
        });
      }
    } catch (error) {
      console.error('[initTTS] ❌ Piper TTS 健康检查失败:', error);
      console.warn('[initTTS] ⚠️ Piper TTS 健康检查失败，但仍尝试启用（服务可能正在启动）');
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

  console.log('[initTTS] TTS 系统初始化完成');
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

