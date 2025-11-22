/**
 * 游戏操作 Hook
 * 管理游戏操作（出牌、要不起、AI建议）
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, GameStatus, Player } from '../types/card';
import { Play } from '../types/card';
import { hasPlayableCards } from '../utils/cardUtils';
import { AIConfig } from '../utils/aiPlayer';

interface GameActionsParams {
  gameState: {
    status: GameStatus;
    currentPlayerIndex: number;
    lastPlay: Play | null;
    lastPlayPlayerIndex: number | null;
    players: Player[];
  };
  humanPlayer: Player | undefined;
  selectedCards: Card[];
  clearSelectedCards: () => void;
  strategy: 'aggressive' | 'conservative' | 'balanced';
  algorithm: 'simple' | 'mcts';
  playerPlay: (playerIndex: number, cards: Card[]) => boolean;
  playerPass: (playerIndex: number) => void;
  suggestPlay: (playerIndex: number, config: AIConfig) => Promise<Card[] | null>;
}

export function useGameActions({
  gameState,
  humanPlayer,
  selectedCards,
  clearSelectedCards,
  strategy,
  algorithm,
  playerPlay,
  playerPass,
  suggestPlay
}: GameActionsParams) {
  const [isSuggesting, setIsSuggesting] = useState(false);

  // 检查玩家是否有能打过的牌（用于强制出牌规则）
  const canPass = useMemo(() => {
    // 如果玩家已经出完牌了，不应该显示"要不起"按钮
    if (!humanPlayer || humanPlayer.hand.length === 0) {
      return false; // 已出完牌，不显示要不起按钮
    }
    const isPlayerTurn = gameState.currentPlayerIndex === humanPlayer.id;
    if (!isPlayerTurn || !gameState.lastPlay) {
      return true; // 没有上家出牌时可以要不起（包括接风情况）
    }
    // 如果当前玩家是最后出牌的人（接风），可以自由出牌，可以要不起
    const isTakingOver = gameState.currentPlayerIndex === gameState.lastPlayPlayerIndex;
    if (isTakingOver) {
      return true; // 接风时可以要不起
    }
    return !hasPlayableCards(humanPlayer.hand, gameState.lastPlay);
  }, [gameState.currentPlayerIndex, gameState.lastPlay, gameState.lastPlayPlayerIndex, humanPlayer]);

  const isPlayerTurn = useMemo(() => {
    return gameState.currentPlayerIndex === humanPlayer?.id;
  }, [gameState.currentPlayerIndex, humanPlayer]);

  // 处理出牌
  const handlePlay = useCallback(() => {
    if (selectedCards.length === 0 || !humanPlayer) return;

    const success = playerPlay(humanPlayer.id, selectedCards);
    if (success) {
      clearSelectedCards();
    } else {
      alert('无法出这些牌！请选择合法的牌型。');
    }
  }, [selectedCards, humanPlayer, playerPlay, clearSelectedCards]);

  // 处理要不起
  const handlePass = useCallback(() => {
    if (!humanPlayer) return;
    playerPass(humanPlayer.id);
    clearSelectedCards();
  }, [humanPlayer, playerPass, clearSelectedCards]);

  // 使用AI辅助出牌（使用MCTS蒙特卡洛算法）
  const handleSuggestPlay = useCallback(async () => {
    if (!humanPlayer) return;

    setIsSuggesting(true);
    try {
      const suggestedCards = await suggestPlay(humanPlayer.id, {
        apiKey: '',  // 不需要API Key
        strategy,
        algorithm: algorithm || 'mcts', // 使用MCTS或智能策略
        mctsIterations: 50 // 快速模式：大幅降低迭代次数以提高速度
      });

      if (suggestedCards && suggestedCards.length > 0) {
        // 这里不直接设置selectedCards，而是通过返回值让调用者处理
        return suggestedCards;
      } else {
        alert('AI建议：要不起');
        return null;
      }
    } catch (error) {
      console.error('获取AI建议失败:', error);
      alert('获取AI建议失败，请稍后重试');
      return null;
    } finally {
      setIsSuggesting(false);
    }
  }, [humanPlayer, strategy, algorithm, suggestPlay]);

  return {
    isSuggesting,
    canPass,
    isPlayerTurn,
    handlePlay,
    handlePass,
    handleSuggestPlay
  };
}

