/**
 * 分段播放系统
 * 实现长吵架的分段生成与播放，支持边生成边播放和插嘴
 */

import { BeatsStructure, Beat } from '../ai/beatsGenerator';
import { Utter, Priority } from './DialogueScheduler';
import { getTTSServiceManager, TTSLanguage } from '../tts';
import { defaultSpeakerManager } from '../tts/speakers';
import { convertToNanchang } from '../ai/dialect/nanchang_rules';
import { getInterruptionManager } from './InterruptionManager';

export interface SegmentedPlaybackConfig {
  roleId: string;
  lang: TTSLanguage;
  civility: number;
  priority: Priority;
  onSegmentStart?: (segmentIndex: number, text: string) => void;
  onSegmentEnd?: (segmentIndex: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  allowInterruption?: boolean;  // 是否允许插嘴，默认 true
}

export interface SegmentedPlaybackResult {
  totalSegments: number;
  completedSegments: number;
  isInterrupted: boolean;
}

/**
 * 分段播放管理器
 */
export class SegmentedPlayback {
  private submitUtterCallback: (utter: Utter) => void;
  private interruptionManager = getInterruptionManager();
  private activePlaybacks: Map<string, {
    segments: Array<{ text: string; beat: Beat }>;
    currentIndex: number;
    config: SegmentedPlaybackConfig;
    isInterrupted: boolean;
    segmentEndTimes: number[];  // 每段结束时间，用于插嘴窗口
  }> = new Map();

  constructor(submitUtterCallback: (utter: Utter) => void) {
    this.submitUtterCallback = submitUtterCallback;
  }

  /**
   * 开始分段播放
   * @param beatsStructure Beats 结构
   * @param config 播放配置
   */
  async startPlayback(
    beatsStructure: BeatsStructure,
    config: SegmentedPlaybackConfig
  ): Promise<SegmentedPlaybackResult> {
    const { roleId, allowInterruption = true } = config;

    // 准备分段数据
    const segments = this.prepareSegments(beatsStructure, config);

    // 注册播放任务
    const playback = {
      segments,
      currentIndex: 0,
      config,
      isInterrupted: false,
      segmentEndTimes: [],
    };
    this.activePlaybacks.set(roleId, playback);

    // 开始播放第一段
    this.playNextSegment(roleId);

    // 返回 Promise，等待播放完成或被中断
    return new Promise((resolve) => {
      const checkComplete = () => {
        const pb = this.activePlaybacks.get(roleId);
        if (!pb) {
          resolve({
            totalSegments: segments.length,
            completedSegments: segments.length,
            isInterrupted: false,
          });
          return;
        }

        if (pb.isInterrupted) {
          resolve({
            totalSegments: segments.length,
            completedSegments: pb.currentIndex,
            isInterrupted: true,
          });
          this.activePlaybacks.delete(roleId);
          return;
        }

        if (pb.currentIndex >= segments.length) {
          resolve({
            totalSegments: segments.length,
            completedSegments: segments.length,
            isInterrupted: false,
          });
          this.activePlaybacks.delete(roleId);
          if (config.onComplete) {
            config.onComplete();
          }
          return;
        }

        // 继续检查
        setTimeout(checkComplete, 100);
      };

      checkComplete();
    });
  }

  /**
   * 准备分段数据
   */
  private prepareSegments(
    beatsStructure: BeatsStructure,
    config: SegmentedPlaybackConfig
  ): Array<{ text: string; beat: Beat }> {
    const segments: Array<{ text: string; beat: Beat }> = [];

    // 如果有预生成的 segments，使用它们
    if (beatsStructure.segments && beatsStructure.segments.length > 0) {
      beatsStructure.segments.forEach((seg) => {
        const beat = beatsStructure.beats[seg.beat_index];
        if (beat) {
          segments.push({
            text: seg.text,
            beat,
          });
        }
      });
    } else {
      // 否则根据 beats 生成占位文本（实际应该由 LLM 生成）
      beatsStructure.beats.forEach((beat, index) => {
        segments.push({
          text: `[节拍${index + 1}: ${beat.type}]`,
          beat,
        });
      });
    }

    // 如果是南昌话，转换文本
    if (config.lang === 'nanchang') {
      segments.forEach((seg) => {
        seg.text = convertToNanchang(seg.text, true, true);
      });
    }

    return segments;
  }

