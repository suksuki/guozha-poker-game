/**
 * TTS 系统初始化
 * 在应用启动时配置 TTS 服务管理器
 */

import { getTTSServiceManager } from './ttsServiceManager';
import { GPTSoVITSClient } from './gptSoVITSClient';
import { CoquiTTSClient } from './coquiTTSClient';
import { PiperTTSClient } from './piperTTSClient';

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
  enablePiper?: boolean;  // Piper TTS（轻量级本地TTS，推荐用于训练场景）
  piperConfig?: {
    baseUrl?: string;
    timeout?: number;
    retryCount?: number;
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

  // 配置 Piper TTS（轻量级本地TTS，推荐用于训练场景）
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
          priority: 1,  // 最高优先级（轻量级本地TTS）
          enabled: true,
          config: config.piperConfig,
        });
        console.log('[initTTS] ✅ Piper TTS 已启用（最高优先级）');
      } else {
        console.warn('[initTTS] ⚠️ Piper TTS 服务不可用，已禁用');
        // 如果 piper 不可用，禁用它
        ttsManager.configureProvider('piper', {
          provider: 'piper',
          enabled: false,
        });
      }
    } catch (error) {
      console.error('[initTTS] ❌ Piper TTS 健康检查失败:', error);
      // 即使健康检查失败，也尝试启用（可能服务刚启动，健康检查端点还未就绪）
      console.warn('[initTTS] ⚠️ Piper TTS 健康检查失败，但仍尝试启用（服务可能正在启动）');
      ttsManager.configureProvider('piper', {
        provider: 'piper',
        priority: 1,
        enabled: true,
        config: config.piperConfig,
      });
    }
  }

  // 配置 Edge TTS（禁用，只使用 Piper TTS）
  ttsManager.configureProvider('edge', {
    provider: 'edge',
    priority: 3,
    enabled: false,  // 禁用 Edge TTS
  });

  // 配置本地 TTS API（禁用，只使用 Piper TTS）
  ttsManager.configureProvider('local', {
    provider: 'local',
    priority: 4,
    enabled: false,  // 禁用本地 TTS API
  });

  // 浏览器 TTS（禁用，只使用 Piper TTS）
  ttsManager.configureProvider('browser', {
    provider: 'browser',
    priority: 5,
    enabled: false,  // 禁用浏览器 TTS
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
    enablePiper: true,  // 默认启用 Piper TTS（轻量级本地TTS，推荐用于训练场景）
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

