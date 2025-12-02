/**
 * 简化手牌组件
 * 按点数选择，显示叠放预览
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Card, GameStatus } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { Game } from '../../utils/Game';
import { Player } from '../../types/card';
import './SimplifiedHandCards.css';

interface SimplifiedHandCardsProps {
  game: Game;
  humanPlayer: Player | undefined;
  /** 高亮的牌（可选，用于显示可出牌提示） */
  highlightedCards?: Card[];
  /** 出牌处理函数 */
  onPlay?: (cards: Card[]) => Promise<void>;
  /** 验证出牌规则函数 */
  validatePlay?: (cards: Card[]) => { valid: boolean; error?: string };
  /** 是否显示预览窗口中的打牌按钮 */
  showPlayButton?: boolean;
  /** 选牌状态（从父组件传入，确保状态同步） */
  selection: Map<number, number>;
  /** 按点数分组的手牌 */
  groupedHand: Map<number, Card[]>;
  /** 点击点数（增加选择） */
  clickRank: (rank: number) => void;
  /** 双击点数（全选/全不选） */
  doubleClickRank: (rank: number) => void;
  /** 取消某个点数的选择 */
  cancelRank: (rank: number) => void;
  /** 清空所有选择 */
  clearSelection: () => void;
  /** 获取选中的Card对象 */
  getSelectedCards: () => Card[];
  /** 获取可出牌的点数 */
  getPlayableRanks: () => number[];
}

