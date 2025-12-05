// @ts-nocheck
/**
 * 理由生成服务
 * 为AI建议生成详细的理由说明
 */

import { Card, Play } from '../../types/card';
import { PlaySuggestion } from './types';
import { canPlayCards, isScoreCard, calculateCardsScore, canBeat } from '../../utils/cardUtils';
import { evaluateActionQuality } from '../../utils/mctsAI';

interface ReasoningContext {
  hand: Card[];
  lastPlay: Play | null;
  currentRoundScore: number;
  remainingCardCount: number;
  playerCount?: number;
}

/**
 * 理由生成服务类
 */
export class ReasoningService {
  /**
   * 为单个建议生成详细理由
   */
  generateReasoning(
    cards: Card[],
    context: ReasoningContext
  ): Omit<PlaySuggestion, 'cards'> {
    const play = canPlayCards(cards);
    if (!play) {
      throw new Error('Invalid play');
    }

    const remainingHand = context.hand.filter(
      card => !cards.some(c => c.id === card.id)
    );

    // 1. 计算推荐度评分（1-5星）
    const rating = this.calculateRating(cards, play, context, remainingHand);

    // 2. 生成主要原因
    const mainReason = this.generateMainReason(cards, play, context, remainingHand);

    // 3. 生成详细理由
    const detailedReason = this.generateDetailedReason(cards, play, context, remainingHand);

    // 4. 生成优缺点列表
    const advantages = this.generateAdvantages(cards, play, context, remainingHand);
    const disadvantages = this.generateDisadvantages(cards, play, context, remainingHand);

    // 5. 评估风险等级
    const riskLevel = this.assessRiskLevel(cards, play, context, remainingHand);

    // 6. 评估预期收益
    const expectedBenefit = this.assessExpectedBenefit(cards, play, context, remainingHand);

    // 7. 计算置信度
    const confidence = this.calculateConfidence(cards, play, context, remainingHand);

    return {
      type: play.type,
      value: play.value,
      rating,
      mainReason,
      detailedReason,
      advantages,
      disadvantages,
      riskLevel,
      expectedBenefit,
      confidence
    };
  }

  /**
   * 计算推荐度评分（1-5星）
   */
  private calculateRating(
    cards: Card[],
    play: Play,
    context: ReasoningContext,
    remainingHand: Card[]
  ): number {
    let score = 3; // 基础分3星

    // 牌型加分
    if (play.type === 'dun') {
      score += 1.5; // 墩加1.5星
    } else if (play.type === 'bomb') {
      score += 1; // 炸弹加1星
    } else if (play.type === 'triple') {
      score += 0.5; // 三张加0.5星
    }

    // 手牌剩余数量
    if (remainingHand.length === 0) {
      score += 2; // 出完牌加2星
    } else if (remainingHand.length <= 3) {
      score += 1; // 快出完加1星
    } else if (remainingHand.length <= 6) {
      score += 0.5; // 中后期加0.5星
    }

    // 能否压过
    if (context.lastPlay) {
      if (play.type === 'bomb' && context.lastPlay.type !== 'bomb' && context.lastPlay.type !== 'dun') {
        score += 1; // 用炸弹压过非炸弹/墩加1星
      } else if (play.type === 'dun') {
        score += 1.5; // 用墩压过加1.5星
      } else if (play.value > context.lastPlay.value) {
        const diff = play.value - context.lastPlay.value;
        if (diff <= 3) {
          score += 1; // 最小能压过加1星（节省大牌）
        } else {
          score += 0.5; // 能压过但用了大牌加0.5星
        }
      }
    } else {
      // 首发出小牌加分
      if (play.value <= 10) {
        score += 0.5;
      }
    }

    // 分牌策略
    const scoreCards = cards.filter(card => isScoreCard(card));
    const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
    if (scoreCards.length > 0) {
      // 出分牌：如果能确保拿到分，加分；否则扣分
      if (context.lastPlay && play.value > context.lastPlay.value) {
        score += 0.5; // 能拿到分加0.5星
      } else {
        score -= 0.5; // 不能确保拿到分扣0.5星
      }
    } else if (remainingScoreCards.length > 0) {
      score += 0.5; // 保护分牌加0.5星
    }

    // 限制在1-5星之间
    return Math.max(1, Math.min(5, Math.round(score * 10) / 10));
  }

