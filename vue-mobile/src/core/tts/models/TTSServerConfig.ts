/**
 * TTS 服务器配置模型
 */

export type TTSServerType = 'melo' | 'piper' | 'azure' | 'browser';
export type TTSServerHealth = 'available' | 'unavailable' | 'checking' | 'disabled';

/**
 * TTS 服务器连接配置
 */
export interface TTSConnectionConfig {
  host: string;                      // 主机地址
  port: number;                      // 端口
  protocol: 'http' | 'https';        // 协议
  baseUrl?: string;                  // 完整URL（可选，自动生成）
}

/**
 * Azure Speech 特定配置
 */
export interface AzureTTSProviderConfig {
  subscriptionKey: string;
  region: string;                    // eastus, westus, etc.
  voiceName: string;                 // zh-CN-XiaoxiaoNeural, etc.
  voiceStyle?: string;               // cheerful, sad, angry, etc.
  rate?: number;                     // 语速 (-50 to 50)
  pitch?: number;                    // 音调 (-50 to 50)
}

/**
 * MeLo TTS 特定配置
 */
export interface MeloTTSProviderConfig {
  speaker?: string;                  // 说话人（ZH, EN, JP, ES, FR, KR）
  speed?: number;                    // 语速 (0.5 - 2.0)
}

/**
 * Piper TTS 特定配置
 */
export interface PiperTTSProviderConfig {
  model: string;                     // 模型名称
  speakerId?: number;                // 说话人ID
}

/**
 * 浏览器 TTS 特定配置
 */
export interface BrowserTTSProviderConfig {
  voice?: string;                    // 浏览器语音名称
  rate?: number;                     // 语速 (0.1 - 10)
  pitch?: number;                    // 音调 (0 - 2)
  volume?: number;                   // 音量 (0 - 1)
}

/**
 * 提供者配置联合类型
 */
export interface TTSProviderConfigMap {
  melo?: MeloTTSProviderConfig;
  azure?: AzureTTSProviderConfig;
  piper?: PiperTTSProviderConfig;
  browser?: BrowserTTSProviderConfig;
}

/**
 * TTS 服务器状态
 */
export interface TTSServerStatus {
  health: TTSServerHealth;
  lastCheckTime?: number;
  latency?: number;                  // 延迟（毫秒）
  errorMessage?: string;             // 错误信息
}

/**
 * TTS 服务器元数据
 */
export interface TTSServerMetadata {
  createdAt: number;
  lastUsed?: number;
  isFavorite: boolean;
  tags?: string[];                   // 标签
}

/**
 * TTS 服务器配置
 */
export interface TTSServerConfig {
  // 基本信息
  id: string;                        // 唯一标识
  name: string;                      // 显示名称
  type: TTSServerType;               // 服务器类型
  enabled: boolean;                  // 启用/禁用开关
  priority: number;                  // 优先级（1-100，数字越小优先级越高）
  
  // 连接配置
  connection: TTSConnectionConfig;
  
  // 提供者特定配置
  providerConfig: TTSProviderConfigMap;
  
  // 运行时状态（不持久化）
  status?: TTSServerStatus;
  
  // 元数据
  metadata: TTSServerMetadata;
}

/**
 * 服务器健康检查结果
 */
export interface ServerHealthResult {
  available: boolean;
  latency?: number;
  errorMessage?: string;
}

/**
 * 默认连接配置
 */
export const DEFAULT_CONNECTION_CONFIG: Record<TTSServerType, TTSConnectionConfig> = {
  melo: {
    host: 'localhost',
    port: 7860,
    protocol: 'http'
  },
  piper: {
    host: 'localhost',
    port: 5000,
    protocol: 'http'
  },
  azure: {
    host: 'api.cognitive.microsoft.com',
    port: 443,
    protocol: 'https'
  },
  browser: {
    host: 'browser',
    port: 0,
    protocol: 'http'
  }
};

/**
 * 默认提供者配置
 */
export const DEFAULT_PROVIDER_CONFIG: Record<TTSServerType, TTSProviderConfigMap> = {
  melo: {
    melo: {
      speaker: 'ZH',
      speed: 1.0
    }
  },
  piper: {
    piper: {
      model: 'zh_CN-huayan-medium'
    }
  },
  azure: {
    azure: {
      subscriptionKey: '',
      region: 'eastus',
      voiceName: 'zh-CN-XiaoxiaoNeural'
    }
  },
  browser: {
    browser: {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0
    }
  }
};

/**
 * 生成完整的 URL
 */
export function getFullUrl(connection: TTSConnectionConfig): string {
  if (connection.baseUrl) {
    return connection.baseUrl;
  }
  
  if (connection.host === 'browser') {
    return 'browser://tts';
  }
  
  return `${connection.protocol}://${connection.host}:${connection.port}`;
}

/**
 * 生成唯一 ID
 */
export function generateServerId(): string {
  return `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建默认服务器配置
 */
export function createDefaultServerConfig(type: TTSServerType, name?: string): TTSServerConfig {
  // 设置优先级：melo(0) < azure(1) < piper(2) < browser(3)
  let priority = 3;
  if (type === 'melo') priority = 0;
  else if (type === 'azure') priority = 1;
  else if (type === 'piper') priority = 2;
  
  return {
    id: generateServerId(),
    name: name || `${type} TTS`,
    type,
    enabled: true,
    priority,
    connection: { ...DEFAULT_CONNECTION_CONFIG[type] },
    providerConfig: { ...DEFAULT_PROVIDER_CONFIG[type] },
    metadata: {
      createdAt: Date.now(),
      isFavorite: false
    }
  };
}

