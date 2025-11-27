/**
 * 吵架王语音服务调试工具
 * 提供调试和监控功能
 */

import { getQuarrelVoiceService } from '../services/quarrelVoiceService';
import { ttsAudioService } from '../services/ttsAudioService';

/**
 * 调试信息接口
 */
export interface QuarrelVoiceDebugInfo {
  serviceStatus: {
    initialized: boolean;
    playingRoles: string[];
    queueLength: number;
    hasLLM: boolean;
  };
  audioServiceStatus: {
    enabled: boolean;
    currentConcurrent: number;
    maxConcurrent: number;
    activeChannels: string[];
  };
  config: {
    maxConcurrent: number;
    quickJabMaxDuration: number;
    enableDucking: boolean;
    duckingLevel: number;
    longTextThreshold: number;
  };
}

/**
 * 获取完整的调试信息
 */
export function getQuarrelVoiceDebugInfo(): QuarrelVoiceDebugInfo {
  const service = getQuarrelVoiceService();
  const status = service.getStatus();
  const config = service.getConfig();
  const audioStatus = ttsAudioService.getStatus();

  return {
    serviceStatus: {
      initialized: status.initialized,
      playingRoles: status.playingRoles,
      queueLength: status.queueLength,
      hasLLM: status.hasLLM,
    },
    audioServiceStatus: {
      enabled: audioStatus.enabled,
      currentConcurrent: audioStatus.currentConcurrent,
      maxConcurrent: audioStatus.maxConcurrent,
      activeChannels: Array.from(audioStatus.activeSources.keys()),
    },
    config: {
      maxConcurrent: config.maxConcurrent,
      quickJabMaxDuration: config.quickJabMaxDuration,
      enableDucking: config.enableDucking,
      duckingLevel: config.duckingLevel,
      longTextThreshold: config.longTextThreshold,
    },
  };
}

/**
 * 打印调试信息到控制台
 */
export function printQuarrelVoiceDebugInfo(): void {
  const info = getQuarrelVoiceDebugInfo();
  
  console.group('🔊 QuarrelVoiceService 调试信息');
  
  console.group('📊 服务状态');
  console.log('已初始化:', info.serviceStatus.initialized);
  console.log('正在播放的角色:', info.serviceStatus.playingRoles);
  console.log('队列长度:', info.serviceStatus.queueLength);
  console.log('LLM可用:', info.serviceStatus.hasLLM);
  console.groupEnd();
  
  console.group('🎵 音频服务状态');
  console.log('已启用:', info.audioServiceStatus.enabled);
  console.log('当前并发:', `${info.audioServiceStatus.currentConcurrent}/${info.audioServiceStatus.maxConcurrent}`);
  console.log('活动声道:', info.audioServiceStatus.activeChannels);
  console.groupEnd();
  
  console.group('⚙️ 配置');
  console.log('最大并发:', info.config.maxConcurrent);
  console.log('QUICK_JAB最大时长:', `${info.config.quickJabMaxDuration}s`);
  console.log('启用Ducking:', info.config.enableDucking);
  console.log('Ducking级别:', info.config.duckingLevel);
  console.log('长文本阈值:', info.config.longTextThreshold);
  console.groupEnd();
  
  console.groupEnd();
}

/**
 * 监控服务状态（定期打印）
 */
export function startQuarrelVoiceMonitoring(interval: number = 5000): () => void {
  const timer = setInterval(() => {
    const info = getQuarrelVoiceDebugInfo();
    
    // 只在有活动时打印
    if (info.serviceStatus.playingRoles.length > 0 || info.serviceStatus.queueLength > 0) {
      console.log(
        `[QuarrelVoice监控] 播放:${info.serviceStatus.playingRoles.length} ` +
        `队列:${info.serviceStatus.queueLength} ` +
        `并发:${info.audioServiceStatus.currentConcurrent}/${info.audioServiceStatus.maxConcurrent}`
      );
    }
  }, interval);

  // 返回停止函数
  return () => clearInterval(timer);
}

/**
 * 测试服务连接
 */
export async function testQuarrelVoiceService(): Promise<{
  success: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 测试服务初始化
    const service = getQuarrelVoiceService();
    if (!service) {
      errors.push('无法获取QuarrelVoiceService实例');
      return { success: false, errors, warnings };
    }

    await service.init();
    const status = service.getStatus();
    
    if (!status.initialized) {
      errors.push('服务初始化失败');
    }

    if (!status.hasLLM) {
      warnings.push('LLM不可用，长吵架分段将使用标点符号分段');
    }

    // 测试音频服务
    const audioStatus = ttsAudioService.getStatus();
    if (!audioStatus.enabled) {
      errors.push('音频服务未启用');
    }

    if (audioStatus.maxConcurrent === 0) {
      warnings.push('最大并发数设置为0，无法同时播放');
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`测试失败: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      errors,
      warnings,
    };
  }
}

/**
 * 在浏览器控制台暴露调试工具
 */
export function exposeQuarrelVoiceDebugTools(): void {
  if (typeof window !== 'undefined') {
    (window as any).quarrelVoiceDebug = {
      getInfo: getQuarrelVoiceDebugInfo,
      printInfo: printQuarrelVoiceDebugInfo,
      startMonitoring: startQuarrelVoiceMonitoring,
      test: testQuarrelVoiceService,
    };
    console.log('🔧 QuarrelVoice调试工具已暴露到 window.quarrelVoiceDebug');
    console.log('   使用 window.quarrelVoiceDebug.printInfo() 查看状态');
    console.log('   使用 window.quarrelVoiceDebug.test() 测试服务');
  }
}

