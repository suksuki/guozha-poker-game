/**
 * 语音提示工具
 * 使用独立的语音服务实现文本转语音
 * 保留工具函数（如playToSpeechText）供其他模块使用
 */

import { Card, Play, CardType, Rank, Suit, VoiceConfig } from '../types/card';
import { speakText as voiceServiceSpeak, stopSpeech as voiceServiceStop, waitForVoices as voiceServiceWaitForVoices, listAvailableVoices as voiceServiceListAvailableVoices, isSpeechSupported } from '../services/voiceService';
import { generateRandomVoiceConfig as generateVoiceConfig } from '../services/voiceConfigService';

// 重新导出语音服务函数
export { isSpeechSupported, waitForVoices, listAvailableVoices } from '../services/voiceService';
export { generateRandomVoiceConfig } from '../services/voiceConfigService';

// 将牌型转换为中文语音文本
export function playToSpeechText(play: Play): string {
  const { type, cards } = play;
  const cardCount = cards.length;
  
  // 获取第一张牌的rank，用于显示点数
  const firstCard = cards[0];
  const rank = firstCard.rank;
  
  // 将rank转换为中文
  const rankText = rankToChinese(rank);
  
  switch (type) {
    case CardType.SINGLE:
      return rankText;
    
    case CardType.PAIR:
      return `对${rankText}`;
    
    case CardType.TRIPLE:
      return `三个${rankText}`;
    
    case CardType.BOMB:
      return `${cardCount}个${rankText}`;
    
    case CardType.DUN:
      return `${cardCount}个${rankText}`;
    
    default:
      return `${cardCount}张牌`;
  }
}

// 将rank转换为中文
function rankToChinese(rank: Rank): string {
  switch (rank) {
    case Rank.THREE: return '三';
    case Rank.FOUR: return '四';
    case Rank.FIVE: return '五';
    case Rank.SIX: return '六';
    case Rank.SEVEN: return '七';
    case Rank.EIGHT: return '八';
    case Rank.NINE: return '九';
    case Rank.TEN: return '十';
    case Rank.JACK: return '钩';
    case Rank.QUEEN: return '圈圈';
    case Rank.KING: return 'K';
    case Rank.ACE: return '桌桌';
    case Rank.TWO: return '喔喔';
    case Rank.JOKER_SMALL: return '小王';
    case Rank.JOKER_BIG: return '大王';
    default: return '未知';
  }
}

// 播放语音（返回Promise，等待播放完成）
// 兼容旧接口，但内部使用新的语音服务
export function speakText(text: string, options?: {
  rate?: number;  // 语速 (0.1 - 10)
  pitch?: number; // 音调 (0 - 2)
  volume?: number; // 音量 (0 - 1)
  voiceConfig?: VoiceConfig; // 语音配置（性别、方言等）
}): Promise<void> {
  // 如果有options但没有voiceConfig，创建一个临时的voiceConfig
  let voiceConfig = options?.voiceConfig;
  if (!voiceConfig && (options?.rate || options?.pitch || options?.volume)) {
    voiceConfig = {
      gender: 'female',
      dialect: 'mandarin',
      rate: options.rate,
      pitch: options.pitch,
      volume: options.volume
    };
  }
  
  return voiceServiceSpeak(text, voiceConfig);
}

// 播放出牌语音提示（返回Promise，等待播放完成）
export function speakPlay(play: Play, voiceConfig?: VoiceConfig): Promise<void> {
  const text = playToSpeechText(play);
  return speakText(text, { voiceConfig });
}

// 播放"要不起"语音提示（返回Promise，等待播放完成）
export function speakPass(voiceConfig?: VoiceConfig): Promise<void> {
  return speakText('要不起', { voiceConfig });
}

// 停止语音（重新导出）
export { stopSpeech } from '../services/voiceService';

