/**
 * 角色声线映射
 * 管理不同角色的语音配置
 */

import { VoiceConfig } from '../types/card';
import { TTSLanguage } from './ttsClient';

export interface SpeakerConfig {
  roleId: string;
  name: string;
  lang: TTSLanguage;
  voiceConfig: VoiceConfig;
  pan?: number;  // 声像位置（-1 到 1）
  volume?: number;  // 音量（0-1）
}

/**
 * 默认角色声线配置
 */
export const DEFAULT_SPEAKERS: SpeakerConfig[] = [
  {
    roleId: 'player0',
    name: '玩家0',
    lang: 'zh',
    voiceConfig: {
      lang: 'zh-CN',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    },
    pan: -0.35,  // 左
    volume: 1.0,
  },
  {
    roleId: 'player1',
    name: '玩家1',
    lang: 'zh',
    voiceConfig: {
      lang: 'zh-CN',
      rate: 1.0,
      pitch: 1.1,  // 稍高音调
      volume: 1.0,
    },
    pan: 0.35,  // 右
    volume: 1.0,
  },
  {
    roleId: 'player2',
    name: '玩家2',
    lang: 'zh',
    voiceConfig: {
      lang: 'zh-CN',
      rate: 1.0,
      pitch: 0.9,  // 稍低音调
      volume: 1.0,
    },
    pan: -0.6,  // 左环绕
    volume: 1.0,
  },
  {
    roleId: 'player3',
    name: '玩家3',
    lang: 'zh',
    voiceConfig: {
      lang: 'zh-CN',
      rate: 1.0,
      pitch: 1.2,  // 高音调
      volume: 1.0,
    },
    pan: 0.6,  // 右环绕
    volume: 1.0,
  },
  // 南昌话角色示例
  {
    roleId: 'nanchang_player',
    name: '南昌话玩家',
    lang: 'nanchang',
    voiceConfig: {
      lang: 'zh-CN',  // 使用普通话 TTS，文本会转换为南昌话
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
    },
    pan: 0.0,  // 中央
    volume: 1.0,
  },
];

/**
 * 角色声线管理器
 */
export class SpeakerManager {
  private speakers: Map<string, SpeakerConfig> = new Map();

  constructor(speakers: SpeakerConfig[] = DEFAULT_SPEAKERS) {
    speakers.forEach((speaker) => {
      this.speakers.set(speaker.roleId, speaker);
    });
  }

  /**
   * 获取角色配置
   */
  getSpeaker(roleId: string): SpeakerConfig | undefined {
    return this.speakers.get(roleId);
  }

  /**
   * 添加或更新角色配置
   */
  setSpeaker(speaker: SpeakerConfig): void {
    this.speakers.set(speaker.roleId, speaker);
  }

  /**
   * 移除角色配置
   */
  removeSpeaker(roleId: string): void {
    this.speakers.delete(roleId);
  }

  /**
   * 获取所有角色ID
   */
  getAllRoleIds(): string[] {
    return Array.from(this.speakers.keys());
  }

  /**
   * 获取所有角色配置
   */
  getAllSpeakers(): SpeakerConfig[] {
    return Array.from(this.speakers.values());
  }
}

// 默认实例
export const defaultSpeakerManager = new SpeakerManager();

