/**
 * 语音配置类型
 */

export interface VoiceConfig {
  gender?: 'male' | 'female'; // 性别
  dialect?: 'mandarin' | 'cantonese' | 'shanghai' | 'sichuan' | 'dongbei' | 'taiwan' | 'nanchang'; // 方言
  rate?: number; // 语速 (0.1 - 10)
  pitch?: number; // 音调 (0 - 2)
  volume?: number; // 音量 (0 - 1)
  voiceIndex?: number; // 语音索引（用于区分不同玩家）
  // 兼容新TTS/语音模块附加字段
  lang?: string;
  speaker?: string;
  voiceStyle?: string;
  model?: string;
  voiceId?: string;
}

