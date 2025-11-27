/**
 * TTS 系统初始化
 * 在应用启动时配置 TTS 服务管理器
 */

import { getTTSServiceManager } from './ttsServiceManager';
import { GPTSoVITSClient } from './gptSoVITSClient';
import { CoquiTTSClient } from './coquiTTSClient';

export interface TTSInitConfig {
  enableGPTSoVITS?: boolean;
  gptSoVITSConfig?: {
    baseUrl?: string;
    refAudioUrl?: string;
    refText?: string;
  };
  enableCoqui?: boolean;
  coquiConfig?: {
    baseUrl?: string;
    modelName?: string;
    speakerId?: string;
  };
  enableEdge?: boolean;
  enableLocal?: boolean;
  enableBrowser?: boolean;  // 总是启用作为后备
}

/**
 * 初始化 TTS 系统
 */
export async function initTTS(config: TTSInitConfig = {}): Promise<void> {
  const ttsManager = getTTSServiceManager();

  // 配置 GPT-SoVITS（如果启用）
  if (config.enableGPTSoVITS) {
    const gptSoVITSClient = new GPTSoVITSClient({
      baseUrl: config.gptSoVITSConfig?.baseUrl || 'http://localhost:9880',
      refAudioUrl: config.gptSoVITSConfig?.refAudioUrl,
      refText: config.gptSoVITSConfig?.refText,
      language: 'zh',
    });

    // 检查服务是否可用
    const isHealthy = await gptSoVITSClient.checkHealth();
    if (isHealthy) {
      ttsManager.configureProvider('gpt_sovits', {
        provider: 'gpt_sovits',
        priority: 1,  // 最高优先级
        enabled: true,
        config: config.gptSoVITSConfig,
      });
      console.log('[initTTS] GPT-SoVITS 已启用');
    } else {
      console.warn('[initTTS] GPT-SoVITS 服务不可用，已禁用');
    }
  }

  // 配置 Coqui TTS（如果启用）
  if (config.enableCoqui) {
    const coquiClient = new CoquiTTSClient({
      baseUrl: config.coquiConfig?.baseUrl || 'http://localhost:5002',
      modelName: config.coquiConfig?.modelName || 'tts_models/zh-CN/baker/tacotron2-DDC-GST',
      speakerId: config.coquiConfig?.speakerId,
      language: 'zh',
    });

    // 检查服务是否可用
    const isHealthy = await coquiClient.checkHealth();
    if (isHealthy) {
      ttsManager.configureProvider('coqui', {
        provider: 'coqui',
        priority: 2,
        enabled: true,
        config: config.coquiConfig,
      });
      console.log('[initTTS] Coqui TTS 已启用');
    } else {
      console.warn('[initTTS] Coqui TTS 服务不可用，已禁用');
    }
  }

  // 配置 Edge TTS
  if (config.enableEdge !== false) {
    ttsManager.configureProvider('edge', {
      provider: 'edge',
      priority: 3,
      enabled: true,
    });
  }

  // 配置本地 TTS API
  if (config.enableLocal !== false) {
    ttsManager.configureProvider('local', {
      provider: 'local',
      priority: 4,
      enabled: true,
    });
  }

  // 浏览器 TTS 总是启用作为后备
  ttsManager.configureProvider('browser', {
    provider: 'browser',
    priority: 5,
    enabled: true,
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
    enableGPTSoVITS: false,  // 默认不启用，需要手动配置
    enableCoqui: false,
    enableEdge: true,
    enableLocal: true,
    enableBrowser: true,
  };
}

/**
 * 保存 TTS 配置
 */
export function saveTTSConfig(config: TTSInitConfig): void {
  localStorage.setItem('tts_config', JSON.stringify(config));
}

