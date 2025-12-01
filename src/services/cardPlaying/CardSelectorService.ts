/**
 * 选牌服务
 * 统一管理所有选牌逻辑
 */

import { Card, Play } from '../../types/card';
import { ValidationService } from './ValidationService';
import { SelectionResult, SelectionMode, CardSelectionState, RankSelectionState } from './types';

/**
 * 选牌服务类
 * 提供统一的选牌接口
 */
export class CardSelectorService {
  private validationService: ValidationService;
  
  // 每个玩家的选牌状态（基于Card对象）
  private cardSelections: Map<number, CardSelectionState> = new Map();
  
  // 每个玩家的选牌状态（基于rank）
  private rankSelections: Map<number, RankSelectionState> = new Map();

  constructor(validationService?: ValidationService) {
    this.validationService = validationService || new ValidationService();
  }

  /**
   * 初始化玩家选牌状态
   * @param playerId 玩家ID
   * @param mode 选牌模式
   */
  initializePlayer(playerId: number, mode: SelectionMode = 'card'): void {
    if (mode === 'card') {
      this.cardSelections.set(playerId, {
        selectedCards: [],
        highlightedCards: []
      });
    } else {
      this.rankSelections.set(playerId, {
        selection: new Map(),
        playableRanks: []
      });
    }
  }

  /**
   * 选择单张牌（基于Card对象）
   * @param playerId 玩家ID
   * @param card 要选择的牌
   * @param playerHand 玩家手牌（用于验证）
   * @returns 选牌结果
   */
  selectCard(playerId: number, card: Card, playerHand?: Card[]): SelectionResult {
    const state = this.cardSelections.get(playerId);
    if (!state) {
      this.initializePlayer(playerId, 'card');
      return this.selectCard(playerId, card, playerHand);
    }

    // 检查牌是否在手牌中
    if (playerHand && !playerHand.some(c => c.id === card.id)) {
      return {
        success: false,
        error: '选择的牌不在手牌中',
        selectedCards: state.selectedCards
      };
    }

    // 检查是否已选中
    if (state.selectedCards.some(c => c.id === card.id)) {
      return {
        success: false,
        error: '该牌已被选中',
        selectedCards: state.selectedCards
      };
    }

    // 添加到选中列表
    state.selectedCards.push(card);

    return {
      success: true,
      selectedCards: [...state.selectedCards]
    };
  }

  /**
   * 取消选择单张牌（基于Card对象）
   * @param playerId 玩家ID
   * @param card 要取消选择的牌
   * @returns 选牌结果
   */
  deselectCard(playerId: number, card: Card): SelectionResult {
    const state = this.cardSelections.get(playerId);
    if (!state) {
      return {
        success: false,
        error: '玩家选牌状态未初始化',
        selectedCards: []
      };
    }

    state.selectedCards = state.selectedCards.filter(c => c.id !== card.id);

    return {
      success: true,
      selectedCards: [...state.selectedCards]
    };
  }

  /**
   * 切换单张牌的选择状态（基于Card对象）
   * @param playerId 玩家ID
   * @param card 要切换的牌
   * @param playerHand 玩家手牌（用于验证）
   * @returns 选牌结果
   */
  toggleCard(playerId: number, card: Card, playerHand?: Card[]): SelectionResult {
    const state = this.cardSelections.get(playerId);
    if (!state) {
      this.initializePlayer(playerId, 'card');
      return this.selectCard(playerId, card, playerHand);
    }

    const isSelected = state.selectedCards.some(c => c.id === card.id);
    if (isSelected) {
      return this.deselectCard(playerId, card);
    } else {
      return this.selectCard(playerId, card, playerHand);
    }
  }

  /**
   * 选择一组牌（基于Card对象）
   * @param playerId 玩家ID
   * @param cards 要选择的牌组
   * @param playerHand 玩家手牌（用于验证）
   * @returns 选牌结果
   */
  selectGroup(playerId: number, cards: Card[], playerHand?: Card[]): SelectionResult {
    const state = this.cardSelections.get(playerId);
    if (!state) {
      this.initializePlayer(playerId, 'card');
      return this.selectGroup(playerId, cards, playerHand);
    }

    // 检查所有牌是否在手牌中
    if (playerHand) {
      const handIds = new Set(playerHand.map(c => c.id));
      for (const card of cards) {
        if (!handIds.has(card.id)) {
          return {
            success: false,
            error: '选择的牌不在手牌中',
            selectedCards: state.selectedCards
          };
        }
      }
    }

    // 检查是否全部已选中
    const allSelected = cards.every(card => 
      state.selectedCards.some(c => c.id === card.id)
    );

    if (allSelected) {
      // 全部已选中，取消选择
      const cardIds = new Set(cards.map(c => c.id));
      state.selectedCards = state.selectedCards.filter(c => !cardIds.has(c.id));
    } else {
      // 未全部选中，添加未选中的牌
      const cardIds = new Set(state.selectedCards.map(c => c.id));
      const newCards = cards.filter(c => !cardIds.has(c.id));
      state.selectedCards.push(...newCards);
    }

    return {
      success: true,
      selectedCards: [...state.selectedCards]
    };
  }

