/**
 * 浏览器TTS客户端（使用speechSynthesis作为后备）
 * 注意：这是简化实现，主要用于测试和后备
 * 生产环境应该使用TTS API服务
 */

import { ITTSClient, TTSOptions, TTSResult } from './types';

export class BrowserTTSClient implements ITTSClient {
  private audioContext: AudioContext | null = null;
  
  constructor() {
    this.initAudioContext();
  }
  
  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('[BrowserTTSClient] AudioContext初始化失败:', error);
    }
  }
  
  async isAvailable(): Promise<boolean> {
    return 'speechSynthesis' in window && this.audioContext !== null;
  }
  
  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (!this.audioContext) {
      throw new Error('AudioContext未初始化');
    }
    
    if (!('speechSynthesis' in window)) {
      throw new Error('浏览器不支持speechSynthesis');
    }
    
    // 使用MediaRecorder捕获speechSynthesis的音频
    // 注意：这是一个简化实现，实际应该使用TTS API服务
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const lang = options.lang || 'zh-CN';
        utterance.lang = lang;
        
        if (options.voiceConfig) {
          if (options.voiceConfig.rate !== undefined) {
            utterance.rate = options.voiceConfig.rate;
          }
          if (options.voiceConfig.pitch !== undefined) {
            utterance.pitch = options.voiceConfig.pitch;
          }
          if (options.voiceConfig.volume !== undefined) {
            utterance.volume = options.voiceConfig.volume;
          }
        }
        
        // 估算时长（简单估算：每个字符约0.1秒）
        const estimatedDuration = text.length * 0.1;
        
        // 注意：这里简化处理，实际应该使用MediaRecorder捕获音频
        // 或者直接使用TTS API服务
        utterance.onend = () => {
          // 创建一个空的AudioBuffer作为占位符
          // 实际应该返回真实的音频数据
          const emptyBuffer = new ArrayBuffer(0);
          resolve({
            audioBuffer: emptyBuffer,
            duration: estimatedDuration,
            format: 'audio/wav'
          });
        };
        
        utterance.onerror = (error) => {
          reject(new Error(`speechSynthesis错误: ${error.error}`));
        };
        
        speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }
}

