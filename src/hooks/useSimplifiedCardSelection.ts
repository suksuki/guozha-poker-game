/**
 * 简化选牌 Hook
 * 按点数选择张数，而不是选择具体的Card对象
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, GameStatus, Player } from '../types/card';
import { Game } from '../utils/Game';
import { findPlayableCards } from '../utils/cardUtils';
import { getLastPlay } from '../utils/gameStateUtils';

export interface UseSimplifiedCardSelectionResult {
  // 选牌状态：Map<rank, count>
  selection: Map<number, number>;
  
  // 操作函数
  clickRank: (rank: number) => void;        // 单击：增加选择
  doubleClickRank: (rank: number) => void;  // 双击：全选/全不选
  cancelRank: (rank: number) => void;       // 取消某个点数的选择
  clearSelection: () => void;               // 清空所有选择
  setSelectionFromCards: (cards: Card[]) => void; // 从Card数组设置选择
  
  // 获取选中的Card对象（用于出牌）
  getSelectedCards: () => Card[];
  
  // 验证和提示
  getPlayableRanks: () => number[];  // 可出牌的点数
  
  // 按点数分组的手牌
  groupedHand: Map<number, Card[]>;
}

export function useSimplifiedCardSelection(
  game: Game,
  humanPlayer: Player | undefined
): UseSimplifiedCardSelectionResult {
  const [selection, setSelection] = useState<Map<number, number>>(new Map());
  
  // 按点数分组的手牌
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
    return groups;
  }, [humanPlayer?.hand]);
  
  // 单击：增加选择（如果已选满，则取消）
  // 注意：每次只能选择一个点数，选择新点数时会清空之前的选择
  const clickRank = useCallback((rank: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      const currentCount = newSelection.get(rank) || 0;
      const maxCount = groupedHand.get(rank)?.length || 0;
      
      // 如果选择的是不同的点数，清空之前的选择
      if (prev.size > 0 && !prev.has(rank)) {
        newSelection.clear();
      }
      
      if (currentCount >= maxCount) {
        // 已选满，取消选择
        newSelection.delete(rank);
      } else {
        // 增加选择
        newSelection.set(rank, currentCount + 1);
      }
      return newSelection;
    });
  }, [groupedHand]);
  
  // 双击：全选/全不选
  // 注意：每次只能选择一个点数，选择新点数时会清空之前的选择
  const doubleClickRank = useCallback((rank: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      const currentCount = newSelection.get(rank) || 0;
      const maxCount = groupedHand.get(rank)?.length || 0;
      
      // 如果选择的是不同的点数，清空之前的选择
      if (prev.size > 0 && !prev.has(rank)) {
        newSelection.clear();
      }
      
      if (currentCount === maxCount) {
        // 全选 → 全不选
        newSelection.delete(rank);
      } else {
        // 全不选 → 全选
        newSelection.set(rank, maxCount);
      }
      return newSelection;
    });
  }, [groupedHand]);
  
  // 取消某个点数的选择
  const cancelRank = useCallback((rank: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      newSelection.delete(rank);
      return newSelection;
    });
  }, []);
  
  // 清空所有选择
  const clearSelection = useCallback(() => {
    setSelection(new Map());
  }, []);
  
  // 从Card数组设置选择（用于AI建议等场景）
  const setSelectionFromCards = useCallback((cards: Card[]) => {
    // 使用函数式更新，确保 React 能检测到变化
    setSelection(() => {
      const newSelection = new Map<number, number>();
      
      // 按点数统计 - 需要匹配手牌中的实际卡片
      // 首先统计每个rank需要选择的数量
      const rankCounts = new Map<number, number>();
      cards.forEach(card => {
        // 检查卡片是否在手牌中（通过rank匹配，因为AI建议的卡片ID可能不同）
        const rank = card.rank;
        rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
      });
      
      // 根据手牌中的实际卡片数量设置选择
      rankCounts.forEach((requiredCount, rank) => {
        const availableCards = groupedHand.get(rank) || [];
        const actualCount = Math.min(requiredCount, availableCards.length);
        
        if (actualCount > 0) {
          newSelection.set(rank, actualCount);
        }
      });
      
      // 返回新的 Map 对象，确保 React 检测到变化
      return new Map(newSelection);
    });
  }, [groupedHand]);
  
  // 获取选中的Card对象（用于出牌）
  const getSelectedCards = useCallback((): Card[] => {
    const selectedCards: Card[] = [];
    const hand = humanPlayer?.hand || [];
    
    selection.forEach((count, rank) => {
      const cardsOfRank = hand.filter(c => c.rank === rank);
      // 选择前count张（不需要关心具体是哪张，因为没花色区别）
      selectedCards.push(...cardsOfRank.slice(0, count));
    });
    
    return selectedCards;
  }, [selection, humanPlayer?.hand]);
  
  // 获取可出牌的点数
  const getPlayableRanks = useCallback((): number[] => {
    if (!humanPlayer || game.status !== GameStatus.PLAYING) {
      return [];
    }
    
    const lastPlay = getLastPlay(game);
    const hand = humanPlayer.hand;
    
    // 使用现有的findPlayableCards逻辑
    const playableCards = findPlayableCards(hand, lastPlay);
    
    // 提取可出牌的点数
    const playableRanks = new Set<number>();
    playableCards.forEach(cards => {
      cards.forEach(card => {
        playableRanks.add(card.rank);
      });
    });
    
    return Array.from(playableRanks);
  }, [game, humanPlayer]);
  
  return {
    selection,
    clickRank,
    doubleClickRank,
    cancelRank,
    clearSelection,
    setSelectionFromCards,
    getSelectedCards,
    getPlayableRanks,
    groupedHand
  };
}

