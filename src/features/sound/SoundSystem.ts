/**
 * 音效系统
 * 
 * 职责：
 * 1. 加载音效文件
 * 2. 播放音效
 * 3. 音量控制
 * 4. 音效队列管理
 * 
 * 使用Web Audio API，完全独立
 */

import { SoundConfig, SoundType, SoundEvent } from './types';

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SoundConfig = {
  volume: 0.7,
  enabled: true,
  preload: true
};

/**
 * 音效文件映射
 */
const SOUND_FILES: Record<SoundType, string> = {
  'play-small': '/sounds/dun-small.aiff',
  'play-medium': '/sounds/dun-medium.aiff',
  'play-large': '/sounds/dun-large.aiff',
  'play-huge': '/sounds/dun-huge.aiff',
  'pass': '/sounds/dun-small.aiff',        // 复用小牌音效
  'game-start': '/sounds/dun-medium.aiff', // 复用中等音效
  'game-end': '/sounds/dun-large.aiff',    // 复用大牌音效
  'win': '/sounds/explosion.aiff',
  'explosion': '/sounds/explosion.aiff'
};

/**
 * 音效系统类
 */
export class SoundSystem {
  private config: SoundConfig;
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private listeners: Map<string, Set<(event: SoundEvent) => void>> = new Map();
  private initialized: boolean = false;
  
  constructor(config: Partial<SoundConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[SoundSystem] 已创建', this.config);
  }
  
  // ==================== 初始化 ====================
  
  /**
   * 初始化音频上下文
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[SoundSystem] 已经初始化过了');
      return;
    }
    
    try {
      // 创建AudioContext
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('[SoundSystem] AudioContext已创建');
      
      // 预加载音效
      if (this.config.preload) {
        await this.preloadSounds();
      }
      
      this.initialized = true;
      console.log('[SoundSystem] 初始化完成');
      
    } catch (error) {
      console.error('[SoundSystem] 初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 预加载所有音效
   */
  private async preloadSounds(): Promise<void> {
    console.log('[SoundSystem] 开始预加载音效...');
    
    const loadPromises = Object.entries(SOUND_FILES).map(async ([type, url]) => {
      try {
        await this.loadSound(type as SoundType, url);
        console.log(`[SoundSystem] ✓ ${type}`);
      } catch (error) {
        console.warn(`[SoundSystem] ✗ ${type}:`, error);
      }
    });
    
    await Promise.all(loadPromises);
    console.log(`[SoundSystem] 预加载完成: ${this.sounds.size}/${Object.keys(SOUND_FILES).length}`);
  }
  
  /**
   * 加载单个音效
   */
  private async loadSound(type: SoundType, url: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext未初始化');
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.sounds.set(type, audioBuffer);
      this.emit({ type: 'sound:loaded', soundType: type });
      
    } catch (error) {
      this.emit({ 
        type: 'sound:error', 
        soundType: type, 
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }
  
  // ==================== 播放音效 ====================
  
  /**
   * 播放音效
   */
  play(type: SoundType, volumeOverride?: number): void {
    if (!this.config.enabled) {
      return;
    }
    
    if (!this.audioContext) {
      console.warn('[SoundSystem] AudioContext未初始化');
      return;
    }
    
    const audioBuffer = this.sounds.get(type);
    if (!audioBuffer) {
      console.warn(`[SoundSystem] 音效未加载: ${type}`);
      return;
    }
    
    try {
      // 恢复AudioContext（如果被暂停）
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // 创建音频源
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // 创建增益节点（音量控制）
      const gainNode = this.audioContext.createGain();
      const volume = volumeOverride !== undefined ? volumeOverride : this.config.volume;
      gainNode.gain.value = volume;
      
      // 连接：source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // 播放
      source.start(0);
      
      // 触发事件
      this.emit({ type: 'sound:play', soundType: type });
      
      console.log(`[SoundSystem] 播放: ${type} (音量: ${volume.toFixed(2)})`);
      
    } catch (error) {
      console.error(`[SoundSystem] 播放失败: ${type}`, error);
    }
  }
  
  /**
   * 根据出牌类型播放音效
   */
  playForCardType(cardCount: number, isBomb: boolean = false): void {
    if (isBomb) {
      this.play('play-huge');
    } else if (cardCount >= 4) {
      this.play('play-large');
    } else if (cardCount >= 2) {
      this.play('play-medium');
    } else {
      this.play('play-small');
    }
  }
  
  /**
   * 播放Pass音效
   */
  playPass(): void {
    this.play('pass', this.config.volume * 0.5); // 降低音量
  }
  
  /**
   * 播放游戏开始音效
   */
  playGameStart(): void {
    this.play('game-start');
  }
  
  /**
   * 播放游戏结束音效
   */
  playGameEnd(): void {
    this.play('game-end');
  }
  
  /**
   * 播放胜利音效
   */
  playWin(): void {
    this.play('win');
  }
  
  // ==================== 配置管理 ====================
  
  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    console.log(`[SoundSystem] 音量: ${this.config.volume.toFixed(2)}`);
  }
  
  /**
   * 启用/禁用音效
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[SoundSystem] 音效${enabled ? '已启用' : '已禁用'}`);
  }
  
  /**
   * 获取配置
   */
  getConfig(): SoundConfig {
    return { ...this.config };
  }
  
  // ==================== 事件系统 ====================
  
  /**
   * 监听事件
   */
  on(eventType: string, callback: (event: SoundEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // 返回取消订阅函数
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }
  
  /**
   * 触发事件
   */
  private emit(event: SoundEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }
  
  // ==================== 统计信息 ====================
  
  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      initialized: this.initialized,
      audioContextState: this.audioContext?.state || 'none',
      loadedSounds: this.sounds.size,
      totalSounds: Object.keys(SOUND_FILES).length,
      enabled: this.config.enabled,
      volume: this.config.volume
    };
  }
}

