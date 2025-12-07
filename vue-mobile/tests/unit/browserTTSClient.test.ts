/**
 * 浏览器TTS客户端单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserTTSClient } from '../../src/services/tts/browserTTSClient';

// Mock speechSynthesis
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [])
};

const mockUtterance = {
  lang: '',
  rate: 1,
  pitch: 1,
  volume: 1,
  onend: null as any,
  onerror: null as any
};

beforeEach(() => {
  vi.clearAllMocks();
  
  // Mock window.speechSynthesis
  Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
    configurable: true
  });

  // Mock AudioContext
  const mockAudioContext = {
    createGain: vi.fn(),
    createBufferSource: vi.fn(),
    decodeAudioData: vi.fn(),
    destination: {}
  };
  Object.defineProperty(window, 'AudioContext', {
    value: vi.fn(() => mockAudioContext),
    writable: true,
    configurable: true
  });
  Object.defineProperty(window, 'webkitAudioContext', {
    value: vi.fn(() => mockAudioContext),
    writable: true,
    configurable: true
  });

  // Mock SpeechSynthesisUtterance
  global.SpeechSynthesisUtterance = vi.fn((text: string) => {
    const utterance = { ...mockUtterance, text };
    return utterance;
  }) as any;
});

describe('BrowserTTSClient', () => {
  describe('isAvailable', () => {
    it('应该检查speechSynthesis是否可用', async () => {
      const client = new BrowserTTSClient();
      const available = await client.isAvailable();
      
      expect(available).toBe(true);
    });

    it('如果speechSynthesis不可用，应该返回false', async () => {
      // @ts-ignore
      delete window.speechSynthesis;
      
      const client = new BrowserTTSClient();
      const available = await client.isAvailable();
      
      expect(available).toBe(false);
    });
  });

  describe('synthesize', () => {
    it('应该创建SpeechSynthesisUtterance并调用speechSynthesis.speak', async () => {
      // Mock utterance事件
      let utteranceInstance: any = null;
      global.SpeechSynthesisUtterance = vi.fn((text: string) => {
        utteranceInstance = {
          text,
          lang: '',
          rate: 1,
          pitch: 1,
          volume: 1,
          onend: null,
          onerror: null
        };
        return utteranceInstance;
      }) as any;

      const client = new BrowserTTSClient();
      const promise = client.synthesize('测试文本');

      // 模拟utterance结束
      setTimeout(() => {
        if (utteranceInstance?.onend) {
          utteranceInstance.onend();
        }
      }, 10);

      await promise;

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('应该应用voiceConfig参数', async () => {
      let utteranceInstance: any = null;
      global.SpeechSynthesisUtterance = vi.fn((text: string) => {
        utteranceInstance = {
          text,
          lang: '',
          rate: 1,
          pitch: 1,
          volume: 1,
          onend: null,
          onerror: null
        };
        return utteranceInstance;
      }) as any;

      const client = new BrowserTTSClient();
      const promise = client.synthesize('测试', {
        voiceConfig: {
          rate: 1.2,
          pitch: 1.1,
          volume: 0.8
        }
      });

      setTimeout(() => {
        if (utteranceInstance?.onend) {
          utteranceInstance.onend();
        }
      }, 10);

      await promise;

      expect(utteranceInstance.rate).toBe(1.2);
      expect(utteranceInstance.pitch).toBe(1.1);
      expect(utteranceInstance.volume).toBe(0.8);
    });

    it('如果AudioContext未初始化，应该抛出错误', async () => {
      // Mock AudioContext失败
      const originalAudioContext = window.AudioContext;
      const originalWebkitAudioContext = (window as any).webkitAudioContext;
      
      // @ts-ignore
      delete window.AudioContext;
      // @ts-ignore
      delete (window as any).webkitAudioContext;

      const client = new BrowserTTSClient();
      
      await expect(client.synthesize('测试')).rejects.toThrow('AudioContext未初始化');

      // 恢复
      window.AudioContext = originalAudioContext;
      (window as any).webkitAudioContext = originalWebkitAudioContext;
    }, 10000);
  });
});

