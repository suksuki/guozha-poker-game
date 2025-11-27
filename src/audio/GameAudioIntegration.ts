/**
 * 游戏音频集成服务
 * 将游戏事件转换为音频播放
 */

import { Player, Card } from '../types/card';
import { ChatMessage, ChatEventType } from '../types/chat';
import { useAudioRoom, Utter, Priority } from './index';
import { getTTSServiceManager, TTSLanguage } from '../tts';
import { defaultSpeakerManager } from '../tts/speakers';
import { convertToNanchang } from '../ai/dialect/nanchang_rules';
import { getQuarrelService } from '../ai/quarrelService';
import { Player } from '../types/card';

export interface GameAudioConfig {
  enableAudio?: boolean;  // 是否启用音频，默认 true
  maxConcurrent?: number;  // 最大并发数，默认 2
  enableDucking?: boolean;  // 是否启用 ducking，默认 true
  defaultCivility?: number;  // 默认文明等级，默认 1
}

export interface GameAudioEvent {
  type: 'play_card' | 'pass' | 'win' | 'lose' | 'chat' | 'taunt' | 'big_dun';
  playerId: string;
  playerName: string;
  text?: string;  // 如果提供，直接使用；否则根据事件类型生成
  priority?: Priority;
  civility?: number;
  lang?: TTSLanguage;
}

/**
 * 游戏音频集成类
 */
export class GameAudioIntegration {
  private audioRoom: ReturnType<typeof useAudioRoom> | null = null;
  private config: Required<GameAudioConfig>;
  private ttsManager = getTTSServiceManager();

  constructor(config: GameAudioConfig = {}) {
    this.config = {
      enableAudio: config.enableAudio ?? true,
      maxConcurrent: config.maxConcurrent ?? 2,
      enableDucking: config.enableDucking ?? true,
      defaultCivility: config.defaultCivility ?? 1,
    };
  }

  /**
   * 设置音频房间实例
   */
  setAudioRoom(audioRoom: ReturnType<typeof useAudioRoom>): void {
    this.audioRoom = audioRoom;
  }

  /**
   * 处理游戏事件
   */
  async handleGameEvent(event: GameAudioEvent): Promise<void> {
    if (!this.config.enableAudio || !this.audioRoom) {
      return;
    }

    try {
      // 获取角色配置
      const speaker = defaultSpeakerManager.getSpeaker(event.playerId);
      if (!speaker) {
        console.warn(`[GameAudioIntegration] 角色 ${event.playerId} 未配置`);
        return;
      }

      // 确定文本
      let text = event.text;
      if (!text) {
        text = this.generateTextForEvent(event);
      }

      // 确定语言
      const lang = event.lang || speaker.lang || 'zh';

      // 如果是南昌话，转换文本
      if (lang === 'nanchang') {
        text = convertToNanchang(text, true, true);
      }

      // 确定优先级
      const priority = event.priority || this.getPriorityForEvent(event.type);

      // 确定文明等级
      const civility = event.civility ?? this.config.defaultCivility;

      // 生成 TTS 音频（使用 TTS 服务管理器）
      const ttsResult = await this.ttsManager.synthesize(text, {
        lang,
        voiceConfig: speaker.voiceConfig,
        useCache: true,
      });

      // 提交到音频房间
      const utter: Utter = {
        roleId: event.playerId,
        text,
        priority,
        civility,
        lang,
        audioBuffer: ttsResult.audioBuffer,
        pan: speaker.pan,
        volume: speaker.volume,
      };

      this.audioRoom.submitUtter(utter);
    } catch (error) {
      console.error(`[GameAudioIntegration] 处理游戏事件失败:`, error);
    }
  }

  /**
   * 根据事件类型生成文本
   */
  private generateTextForEvent(event: GameAudioEvent): string {
    switch (event.type) {
      case 'play_card':
        return '我跟一手！';
      case 'pass':
        return '要不起';
      case 'win':
        return '这局我拿下了！';
      case 'lose':
        return '这局算你运气好';
      case 'chat':
        return '这手牌打得不错';
      case 'taunt':
        return '你这一手打得不行！';
      case 'big_dun':
        return '出大墩了！';
      default:
        return '我跟一手';
    }
  }