  /**
   * 清空选择（基于Card对象）
   * @param playerId 玩家ID
   */
  clearSelection(playerId: number): void {
    const state = this.cardSelections.get(playerId);
    if (state) {
      state.selectedCards = [];
      state.highlightedCards = [];
    }

    const rankState = this.rankSelections.get(playerId);
    if (rankState) {
      rankState.selection.clear();
    }
  }

  /**
   * 获取选中的牌（基于Card对象）
   * @param playerId 玩家ID
   * @returns 选中的牌
   */
  getSelection(playerId: number): Card[] {
    const state = this.cardSelections.get(playerId);
    return state ? [...state.selectedCards] : [];
  }

  /**
   * 高亮可出牌（智能提示）
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 高亮的牌
   */
  highlightPlayableCards(playerId: number, playerHand: Card[], lastPlay?: Play | null): Card[] {
    const state = this.cardSelections.get(playerId);
    if (!state) {
      this.initializePlayer(playerId, 'card');
      return this.highlightPlayableCards(playerId, playerHand, lastPlay);
    }

    // 使用 ValidationService 查找可出的牌
    const playableCards = this.validationService.findPlayableCards(playerHand, lastPlay || null);
    
    // 提取所有可出牌的唯一Card对象
    const highlightedSet = new Set<string>();
    const highlighted: Card[] = [];
    
    playableCards.forEach(cards => {
      cards.forEach(card => {
        if (!highlightedSet.has(card.id)) {
          highlightedSet.add(card.id);
          highlighted.push(card);
        }
      });
    });

    state.highlightedCards = highlighted;
    return highlighted;
  }

  /**
   * 验证选中的牌
   * @param playerId 玩家ID
   * @param lastPlay 上家出的牌（可选）
   * @param playerHand 玩家手牌（用于验证）
   * @returns 验证结果
   */
  validateSelection(playerId: number, lastPlay?: Play | null, playerHand?: Card[]): import('./types').ValidationResult {
    const selectedCards = this.getSelection(playerId);
    
    if (selectedCards.length === 0) {
      return {
        valid: false,
        error: '请选择要出的牌'
      };
    }

    if (playerHand) {
      // 验证选中的牌是否都在手牌中
      const handIds = new Set(playerHand.map(c => c.id));
      for (const card of selectedCards) {
        if (!handIds.has(card.id)) {
          return {
            valid: false,
            error: '选择的牌不在手牌中'
          };
        }
      }
    }

    // 使用 ValidationService 验证
    return this.validationService.validatePlayRules(
      selectedCards,
      lastPlay || null,
      playerHand,
      { checkInHand: !!playerHand }
    );
  }

  // ========== 基于rank的选牌方法（简化模式） ==========

  /**
   * 选择某个点数的牌（基于rank）
   * @param playerId 玩家ID
   * @param rank 点数
   * @param groupedHand 按点数分组的手牌
   * @returns 选牌结果
   */
  selectRank(playerId: number, rank: number, groupedHand: Map<number, Card[]>): SelectionResult {
    const state = this.rankSelections.get(playerId);
    if (!state) {
      this.initializePlayer(playerId, 'rank');
      return this.selectRank(playerId, rank, groupedHand);
    }

    const currentCount = state.selection.get(rank) || 0;
    const maxCount = groupedHand.get(rank)?.length || 0;

    // 如果选择的是不同的点数，清空之前的选择
    if (state.selection.size > 0 && !state.selection.has(rank)) {
      state.selection.clear();
    }

    if (currentCount >= maxCount) {
      // 已选满，取消选择
      state.selection.delete(rank);
    } else {
      // 增加选择
      state.selection.set(rank, currentCount + 1);
    }

    return {
      success: true,
      selectedCards: this.getSelectionFromRank(playerId, groupedHand)
    };
  }

