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

