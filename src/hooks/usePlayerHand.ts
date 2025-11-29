/**
 * 玩家手牌 Hook
 * 管理玩家手牌的选择、展开和分组
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, GameStatus, Player } from '../types/card';
import { Game } from '../utils/Game';

export function usePlayerHand(
  game: Game
) {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set());

  // 获取人类玩家
  // 注意：依赖 game.players.length 和每个玩家的 hand.length，确保手牌变化时重新计算
  const humanPlayer = useMemo(() => {
    return game.players.find(p => p.isHuman);
  }, [game.players, game.players.length, game.players.map(p => p.hand.length).join(',')]);

  // 按数字分组手牌（用于叠放显示）
  const groupedHand = useMemo(() => {
    if (!humanPlayer) return new Map<number, Card[]>();
    const groups = new Map<number, Card[]>();
    humanPlayer.hand.forEach(card => {
      const rank = card.rank;
      if (!groups.has(rank)) {
        groups.set(rank, []);
      }
      groups.get(rank)!.push(card);
    });
    // 对每组内的牌按花色排序
    groups.forEach(cards => {
      cards.sort((a, b) => a.suit.localeCompare(b.suit));
    });
    return groups;
  }, [humanPlayer?.hand]);

  // 处理卡片点击
  const handleCardClick = useCallback((card: Card) => {
    if (game.status !== GameStatus.PLAYING) return;
    if (!humanPlayer || game.currentPlayerIndex !== humanPlayer.id) return;

    const index = selectedCards.findIndex(c => c.id === card.id);
    if (index >= 0) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  }, [game.status, game.currentPlayerIndex, humanPlayer, selectedCards]);

  // 切换展开/收起
  const toggleExpand = useCallback((rank: number) => {
    setExpandedRanks(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(rank)) {
        newExpanded.delete(rank);
      } else {
        newExpanded.add(rank);
      }
      return newExpanded;
    });
  }, []);

  // 清空选中的牌
  const clearSelectedCards = useCallback(() => {
    setSelectedCards([]);
  }, []);

  return {
    selectedCards,
    setSelectedCards,
    expandedRanks,
    groupedHand,
    humanPlayer,
    handleCardClick,
    toggleExpand,
    clearSelectedCards
  };
}

