/**
 * 对话调度器
 * 管理多个 AI 的语音播放，实现"吵架王对轰"效果
 * 
 * 设计目标：
 * - 房间最多 8 人
 * - 同时发声最多 2 人（maxConcurrent=2）
 * - 其他人只能短插一句（QUICK_JAB ≤ 1.5s）
 */

export type Priority = 'MAIN_FIGHT' | 'QUICK_JAB' | 'NORMAL_CHAT';

export type Language = 'zh' | 'ja' | 'ko' | 'nanchang';

export interface Utter {
  roleId: string;
  text: string;
  priority: Priority;
  civility: number;  // 文明等级 0-4
  lang: Language;
  audioBuffer?: ArrayBuffer;  // 预生成的音频数据
  pan?: number;  // 声像位置（-1 到 1）
  volume?: number;  // 音量（0-1）
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface DialogueSchedulerConfig {
  maxConcurrent?: number;  // 最大并发数，默认 2
  quickJabMaxDuration?: number;  // QUICK_JAB 最大时长（秒），默认 1.5
  enableDucking?: boolean;  // 是否启用 ducking，默认 true
  duckingLevel?: number;  // ducking 时其他角色的音量级别，默认 0.25
}

export class DialogueScheduler {
  private maxConcurrent: number;
  private quickJabMaxDuration: number;
  private enableDucking: boolean;
  private duckingLevel: number;

  private playing: Set<string> = new Set();  // 正在播放的角色ID
  private queue: Utter[] = [];  // 待播放队列
  private playCallback: (utter: Utter) => Promise<void>;  // 播放回调函数

  constructor(
    playCallback: (utter: Utter) => Promise<void>,
    config: DialogueSchedulerConfig = {}
  ) {
    this.playCallback = playCallback;
    this.maxConcurrent = config.maxConcurrent ?? 2;
    this.quickJabMaxDuration = config.quickJabMaxDuration ?? 1.5;
    this.enableDucking = config.enableDucking ?? true;
    this.duckingLevel = config.duckingLevel ?? 0.25;
  }

  /**
   * 提交一个话语
   * @param utter 话语对象
   */
  submit(utter: Utter): void {
    // QUICK_JAB 优先插入队列前面
    if (utter.priority === 'QUICK_JAB') {
      this.queue.unshift(utter);
    } else {
      this.queue.push(utter);
    }

    console.log(`[DialogueScheduler] 提交话语: ${utter.roleId} (${utter.priority})`);
    this.tick();
  }

  /**
   * 调度播放
   */
  private tick(): void {
    // 如果已达到最大并发数，等待
    if (this.playing.size >= this.maxConcurrent) {
      return;
    }

    // 如果队列为空，返回
    if (this.queue.length === 0) {
      return;
    }

    // 选择下一个要播放的话语
    const next = this.pickNext();
    if (!next) {
      return;
    }

    // 标记为正在播放
    this.playing.add(next.roleId);

    // 调用播放回调
    this.playCallback(next)
      .then(() => {
        // 播放完成
        this.playing.delete(next.roleId);
        if (next.onEnd) {
          next.onEnd();
        }
        this.tick();  // 继续调度下一个
      })
      .catch((error) => {
        // 播放失败
        console.error(`[DialogueScheduler] 播放失败: ${next.roleId}`, error);
        this.playing.delete(next.roleId);
        if (next.onError) {
          next.onError(error);
        }
        this.tick();  // 继续调度下一个
      });

    // 如果启用 ducking，降低其他角色的音量
    if (this.enableDucking && this.playing.size > 1) {
      // 这里需要访问 AudioMixer，暂时先记录，由外部处理
      // 或者通过回调传递
    }

    // 继续调度（如果还有空间）
    if (this.playing.size < this.maxConcurrent) {
      this.tick();
    }
  }

  /**
   * 选择下一个要播放的话语
   * 优先级：MAIN_FIGHT > QUICK_JAB > NORMAL_CHAT
   */
  private pickNext(): Utter | null {
    if (this.queue.length === 0) {
      return null;
    }

    // 按优先级排序
    this.queue.sort((a, b) => {
      const priorityScore = (p: Priority): number => {
        switch (p) {
          case 'MAIN_FIGHT': return 3;
          case 'QUICK_JAB': return 2;
          case 'NORMAL_CHAT': return 1;
          default: return 0;
        }
      };

      return priorityScore(b.priority) - priorityScore(a.priority);
    });

    return this.queue.shift() || null;
  }

  /**
   * 获取当前正在播放的角色ID列表
   */
  getPlayingRoles(): string[] {
    return Array.from(this.playing);
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * 停止指定角色的播放（从队列中移除）
   */
  cancelRole(roleId: string): void {
    this.queue = this.queue.filter(u => u.roleId !== roleId);
    // 注意：正在播放的无法直接停止，需要外部 AudioMixer 处理
  }

  /**
   * 停止所有播放
   */
  stopAll(): void {
    this.queue = [];
    // 注意：正在播放的无法直接停止，需要外部 AudioMixer 处理
  }

  /**
   * 检查指定角色是否正在播放
   */
  isRolePlaying(roleId: string): boolean {
    return this.playing.has(roleId);
  }

  /**
   * 检查是否有空闲槽位
   */
  hasAvailableSlot(): boolean {
    return this.playing.size < this.maxConcurrent;
  }
}