  /**
   * 全选/全不选某个点数的牌（基于rank）
   * @param playerId 玩家ID
   * @param rank 点数
   * @param groupedHand 按点数分组的手牌
   * @returns 选牌结果
   */
  toggleRankSelection(playerId: number, rank: number, groupedHand: Map<number, Card[]>): SelectionResult {
    const state = this.rankSelections.get(playerId);
    if (!state) {
      this.initializePlayer(playerId, 'rank');
      return this.toggleRankSelection(playerId, rank, groupedHand);
    }

    const currentCount = state.selection.get(rank) || 0;
    const maxCount = groupedHand.get(rank)?.length || 0;

    // 如果选择的是不同的点数，清空之前的选择
    if (state.selection.size > 0 && !state.selection.has(rank)) {
      state.selection.clear();
    }

    if (currentCount === maxCount) {
      // 全选 → 全不选
      state.selection.delete(rank);
    } else {
      // 全不选 → 全选
      state.selection.set(rank, maxCount);
    }

    return {
      success: true,
      selectedCards: this.getSelectionFromRank(playerId, groupedHand)
    };
  }

  /**
   * 取消某个点数的选择（基于rank）
   * @param playerId 玩家ID
   * @param rank 点数
   * @param groupedHand 按点数分组的手牌
   * @returns 选牌结果
   */
  cancelRank(playerId: number, rank: number, groupedHand: Map<number, Card[]>): SelectionResult {
    const state = this.rankSelections.get(playerId);
    if (!state) {
      return {
        success: false,
        error: '玩家选牌状态未初始化',
        selectedCards: []
      };
    }

    state.selection.delete(rank);

    return {
      success: true,
      selectedCards: this.getSelectionFromRank(playerId, groupedHand)
    };
  }

  /**
   * 从Card数组设置选择（基于rank）
   * @param playerId 玩家ID
   * @param cards 要设置的牌
   * @param groupedHand 按点数分组的手牌
   * @returns 选牌结果
   */
  setSelectionFromCards(playerId: number, cards: Card[], groupedHand: Map<number, Card[]>): SelectionResult {
    const state = this.rankSelections.get(playerId);
    if (!state) {
      this.initializePlayer(playerId, 'rank');
      return this.setSelectionFromCards(playerId, cards, groupedHand);
    }

    const newSelection = new Map<number, number>();
    
    // 按点数统计
    cards.forEach(card => {
      const rank = card.rank;
      newSelection.set(rank, (newSelection.get(rank) || 0) + 1);
    });
    
    // 验证选择数量不超过手牌数量
    newSelection.forEach((count, rank) => {
      const maxCount = groupedHand.get(rank)?.length || 0;
      if (count > maxCount) {
        newSelection.set(rank, maxCount);
      }
    });
    
    state.selection = newSelection;

    return {
      success: true,
      selectedCards: this.getSelectionFromRank(playerId, groupedHand)
    };
  }

  /**
   * 获取选中的Card对象（基于rank）
   * @param playerId 玩家ID
   * @param groupedHand 按点数分组的手牌
   * @returns 选中的牌
   */
  getSelectionFromRank(playerId: number, groupedHand: Map<number, Card[]>): Card[] {
    const state = this.rankSelections.get(playerId);
    if (!state) {
      return [];
    }

    const selectedCards: Card[] = [];
    
    state.selection.forEach((count, rank) => {
      const cardsOfRank = groupedHand.get(rank) || [];
      // 选择前count张（不需要关心具体是哪张，因为没花色区别）
      selectedCards.push(...cardsOfRank.slice(0, count));
    });
    
    return selectedCards;
  }

  /**
   * 获取可出牌的点数（基于rank）
   * @param playerId 玩家ID
   * @param playerHand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 可出牌的点数
   */
  getPlayableRanks(playerId: number, playerHand: Card[], lastPlay?: Play | null): number[] {
    const state = this.rankSelections.get(playerId);
    if (!state) {
      this.initializePlayer(playerId, 'rank');
      return this.getPlayableRanks(playerId, playerHand, lastPlay);
    }

    // 使用 ValidationService 查找可出的牌
    const playableCards = this.validationService.findPlayableCards(playerHand, lastPlay || null);
    
    // 提取可出牌的点数
    const playableRanks = new Set<number>();
    playableCards.forEach(cards => {
      cards.forEach(card => {
        playableRanks.add(card.rank);
      });
    });
    
    state.playableRanks = Array.from(playableRanks);
    return state.playableRanks;
  }

  /**
   * 获取rank选牌状态
   * @param playerId 玩家ID
   * @returns 选牌状态
   */
  getRankSelectionState(playerId: number): RankSelectionState | null {
    return this.rankSelections.get(playerId) || null;
  }

  /**
   * 获取card选牌状态
   * @param playerId 玩家ID
   * @returns 选牌状态
   */
  getCardSelectionState(playerId: number): CardSelectionState | null {
    return this.cardSelections.get(playerId) || null;
  }
}

// 导出单例实例
export const cardSelectorService = new CardSelectorService();