  /**
   * 根据事件类型确定优先级
   */
  private getPriorityForEvent(type: GameAudioEvent['type']): Priority {
    switch (type) {
      case 'taunt':
      case 'big_dun':
        return 'MAIN_FIGHT';
      case 'chat':
        return 'QUICK_JAB';
      case 'play_card':
      case 'pass':
      case 'win':
      case 'lose':
      default:
        return 'NORMAL_CHAT';
    }
  }

  /**
   * 处理聊天消息
   */
  async handleChatMessage(message: ChatMessage): Promise<void> {
    if (!this.config.enableAudio || !this.audioRoom) {
      return;
    }

    // 从消息中提取玩家信息
    const playerId = `player${message.playerId}`;
    const playerName = message.playerName || `玩家${message.playerId}`;

    // 确定优先级
    let priority: Priority = 'NORMAL_CHAT';
    if (message.eventType === ChatEventType.TAUNT) {
      priority = 'MAIN_FIGHT';
    } else if (message.eventType === ChatEventType.QUICK_REACTION) {
      priority = 'QUICK_JAB';
    }

    await this.handleGameEvent({
      type: 'chat',
      playerId,
      playerName,
      text: message.content,
      priority,
      civility: message.civility,
    });
  }

  /**
   * 处理出牌事件
   */
  async handlePlayCard(
    player: Player,
    cards: Card[],
    isBigDun: boolean = false
  ): Promise<void> {
    const playerId = `player${player.id}`;
    const playerName = player.name;

    await this.handleGameEvent({
      type: isBigDun ? 'big_dun' : 'play_card',
      playerId,
      playerName,
      priority: isBigDun ? 'MAIN_FIGHT' : 'NORMAL_CHAT',
    });
  }

  /**
   * 处理要不起事件
   */
  async handlePass(player: Player): Promise<void> {
    const playerId = `player${player.id}`;
    const playerName = player.name;

    await this.handleGameEvent({
      type: 'pass',
      playerId,
      playerName,
      priority: 'QUICK_JAB',  // 要不起是短句
    });
  }

  /**
   * 处理胜利事件
   */
  async handleWin(player: Player): Promise<void> {
    const playerId = `player${player.id}`;
    const playerName = player.name;

    await this.handleGameEvent({
      type: 'win',
      playerId,
      playerName,
      priority: 'MAIN_FIGHT',
    });
  }

  /**
   * 处理失败事件
   */
  async handleLose(player: Player): Promise<void> {
    const playerId = `player${player.id}`;
    const playerName = player.name;

    await this.handleGameEvent({
      type: 'lose',
      playerId,
      playerName,
      priority: 'NORMAL_CHAT',
    });
  }

  /**
   * 处理挑衅事件
   */
  async handleTaunt(
    player: Player,
    targetPlayer: Player,
    text?: string
  ): Promise<void> {
    const playerId = `player${player.id}`;
    const playerName = player.name;

    // 如果有文本，直接使用；否则生成长吵架
    if (text) {
      await this.handleGameEvent({
        type: 'taunt',
        playerId,
        playerName,
        text,
        priority: 'MAIN_FIGHT',
        civility: 2,
      });
    } else {
      // 生成长吵架
      await this.handleLongQuarrel(player, targetPlayer);
    }
  }

  /**
   * 处理长吵架（使用 Beats 生成和分段播放）
   */
  async handleLongQuarrel(
    player: Player,
    targetPlayer: Player,
    opponentLastUtterance?: string
  ): Promise<void> {
    if (!this.audioRoom) {
      return;
    }

    const quarrelService = getQuarrelService();
    quarrelService.setAudioRoom(this.audioRoom);

    const playerId = `player${player.id}`;
    const speaker = defaultSpeakerManager.getSpeaker(playerId);
    if (!speaker) {
      console.warn(`[GameAudioIntegration] 角色 ${playerId} 未配置`);
      return;
    }

    await quarrelService.startQuarrel({
      roleId: playerId,
      player,
      opponentLastUtterance,
      scene: 'quarrel',
      targetLength: 60,  // 约 60 字的长吵架
      civility: 2,
      lang: speaker.lang,
      priority: 'MAIN_FIGHT',
    });
  }
}

// 单例实例
let gameAudioIntegrationInstance: GameAudioIntegration | null = null;

/**
 * 获取游戏音频集成服务单例
 */
export function getGameAudioIntegration(
  config?: GameAudioConfig
): GameAudioIntegration {
  if (!gameAudioIntegrationInstance) {
    gameAudioIntegrationInstance = new GameAudioIntegration(config);
  }
  return gameAudioIntegrationInstance;
}

