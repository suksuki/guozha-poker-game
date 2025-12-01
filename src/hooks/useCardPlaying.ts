/**
 * 打牌系统 React Hook
 * 封装 CardPlayingService，提供 React 友好的 API
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, Play, Player, GameStatus } from '../types/card';
import { Game } from '../utils/Game';
import { cardPlayingService, CardPlayingService } from '../services/cardPlaying';
import {
  ValidationResult,
  SelectionResult,
  PlayResult,
  SuggestResult,
  PlayOptions,
  SuggestOptions
} from '../services/cardPlaying/types';
import { getLastPlay } from '../utils/gameStateUtils';

export interface UseCardPlayingOptions {
  /** 游戏实例 */
  game: Game;
  /** 玩家ID */
  playerId: number;
  /** 打牌服务实例（可选，默认使用单例） */
  service?: CardPlayingService;
  /** 是否自动初始化选牌状态 */
  autoInit?: boolean;
}

export interface UseCardPlayingReturn {
  // ========== 选牌相关 ==========
  /** 选中的牌 */
  selectedCards: Card[];
  /** 高亮的牌（可出牌提示） */
  highlightedCards: Card[];
  /** 选择单张牌 */
  selectCard: (card: Card) => SelectionResult;
  /** 取消选择单张牌 */
  deselectCard: (card: Card) => SelectionResult;
  /** 切换单张牌的选择状态 */
  toggleCard: (card: Card) => SelectionResult;
  /** 选择一组牌 */
  selectGroup: (cards: Card[]) => SelectionResult;
  /** 清空选择 */
  clearSelection: () => void;
  /** 验证选中的牌 */
  validateSelection: (lastPlay?: Play | null) => ValidationResult;

  // ========== 出牌相关 ==========
  /** 是否正在出牌 */
  isPlaying: boolean;
  /** 是否可以出牌 */
  canPlay: (cards: Card[], lastPlay?: Play | null) => boolean;
  /** 是否可以要不起 */
  canPass: boolean;
  /** 所有可出的牌组合 */
  playableCards: Card[][];
  /** 执行出牌 */
  playCards: (cards: Card[], options?: PlayOptions) => Promise<PlayResult>;
  /** 要不起 */
  passCards: () => Promise<void>;

  // ========== AI建议相关 ==========
  /** 是否正在获取AI建议 */
  isSuggesting: boolean;
  /** 当前AI建议 */
  currentSuggestion: SuggestResult | null;
  /** 获取AI建议 */
  suggestPlay: (options?: SuggestOptions) => Promise<SuggestResult | null>;
  /** 获取多个AI建议 */
  suggestMultiple: (optionsList?: SuggestOptions[]) => Promise<SuggestResult[]>;
  /** 应用AI建议（自动选牌） */
  applySuggestion: (suggestion: SuggestResult) => SelectionResult;

  // ========== 验证相关 ==========
  /** 验证牌型 */
  validateCardType: (cards: Card[]) => Play | null;
  /** 验证出牌规则 */
  validatePlayRules: (cards: Card[], lastPlay?: Play | null) => ValidationResult;
  /** 查找可出的牌 */
  findPlayableCards: (lastPlay?: Play | null) => Card[][];
  /** 检查是否有能打过的牌 */
  hasPlayableCards: (lastPlay?: Play | null) => boolean;
}

/**
 * 打牌系统 Hook
 * 提供选牌、出牌、AI建议等功能
 */
