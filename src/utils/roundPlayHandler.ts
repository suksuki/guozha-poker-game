/**
 * 轮次出牌处理器
 * 封装异步出牌处理的完整流程
 */

import { Round, PlayProcessResult } from './Round';
import { Card, RoundPlayRecord, Player } from '../types/card';
import { canPlayCards, calculateCardsScore, isScoreCard } from './cardUtils';
import { announcePlay, announcePass } from '../services/systemAnnouncementService';
import { voiceService } from '../services/voiceService';

/**
 * 出牌处理选项
 */
export interface PlayProcessOptions {
  /** 是否等待最短间隔 */
  waitForMinInterval?: boolean;
  /** 是否启用超时检测 */
  enableTimeout?: boolean;
  /** 超时回调 */
  onTimeout?: () => void;
  /** 处理开始回调 */
  onStart?: () => void;
  /** 处理完成回调 */
  onComplete?: (result: PlayProcessResult) => void;
  /** 处理失败回调 */
  onError?: (error: Error) => void;
}

/**
 * 轮次出牌处理器类
 */
export class RoundPlayHandler {
  private round: Round;
  private players: Player[];

  constructor(round: Round, players: Player[]) {
    this.round = round;
    this.players = players;
  }

  /**
   * 处理玩家出牌（完整流程）
   * 
   * 流程：
   * 1. 检查最短间隔（如果需要，等待）
   * 2. 验证牌型和规则
   * 3. 异步处理：记录出牌 → 生成TTS → 播放语音 → 等待完成
   * 4. 处理完成后返回结果
   */
  async processPlay(
    playerIndex: number,
    cards: Card[],
    options: PlayProcessOptions = {}
  ): Promise<PlayProcessResult> {
    const {
      waitForMinInterval = true,
      enableTimeout = true,
      onTimeout,
      onStart,
      onComplete,
      onError
    } = options;

    try {
      // 1. 等待最短间隔
      if (waitForMinInterval) {
        const canPlay = this.round.canPlayNow(playerIndex);
        if (canPlay !== true) {
          await this.round.waitForMinInterval();
        }
      }

      // 2. 验证牌型
      const play = canPlayCards(cards);
      if (!play) {
        throw new Error('不合法的牌型');
      }

      // 3. 检查是否能压过上家
      // 注意：如果 lastPlay 为 null，说明新轮次开始，可以自由出任意牌型
      const lastPlay = this.round.getLastPlay();
      
      if (lastPlay !== null) {
        // TODO: 需要导入 canBeat 函数
        // if (!canBeat(play, lastPlay)) {
        //   throw new Error('不能压过上家的牌');
        // }
      }

      // 4. 创建出牌记录
      const player = this.players[playerIndex];
      const playRecord: RoundPlayRecord = {
        playerId: playerIndex,
        playerName: player.name,
        cards: cards,
        scoreCards: cards.filter(c => isScoreCard(c)),
        score: calculateCardsScore(cards)
      };

      // 5. 开始超时计时
      if (enableTimeout) {
        this.round.startPlayTimer(playerIndex, () => {
          onTimeout?.();
        });
      }

      // 6. 调用开始回调
      onStart?.();

      // 7. 异步处理出牌
      const result = await this.round.processPlayAsync(playerIndex, async () => {
        // 7.1 记录出牌
        this.round.recordPlay(playRecord, play);

        // 7.2 生成TTS并播放语音（等待完成）
        await announcePlay(play, player.voiceConfig);
      });

      // 8. 处理结果
      if (result.status === 'completed') {
        onComplete?.(result);
      } else {
        onError?.(result.error || new Error('出牌处理失败'));
      }

      return result;
    } catch (error) {
      // 清除计时器
      this.round.clearPlayTimer(playerIndex);
      
      const errorObj = error as Error;
      onError?.(errorObj);
      
      return {
        status: 'failed',
        startTime: Date.now(),
        error: errorObj
      };
    }
  }

  /**
   * 处理玩家要不起
   */
  async processPass(
    playerIndex: number,
    options: {
      onStart?: () => void;
      onComplete?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<void> {
    const { onStart, onComplete, onError } = options;

    try {
      // 1. 记录要不起
      this.round.recordPass(playerIndex);

      // 2. 调用开始回调
      onStart?.();

      // 3. 播放"要不起"语音（等待完成）
      const player = this.players[playerIndex];
      await announcePass(player.voiceConfig);

      // 4. 完成
      onComplete?.();
    } catch (error) {
      const errorObj = error as Error;
      onError?.(errorObj);
      throw errorObj;
    }
  }

  /**
   * 等待当前出牌处理完成
   */
  async waitForCurrentPlay(): Promise<PlayProcessResult | null> {
    if (!this.round.hasProcessingPlay()) {
      return null;
    }
    return this.round.waitForPlayProcess();
  }

  /**
   * 等待语音播放完成
   */
  async waitForSpeechComplete(timeout: number = 5000): Promise<void> {
    if (!voiceService.isCurrentlySpeaking()) {
      return;
    }

    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (!voiceService.isCurrentlySpeaking()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);

      // 超时保护
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, timeout);
    });
  }

  /**
   * 开始超时计时
   */
  startTimeoutTimer(playerIndex: number, onTimeout: () => void): void {
    this.round.startPlayTimer(playerIndex, onTimeout);
  }

  /**
   * 清除超时计时
   */
  clearTimeoutTimer(playerIndex: number): void {
    this.round.clearPlayTimer(playerIndex);
  }

  /**
   * 获取剩余时间
   */
  getRemainingTime(playerIndex: number): number {
    const elapsed = this.round.getElapsedWaitTime(playerIndex);
    const config = this.round.getTimingConfig();
    return Math.max(0, config.playTimeout - elapsed);
  }
}