  /**
   * 播放下一段
   */
  private async playNextSegment(roleId: string): Promise<void> {
    const playback = this.activePlaybacks.get(roleId);
    if (!playback) {
      return;
    }

    const { segments, currentIndex, config } = playback;

    if (currentIndex >= segments.length) {
      // 播放完成
      this.activePlaybacks.delete(roleId);
      return;
    }

    const segment = segments[currentIndex];
    const { text, beat } = segment;

    // 触发段开始回调
    if (config.onSegmentStart) {
      config.onSegmentStart(currentIndex, text);
    }

    try {
      // 获取角色配置
      const speaker = defaultSpeakerManager.getSpeaker(roleId);
      if (!speaker) {
        throw new Error(`角色 ${roleId} 未配置`);
      }

      // 生成 TTS 音频
      const ttsResult = await synthesizeSpeech(text, {
        lang: config.lang,
        voiceConfig: speaker.voiceConfig,
        useCache: true,
      });

      // 确定优先级（根据节拍类型）
      let priority = config.priority;
      if (beat.tone === '绝杀') {
        priority = 'MAIN_FIGHT';  // 绝杀尾句优先级最高
      } else if (beat.tone === '反击' || beat.tone === '升级') {
        priority = 'MAIN_FIGHT';  // 反击和升级也是主吵架
      } else if (beat.tone === '挑衅') {
        priority = 'NORMAL_CHAT';  // 开场可以是正常聊天
      }

      // 提交到音频房间
      const utter: Utter = {
        roleId,
        text,
        priority,
        civility: config.civility,
        lang: config.lang,
        audioBuffer: ttsResult.audioBuffer,
        pan: speaker.pan,
        volume: speaker.volume,
        onStart: () => {
          // 段开始播放
        },
        onEnd: () => {
          // 记录段结束时间（用于插嘴窗口）
          playback.segmentEndTimes[currentIndex] = Date.now();

          // 段播放完成
          if (config.onSegmentEnd) {
            config.onSegmentEnd(currentIndex);
          }

          // 播放下一段（延迟一小段时间，允许插嘴）
          setTimeout(() => {
            playback.currentIndex++;
            this.playNextSegment(roleId);
          }, 300);  // 300ms 间隔，允许插嘴
        },
        onError: (error) => {
          if (config.onError) {
            config.onError(error);
          }
          // 继续播放下一段
          playback.currentIndex++;
          this.playNextSegment(roleId);
        },
      };

      this.submitUtterCallback(utter);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (config.onError) {
        config.onError(err);
      }

      // 继续播放下一段（即使失败）
      playback.currentIndex++;
      this.playNextSegment(roleId);
    }
  }

  /**
   * 中断指定角色的播放
   */
  interrupt(roleId: string): void {
    const playback = this.activePlaybacks.get(roleId);
    if (playback) {
      playback.isInterrupted = true;
      this.activePlaybacks.delete(roleId);
      // 重置插嘴历史
      this.interruptionManager.resetInterruptionHistory(roleId);
    }
  }

  /**
   * 检查是否在插嘴窗口（段间隔中）
   */
  isInInterruptionWindow(roleId: string): boolean {
    const playback = this.activePlaybacks.get(roleId);
    if (!playback) {
      return false;
    }

    const lastEndTime = playback.segmentEndTimes[playback.currentIndex - 1];
    if (!lastEndTime) {
      return false;
    }

    const now = Date.now();
    const gap = now - lastEndTime;
    return gap < 500;  // 500ms 内的窗口
  }

  /**
   * 检查是否有正在播放的分段
   */
  isPlaying(roleId: string): boolean {
    return this.activePlaybacks.has(roleId);
  }

  /**
   * 获取播放进度
   */
  getProgress(roleId: string): { current: number; total: number } | null {
    const playback = this.activePlaybacks.get(roleId);
    if (!playback) {
      return null;
    }

    return {
      current: playback.currentIndex,
      total: playback.segments.length,
    };
  }
}

