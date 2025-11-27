/**
 * WebAudio 混音器
 * 实现真正的多声道并发混音，支持多个 AI 同时说话
 * 
 * 设计目标：
 * - 逻辑多通道并发，不追求物理 5.1/7.1
 * - 每个角色一个 roleGainNode + StereoPanner
 * - 每段音频一个 AudioBufferSourceNode
 * - 多段同时 start() → 多 AI 同时说话
 */

export interface RoleAudioNodes {
  gain: GainNode;
  pan: StereoPannerNode;
}

export interface PlayOptions {
  volume?: number;  // 音量 0-1，默认 1.0
  pan?: number;     // 声像位置 -1 到 1，默认 0（中央）
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export class AudioMixer {
  private ctx: AudioContext | null = null;
  private roleNodes: Map<string, RoleAudioNodes> = new Map();
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;

  /**
   * 初始化 AudioContext
   */
  async init(): Promise<void> {
    if (this.isInitialized && this.ctx) {
      return;
    }

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 创建主音量控制
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      // 如果 AudioContext 被暂停，恢复它
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.isInitialized = true;
      console.log('[AudioMixer] AudioContext 已初始化');
    } catch (error) {
      console.error('[AudioMixer] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 确保角色节点存在
   * @param roleId 角色ID
   * @param panValue 声像位置，默认 0（中央）
   * @returns 角色的音频节点
   */
  ensureRole(roleId: string, panValue: number = 0): RoleAudioNodes {
    if (!this.ctx || !this.masterGain) {
      throw new Error('AudioMixer 未初始化，请先调用 init()');
    }

    if (this.roleNodes.has(roleId)) {
      return this.roleNodes.get(roleId)!;
    }

    // 创建角色的 GainNode（音量控制）
    const gain = this.ctx.createGain();
    gain.gain.value = 1.0;

    // 创建角色的 StereoPannerNode（声像定位）
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = panValue;

    // 连接：gain -> pan -> masterGain -> destination
    gain.connect(pan);
    pan.connect(this.masterGain);

    const nodes: RoleAudioNodes = { gain, pan };
    this.roleNodes.set(roleId, nodes);

    console.log(`[AudioMixer] 创建角色节点: ${roleId}, pan=${panValue}`);
    return nodes;
  }

  /**
   * 播放音频
   * @param roleId 角色ID
   * @param arrayBuffer 音频数据（ArrayBuffer）
   * @param options 播放选项
   * @returns Promise，播放结束时 resolve
   */
  async play(
    roleId: string,
    arrayBuffer: ArrayBuffer,
    options: PlayOptions = {}
  ): Promise<void> {
    if (!this.ctx || !this.masterGain) {
      throw new Error('AudioMixer 未初始化，请先调用 init()');
    }

    const { volume = 1.0, pan, onEnd, onError } = options;

    try {
      // 确保角色节点存在
      const role = this.ensureRole(roleId, pan);

      // 解码音频数据
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));

      // 创建音频源
      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;

      // 创建段级别的音量控制（用于 ducking 等效果）
      const segGain = this.ctx.createGain();
      segGain.gain.value = volume;

      // 连接：source -> segGain -> role.gain -> role.pan -> masterGain -> destination
      source.connect(segGain);
      segGain.connect(role.gain);

      // 播放
      source.start();

      // 处理播放结束
      source.onended = () => {
        if (onEnd) {
          onEnd();
        }
      };

      // 返回 Promise，播放结束时 resolve
      return new Promise<void>((resolve, reject) => {
        source.onended = () => {
          if (onEnd) {
            onEnd();
          }
          resolve();
        };

        // 如果音频时长已知，设置超时（防止 onended 不触发）
        const duration = audioBuffer.duration * 1000; // 转换为毫秒
        setTimeout(() => {
          if (source.playbackState === source.PLAYING_STATE) {
            source.stop();
            resolve();
          }
        }, duration + 100); // 加 100ms 缓冲
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[AudioMixer] 播放失败 (${roleId}):`, err);
      if (onError) {
        onError(err);
      }
      throw err;
    }
  }

  /**
   * Ducking 效果：降低其他角色的音量，突出当前角色
   * @param activeRoleId 当前活跃的角色ID
   * @param otherLevel 其他角色的音量级别（0-1），默认 0.25
   */
  duckOthers(activeRoleId: string, otherLevel: number = 0.25): void {
    if (!this.ctx) {
      return;
    }

    const currentTime = this.ctx.currentTime;
    const fadeTime = 0.05; // 50ms 淡入淡出时间

    for (const [roleId, role] of this.roleNodes) {
      const targetGain = roleId === activeRoleId ? 1.0 : otherLevel;
      role.gain.gain.setTargetAtTime(targetGain, currentTime, fadeTime);
    }

    console.log(`[AudioMixer] Ducking: ${activeRoleId} 突出，其他角色降至 ${otherLevel}`);
  }

  /**
   * 恢复所有角色的音量
   */
  restoreAllVolumes(): void {
    if (!this.ctx) {
      return;
    }

    const currentTime = this.ctx.currentTime;
    const fadeTime = 0.05;

    for (const [, role] of this.roleNodes) {
      role.gain.gain.setTargetAtTime(1.0, currentTime, fadeTime);
    }

    console.log('[AudioMixer] 恢复所有角色音量');
  }

  /**
   * 设置角色的音量
   * @param roleId 角色ID
   * @param volume 音量（0-1）
   */
  setRoleVolume(roleId: string, volume: number): void {
    const role = this.roleNodes.get(roleId);
    if (!role || !this.ctx) {
      return;
    }

    const currentTime = this.ctx.currentTime;
    role.gain.gain.setTargetAtTime(volume, currentTime, 0.05);
  }

  /**
   * 设置角色的声像位置
   * @param roleId 角色ID
   * @param pan 声像位置（-1 到 1）
   */
  setRolePan(roleId: string, pan: number): void {
    const role = this.roleNodes.get(roleId);
    if (!role || !this.ctx) {
      return;
    }

    role.pan.pan.value = pan;
  }

  /**
   * 停止指定角色的所有播放
   * @param roleId 角色ID
   */
  stopRole(roleId: string): void {
    // 注意：WebAudio 的 BufferSource 一旦 start() 后无法直接停止
    // 这里通过降低音量到 0 来实现"停止"效果
    this.setRoleVolume(roleId, 0);
  }

  /**
   * 停止所有播放
   */
  stopAll(): void {
    if (this.masterGain && this.ctx) {
      const currentTime = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(0, currentTime, 0.1);
      
      // 0.2 秒后恢复音量（如果需要继续播放）
      setTimeout(() => {
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.1);
        }
      }, 200);
    }
  }

  /**
   * 获取 AudioContext 状态
   */
  getState(): AudioContextState | null {
    return this.ctx?.state || null;
  }

  /**
   * 恢复 AudioContext（如果被暂停）
   */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * 销毁混音器
   */
  destroy(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.roleNodes.clear();
    this.ctx = null;
    this.masterGain = null;
    this.isInitialized = false;
  }
}

// 单例实例
let audioMixerInstance: AudioMixer | null = null;

/**
 * 获取 AudioMixer 单例
 */
export function getAudioMixer(): AudioMixer {
  if (!audioMixerInstance) {
    audioMixerInstance = new AudioMixer();
  }
  return audioMixerInstance;
}

