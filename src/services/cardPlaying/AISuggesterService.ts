/**
 * AI建议服务
 * 统一管理所有AI建议逻辑
 */

import { Card, Play } from '../../types/card';
import { ValidationService } from './ValidationService';
import { PlayExecutorService } from './PlayExecutorService';
import { SuggestOptions, SuggestResult } from './types';
import { aiChoosePlay } from '../../utils/aiPlayer';

/**
 * AI建议服务类
 * 提供统一的AI建议接口
 */
export class AISuggesterService {
  private validationService: ValidationService;
  private playExecutorService: PlayExecutorService;

  constructor(
    validationService?: ValidationService,
    playExecutorService?: PlayExecutorService
  ) {
    this.validationService = validationService || new ValidationService();
    this.playExecutorService = playExecutorService || new PlayExecutorService();
  }

  /**
   * 获取AI建议
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @param options AI建议选项
   * @returns AI建议结果
   */
  async suggestPlay(
    playerId: number,
    playerHand: Card[],
    lastPlay: Play | null,
    options: SuggestOptions = {}
  ): Promise<SuggestResult | null> {
    try {
      // 1. 检查是否有可出的牌
      const hasPlayable = this.playExecutorService.hasPlayableCards(
        playerId,
        playerHand,
        lastPlay
      );

      if (!hasPlayable) {
        return null; // 没有可出的牌
      }

      // 2. 使用AI选择出牌
      const suggestedCards = await aiChoosePlay(playerHand, lastPlay, {
        strategy: options.strategy || 'balanced',
        algorithm: options.algorithm || 'mcts',
        mctsIterations: options.mctsIterations || 50
      });

      if (!suggestedCards || suggestedCards.length === 0) {
        return null; // AI建议要不起
      }

      // 3. 验证建议的牌是否在手牌中
      const handCardIds = new Set(playerHand.map(c => c.id));
      const allCardsInHand = suggestedCards.every(card => handCardIds.has(card.id));
      
      if (!allCardsInHand) {
        console.warn('[AISuggesterService] 建议的牌不在手牌中，忽略建议', {
          playerId,
          suggestedCardIds: suggestedCards.map(c => c.id),
          handCardIds: Array.from(handCardIds)
        });
        return null; // 建议的牌不在手牌中
      }

      // 4. 验证建议的牌型
      const play = this.validationService.validateCardType(suggestedCards);
      if (!play) {
        console.warn('[AISuggesterService] 建议的牌不构成合法牌型，忽略建议', {
          playerId,
          suggestedCards: suggestedCards.map(c => `${c.rank}-${c.suit}`)
        });
        return null; // 建议的牌不合法
      }

      // 5. 如果有上家出牌，检查是否能压过
      if (lastPlay) {
        const canBeat = this.validationService.canBeat(play, lastPlay);
        if (!canBeat) {
          console.warn('[AISuggesterService] 建议的牌不能压过上家的牌，忽略建议', {
            playerId,
            playType: play.type,
            playValue: play.value,
            lastPlayType: lastPlay.type,
            lastPlayValue: lastPlay.value
          });
          return null; // 建议的牌不能压过上家
        }
      }

      // 6. 生成解释说明
      const explanation = this.generateExplanation(
        play,
        lastPlay,
        playerHand,
        suggestedCards,
        options.strategy || 'balanced'
      );

      // 7. 返回建议结果
      return {
        cards: suggestedCards,
        type: play.type,
        value: play.value,
        explanation
      };
    } catch (error) {
      console.error('[AISuggesterService] 获取AI建议失败:', error);
      return null;
    }
  }

