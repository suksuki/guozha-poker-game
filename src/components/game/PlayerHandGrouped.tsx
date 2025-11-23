/**
 * 分组手牌显示组件
 * 按点数分组显示玩家手牌，支持展开/收起
 */

import React from 'react';
import { Card } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { isScoreCard, getCardScore } from '../../utils/cardUtils';
import { getRankDisplay } from '../../utils/gameUtils';

interface PlayerHandGroupedProps {
  groupedHand: Map<number, Card[]>;
  selectedCards: Card[];
  expandedRanks: Set<number>;
  onCardClick: (card: Card) => void;
  onToggleExpand: (rank: number) => void;
}

export const PlayerHandGrouped: React.FC<PlayerHandGroupedProps> = ({
  groupedHand,
  selectedCards,
  expandedRanks,
  onCardClick,
  onToggleExpand
}) => {
  if (groupedHand.size === 0) {
    return <div className="no-cards">手牌数据加载中...</div>;
  }

  return (
    <div className="player-hand-grouped">
      {Array.from(groupedHand.entries())
        .sort(([rankA], [rankB]) => rankA - rankB)
        .map(([rank, cards]) => {
          const isExpanded = expandedRanks.has(rank);
          const selectedCount = cards.filter((c: Card) => selectedCards.some(sc => sc.id === c.id)).length;

          return (
            <div key={rank} className="card-group">
              {/* 隐藏的头部，仅用于点击展开/收起 */}
              <div 
                className={`card-group-header ${isExpanded ? 'expanded' : ''} ${selectedCount > 0 ? 'has-selected' : ''}`}
                onClick={() => onToggleExpand(rank)}
                style={{ display: 'none' }}
              />
              {/* 叠放显示：不展开时显示一叠牌 */}
              {!isExpanded && (
                <div 
                  className="card-stack"
                  style={{
                    height: `${84 + Math.max(0, (cards.length - 1) * 40)}px`
                  }}
                  onClick={() => onToggleExpand(rank)}
                >
                  {cards.map((card: Card, index: number) => {
                    const isScore = isScoreCard(card);
                    const score = isScore ? getCardScore(card) : 0;
                    const stackOffset = index * 40; // 每张牌向上偏移40px（从底部开始）
                    // 最上面的牌（第一张）是 index === cards.length - 1（最后一张）
                    const isTopCard = index === cards.length - 1;
                    return (
                      <div
                        key={card.id}
                        className={`card-stack-item ${isScore ? 'score-card-wrapper' : ''}`}
                        style={{
                          transform: `translateY(-${stackOffset}px)`, // 向上偏移
                          zIndex: index + 1, // 上面的牌 z-index 更大
                          '--stack-offset': `-${stackOffset}px`,
                          position: 'relative' // 确保徽章定位正确
                        } as React.CSSProperties}
                      >
                        <CardComponent
                          card={card}
                          selected={selectedCards.some(c => c.id === card.id)}
                          onClick={() => onCardClick(card)}
                        />
                        {/* 在最上面的牌上显示数量 */}
                        {isTopCard && cards.length > 1 && (
                          <div className="card-count-badge">{cards.length}</div>
                        )}
                        {isScore && (
                          <div className="card-score-badge">{score}分</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {/* 展开显示：展开时显示所有牌（用于选择） */}
              {isExpanded && (
                <div className="card-group-content">
                  {cards.map((card: Card) => {
                    const isScore = isScoreCard(card);
                    const score = isScore ? getCardScore(card) : 0;
                    return (
                      <div key={card.id} className={isScore ? 'score-card-wrapper' : ''}>
                        <CardComponent
                          card={card}
                          selected={selectedCards.some(c => c.id === card.id)}
                          onClick={() => onCardClick(card)}
                        />
                        {isScore && (
                          <div className="card-score-badge">{score}分</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

