/**
 * 吵架服务
 * 整合 Beats 生成、LLM 调用和分段播放
 */

import { getBeatsGenerator, BeatsStructure, BeatsGenerationContext } from './beatsGenerator';
import { SegmentedPlayback, SegmentedPlaybackConfig } from '../audio/SegmentedPlayback';
import { useAudioRoom } from '../audio';
import { Player } from '../types/card';
import { TTSLanguage } from '../tts';

export interface QuarrelConfig {
  roleId: string;
  player: Player;
  opponentLastUtterance?: string;
  scene?: string;
  targetLength?: number;  // 目标长度（字），默认 60
  civility?: number;  // 文明等级，默认 2
  lang?: TTSLanguage;  // 语言，默认 'zh'
  priority?: 'MAIN_FIGHT' | 'QUICK_JAB' | 'NORMAL_CHAT';
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * 吵架服务类
 */
export class QuarrelService {
  private beatsGenerator = getBeatsGenerator();
  private segmentedPlayback: SegmentedPlayback | null = null;
  private audioRoom: ReturnType<typeof useAudioRoom> | null = null;

  /**
   * 设置音频房间
   */
  setAudioRoom(audioRoom: ReturnType<typeof useAudioRoom>): void {
    this.audioRoom = audioRoom;
    
    // 创建分段播放管理器
    if (audioRoom) {
      this.segmentedPlayback = new SegmentedPlayback((utter) => {
        audioRoom.submitUtter(utter);
      });
    }
  }

  /**
   * 生成长吵架并播放
   */
  async startQuarrel(config: QuarrelConfig): Promise<void> {
    if (!this.segmentedPlayback || !this.audioRoom) {
      throw new Error('音频房间未初始化');
    }

    const {
      roleId,
      player,
      opponentLastUtterance,
      scene = 'quarrel',
      targetLength = 60,
      civility = 2,
      lang = 'zh',
      priority = 'MAIN_FIGHT',
      onStart,
      onComplete,
      onError,
    } = config;

    try {
      if (onStart) {
        onStart();
      }

      // 1. 生成 Beats 结构
      const beatsContext: BeatsGenerationContext = {
        scene,
        opponentLastUtterance,
        targetLength,
        civility,
        gameState: undefined,  // 可以传入游戏状态
      };

      const beatsStructure = await this.beatsGenerator.generateBeats(beatsContext);

      // 2. 调用 LLM 生成分段内容
      const beatsWithSegments = await this.generateSegmentsWithLLM(
        beatsStructure,
        beatsContext,
        player
      );

      // 3. 开始分段播放
      const playbackConfig: SegmentedPlaybackConfig = {
        roleId,
        lang,
        civility,
        priority,
        onSegmentStart: (index, text) => {
          console.log(`[QuarrelService] 段 ${index + 1} 开始: ${text}`);
        },
        onSegmentEnd: (index) => {
          console.log(`[QuarrelService] 段 ${index + 1} 完成`);
        },
        onComplete: () => {
          console.log('[QuarrelService] 吵架播放完成');
          if (onComplete) {
            onComplete();
          }
        },
        onError: (error) => {
          console.error('[QuarrelService] 播放错误:', error);
          if (onError) {
            onError(error);
          }
        },
        allowInterruption: true,
      };

      await this.segmentedPlayback.startPlayback(beatsWithSegments, playbackConfig);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[QuarrelService] 吵架生成失败:', err);
      if (onError) {
        onError(err);
      }
      throw err;
    }
  }

  /**
   * 使用 LLM 生成分段内容
   */
  private async generateSegmentsWithLLM(
    beatsStructure: BeatsStructure,
    context: BeatsGenerationContext,
    player: Player
  ): Promise<BeatsStructure> {
    // 如果已经有 segments，直接返回
    if (beatsStructure.segments && beatsStructure.segments.length > 0) {
      return beatsStructure;
    }

    // 调用 LLM 生成分段内容
    const prompt = this.beatsGenerator.generateBeatsPrompt(context);
    
    try {
      // 调用 LLM API（使用 Ollama）
      const response = await this.callLLMAPI(prompt);
      
      // 解析响应
      const parsed = this.beatsGenerator.parseLLMResponse(response);
      if (parsed && parsed.segments && parsed.segments.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.error('[QuarrelService] LLM 调用失败:', error);
    }
    
    // 如果 LLM 调用失败，生成占位分段
    console.warn('[QuarrelService] LLM 调用失败，使用占位内容');
    const segments = beatsStructure.beats.map((beat, index) => ({
      beat_index: index,
      text: this.generatePlaceholderText(beat, index, context),
    }));

    return {
      ...beatsStructure,
      segments,
    };
  }

  /**
   * 调用 LLM API
   */
  private async callLLMAPI(prompt: string): Promise<string> {
    const apiUrl = 'http://localhost:11434/api/chat';
    const model = 'qwen2.5:latest';  // 默认模型，可以从配置读取
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: false,
        }),
        signal: AbortSignal.timeout(30000),  // 30秒超时
      });

      if (!response.ok) {
        throw new Error(`LLM API 错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || data.response || '';
    } catch (error) {
      console.error('[QuarrelService] LLM API 调用失败:', error);
      throw error;
    }
  }

  /**
   * 生成占位文本（当 LLM 不可用时）
   */
  private generatePlaceholderText(
    beat: { type: string; tone: string },
    index: number,
    context: BeatsGenerationContext
  ): string {
    const templates: Record<string, string[]> = {
      '反讽开场': ['我跟一手，你莫急咧。', '你这一手打得，我都替你着急。'],
      '抓对方上一句话反击': ['你一张嘴就输钱气！', '你这一手打得不行！'],
      '夸张比喻升级': ['你嘴巴跟漏斗一样，别在这儿放屁！', '你这一手打得，我都替你着急，别在这儿瞎搞！'],
      '短狠收尾': ['这局我拿下了！', '你还有什么话说？'],
    };

    const options = templates[beat.type] || ['我跟一手。'];
    return options[index % options.length];
  }

  /**
   * 中断指定角色的吵架
   */
  interrupt(roleId: string): void {
    if (this.segmentedPlayback) {
      this.segmentedPlayback.interrupt(roleId);
    }
  }

  /**
   * 检查是否有正在播放的吵架
   */
  isPlaying(roleId: string): boolean {
    return this.segmentedPlayback?.isPlaying(roleId) || false;
  }
}

// 单例实例
let quarrelServiceInstance: QuarrelService | null = null;

/**
 * 获取吵架服务单例
 */
export function getQuarrelService(): QuarrelService {
  if (!quarrelServiceInstance) {
    quarrelServiceInstance = new QuarrelService();
  }
  return quarrelServiceInstance;
}

