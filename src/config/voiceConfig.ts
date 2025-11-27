/**
 * 语音配置文件
 * 管理所有语音相关的配置
 */

export type VoiceGender = 'male' | 'female';
export type VoiceDialect = 'mandarin' | 'cantonese' | 'nanchang';

// 支持的方言列表
export const SUPPORTED_DIALECTS: VoiceDialect[] = ['mandarin', 'cantonese', 'nanchang'];

// 方言到语言代码的映射
// 注意：南昌话使用普通话TTS，因为TTS不支持南昌话
export const DIALECT_LANG_MAP: Record<VoiceDialect, string> = {
  mandarin: 'zh-CN',
  cantonese: 'zh-HK',
  nanchang: 'zh-CN' // 南昌话使用普通话TTS，文本会通过映射转换为南昌话
};

// 语音参数范围配置
export interface VoiceParamRanges {
  rate: { min: number; max: number }; // 语速范围
  pitch: { min: number; max: number }; // 音调范围
  volume: { min: number; max: number }; // 音量范围
}

// 默认语音参数范围
export const DEFAULT_VOICE_PARAM_RANGES: VoiceParamRanges = {
  rate: { min: 0.9, max: 1.1 }, // 恢复正常语速范围
  pitch: { min: 1.0, max: 1.3 }, // 女声范围
  volume: { min: 0.95, max: 1.0 }
};

// 语音配置生成参数
export interface VoiceConfigGenerationParams {
  gender: VoiceGender;
  dialects: VoiceDialect[];
  paramRanges: VoiceParamRanges;
}

// 默认语音配置生成参数
export const DEFAULT_VOICE_CONFIG_PARAMS: VoiceConfigGenerationParams = {
  gender: 'female', // 全用女声
  dialects: SUPPORTED_DIALECTS, // 只用普通话和粤语
  paramRanges: DEFAULT_VOICE_PARAM_RANGES
};

// 语音服务配置
export interface VoiceServiceConfig {
  maxQueueSize: number; // 最大队列长度
  deduplicationWindow: number; // 去重时间窗口（毫秒）
  defaultTimeout: number; // 默认超时时间（毫秒）
}

// 默认语音服务配置
export const DEFAULT_VOICE_SERVICE_CONFIG: VoiceServiceConfig = {
  maxQueueSize: 10, // 串行播放，减少队列长度（从20降到10），提高响应速度
  deduplicationWindow: 3000, // 3秒（从2秒增加到3秒，减少报牌频繁中断）
  defaultTimeout: 5000 // 5秒
};

// TTS服务商选择
export type TTSProvider = 'auto' | 'gpt_sovits' | 'coqui' | 'edge' | 'local' | 'browser';

// 多声道播放配置
export interface MultiChannelConfig {
  enabled: boolean;  // 是否启用多声道同时播放
  maxConcurrentSpeakers: number;  // 最多同时播放数（2-3）
  useTTS: boolean;  // 是否使用本地TTS服务（否则使用speechSynthesis）
  ttsProvider?: TTSProvider;  // 指定TTS服务商（'auto'表示自动选择）
  enableDucking?: boolean;  // 是否启用ducking（降低其他角色音量）
  duckingLevel?: number;  // ducking时其他角色的音量级别（0-1，默认0.25）
  enableAudioCache?: boolean;  // 是否启用音频缓存（默认true）
  cacheSize?: number;  // 音频缓存大小（默认100）
}

// 默认多声道配置
// 注意：按照设计文档，必须使用TTS API服务生成音频文件（ArrayBuffer/AudioBuffer），
// 然后通过Web Audio API播放，支持真正的多声道同时播放。
// 不使用 speechSynthesis（它是单通道队列，会让 AI 排队）
// 只使用TTS API服务（GPT-SoVITS、Coqui TTS、Edge TTS等）
export const DEFAULT_MULTI_CHANNEL_CONFIG: MultiChannelConfig = {
  enabled: true,  // 默认启用多声道（通过TTS API服务 + Web Audio API实现）
  maxConcurrentSpeakers: 2,  // 最多2个同时播放（符合设计文档）
  useTTS: true,  // 必须使用TTS API服务（不使用speechSynthesis）
  ttsProvider: 'auto',  // 自动选择最佳TTS服务商
  enableDucking: true,  // 启用ducking
  duckingLevel: 0.25,  // ducking时其他角色音量降低到25%
  enableAudioCache: true,  // 启用音频缓存
  cacheSize: 100  // 缓存最多100个音频
};