export const SimplifiedHandCards: React.FC<SimplifiedHandCardsProps> = ({
  game,
  humanPlayer,
  highlightedCards = [],
  onPlay,
  validatePlay,
  showPlayButton = true,
  selection,
  groupedHand,
  clickRank,
  doubleClickRank,
  cancelRank,
  clearSelection,
  getSelectedCards,
  getPlayableRanks
}) => {
  // 不再内部创建 useSimplifiedCardSelection hook 实例
  // 所有状态和方法都从父组件传入，确保状态同步
  
  // 如果提供了 highlightedCards，计算高亮的点数（优先使用）
  const highlightedRanks = useMemo(() => {
    if (highlightedCards && highlightedCards.length > 0) {
      const ranks = new Set<number>();
      highlightedCards.forEach(card => {
        ranks.add(card.rank);
      });
      return ranks;
    }
    // 如果没有 highlightedCards，使用 playableRanks 作为后备
    const playableRanks = getPlayableRanks();
    return new Set(playableRanks);
  }, [highlightedCards, getPlayableRanks]);
  
  const sortedRanks = useMemo(() => {
    return Array.from(groupedHand.keys()).sort((a, b) => a - b);
  }, [groupedHand]);
  
  // 处理单击（延迟处理，用于区分单击和双击）
  const [clickTimers, setClickTimers] = useState<Map<number, NodeJS.Timeout>>(new Map());
  
  // 清理定时器
  useEffect(() => {
    return () => {
      clickTimers.forEach(timer => clearTimeout(timer));
    };
  }, [clickTimers]);
  
  const handleRankClick = useCallback((rank: number) => {
    const timer = setTimeout(() => {
      clickRank(rank);
      setClickTimers(prev => {
        const newTimers = new Map(prev);
        newTimers.delete(rank);
        return newTimers;
      });
    }, 300); // 300ms延迟，用于区分单击和双击
    
    setClickTimers(prev => {
      const newTimers = new Map(prev);
      const existingTimer = newTimers.get(rank);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      newTimers.set(rank, timer);
      return newTimers;
    });
  }, [clickRank]);
  
  const handleRankDoubleClick = useCallback((rank: number) => {
    // 清除单击定时器
    setClickTimers(prev => {
      const newTimers = new Map(prev);
      const existingTimer = newTimers.get(rank);
      if (existingTimer) {
        clearTimeout(existingTimer);
        newTimers.delete(rank);
      }
      return newTimers;
    });
    
    // 执行双击操作
    doubleClickRank(rank);
  }, [doubleClickRank]);
  
  
  const getRankDisplay = (rank: number): string => {
    const rankMap: { [key: number]: string } = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小', 17: '大'
    };
    return rankMap[rank] || String(rank);
  };
  
  if (groupedHand.size === 0) {
    return (
      <div className="simplified-hand-empty">
        <div className="empty-icon">🃏</div>
        <div className="empty-text">暂无手牌</div>
      </div>
    );
  }
  
  return (
    <div className="simplified-hand-wrapper">
      {/* 点数选择区域 */}
      <div className="rank-selection-area">
        <div className="rank-selection-grid">
          {sortedRanks.map(rank => {
            const cards = groupedHand.get(rank) || [];
            const totalCount = cards.length;
            const selectedCount = selection.get(rank) || 0;
            // 只在轮到玩家出牌时显示高亮
            const isPlayerTurn = game.status === GameStatus.PLAYING && game.currentPlayerIndex === (humanPlayer?.id ?? -1);
            // 使用 highlightedRanks 来判断是否可出牌
            const isPlayable = isPlayerTurn && highlightedRanks.has(rank);
            const rankDisplay = getRankDisplay(rank);
            const hasSelected = selectedCount > 0;
            
            return (
              <div
                key={rank}
                className={`rank-item ${hasSelected ? 'has-selected' : ''} ${isPlayable ? 'playable' : ''}`}
                onClick={() => handleRankClick(rank)}
                onDoubleClick={() => handleRankDoubleClick(rank)}
                title={`单击增加选择，双击全选/全不选 (共${totalCount}张)`}
              >
                {/* 卡牌叠放效果 - 显示该点数的所有卡牌 */}
                <div className="rank-cards-stack">
                  {cards.map((card, index) => {
                    // 纯纵向叠放：只向下偏移，不横向偏移
                    const offsetY = index * 15; // 纵向偏移，向下叠放（增加到15px，让叠放效果更明显，能看到更多下一张牌）
                    const isSelected = index < selectedCount; // 前selectedCount张是选中的
                    const isLastCard = index === totalCount - 1; // 最后一张牌
                    
                    return (
                      <div
                        key={card.id}
                        className={`rank-card-stacked ${isSelected ? 'card-selected' : ''}`}
                        style={{
                          transform: `translateY(${offsetY}px)`,
                          zIndex: index + 1, // 前面的牌z-index更高（显示在上层）
                          opacity: 1 // 100%不透明
                        }}
                      >
                        <CardComponent
                          card={card} // 显示真实的卡牌（带花色和点数）
                          selected={isSelected}
                          size="medium"
                        />
                        {/* 数量徽章 - 放在最后一张卡牌上 */}
                        {isLastCard && totalCount > 1 && (
                          <div className="rank-total-badge">{totalCount}</div>
                        )}
                        {/* 选中数量徽章 - 放在最后一张卡牌上 */}
                        {isLastCard && hasSelected && (
                          <div className="rank-selected-badge">{selectedCount}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* 悬浮预览 - 显示在选中牌的上方 */}
                {hasSelected && (
                  <div className="rank-preview-popup">
                    {/* 取消按钮 - 放在右上角 */}
                    <button
                      className="btn-cancel-rank"
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelRank(rank);
                      }}
                      title="清空选择"
                    >
                      ×
                    </button>
                    <div className="preview-stack">
                      {/* 横向平铺：显示选中的卡牌，没有交叠 */}
                      {cards.slice(0, selectedCount).map((card, index) => {
                        return (
                          <div
                            key={card.id}
                            className="preview-card-flat"
                          >
                            <CardComponent
                              card={card}
                              selected={true}
                              size="medium"
                            />
                          </div>
                        );
                      })}
                      {/* 数量标签 */}
                      <div className="preview-count-badge">{selectedCount}</div>
                    </div>
                    {/* 打牌按钮和验证提示 */}
                    {showPlayButton && onPlay && (
                      <div className="preview-actions">
                        {(() => {
                          const selectedCards = getSelectedCards();
                          const validation = validatePlay ? validatePlay(selectedCards) : { valid: true };
                          return (
                            <>
                              {!validation.valid && (
                                <div className="preview-validation-error" title={validation.error}>
                                  ⚠️ {validation.error || '出牌不符合规则'}
                                </div>
                              )}
                              <button
                                className={`btn-play-from-preview ${!validation.valid ? 'disabled' : ''}`}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!validation.valid || selectedCards.length === 0) {
                                    return;
                                  }
                                  await onPlay(selectedCards);
                                }}
                                disabled={!validation.valid || selectedCards.length === 0}
                                title={validation.valid ? '打牌' : validation.error || '出牌不符合规则'}
                              >
                                🎴 打牌
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
    </div>
  );
};

