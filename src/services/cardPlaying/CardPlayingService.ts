/**
 * 打牌服务（统一入口）
 * 整合所有打牌相关的服务，提供统一的接口
 */

import { Card, Play, Player } from '../../types/card';
import { ValidationService } from './ValidationService';
import { CardSelectorService } from './CardSelectorService';
import { PlayExecutorService } from './PlayExecutorService';
import { AISuggesterService } from './AISuggesterService';
import {
  ValidationResult,
  SelectionResult,
  PlayResult,
  SuggestResult,
  PlayOptions,
  SuggestOptions
} from './types';

/**
 * 打牌服务配置
 */
export interface CardPlayingServiceConfig {
  /** 验证服务 */
  validationService?: ValidationService;
  /** 选牌服务 */
  cardSelectorService?: CardSelectorService;
  /** 出牌执行服务 */
  playExecutorService?: PlayExecutorService;
  /** AI建议服务 */
  aiSuggesterService?: AISuggesterService;
}

/**
 * 打牌服务类
 * 提供统一的打牌接口，整合所有相关服务
 */
export class CardPlayingService {
  private validationService: ValidationService;
  private cardSelectorService: CardSelectorService;
  private playExecutorService: PlayExecutorService;
  private aiSuggesterService: AISuggesterService;

  constructor(config: CardPlayingServiceConfig = {}) {
    this.validationService = config.validationService || new ValidationService();
    this.cardSelectorService = config.cardSelectorService || new CardSelectorService(this.validationService);
    this.playExecutorService = config.playExecutorService || new PlayExecutorService(this.validationService);
    this.aiSuggesterService = config.aiSuggesterService || new AISuggesterService(this.validationService, this.playExecutorService);
  }

  // ========== 验证相关 ==========

  /**
   * 验证牌型
   * @param cards 要验证的牌
   * @returns 验证结果
   */
  validateCardType(cards: Card[]): Play | null {
    return this.validationService.validateCardType(cards);
  }

  /**
   * 验证出牌规则
   * @param cards 要出的牌
   * @param lastPlay 上家出的牌（可选）
   * @param playerHand 玩家手牌（可选）
   * @returns 验证结果
   */
  validatePlayRules(
    cards: Card[],
    lastPlay: Play | null,
    playerHand?: Card[]
  ): ValidationResult {
    return this.validationService.validatePlayRules(cards, lastPlay, playerHand);
  }

  /**
   * 判断是否能压过上家
   * @param play 当前要出的牌
   * @param lastPlay 上家出的牌
   * @returns 是否能压过
   */
  canBeat(play: Play, lastPlay: Play | null): boolean {
    return this.validationService.canBeat(play, lastPlay);
  }

  /**
   * 查找可出的牌
   * @param hand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 所有可出的牌组合
   */
  findPlayableCards(hand: Card[], lastPlay?: Play | null): Card[][] {
    return this.validationService.findPlayableCards(hand, lastPlay || null);
  }

  /**
   * 检查是否有能打过的牌
   * @param hand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 是否有能打过的牌
   */
  hasPlayableCards(hand: Card[], lastPlay?: Play | null): boolean {
    return this.validationService.hasPlayableCards(hand, lastPlay || null);
  }

  // ========== 选牌相关 ==========

  /**
   * 初始化玩家选牌状态
   * @param playerId 玩家ID
   * @param mode 选牌模式
   */
  initializePlayerSelection(playerId: number, mode: 'card' | 'rank' = 'card'): void {
    this.cardSelectorService.initializePlayer(playerId, mode);
  }

  /**
   * 选择单张牌
   * @param playerId 玩家ID
   * @param card 要选择的牌
   * @param playerHand 玩家手牌（用于验证）
   * @returns 选牌结果
   */
  selectCard(playerId: number, card: Card, playerHand?: Card[]): SelectionResult {
    return this.cardSelectorService.selectCard(playerId, card, playerHand);
  }

  /**
   * 取消选择单张牌
   * @param playerId 玩家ID
   * @param card 要取消选择的牌
   * @returns 选牌结果
   */
  deselectCard(playerId: number, card: Card): SelectionResult {
    return this.cardSelectorService.deselectCard(playerId, card);
  }

  /**
   * 切换单张牌的选择状态
   * @param playerId 玩家ID
   * @param card 要切换的牌
   * @param playerHand 玩家手牌（用于验证）
   * @returns 选牌结果
   */
  toggleCard(playerId: number, card: Card, playerHand?: Card[]): SelectionResult {
    return this.cardSelectorService.toggleCard(playerId, card, playerHand);
  }

