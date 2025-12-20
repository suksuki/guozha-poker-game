/**
 * 音效服务
 * 管理游戏中的音效播放
 * 使用 Web Audio API 实现独立的音效声道，避免与语音冲突
 */

import { AnimationIntensity } from '../types/gameEvent';

/**
 * 音效配置
 */
interface SoundConfig {
  volume: number;  // 音量 (0-1)
  preload: boolean; // 是否预加载
}

/**
 * 音效服务类
 * 使用 Web Audio API 实现独立的音效播放
 */
class SoundService {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private htmlAudioSounds: Map<string, HTMLAudioElement> = new Map(); // 备用方案
  private config: SoundConfig = {
    volume: 0.7,
    preload: true
  };
  private isInitialized = false;

  /**
   * 初始化音频上下文
   */
  private initAudioContext(): void {
    if (this.audioContext) {
      return;
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
    }
  }

  /**
   * 加载音效（优先使用 HTML5 Audio，因为对格式支持更好）
   * @param name 音效名称
   * @param url 音效文件路径
   */
  async loadSound(name: string, url: string): Promise<void> {
    if (this.sounds.has(name) || this.htmlAudioSounds.has(name)) {
      return; // 已加载
    }

    // 对于 AIFF 文件，直接使用 HTML5 Audio（Web Audio API 不支持 AIFF）
    const isAIFF = url.toLowerCase().endsWith('.aiff') || url.toLowerCase().endsWith('.aif');
    
    if (isAIFF) {
      // 使用 HTML5 Audio 加载 AIFF 文件
      return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.volume = this.config.volume;
        audio.preload = this.config.preload ? 'auto' : 'none';
        
        // 添加超时处理
        const timeout = setTimeout(() => {
          (audio as any).__loadFailed = true;
          reject(new Error(`HTML5 Audio 加载超时: ${name}`));
        }, 10000); // 10秒超时
        
        audio.addEventListener('error', (e) => {
          clearTimeout(timeout);
          const error = audio.error;          (audio as any).__loadFailed = true;
          reject(new Error(`HTML5 Audio 加载失败: ${name} (${error?.code || 'unknown'})`));
        });
        
        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          this.htmlAudioSounds.set(name, audio);
          resolve();
        });
        
        // 如果已经可以播放，立即解析
        if (audio.readyState >= 3) {
          clearTimeout(timeout);
          this.htmlAudioSounds.set(name, audio);
          resolve();
        }
        