  /**
   * 生成主要原因
   */
  private generateMainReason(
    cards: Card[],
    play: Play,
    context: ReasoningContext,
    remainingHand: Card[]
  ): string {
    const reasons: string[] = [];

    // 手牌剩余数量
    if (remainingHand.length === 0) {
      return '出完所有手牌，获胜！';
    } else if (remainingHand.length <= 3) {
      reasons.push('接近出完手牌');
    }

    // 牌型优势
    if (play.type === 'dun') {
      reasons.push('使用墩可以压制所有非墩牌型');
    } else if (play.type === 'bomb') {
      reasons.push('使用炸弹可以压制非炸弹/墩牌型');
    } else if (play.type === 'triple') {
      reasons.push('使用三张组合牌型');
    }

    // 压牌优势
    if (context.lastPlay) {
      if (play.type === 'bomb' && context.lastPlay.type !== 'bomb' && context.lastPlay.type !== 'dun') {
        reasons.push('用炸弹压制上家');
      } else if (play.type === 'dun') {
        reasons.push('用墩压制上家');
      } else if (play.value > context.lastPlay.value) {
        const diff = play.value - context.lastPlay.value;
        if (diff <= 3) {
          reasons.push('最小能压过的牌，节省大牌');
        } else {
          reasons.push('能够压过上家');
        }
      }
    } else {
      if (play.value <= 10) {
        reasons.push('首发出小牌，保留大牌');
      }
    }

    // 分牌策略
    const scoreCards = cards.filter(card => isScoreCard(card));
    if (scoreCards.length > 0) {
      if (context.lastPlay && play.value > context.lastPlay.value) {
        reasons.push('出分牌并确保拿到分');
      }
    } else {
      const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
      if (remainingScoreCards.length > 0) {
        reasons.push('保护分牌');
      }
    }

    if (reasons.length === 0) {
      return '合理的出牌选择';
    }

    return reasons.join('；');
  }

  /**
   * 生成详细理由
   */
  private generateDetailedReason(
    cards: Card[],
    play: Play,
    context: ReasoningContext,
    remainingHand: Card[]
  ): string {
    const lines: string[] = [];

    // 牌型说明
    const typeNames: { [key: string]: string } = {
      'single': '单张',
      'pair': '对子',
      'triple': '三张',
      'bomb': '炸弹',
      'dun': '墩'
    };
    lines.push(`出${typeNames[play.type] || play.type}，牌值为${play.value}。`);

    // 手牌状态
    if (remainingHand.length === 0) {
      lines.push('出完所有手牌，可以直接获胜。');
    } else {
      lines.push(`剩余${remainingHand.length}张手牌。`);
    }

    // 压牌说明
    if (context.lastPlay) {
      if (play.type === 'bomb' && context.lastPlay.type !== 'bomb' && context.lastPlay.type !== 'dun') {
        lines.push('使用炸弹可以压制上家的非炸弹/墩牌型。');
      } else if (play.type === 'dun') {
        lines.push('使用墩可以压制所有非墩牌型，并且可以扣除其他玩家分数。');
      } else if (play.value > context.lastPlay.value) {
        const diff = play.value - context.lastPlay.value;
        if (diff <= 3) {
          lines.push(`使用最小能压过的牌（仅大${diff}点），可以节省大牌用于关键时刻。`);
        } else {
          lines.push(`能够压过上家的牌（大${diff}点）。`);
        }
      }
    } else {
      lines.push('这是新轮次的首发出牌。');
      if (play.value <= 10) {
        lines.push('首发出小牌，可以保留大牌用于后续的关键时刻。');
      }
    }

    // 分牌说明
    const scoreCards = cards.filter(card => isScoreCard(card));
    const score = calculateCardsScore(scoreCards);
    if (score > 0) {
      lines.push(`出牌中包含${score}分的分牌。`);
      if (context.lastPlay && play.value > context.lastPlay.value) {
        lines.push('能够确保拿到这些分数。');
      } else {
        lines.push('需要注意，可能无法确保拿到这些分数。');
      }
    } else {
      const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
      const remainingScore = calculateCardsScore(remainingScoreCards);
      if (remainingScore > 0) {
        lines.push(`保护了手牌中的${remainingScore}分分牌。`);
      }
    }

    // 拆牌说明
    const handRankGroups = new Map<number, number>();
    context.hand.forEach(card => {
      handRankGroups.set(card.rank, (handRankGroups.get(card.rank) || 0) + 1);
    });
    const playRank = cards[0].rank;
    const originalCount = handRankGroups.get(playRank) || 0;
    const remainingCount = originalCount - cards.length;
    if (originalCount >= 4 && remainingCount > 0 && remainingCount < 4) {
      lines.push(`注意：这可能会拆散原本的炸弹组合（原本有${originalCount}张，出${cards.length}张后剩余${remainingCount}张）。`);
    }

    return lines.join(' ');
  }