  /**
   * 选择一组牌
   * @param playerId 玩家ID
   * @param cards 要选择的牌组
   * @param playerHand 玩家手牌（用于验证）
   * @returns 选牌结果
   */
  selectGroup(playerId: number, cards: Card[], playerHand?: Card[]): SelectionResult {
    return this.cardSelectorService.selectGroup(playerId, cards, playerHand);
  }

  /**
   * 清空选择
   * @param playerId 玩家ID
   */
  clearSelection(playerId: number): void {
    this.cardSelectorService.clearSelection(playerId);
  }

  /**
   * 获取选中的牌
   * @param playerId 玩家ID
   * @returns 选中的牌
   */
  getSelection(playerId: number): Card[] {
    return this.cardSelectorService.getSelection(playerId);
  }

  /**
   * 高亮可出牌
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 高亮的牌
   */
  highlightPlayableCards(
    playerId: number,
    playerHand: Card[],
    lastPlay?: Play | null
  ): Card[] {
    return this.cardSelectorService.highlightPlayableCards(playerId, playerHand, lastPlay || null);
  }

  // ========== 出牌执行相关 ==========

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
    return this.playExecutorService.executePlay(playerId, cards, playerHand, lastPlay, options);
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
    return this.playExecutorService.validatePlay(playerId, cards, playerHand, lastPlay);
  }

  // ========== AI建议相关 ==========

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
    return this.aiSuggesterService.suggestPlay(playerId, playerHand, lastPlay, options);
  }

  /**
   * 获取多个AI建议
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
    return this.aiSuggesterService.suggestMultiple(playerId, playerHand, lastPlay, optionsList);
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
    lastPlay?: Play | null
  ): number {
    return this.aiSuggesterService.evaluateSuggestion(suggestResult, playerHand, lastPlay || null);
  }

  // ========== 便捷方法 ==========

  /**
   * 完整的打牌流程（验证 + 执行）
   * @param playerId 玩家ID
   * @param cards 要出的牌
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @param options 出牌选项
   * @returns 出牌结果
   */
  async playCards(
    playerId: number,
    cards: Card[],
    playerHand: Card[],
    lastPlay: Play | null,
    options: PlayOptions = {}
  ): Promise<PlayResult> {
    // 1. 验证
    const validation = this.validatePlay(playerId, cards, playerHand, lastPlay);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || '出牌验证失败'
      };
    }

    // 2. 执行
    return this.executePlay(playerId, cards, playerHand, lastPlay, options);
  }

  /**
   * 获取并应用AI建议（选牌 + 验证）
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @param options AI建议选项
   * @returns 选牌结果（如果成功）
   */
  async getAndApplySuggestion(
    playerId: number,
    playerHand: Card[],
    lastPlay: Play | null,
    options: SuggestOptions = {}
  ): Promise<SelectionResult | null> {
    // 1. 获取AI建议
    const suggestion = await this.suggestPlay(playerId, playerHand, lastPlay, options);
    if (!suggestion) {
      return null;
    }

    // 2. 应用建议（设置选牌）
    // 注意：这里需要根据选牌模式来处理
    // 如果是 rank 模式，需要使用 setSelectionFromCards
    const rankState = this.cardSelectorService.getRankSelectionState(playerId);
    if (rankState) {
      // rank 模式：需要按点数分组
      const groupedHand = new Map<number, Card[]>();
      playerHand.forEach(card => {
        const rank = card.rank;
        if (!groupedHand.has(rank)) {
          groupedHand.set(rank, []);
        }
        groupedHand.get(rank)!.push(card);
      });
      return this.cardSelectorService.setSelectionFromCards(playerId, suggestion.cards, groupedHand);
    } else {
      // card 模式：直接选择
      suggestion.cards.forEach(card => {
        this.selectCard(playerId, card, playerHand);
      });
      return {
        success: true,
        selectedCards: suggestion.cards
      };
    }
  }

  /**
   * 检查是否可以出牌
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 是否可以出牌
   */
  canPlay(playerId: number, playerHand: Card[], lastPlay?: Play | null): boolean {
    return this.hasPlayableCards(playerHand, lastPlay || null);
  }

  /**
   * 获取选中的牌并验证
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 验证结果
   */
  validateSelection(
    playerId: number,
    playerHand: Card[],
    lastPlay?: Play | null
  ): ValidationResult {
    const selectedCards = this.getSelection(playerId);
    return this.validatePlay(playerId, selectedCards, playerHand, lastPlay);
  }
}

// 导出单例实例
export const cardPlayingService = new CardPlayingService();

