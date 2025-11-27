/**
 * 检查本地TTS服务状态工具
 * 帮助用户了解哪些本地TTS服务可用
 */

import { getTTSServiceManager, TTSProvider } from '../tts/ttsServiceManager';

/**
 * 本地TTS服务信息
 */
export interface LocalTTSServiceInfo {
  name: string;
  provider: TTSProvider;
  defaultUrl: string;
  description: string;
  checkHealth?: () => Promise<boolean>;
}

/**
 * 所有本地TTS服务列表
 */
export const LOCAL_TTS_SERVICES: LocalTTSServiceInfo[] = [
  {
    name: 'GPT-SoVITS',
    provider: 'gpt_sovits',
    defaultUrl: 'http://localhost:9880',
    description: '零样本TTS，支持声音克隆，高质量',
    checkHealth: async () => {
      try {
        const response = await fetch('http://localhost:9880/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Coqui TTS',
    provider: 'coqui',
    defaultUrl: 'http://localhost:5002',
    description: '开源多语言TTS，支持声音克隆',
    checkHealth: async () => {
      try {
        const response = await fetch('http://localhost:5002/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Piper TTS',
    provider: 'piper',
    defaultUrl: 'http://localhost:5000',
    description: '轻量级本地TTS（推荐用于训练场景），极轻量、速度快、音质好',
    checkHealth: async () => {
      try {
        const response = await fetch('http://localhost:5000/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  },
  {
    name: '本地TTS API',
    provider: 'local',
    defaultUrl: 'http://localhost:8000',
    description: '通用本地TTS API服务',
    checkHealth: async () => {
      try {
        const response = await fetch('http://localhost:8000/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  },
  {
    name: 'Edge TTS',
    provider: 'edge',
    defaultUrl: '/api/edge-tts',
    description: 'Edge TTS（需要后端代理）',
    checkHealth: async () => {
      try {
        const response = await fetch('/api/edge-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'test', voice: 'zh-CN-XiaoxiaoNeural' }),
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  },
  {
    name: '浏览器TTS',
    provider: 'browser',
    defaultUrl: 'speechSynthesis',
    description: '浏览器原生TTS（单声道，功能受限）',
    checkHealth: async () => {
      return 'speechSynthesis' in window;
    }
  }
];

/**
 * 检查所有本地TTS服务状态
 */
export async function checkAllLocalTTSServices(): Promise<
  Array<LocalTTSServiceInfo & { healthy: boolean; status: string }>
> {
  const results = await Promise.all(
    LOCAL_TTS_SERVICES.map(async (service) => {
      let healthy = false;
      let status = '未知';

      try {
        if (service.checkHealth) {
          healthy = await service.checkHealth();
          status = healthy ? '✅ 健康' : '❌ 不健康';
        } else {
          // 使用TTS服务管理器检查
          const ttsManager = getTTSServiceManager();
          const providerStatus = ttsManager.getProviderStatus();
          const serviceStatus = providerStatus[service.provider];
          if (serviceStatus) {
            healthy = serviceStatus.enabled && serviceStatus.healthy;
            status = healthy ? '✅ 健康' : serviceStatus.enabled ? '❌ 不健康' : '⚠️ 未启用';
          } else {
            status = '⚠️ 未配置';
          }
        }
      } catch (error) {
        status = `❌ 检查失败: ${error instanceof Error ? error.message : String(error)}`;
      }

      return {
        ...service,
        healthy,
        status
      };
    })
  );

  return results;
}

/**
 * 获取可用的本地TTS服务
 */
export async function getAvailableLocalTTSServices(): Promise<LocalTTSServiceInfo[]> {
  const allStatus = await checkAllLocalTTSServices();
  return allStatus
    .filter(s => s.healthy)
    .map(({ healthy, status, ...rest }) => rest);
}

/**
 * 打印所有本地TTS服务状态（用于调试）
 */
export async function printLocalTTSServicesStatus(): Promise<void> {
  const status = await checkAllLocalTTSServices();
  
  console.group('🔊 本地TTS服务状态');
  status.forEach(service => {
    console.log(`${service.status} ${service.name} (${service.provider})`);
    console.log(`  地址: ${service.defaultUrl}`);
    console.log(`  说明: ${service.description}`);
  });
  console.groupEnd();

  const available = status.filter(s => s.healthy);
  if (available.length === 0) {
    console.warn('⚠️ 没有可用的本地TTS服务！');
    console.log('💡 建议（按推荐顺序）：');
    console.log('  1. 🎯 启动 Piper TTS (http://localhost:5000) - 推荐！轻量级，适合训练场景');
    console.log('     📖 安装指南: docs/setup/piper-tts-setup.md');
    console.log('  2. 启动 GPT-SoVITS (http://localhost:9880) - 高质量，支持声音克隆');
    console.log('  3. 启动 Coqui TTS (http://localhost:5002) - 多语言支持');
    console.log('  4. 配置 Edge TTS 后端代理 (/api/edge-tts) - 在线服务');
    console.log('  5. 或使用浏览器TTS（功能受限）');
  } else {
    console.log(`✅ 找到 ${available.length} 个可用的本地TTS服务`);
  }
}

/**
 * 在浏览器控制台暴露检查工具
 */
export function exposeLocalTTSChecker(): void {
  if (typeof window !== 'undefined') {
    (window as any).checkLocalTTS = {
      checkAll: checkAllLocalTTSServices,
      getAvailable: getAvailableLocalTTSServices,
      printStatus: printLocalTTSServicesStatus,
    };
    console.log('🔧 本地TTS检查工具已暴露到 window.checkLocalTTS');
    console.log('   使用 window.checkLocalTTS.printStatus() 查看状态');
  }
}