  /**
   * 生成优点列表
   */
  private generateAdvantages(
    cards: Card[],
    play: Play,
    context: ReasoningContext,
    remainingHand: Card[]
  ): string[] {
    const advantages: string[] = [];

    if (remainingHand.length === 0) {
      advantages.push('出完所有手牌，直接获胜');
    }

    if (play.type === 'dun') {
      advantages.push('墩可以压制所有非墩牌型');
      advantages.push('出墩可以扣除其他玩家分数');
    } else if (play.type === 'bomb') {
      advantages.push('炸弹可以压制非炸弹/墩牌型');
    } else if (play.type === 'triple') {
      advantages.push('使用组合牌型，减少手牌数量');
    }

    if (context.lastPlay) {
      if (play.value > context.lastPlay.value) {
        const diff = play.value - context.lastPlay.value;
        if (diff <= 3) {
          advantages.push('使用最小能压过的牌，节省大牌');
        }
        advantages.push('能够压过上家的牌');
      }
    } else {
      if (play.value <= 10) {
        advantages.push('首发出小牌，保留大牌');
      }
    }

    const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
    if (remainingScoreCards.length > 0) {
      advantages.push('保护了手牌中的分牌');
    }

    const scoreCards = cards.filter(card => isScoreCard(card));
    if (scoreCards.length > 0 && context.lastPlay && play.value > context.lastPlay.value) {
      advantages.push('能够拿到分牌分数');
    }

    if (advantages.length === 0) {
      advantages.push('合理的出牌选择');
    }

    return advantages;
  }

  /**
   * 生成缺点列表
   */
  private generateDisadvantages(
    cards: Card[],
    play: Play,
    context: ReasoningContext,
    remainingHand: Card[]
  ): string[] {
    const disadvantages: string[] = [];

    // 拆牌检查
    const handRankGroups = new Map<number, number>();
    context.hand.forEach(card => {
      handRankGroups.set(card.rank, (handRankGroups.get(card.rank) || 0) + 1);
    });
    const playRank = cards[0].rank;
    const originalCount = handRankGroups.get(playRank) || 0;
    const remainingCount = originalCount - cards.length;
    if (originalCount >= 4 && remainingCount > 0 && remainingCount < 4) {
      disadvantages.push('拆散了原本的炸弹组合');
    }

    // 出分牌风险
    const scoreCards = cards.filter(card => isScoreCard(card));
    if (scoreCards.length > 0) {
      if (!context.lastPlay || play.value <= (context.lastPlay?.value || 0)) {
        disadvantages.push('出分牌但可能无法确保拿到分数');
      }
    }

    // 使用大牌
    if (play.value >= 13) {
      if (context.lastPlay && play.value - context.lastPlay.value > 5) {
        disadvantages.push('使用了较大价值的牌，可能浪费');
      }
    }

    // 手牌还多
    if (remainingHand.length > 10) {
      if (play.type === 'bomb' || play.type === 'dun') {
        disadvantages.push('手牌还多，使用炸弹/墩需谨慎');
      }
    }

    return disadvantages;
  }

