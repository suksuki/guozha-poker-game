/**
 * 游戏操作 Hook
 * 管理游戏操作（出牌、要不起、AI建议）
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, GameStatus, Player } from '../types/card';
import { Play } from '../types/card';
import { hasPlayableCards } from '../utils/cardUtils';
import { AIConfig, aiChoosePlay } from '../utils/aiPlayer';
import { Game } from '../utils/Game';
import { getLastPlay, getLastPlayPlayerIndex } from '../utils/gameStateUtils';

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

      if (suggestedCards && suggestedCards.length > 0) {
        // 这里不直接设置selectedCards，而是通过返回值让调用者处理
        return suggestedCards;
      } else {
        alert(`${t('game:actions.aiSuggest')}: ${t('game:actions.pass')}`);
        return null;
      }
    } catch (error) {
      console.error('获取AI建议失败:', error);
      // 注意：这里暂时保留中文，因为这是错误提示，不是游戏核心功能
      alert('获取AI建议失败，请稍后重试');
      return null;
    } finally {
      setIsSuggesting(false);
    }
  }, [humanPlayer, strategy, algorithm, game]);

  return {
    isSuggesting,
    canPass,
    isPlayerTurn,
    handlePlay,
    handlePass,
    handleSuggestPlay
  };
}