  /**
   * 生成解释说明
   * @param play 建议的牌型
   * @param lastPlay 上家出的牌（可选）
   * @param playerHand 玩家手牌
   * @param suggestedCards 建议的牌
   * @param strategy 策略类型
   * @returns 解释说明
   */
  private generateExplanation(
    play: Play,
    lastPlay: Play | null,
    playerHand: Card[],
    suggestedCards: Card[],
    strategy: string
  ): string {
    const explanations: string[] = [];

    // 1. 牌型说明
    const typeNames: { [key: string]: string } = {
      'single': '单张',
      'pair': '对子',
      'triple': '三张',
      'bomb': '炸弹',
      'dun': '墩'
    };
    explanations.push(`出${typeNames[play.type] || play.type}`);

    // 2. 策略说明
    if (strategy === 'aggressive') {
      explanations.push('（激进策略：优先出大牌）');
    } else if (strategy === 'conservative') {
      explanations.push('（保守策略：优先出小牌）');
    } else {
      explanations.push('（平衡策略）');
    }

    // 3. 剩余手牌说明
    const remainingCount = playerHand.length - suggestedCards.length;
    if (remainingCount <= 3) {
      explanations.push(`剩余${remainingCount}张牌，快出完了！`);
    } else if (remainingCount <= 6) {
      explanations.push(`剩余${remainingCount}张牌`);
    }

    // 4. 特殊牌型说明
    if (play.type === 'bomb' || play.type === 'dun') {
      if (remainingCount > 10) {
        explanations.push('（注意：手牌还多，使用炸弹/墩需谨慎）');
      } else {
        explanations.push('（使用炸弹/墩，可以压制对手）');
      }
    }

    // 5. 压牌说明
    if (lastPlay) {
      if (play.type === 'bomb' && lastPlay.type !== 'bomb' && lastPlay.type !== 'dun') {
        explanations.push('（用炸弹压过对手）');
      } else if (play.type === 'dun') {
        explanations.push('（用墩压过对手）');
      } else if (play.value > lastPlay.value) {
        explanations.push(`（${play.value} > ${lastPlay.value}，可以压过）`);
      }
    }

    return explanations.join(' ');
  }

  /**
   * 获取多个AI建议（用于对比）
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @param optionsList 多个AI建议选项
   * @returns 多个AI建议结果
   */
  async suggestMultiple(
    playerId: number,
    playerHand: Card[],
    lastPlay: Play | null,
    optionsList: SuggestOptions[]
  ): Promise<SuggestResult[]> {
    const results: SuggestResult[] = [];

    for (const options of optionsList) {
      const result = await this.suggestPlay(playerId, playerHand, lastPlay, options);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 解释建议
   * @param suggestion AI建议结果
   * @returns 解释说明
   */
  explainSuggestion(suggestion: SuggestResult): string {
    return suggestion.explanation || `建议出${suggestion.type}，值为${suggestion.value}`;
  }

  /**
   * 评估建议质量
   * @param suggestResult AI建议结果
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 质量评分（0-100）
   */
  evaluateSuggestion(
    suggestResult: SuggestResult,
    playerHand: Card[],
    lastPlay: Play | null
  ): number {
    let score = 50; // 基础分

    // 1. 剩余手牌数量（越少越好）
    const remainingCount = playerHand.length - suggestResult.cards.length;
    if (remainingCount === 0) {
      score += 50; // 出完了最高分
    } else if (remainingCount <= 3) {
      score += 30; // 快出完了高分
    } else if (remainingCount <= 6) {
      score += 15; // 中后期中等分
    } else {
      score -= 10; // 手牌还多，扣分
    }

    // 2. 牌型价值
    if (suggestResult.type === 'dun') {
      score += 20; // 墩加分
    } else if (suggestResult.type === 'bomb') {
      score += 15; // 炸弹加分
    } else if (suggestResult.type === 'triple') {
      score += 10; // 三张加分
    } else if (suggestResult.type === 'pair') {
      score += 5; // 对子加分
    }

    // 3. 压牌效果
    if (lastPlay) {
      if (suggestResult.type === 'bomb' && lastPlay.type !== 'bomb' && lastPlay.type !== 'dun') {
        score += 25; // 用炸弹压过非炸弹/墩，高分
      } else if (suggestResult.type === 'dun') {
        score += 30; // 用墩压过，最高分
      } else if (suggestResult.value > lastPlay.value) {
        const diff = suggestResult.value - lastPlay.value;
        if (diff <= 3) {
          score += 20; // 最小能压过的牌，高分（节省大牌）
        } else {
          score += 10; // 能压过，但用了大牌，中等分
        }
      }
    } else {
      // 没有上家出牌，优先出小牌或组合牌
      if (suggestResult.value <= 10) {
        score += 15; // 小牌加分
      }
      if (suggestResult.type === 'pair' || suggestResult.type === 'triple') {
        score += 10; // 组合牌型加分
      }
    }

    // 4. 避免拆散炸弹
    const playRank = suggestResult.cards[0].rank;
    const originalCount = playerHand.filter(c => c.rank === playRank).length;
    const remainingCountForRank = remainingCount > 0 
      ? playerHand.filter(c => c.rank === playRank && !suggestResult.cards.some(sc => sc.id === c.id)).length
      : 0;

    if (originalCount >= 4 && remainingCountForRank > 0 && remainingCountForRank < 3) {
      score -= 30; // 拆散了炸弹，大幅扣分
    }

    // 限制分数范围
    return Math.max(0, Math.min(100, score));
  }
}

// 导出单例实例
export const aiSuggesterService = new AISuggesterService();

