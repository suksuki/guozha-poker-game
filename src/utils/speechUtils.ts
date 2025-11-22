/**
 * 语音提示工具
 * 使用Web Speech API实现文本转语音
 */

import { Card, Play, CardType, Rank, Suit } from '../types/card';

// 检查浏览器是否支持语音合成
export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

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

// 语音播放队列管理
let isSpeaking = false;
let speechQueue: Array<{ text: string; options?: any; resolve: () => void }> = [];
let lastSpeechText = ''; // 记录最后播放的语音文本，用于去重
let lastSpeechTime = 0; // 记录最后播放的时间
let currentSpeechText = ''; // 记录当前正在播放的语音文本

// 处理语音队列
function processSpeechQueue() {
  if (isSpeaking || speechQueue.length === 0) {
    return;
  }

  const item = speechQueue.shift();
  if (!item) return;

  isSpeaking = true;
  const { text, options, resolve } = item;
  
  // 更新当前正在播放的语音
  currentSpeechText = text;

  if (!isSpeechSupported()) {
    console.warn('浏览器不支持语音合成');
    setTimeout(() => {
      isSpeaking = false;
      resolve();
      processSpeechQueue(); // 处理下一个
    }, 300);
    return;
  }

  // 获取voices（某些浏览器需要等待加载）
  let voices = window.speechSynthesis.getVoices();
  
  // 如果voices还没加载，直接播放（使用默认语音）
  // 某些浏览器可能需要等待，但我们不阻塞，让浏览器使用默认语音
  if (voices.length === 0) {
    console.warn('语音列表未加载，使用默认语音');
  }
  
  // 直接播放语音
  const utterance = new SpeechSynthesisUtterance(text);
  
  // 设置语言为中文
  utterance.lang = 'zh-CN';
  
  // 设置语音参数
  utterance.rate = options?.rate ?? 1.0; // 正常语速
  utterance.pitch = options?.pitch ?? 1.0; // 正常音调
  utterance.volume = options?.volume ?? 1.0; // 最大音量
  
  // 尝试使用中文语音（如果voices已加载）
  if (voices.length > 0) {
    const chineseVoice = voices.find(voice => 
      voice.lang.includes('zh') || voice.lang.includes('CN')
    );
    
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }
  }
  
  // 计算预计播放时间（文本长度 * 每字符时间 * 语速倒数）
  // 中文字符大约每个需要0.3-0.5秒，根据语速调整
  const estimatedDuration = Math.max(
    text.length * 0.4 * (1 / (options?.rate ?? 1.0)), // 基础时间
    500 // 最小500ms
  );
  
  let resolved = false;
  let timeoutId: NodeJS.Timeout | null = null;
  
  // 清理函数
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (!resolved) {
      resolved = true;
      isSpeaking = false;
      // 更新最后播放的语音信息
      lastSpeechText = text;
      lastSpeechTime = Date.now();
      // 清除当前正在播放的语音
      currentSpeechText = '';
      resolve();
      // 延迟一下再处理下一个，确保语音完全结束
      setTimeout(() => {
        processSpeechQueue(); // 处理下一个
      }, 100);
    }
  };
  
  // 设置播放完成回调
  utterance.onend = () => {
    cleanup();
  };
  
  // 设置错误回调（即使出错也继续）
  utterance.onerror = (error) => {
    console.warn('语音播放出错:', error);
    cleanup();
  };
  
  // 设置超时保护，确保即使语音没有正常结束也能继续
  timeoutId = setTimeout(() => {
    if (!resolved && isSpeaking) {
      // 停止可能还在播放的语音
      window.speechSynthesis.cancel();
      cleanup();
    }
  }, estimatedDuration + 500); // 额外500ms缓冲
  
  // 播放语音
  try {
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('播放语音时出错:', error);
    cleanup();
  }
}

// 播放语音（返回Promise，等待播放完成）
export function speakText(text: string, options?: {
  rate?: number;  // 语速 (0.1 - 10)
  pitch?: number; // 音调 (0 - 2)
  volume?: number; // 音量 (0 - 1)
}): Promise<void> {
  return new Promise((resolve) => {
    // 去重检查：
    // 1. 如果和当前正在播放的语音相同，则忽略
    // 2. 如果和最后播放的语音相同，且时间间隔小于2秒，则忽略
    // 3. 如果队列中已经有相同的语音，则忽略
    const now = Date.now();
    
    if (text === currentSpeechText) {
      console.log('忽略重复的语音（正在播放）:', text);
      resolve();
      return;
    }
    
    if (text === lastSpeechText && (now - lastSpeechTime) < 2000) {
      console.log('忽略重复的语音（最近播放过）:', text);
      resolve();
      return;
    }
    
    // 检查队列中是否已有相同的语音
    if (speechQueue.some(item => item.text === text)) {
      console.log('忽略重复的语音（已在队列中）:', text);
      resolve();
      return;
    }
    
    // 添加到队列
    speechQueue.push({ text, options, resolve });
    // 尝试处理队列
    processSpeechQueue();
  });
}

// 播放出牌语音提示（返回Promise，等待播放完成）
export function speakPlay(play: Play): Promise<void> {
  const text = playToSpeechText(play);
  return speakText(text);
}

// 播放"要不起"语音提示（返回Promise，等待播放完成）
export function speakPass(): Promise<void> {
  return speakText('要不起');
}

// 停止语音
export function stopSpeech(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

// 等待语音加载完成（某些浏览器需要）
export function waitForVoices(callback: () => void): void {
  if (!isSpeechSupported()) {
    callback();
    return;
  }
  
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    callback();
  } else {
    // 某些浏览器需要等待voices加载
    window.speechSynthesis.onvoiceschanged = () => {
      callback();
    };
  }
}

