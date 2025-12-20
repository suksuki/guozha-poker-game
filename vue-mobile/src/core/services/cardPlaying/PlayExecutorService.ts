/**
 * 出牌执行服务
 * 统一管理所有出牌执行逻辑
 */

import { Card, Play, Player, RoundPlayRecord } from '../../types/card';
import { ValidationService } from './ValidationService';
import { ValidationResult, PlayOptions, PlayResult } from './types';
import { calculateCardsScore, isScoreCard } from '../../utils/cardUtils';

/**
 * 出牌执行服务类
 * 提供统一的出牌执行接口
 */
export class PlayExecutorService {
  private validationService: ValidationService;

  constructor(validationService?: ValidationService) {
    this.validationService = validationService || new ValidationService();
  }

  /**
   * 执行出牌
   * @param playerId 玩家ID
   * @param cards 要出的牌
   * @param playerHand 玩家手牌（用于验证）
   * @param lastPlay 上家出的牌（可选）
   * @param options 出牌选项
   * @returns 出牌结果
   */
  async executePlay(
    playerId: number,
    cards: Card[],
    playerHand: Card[],
    lastPlay: Play | null,
    options: PlayOptions = {}
  ): Promise<PlayResult> {
    try {
      // 1. 验证出牌
      const validationResult = this.validatePlay(playerId, cards, playerHand, lastPlay);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error || '出牌验证失败'
        };
      }

      if (!validationResult.play) {
        return {
          success: false,
          error: '无法确定牌型'
        };
      }

      // 2. 创建出牌记录
      const playRecord: RoundPlayRecord = {
        playerId: playerId,
        playerName: `玩家${playerId + 1}`, // 默认名称，实际应该从player对象获取
        cards: cards,
        scoreCards: cards.filter(card => isScoreCard(card)),
        score: calculateCardsScore(cards)
      };

      // 3. 调用开始回调
      options.onStart?.();

      // 4. 返回成功结果
      const result: PlayResult = {
        success: true,
        play: validationResult.play,
        playRecord
      };

      // 5. 调用完成回调
      options.onComplete?.(result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '出牌执行失败';
      
      // 调用错误回调
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 验证出牌
   * @param playerId 玩家ID
   * @param cards 要出的牌
   * @param playerHand 玩家手牌（用于验证）
   * @param lastPlay 上家出的牌（可选）
   * @returns 验证结果
   */
  validatePlay(
    playerId: number,
    cards: Card[],
    playerHand: Card[],
    lastPlay?: Play | null
  ): ValidationResult {
    return this.validationService.validatePlayRules(
      cards,
      lastPlay || null,
      playerHand,
      {
        checkInHand: true,
        allowEmpty: false
      }
    );
  }

  /**
   * 判断是否能压过上家
   * @param cards 要出的牌
   * @param lastPlay 上家出的牌
   * @returns 是否能压过
   */
  canBeat(cards: Card[], lastPlay: Play | null): boolean {
    const play = this.validationService.validateCardType(cards);
    if (!play) {
      return false;
    }

    return this.validationService.canBeat(play, lastPlay);
  }

  /**
   * 获取可出的牌
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 所有可出的牌组合
   */
  getPlayableCards(
    playerId: number,
    playerHand: Card[],
    lastPlay?: Play | null
  ): Card[][] {
    return this.validationService.findPlayableCards(playerHand, lastPlay || null);
  }

  /**
   * 检查是否有能打过的牌
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 是否有能打过的牌
   */
  hasPlayableCards(
    playerId: number,
    playerHand: Card[],
    lastPlay?: Play | null
  ): boolean {
    return this.validationService.hasPlayableCards(playerHand, lastPlay || null);
  }
}

// 导出单例实例
export const playExecutorService = new PlayExecutorService();