export function useCardPlaying({
  game,
  playerId,
  service = cardPlayingService,
  autoInit = true
}: UseCardPlayingOptions): UseCardPlayingReturn {
  // ========== 状态管理 ==========
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [highlightedCards, setHighlightedCards] = useState<Card[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<SuggestResult | null>(null);

  // 使用 ref 存储服务实例，避免重复创建
  const serviceRef = useRef(service);

  // ========== 获取玩家信息 ==========
  const player = useMemo(() => {
    return game.players.find(p => p.id === playerId);
  }, [game.players, playerId]);

  const playerHand = useMemo(() => {
    return player?.hand || [];
  }, [player?.hand]);

  const isPlayerTurn = useMemo(() => {
    return game.currentPlayerIndex === playerId;
  }, [game.currentPlayerIndex, playerId]);

  // 直接从 Round 获取 lastPlay，不缓存，确保总是最新值
  // lastPlay 由 Round 类统一管理，每次渲染都从 Round 获取最新状态
  const lastPlay = getLastPlay(game);

  // 获取当前轮次号，用于确保状态同步
  const currentRoundNumber = useMemo(() => {
    const round = game.getCurrentRound();
    return round ? round.roundNumber : 0;
  }, [game, game.currentRoundIndex, game.rounds.length]);
  
  // 获取当前轮次的出牌记录数量，用于检测 lastPlay 是否变化
  // 当有新的出牌时，plays.length 会增加，可以触发相关计算更新
  const currentRoundPlaysCount = useMemo(() => {
    const round = game.getCurrentRound();
    return round ? round.getPlays().length : 0;
  }, [game, game.currentRoundIndex, game.rounds.length]);

  // ========== 初始化 ==========
  useEffect(() => {
    if (autoInit) {
      serviceRef.current.initializePlayerSelection(playerId, 'card');
    }
  }, [playerId, autoInit]);

  // ========== 更新高亮牌 ==========
  // 重要：只在真正轮到玩家时计算高亮，直接从game对象获取最新状态
  useEffect(() => {
    // 直接从game对象获取最新状态，确保状态已同步
    const currentIsPlayerTurn = game.currentPlayerIndex === playerId && game.status === GameStatus.PLAYING;
    const currentPlayer = game.players.find(p => p.id === playerId);
    const currentHand = currentPlayer?.hand || [];
    
    if (!currentIsPlayerTurn || currentHand.length === 0) {
      setHighlightedCards([]);
      return;
    }

    // 直接从game对象获取最新的lastPlay和手牌
    const latestLastPlay = getLastPlay(game);
    
    const highlighted = serviceRef.current.highlightPlayableCards(
      playerId,
      currentHand,
      latestLastPlay
    );
    setHighlightedCards(highlighted);
  }, [playerId, game.currentPlayerIndex, game.status, currentRoundNumber]);

  // ========== 选牌相关方法 ==========
  const selectCard = useCallback((card: Card): SelectionResult => {
    const result = serviceRef.current.selectCard(playerId, card, playerHand);
    if (result.success) {
      setSelectedCards(result.selectedCards);
    }
    return result;
  }, [playerId, playerHand]);

  const deselectCard = useCallback((card: Card): SelectionResult => {
    const result = serviceRef.current.deselectCard(playerId, card);
    if (result.success) {
      setSelectedCards(result.selectedCards);
    }
    return result;
  }, [playerId]);

  const toggleCard = useCallback((card: Card): SelectionResult => {
    const result = serviceRef.current.toggleCard(playerId, card, playerHand);
    if (result.success) {
      setSelectedCards(result.selectedCards);
    }
    return result;
  }, [playerId, playerHand]);

  const selectGroup = useCallback((cards: Card[]): SelectionResult => {
    const result = serviceRef.current.selectGroup(playerId, cards, playerHand);
    if (result.success) {
      setSelectedCards(result.selectedCards);
    }
    return result;
  }, [playerId, playerHand]);

  const clearSelection = useCallback(() => {
    serviceRef.current.clearSelection(playerId);
    setSelectedCards([]);
  }, [playerId]);

  const validateSelection = useCallback((lastPlay?: Play | null): ValidationResult => {
    // CardPlayingService.validateSelection 的参数顺序是: playerId, playerHand, lastPlay?
    return serviceRef.current.validateSelection(playerId, playerHand, lastPlay || null);
  }, [playerId, playerHand]);

  // ========== 出牌相关方法 ==========
  const canPlay = useCallback((cards: Card[], lastPlay?: Play | null): boolean => {
    const validation = serviceRef.current.validatePlay(playerId, cards, playerHand, lastPlay || null);
    return validation.valid;
  }, [playerId, playerHand]);

  const canPass = useMemo(() => {
    // 每次都从 Round 获取最新的 lastPlay
    const currentLastPlay = getLastPlay(game);
    
    if (!player || playerHand.length === 0) {
      return false;
    }
    if (!isPlayerTurn || !currentLastPlay) {
      return true;
    }
    // 检查是否有能打过的牌，如果没有则可以要不起
    const hasPlayable = serviceRef.current.hasPlayableCards(playerHand, currentLastPlay);
    return !hasPlayable;
  }, [player, playerHand, isPlayerTurn, game, currentRoundPlaysCount, currentRoundNumber]);

  const playableCards = useMemo(() => {
    // 每次都从 Round 获取最新的 lastPlay
    const currentLastPlay = getLastPlay(game);
    return serviceRef.current.findPlayableCards(playerHand, currentLastPlay || null);
  }, [playerHand, game, currentRoundPlaysCount, currentRoundNumber]);

  const playCards = useCallback(async (
    cards: Card[],
    options: PlayOptions = {}
  ): Promise<PlayResult> => {
    if (!isPlayerTurn) {
      return {
        success: false,
        error: '不是你的回合'
      };
    }

    setIsPlaying(true);
    try {
      // 使用 Game 类的 playCards 方法（它内部会调用 processPlayAsync）
      const success = await game.playCards(playerId, cards);
      
      if (success) {
        clearSelection();
        options.onComplete?.({ success: true });
        return { success: true };
      } else {
        const error = '出牌失败';
        options.onError?.(new Error(error));
        return { success: false, error };
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setIsPlaying(false);
    }
  }, [playerId, game, isPlayerTurn, clearSelection]);

  const passCards = useCallback(async (): Promise<void> => {
    if (!isPlayerTurn) {
      return;
    }
    await game.passCards(playerId);
    clearSelection();
  }, [playerId, game, isPlayerTurn, clearSelection]);

  // ========== AI建议相关方法 ==========
  const suggestPlay = useCallback(async (
    options: SuggestOptions = {}
  ): Promise<SuggestResult | null> => {
    // 直接从game对象获取最新状态，检查是否真的轮到玩家了
    const currentIsPlayerTurn = game.currentPlayerIndex === playerId && game.status === GameStatus.PLAYING;
    if (!currentIsPlayerTurn) {
      return null;
    }

    const currentPlayer = game.players.find(p => p.id === playerId);
    const currentHand = currentPlayer?.hand || [];
    if (currentHand.length === 0) {
      return null;
    }

    setIsSuggesting(true);
    try {
      // 直接从game对象获取最新的状态
      const latestLastPlay = getLastPlay(game);
      
      const suggestion = await serviceRef.current.suggestPlay(
        playerId,
        currentHand,
        latestLastPlay || null,
        options
      );
      setCurrentSuggestion(suggestion);
      return suggestion;
    } catch (error) {
      console.error('获取AI建议失败:', error);
      return null;
    } finally {
      setIsSuggesting(false);
    }
  }, [playerId, game]);

  const suggestMultiple = useCallback(async (
    optionsList: SuggestOptions[] = []
  ): Promise<SuggestResult[]> => {
    if (!player || playerHand.length === 0) {
      return [];
    }

    setIsSuggesting(true);
    try {
      // 直接从 Round 获取最新的 lastPlay
      const currentLastPlay = getLastPlay(game);
      
      const suggestions = await serviceRef.current.suggestMultiple(
        playerId,
        playerHand,
        currentLastPlay || null,
        optionsList.length > 0 ? optionsList : [
          { strategy: 'aggressive' },
          { strategy: 'conservative' },
          { strategy: 'balanced' }
        ]
      );
      return suggestions;
    } catch (error) {
      console.error('获取多个AI建议失败:', error);
      return [];
    } finally {
      setIsSuggesting(false);
    }
  }, [playerId, playerHand, game, player]);

  const applySuggestion = useCallback((suggestion: SuggestResult): SelectionResult => {
    const result = selectGroup(suggestion.cards);
    if (result.success) {
      setCurrentSuggestion(suggestion);
    }
    return result;
  }, [selectGroup]);

  // ========== 验证相关方法 ==========
  const validateCardType = useCallback((cards: Card[]): Play | null => {
    return serviceRef.current.validateCardType(cards);
  }, []);

  const validatePlayRules = useCallback((
    cards: Card[],
    lastPlay?: Play | null
  ): ValidationResult => {
    return serviceRef.current.validatePlayRules(cards, lastPlay || null, playerHand);
  }, [playerHand]);

  const findPlayableCards = useCallback((lastPlay?: Play | null): Card[][] => {
    return serviceRef.current.findPlayableCards(playerHand, lastPlay || null);
  }, [playerHand]);

  const hasPlayableCards = useCallback((lastPlay?: Play | null): boolean => {
    return serviceRef.current.hasPlayableCards(playerHand, lastPlay || null);
  }, [playerHand]);

  // ========== 返回 API ==========
  return {
    // 选牌相关
    selectedCards,
    highlightedCards,
    selectCard,
    deselectCard,
    toggleCard,
    selectGroup,
    clearSelection,
    validateSelection,

    // 出牌相关
    isPlaying,
    canPlay,
    canPass,
    playableCards,
    playCards,
    passCards,

    // AI建议相关
    isSuggesting,
    currentSuggestion,
    suggestPlay,
    suggestMultiple,
    applySuggestion,

    // 验证相关
    validateCardType,
    validatePlayRules,
    findPlayableCards,
    hasPlayableCards
  };
}

