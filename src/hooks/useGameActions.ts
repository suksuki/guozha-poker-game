/**
 * 游戏操作 Hook
 * 管理游戏操作（出牌、要不起、AI建议）
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Player } from '../types/card';
import { hasPlayableCards, canPlayCards, canBeat } from '../utils/cardUtils';
import { aiChoosePlay } from '../utils/aiPlayer';
import { Game } from '../utils/Game';
import { getLastPlay } from '../utils/gameStateUtils';
import { aiSuggesterService } from '../services/cardPlaying/AISuggesterService';
import { MultipleSuggestionsResult, PlaySuggestion } from '../services/cardPlaying/types';

interface GameActionsParams {
  game: Game;
  humanPlayer: Player | undefined;
  selectedCards: Card[];
  clearSelectedCards: () => void;
  strategy: 'aggressive' | 'conservative' | 'balanced';
  algorithm: 'simple' | 'mcts';
}

export function useGameActions({
  game,
  humanPlayer,
  selectedCards,
  clearSelectedCards,
  strategy,
  algorithm
}: GameActionsParams) {
  const { t } = useTranslation(['game']);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [multipleSuggestions, setMultipleSuggestions] = useState<MultipleSuggestionsResult | null>(null);

  // 检查玩家是否有能打过的牌（用于强制出牌规则）
  const canPass = useMemo(() => {
    // 如果玩家已经出完牌了，不应该显示"要不起"按钮
    if (!humanPlayer || humanPlayer.hand.length === 0) {
      return false; // 已出完牌，不显示要不起按钮
    }
    const isPlayerTurn = game.currentPlayerIndex === humanPlayer.id;
    const lastPlay = getLastPlay(game);
    // 如果没有上家出牌（lastPlay 为 null），说明新轮次开始，可以要不起
    if (!isPlayerTurn || !lastPlay) {
      return true;
    }
    // 如果有上家出牌，检查是否有能打过的牌
    return !hasPlayableCards(humanPlayer.hand, lastPlay);
  }, [game.currentPlayerIndex, game, humanPlayer]);

  const isPlayerTurn = useMemo(() => {
    return game.currentPlayerIndex === humanPlayer?.id;
  }, [game.currentPlayerIndex, humanPlayer]);

  // 处理出牌
  const handlePlay = useCallback(async () => {
    if (selectedCards.length === 0 || !humanPlayer) return;

    const success = await game.playCards(humanPlayer.id, selectedCards);
    if (success) {
      clearSelectedCards();
    } else {
      alert('无法出这些牌！请选择合法的牌型。');
    }
  }, [selectedCards, humanPlayer, game, clearSelectedCards]);

  // 处理要不起
  const handlePass = useCallback(async () => {
    if (!humanPlayer) return;
    await game.passCards(humanPlayer.id);
    clearSelectedCards();
  }, [humanPlayer, game, clearSelectedCards]);

  // 使用AI辅助出牌（使用MCTS蒙特卡洛算法）
  const handleSuggestPlay = useCallback(async () => {
    if (!humanPlayer) return null;

    setIsSuggesting(true);
    try {
      // 获取当前轮次的最后出牌
      const lastPlay = getLastPlay(game);
      
      // 使用AI选择出牌
      const suggestedCards = await aiChoosePlay(humanPlayer.hand, lastPlay, {
        strategy,
        algorithm: algorithm || 'mcts',
        mctsIterations: 50 // 快速模式：大幅降低迭代次数以提高速度
      });

      if (!suggestedCards || suggestedCards.length === 0) {
        alert(`${t('game:actions.aiSuggest')}: ${t('game:actions.pass')}`);
        return null;
      }

      // ========== 验证AI建议的牌是否符合出牌规则 ==========
      
      // 1. 验证牌是否在手牌中
      const handCardIds = new Set(humanPlayer.hand.map(c => c.id));
      const allCardsInHand = suggestedCards.every(card => handCardIds.has(card.id));
      
      if (!allCardsInHand) {        alert('AI建议的牌不在手牌中，请重试');
        return null;
      }

      // 2. 验证牌型是否合法
      const play = canPlayCards(suggestedCards);
      if (!play) {
        alert('AI建议的牌不构成合法牌型，请重试');
        return null;
      }

      // 3. 如果有上家出牌，验证是否能压过
      if (lastPlay) {
        const canBeatLastPlay = canBeat(play, lastPlay);
        if (!canBeatLastPlay) {
          alert('AI建议的牌不能压过上家的牌，请重试');
          return null;
        }
      }

      // 验证通过，返回建议的牌
      return suggestedCards;
    } catch (error) {
      // 注意：这里暂时保留中文，因为这是错误提示，不是游戏核心功能
      alert('获取AI建议失败，请稍后重试');
      return null;
    } finally {
      setIsSuggesting(false);
    }
  }, [humanPlayer, strategy, algorithm, game, t]);

  // 获取多个AI建议（多方案建议）
  const handleSuggestMultiplePlays = useCallback(async () => {
    if (!humanPlayer) return;

    setIsSuggesting(true);
    try {
      const lastPlay = getLastPlay(game);
      
      const result = await aiSuggesterService.suggestMultiplePlays(
        humanPlayer.id,
        humanPlayer.hand,
        lastPlay,
        {
          strategy,
          algorithm: algorithm || 'mcts',
          mctsIterations: 50
        },
        5 // 最多5个建议
      );

      if (!result || result.suggestions.length === 0) {
        alert(`${t('game:actions.aiSuggest')}: ${t('game:actions.pass')}`);
        return null;
      }

      setMultipleSuggestions(result);
      return result;
    } catch (error) {
      alert('获取AI建议失败，请稍后重试');
      return null;
    } finally {
      setIsSuggesting(false);
    }
  }, [humanPlayer, strategy, algorithm, game, t]);

  // 关闭多方案建议面板
  const closeMultipleSuggestions = useCallback(() => {
    setMultipleSuggestions(null);
  }, []);

  // 选择某个建议方案
  const handleSelectSuggestion = useCallback((suggestion: PlaySuggestion) => {
    // 这里可以自动选中建议的牌，或者让用户手动确认
    setMultipleSuggestions(null);
    // TODO: 自动选中建议的牌
  }, []);

  return {
    isSuggesting,
    canPass,
    isPlayerTurn,
    handlePlay,
    handlePass,
    handleSuggestPlay,
    handleSuggestMultiplePlays,
    multipleSuggestions,
    closeMultipleSuggestions,
    handleSelectSuggestion
  };
}

