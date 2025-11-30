/**
 * 紧凑型手牌显示组件
 * 更卡通、更节省空间、更容易选择
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { isScoreCard, getCardScore } from '../../utils/cardUtils';
import { useTranslation } from 'react-i18next';
import './CompactHandCards.css';

interface CompactHandCardsProps {
  groupedHand: Map<number, Card[]>;
  selectedCards: Card[];
  onCardClick: (card: Card) => void;
  onToggleExpand?: (rank: number) => void;
}

export const CompactHandCards: React.FC<CompactHandCardsProps> = ({
  groupedHand,
  selectedCards,
  onCardClick,
  onToggleExpand
}) => {
  const { t } = useTranslation(['ui']);
  const [hoveredRank, setHoveredRank] = useState<number | null>(null);
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set());

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
    onToggleExpand?.(rank);
  }, [onToggleExpand]);

  // 选择/取消选择整个组
  const toggleSelectGroup = useCallback((cards: Card[]) => {
    const allSelected = cards.every(card => selectedCards.some(c => c.id === card.id));
    if (allSelected) {
      // 如果全部已选中，则取消选择
      cards.forEach(card => {
        if (selectedCards.some(c => c.id === card.id)) {
          onCardClick(card);
        }
      });
    } else {
      // 如果未全部选中，则选择所有未选中的
      cards.forEach(card => {
        if (!selectedCards.some(c => c.id === card.id)) {
          onCardClick(card);
        }
      });
    }
  }, [selectedCards, onCardClick]);

  // 计算每组的选中数量
  const getSelectedCount = useCallback((cards: Card[]) => {
    return cards.filter(c => selectedCards.some(sc => sc.id === c.id)).length;
  }, [selectedCards]);

  // 获取点数显示
  const getRankDisplay = useCallback((rank: number): string => {
    const rankMap: { [key: number]: string } = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小', 17: '大' // 小王、大王
    };
    return rankMap[rank] || String(rank);
  }, []);

  // 排序后的分组
  const sortedGroups = useMemo(() => {
    return Array.from(groupedHand.entries())
      .sort(([rankA], [rankB]) => rankA - rankB);
  }, [groupedHand]);

  if (groupedHand.size === 0) {
    return (
      <div className="compact-hand-empty">
        <div className="empty-icon">🃏</div>
        <div className="empty-text">{t('ui:playerHand.loading')}</div>
      </div>
    );
  }

  return (
    <div className="compact-hand-container">
      <div className="compact-hand-scroll">
        {sortedGroups.map(([rank, cards]) => {
          const isExpanded = expandedRanks.has(rank);
          const isHovered = hoveredRank === rank;
          const selectedCount = getSelectedCount(cards);
          const hasSelected = selectedCount > 0;
          const rankDisplay = getRankDisplay(rank);

          return (
            <div
              key={rank}
              className={`compact-card-group ${isExpanded ? 'expanded' : ''} ${hasSelected ? 'has-selected' : ''} ${isHovered ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredRank(rank)}
              onMouseLeave={() => setHoveredRank(null)}
            >
              {/* 紧凑模式：每个墩纵向叠放 */}
              {!isExpanded && (
                <div
                  className="compact-card-stack"
                  onClick={(e) => {
                    // 延迟处理单击，如果300ms内没有双击，则展开
                    const clickTimer = setTimeout(() => {
                      toggleExpand(rank);
                    }, 300);
                    (e.currentTarget as any).clickTimer = clickTimer;
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // 清除单击定时器
                    const clickTimer = (e.currentTarget as any).clickTimer;
                    if (clickTimer) {
                      clearTimeout(clickTimer);
                    }
                    toggleSelectGroup(cards);
                  }}
                  style={{
                    '--card-count': cards.length,
                    '--stack-height': `${Math.min(cards.length * 10, 90)}px` // 从8px增加到10px，从60px增加到90px，适应更大的卡牌
                  } as React.CSSProperties}
                  title="单击展开显示所有卡牌，双击选择/取消选择整个组"
                >
                  {/* 显示所有牌，纵向叠放（向下延伸） */}
                  {cards.map((card, index) => {
                    const isScore = isScoreCard(card);
                    const isSelected = selectedCards.some(c => c.id === card.id);
                    const isTopCard = index === cards.length - 1; // 最上面的牌
                    const stackOffset = index * 10; // 每张牌向下偏移10px（从8px增加到10px，适应更大的卡牌）

                    return (
                      <div
                        key={card.id}
                        className={`compact-card-item-stacked ${isScore ? 'score-card' : ''} ${isSelected ? 'selected' : ''}`}
                        style={{
                          transform: `translateY(${stackOffset}px)`,
                          zIndex: index + 100, // 增加z-index，确保上层卡牌可以点击
                          '--offset': `${stackOffset}px`,
                          '--z-index': index + 100
                        } as React.CSSProperties}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCardClick(card);
                        }}
                      >
                        <CardComponent
                          card={card}
                          selected={isSelected}
                          onClick={(e) => {
                            e?.stopPropagation();
                            onCardClick(card);
                          }}
                          size="medium"
                        />
                        {/* 数量徽章（只在最上面的牌上显示） */}
                        {isTopCard && cards.length > 1 && (
                          <div className="compact-count-badge-stacked">
                            {cards.length}
                          </div>
                        )}
                        {/* 分数徽章 */}
                        {isScore && (
                          <div className="compact-score-badge-stacked">
                            {getCardScore(card)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 展开模式：显示所有牌 */}
              {isExpanded && (
                <div className="compact-card-expanded">
                  <div className="expanded-header">
                    <span className="rank-label">{rankDisplay}</span>
                    <span className="count-label">{cards.length}张</span>
                    {hasSelected && (
                      <span className="selected-label">已选{selectedCount}</span>
                    )}
                    <button
                      className="select-all-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectGroup(cards);
                      }}
                      title={cards.every(card => selectedCards.some(c => c.id === card.id)) ? "取消全选" : "全选"}
                    >
                      {cards.every(card => selectedCards.some(c => c.id === card.id)) ? '取消全选' : '全选'}
                    </button>
                    <button
                      className="collapse-btn"
                      onClick={() => toggleExpand(rank)}
                      title="收起"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="expanded-cards">
                    {cards.map((card) => {
                      const isScore = isScoreCard(card);
                      const isSelected = selectedCards.some(c => c.id === card.id);

                      return (
                        <div
                          key={card.id}
                          className={`expanded-card-item ${isScore ? 'score-card' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => onCardClick(card)}
                        >
                          <CardComponent
                            card={card}
                            selected={isSelected}
                            onClick={() => onCardClick(card)}
                            size="medium"
                          />
                          {isScore && (
                            <div className="expanded-score-badge">
                              {getCardScore(card)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 选中指示器 */}
              {hasSelected && !isExpanded && (
                <div className="selected-indicator">
                  {selectedCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