        // 尝试加载（触发网络请求）
        audio.load();
      });
    }

    // 初始化音频上下文（用于 MP3 等格式）
    this.initAudioContext();

    // 如果 Web Audio API 不可用，使用 HTML5 Audio 作为备用
    if (!this.audioContext) {
      return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.volume = this.config.volume;
        audio.preload = this.config.preload ? 'auto' : 'none';
        
        audio.addEventListener('error', (e) => {
          (audio as any).__loadFailed = true;
          reject(new Error(`HTML5 Audio 加载失败: ${name}`));
        });
        
        audio.addEventListener('canplaythrough', () => {
          this.htmlAudioSounds.set(name, audio);
          resolve();
        });
        
        // 如果已经可以播放，立即解析
        if (audio.readyState >= 3) {
          this.htmlAudioSounds.set(name, audio);
          resolve();
        }
      });
    }

    // 使用 Web Audio API 加载（主要用于 MP3）
    try {
      const response = await fetch(url);      
      if (!response.ok) {
        // 文件不存在，抛出错误让调用者继续尝试下一个路径
        throw new Error(`文件不存在 (${response.status} ${response.statusText})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds.set(name, audioBuffer);    } catch (error) {
      // 解码失败，尝试使用 HTML5 Audio 作为备用      
      return new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.volume = this.config.volume;
        audio.preload = this.config.preload ? 'auto' : 'none';
        
        audio.addEventListener('error', (e) => {
          (audio as any).__loadFailed = true;
          reject(new Error(`HTML5 Audio 加载失败: ${name}`));
        });
        
        audio.addEventListener('canplaythrough', () => {
          this.htmlAudioSounds.set(name, audio);
          resolve();
        });
        
        // 如果已经可以播放，立即解析
        if (audio.readyState >= 3) {
          this.htmlAudioSounds.set(name, audio);
          resolve();
        }
      });
    }
  }

  /**
   * 预加载所有音效
   */
  async preloadSounds(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 初始化音频上下文
    this.initAudioContext();

    // 音效文件路径（Vite 项目使用 public 目录，路径从根目录开始）
    // 支持 .mp3 和 .aiff 格式（系统音效可能是 .aiff）
    // 优先使用 .aiff（系统音效），如果不存在则尝试 .mp3
    const soundPaths: Record<string, string[]> = {
      'dun-small': ['/sounds/dun-small.aiff', '/sounds/dun-small.mp3'],
      'dun-medium': ['/sounds/dun-medium.aiff', '/sounds/dun-medium.mp3'],
      'dun-large': ['/sounds/dun-large.aiff', '/sounds/dun-large.mp3'],
      'dun-huge': ['/sounds/dun-huge.aiff', '/sounds/dun-huge.mp3'],
      'bomb': ['/sounds/bomb.aiff', '/sounds/bomb.mp3'],
      'explosion': ['/sounds/explosion.aiff', '/sounds/explosion.mp3'],
    };

    
    // 并行加载所有音效，尝试每个路径直到成功
    const loadPromises = Object.entries(soundPaths).map(async ([name, paths]) => {
      let lastError: Error | null = null;
      // 尝试每个路径，直到成功加载
      for (const path of paths) {
        try {
          await this.loadSound(name, path);
          // 如果加载成功（已存在于sounds或htmlAudioSounds中），跳出循环
          if (this.sounds.has(name) || this.htmlAudioSounds.has(name)) {
            return; // 成功加载，退出
          }
        } catch (error) {
          lastError = error as Error;
          // 继续尝试下一个路径
          continue;
        }
      }
      // 所有路径都失败，标记为缺失
      if (lastError) {
        (this as any).__soundFileMissing = (this as any).__soundFileMissing || new Set();
        (this as any).__soundFileMissing.add(name);
      }
    });

    await Promise.all(loadPromises);
    
    this.isInitialized = true;  }

  /**
   * 播放音效（使用 Web Audio API）
   * 系统声音通过独立声道播放（中央声道）
   * @param name 音效名称
   * @param volume 音量（可选，覆盖默认音量）
   */
  playSound(name: string, volume?: number): void {
    // 确保音频上下文已初始化
    this.initAudioContext();

    const vol = volume !== undefined ? volume : this.config.volume;

    // 检查音效文件是否缺失，如果缺失直接使用备用音效
    if ((this as any).__soundFileMissing?.has(name)) {
      this.playFallbackSound(name, volume);
      return;
    }

    // 优先使用 Web Audio API
    const audioBuffer = this.sounds.get(name);
    if (audioBuffer && this.audioContext) {
      try {
        // 恢复音频上下文（如果被暂停）
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }

        // 尝试使用多声道服务播放系统声音（如果可用）
        try {
          const { webAudioVoiceService } = require('./webAudioVoiceService');
          webAudioVoiceService.playSystemSound(audioBuffer, vol);          return;
        } catch (e) {
          // 多声道服务不可用，使用普通播放
        }

        // 普通播放（中央声道）
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = audioBuffer;
        gainNode.gain.value = vol;
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        source.start(0);        return;
      } catch (error) {
      }
    }

    // 回退到 HTML5 Audio
    const htmlAudio = this.htmlAudioSounds.get(name);
    if (htmlAudio) {
      // 检查是否加载失败
      if ((htmlAudio as any).__loadFailed) {
        this.playFallbackSound(name, volume);
        return;
      }

      const newAudio = htmlAudio.cloneNode() as HTMLAudioElement;
      newAudio.volume = vol;      
      newAudio.play().catch(error => {
        if (error.name === 'NotAllowedError') {
        } else {
          // 使用备用音效
          this.playFallbackSound(name, volume);
        }
      });
      return;
    }

    // 如果音效未加载，直接使用备用音效（因为文件不存在）
    this.playFallbackSound(name, volume);
  }

  /**
   * 播放备用音效（当音效文件不存在时使用）
   * 为不同类型的音效生成不同强度的合成音效
   */
  private playFallbackSound(name: string, volume?: number): void {
    // 确保音频上下文已初始化
    this.initAudioContext();

    if (!this.audioContext) {
      return;
    }

    try {
      // 恢复音频上下文（如果被暂停）
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const vol = volume !== undefined ? volume : this.config.volume * 0.5;
      const now = this.audioContext.currentTime;

      // 根据音效类型设置不同的参数
      let duration: number;
      let baseFreq: number;
      let endFreq: number;
      let noiseLevel: number;

      if (name.startsWith('dun-')) {
        // 出墩音效：根据大小设置不同参数
        switch (name) {
          case 'dun-small':
            duration = 0.15;
            baseFreq = 400;
            endFreq = 300;
            noiseLevel = 0.3;
            break;
          case 'dun-medium':
            duration = 0.2;
            baseFreq = 300;
            endFreq = 200;
            noiseLevel = 0.4;
            break;
          case 'dun-large':
            duration = 0.3;
            baseFreq = 200;
            endFreq = 100;
            noiseLevel = 0.5;
            break;
          case 'dun-huge':
            duration = 0.4;
            baseFreq = 150;
            endFreq = 60;
            noiseLevel = 0.6;
            break;
          default:
            duration = 0.2;
            baseFreq = 300;
            endFreq = 200;
            noiseLevel = 0.4;
        }
      } else {
        // 炸弹/爆炸音效
        duration = 0.4;
        baseFreq = 60;
        endFreq = 30;
        noiseLevel = 0.5;
      }

      const masterGain = this.audioContext.createGain();
      masterGain.connect(this.audioContext.destination);
      
      // 主音调
      const mainOsc = this.audioContext.createOscillator();
      const mainGain = this.audioContext.createGain();
      mainOsc.type = name.startsWith('dun-') ? 'sine' : 'sawtooth';
      mainOsc.frequency.setValueAtTime(baseFreq, now);
      mainOsc.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.3);
      mainGain.gain.setValueAtTime(vol, now);
      mainGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
      mainOsc.connect(mainGain);
      mainGain.connect(masterGain);
      
      // 噪声层（仅对较大的音效）
      if (noiseLevel > 0) {
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = Math.random() * 2 - 1;
        }
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseSource.buffer = noiseBuffer;
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(200, now + duration);
        noiseGain.gain.setValueAtTime(vol * noiseLevel, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);
        
        noiseSource.start(now);
        noiseSource.stop(now + duration);
      }
      
      mainOsc.start(now);
      mainOsc.stop(now + duration);
      
    } catch (error) {
    }
  }

  /**
   * 播放出墩音效（根据强度）
   * @param intensity 动画强度
   */
  playDunSound(intensity: AnimationIntensity): void {
    const soundMap: Record<AnimationIntensity, string> = {
      small: 'dun-small',
      medium: 'dun-medium',
      large: 'dun-large',
      huge: 'dun-huge',
    };

    const soundName = soundMap[intensity];
    if (soundName) {
      // 尝试播放音效，如果文件不存在则静默跳过
      this.playSound(soundName);
    } else {
    }
  }

  /**
   * 播放炸弹音效
   */
  playBombSound(): void {
    this.playSound('bomb');
  }

  /**
   * 播放爆炸音效
   */
  playExplosionSound(): void {
    this.playSound('explosion');
  }

  /**
   * 停止所有音效
   */
  stopAll(): void {
    // 停止 HTML5 Audio
    this.htmlAudioSounds.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Web Audio API 的 BufferSource 会自动停止，无需手动停止
    // 但我们可以清理音频上下文
    if (this.audioContext && this.audioContext.state !== 'closed') {
      // 注意：不能直接关闭，因为可能还有其他音效要播放
      // this.audioContext.close();
    }
  }

  /**
   * 设置音量
   * @param volume 音量 (0-1)
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    // 更新 HTML5 Audio 音量
    this.htmlAudioSounds.forEach(audio => {
      audio.volume = this.config.volume;
    });
    // Web Audio API 的音量在播放时设置，不需要在这里更新
  }

  /**
   * 获取音量
   */
  getVolume(): number {
    return this.config.volume;
  }
}

// 创建全局音效服务实例
export const soundService = new SoundService();