  /**
   * 评估风险等级
   */
  private assessRiskLevel(
    cards: Card[],
    play: Play,
    context: ReasoningContext,
    remainingHand: Card[]
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    // 拆牌风险
    const handRankGroups = new Map<number, number>();
    context.hand.forEach(card => {
      handRankGroups.set(card.rank, (handRankGroups.get(card.rank) || 0) + 1);
    });
    const playRank = cards[0].rank;
    const originalCount = handRankGroups.get(playRank) || 0;
    const remainingCount = originalCount - cards.length;
    if (originalCount >= 4 && remainingCount > 0 && remainingCount < 4) {
      riskScore += 2; // 拆炸弹高风险
    }

    // 出分牌风险
    const scoreCards = cards.filter(card => isScoreCard(card));
    if (scoreCards.length > 0) {
      if (!context.lastPlay || play.value <= (context.lastPlay?.value || 0)) {
        riskScore += 2; // 分牌可能丢失高风险
      }
    }

    // 使用大牌风险
    if (play.value >= 13 && remainingHand.length > 6) {
      riskScore += 1; // 手牌还多就用大牌中风险
    }

    // 出炸弹/墩风险
    if ((play.type === 'bomb' || play.type === 'dun') && remainingHand.length > 10) {
      riskScore += 1; // 手牌还多就用炸弹中风险
    }

    if (riskScore >= 3) {
      return 'high';
    } else if (riskScore >= 1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 评估预期收益
   */
  private assessExpectedBenefit(
    cards: Card[],
    play: Play,
    context: ReasoningContext,
    remainingHand: Card[]
  ): string {
    const benefits: string[] = [];

    if (remainingHand.length === 0) {
      return '直接获胜';
    }

    // 分数收益
    const scoreCards = cards.filter(card => isScoreCard(card));
    const score = calculateCardsScore(scoreCards);
    if (score > 0 && context.lastPlay && play.value > context.lastPlay.value) {
      benefits.push(`获得${score}分`);
    }

    // 墩的收益
    if (play.type === 'dun') {
      const playerCount = context.playerCount || 4;
      const dunPoints = play.cards.length >= 7 ? Math.pow(2, play.cards.length - 7) : 0;
      benefits.push(`扣除其他玩家${dunPoints * (playerCount - 1) * 30}分`);
    }

    // 控制收益
    if (play.type === 'bomb' || play.type === 'dun') {
      benefits.push('控制出牌权');
    }

    // 手牌减少收益
    if (remainingHand.length <= 3) {
      benefits.push('接近出完手牌');
    } else if (remainingHand.length <= 6) {
      benefits.push('减少手牌数量');
    }

    if (benefits.length === 0) {
      return '正常出牌';
    }

    return benefits.join('、');
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    cards: Card[],
    play: Play,
    context: ReasoningContext,
    remainingHand: Card[]
  ): number {
    let confidence = 0.7; // 基础置信度

    // 手牌少时置信度高
    if (remainingHand.length === 0) {
      confidence = 1.0; // 出完牌100%置信
    } else if (remainingHand.length <= 3) {
      confidence = 0.95;
    } else if (remainingHand.length <= 6) {
      confidence = 0.85;
    }

    // 炸弹/墩置信度高
    if (play.type === 'dun') {
      confidence = Math.min(0.95, confidence + 0.1);
    } else if (play.type === 'bomb') {
      confidence = Math.min(0.9, confidence + 0.1);
    }

    // 拆牌降低置信度
    const handRankGroups = new Map<number, number>();
    context.hand.forEach(card => {
      handRankGroups.set(card.rank, (handRankGroups.get(card.rank) || 0) + 1);
    });
    const playRank = cards[0].rank;
    const originalCount = handRankGroups.get(playRank) || 0;
    const remainingCount = originalCount - cards.length;
    if (originalCount >= 4 && remainingCount > 0 && remainingCount < 4) {
      confidence = Math.max(0.5, confidence - 0.15); // 拆炸弹降低置信度
    }

    return Math.round(confidence * 100) / 100;
  }
}

// 导出单例实例
export const reasoningService = new ReasoningService();
// @ts-nocheck
