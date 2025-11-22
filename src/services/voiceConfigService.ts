/**
 * 语音配置服务
 * 管理玩家语音配置的生成和管理
 */

import { VoiceConfig } from '../types/card';
import {
  VoiceGender,
  VoiceDialect,
  VoiceParamRanges,
  DEFAULT_VOICE_CONFIG_PARAMS,
  VoiceConfigGenerationParams
} from '../config/voiceConfig';

// 生成随机语音配置
export function generateRandomVoiceConfig(
  playerId?: number,
  params: VoiceConfigGenerationParams = DEFAULT_VOICE_CONFIG_PARAMS
): VoiceConfig {
  const seed = playerId !== undefined ? playerId : Math.floor(Math.random() * 1000);
  const { gender, dialects, paramRanges } = params;

  // 选择方言
  const dialect = dialects[seed % dialects.length];

  // 计算参数范围
  const rateRange = paramRanges.rate.max - paramRanges.rate.min;
  const pitchRange = paramRanges.pitch.max - paramRanges.pitch.min;
  const volumeRange = paramRanges.volume.max - paramRanges.volume.min;

  // 根据seed生成参数（确保同一玩家有固定配置）
  const rate = paramRanges.rate.min + (seed % Math.floor(rateRange * 100)) * 0.01;
  const pitch = paramRanges.pitch.min + (seed % Math.floor(pitchRange * 100)) * 0.01;
  const volume = paramRanges.volume.min + (seed % Math.floor(volumeRange * 100)) * 0.01;

  return {
    gender,
    dialect,
    rate: Math.min(rate, paramRanges.rate.max),
    pitch: Math.min(pitch, paramRanges.pitch.max),
    volume: Math.min(volume, paramRanges.volume.max),
    voiceIndex: playerId !== undefined ? playerId : seed
  };
}

// 从配置创建语音配置
export function createVoiceConfig(
  playerId: number,
  gender: VoiceGender,
  dialect: VoiceDialect,
  params?: Partial<VoiceParamRanges>
): VoiceConfig {
  const paramRanges = params || DEFAULT_VOICE_CONFIG_PARAMS.paramRanges;
  const seed = playerId;

  const rateRange = paramRanges.rate.max - paramRanges.rate.min;
  const pitchRange = paramRanges.pitch.max - paramRanges.pitch.min;
  const volumeRange = paramRanges.volume.max - paramRanges.volume.min;

  const rate = paramRanges.rate.min + (seed % Math.floor(rateRange * 100)) * 0.01;
  const pitch = paramRanges.pitch.min + (seed % Math.floor(pitchRange * 100)) * 0.01;
  const volume = paramRanges.volume.min + (seed % Math.floor(volumeRange * 100)) * 0.01;

  return {
    gender,
    dialect,
    rate: Math.min(rate, paramRanges.rate.max),
    pitch: Math.min(pitch, paramRanges.pitch.max),
    volume: Math.min(volume, paramRanges.volume.max),
    voiceIndex: playerId
  };
}

