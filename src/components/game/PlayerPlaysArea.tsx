/**
 * 玩家出牌区域组件
 * 显示某个玩家在当前轮次的所有出牌记录
 * 支持横向和纵向两种排列方式
 */

import React from 'react';
import { RoundPlayRecord } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { isScoreCard, getCardScore } from '../../utils/cardUtils';
import './PlayerPlaysArea.css';

interface PlayerPlaysAreaProps {
  playerId: number;
  plays: RoundPlayRecord[]; // 该玩家的所有出牌记录（按时间排序）
  direction: 'north' | 'south' | 'east' | 'west';
  isLastPlay?: boolean; // 是否是最后一次出牌
}

export const PlayerPlaysArea: React.FC<PlayerPlaysAreaProps> = ({
  playerId,
  plays,
  direction,
  isLastPlay = false
}) => {
  // 如果没有出牌记录，不显示
  if (!plays || plays.length === 0) {
    return null;
  }

  // 确保出牌按时间顺序排列（plays 数组本身应该已经是按时间顺序的，但这里确保一下）
  const sortedPlays = [...plays].sort((a, b) => {
    // 由于 RoundPlayRecord 没有时间戳，我们假设传入的数组已经是按时间顺序的
    // 这里只是确保顺序稳定
    return 0;
  });

  // 根据方向决定排列方式
  const isHorizontal = direction === 'north' || direction === 'south';
  const flexDirection = isHorizontal ? 'row' : 'column';
  const gap = '20px'; // 出牌之间的间距

  return (
    <div 
      className={`player-plays-area player-plays-${direction} ${isLastPlay ? 'last-play' : ''}`}
      style={{
        display: 'flex',
        flexDirection: flexDirection as 'row' | 'column',
        gap: gap,
        alignItems: isHorizontal ? 'center' : 'flex-start',
        justifyContent: isHorizontal ? 'flex-start' : 'flex-start'
      }}
    >
      {sortedPlays.map((playRecord, index) => {
        const isLastInSequence = index === plays.length - 1;
        const cardWidth = 40; // 小卡片宽度
        const stackOffset = (playRecord.cards.length - 1) * 20; // 叠放偏移
        
        return (
          <div
            key={index}
            className={`play-card-stack ${isLastInSequence && isLastPlay ? 'highlight' : ''}`}
            style={{
              position: 'relative',
              width: isHorizontal ? `${stackOffset + cardWidth}px` : `${cardWidth}px`,
              height: isHorizontal ? `${cardWidth * 1.4}px` : `${stackOffset + cardWidth * 1.4}px`
            }}
          >
            {/* 卡牌叠放 */}
            {playRecord.cards.map((card, cardIndex) => {
              const isScore = isScoreCard(card);
              const score = isScore ? getCardScore(card) : 0;
              
              // 计算每张卡的位置
              const cardOffset = isHorizontal 
                ? cardIndex * 20 // 横向：向右偏移
                : cardIndex * 20; // 纵向：向下偏移
              
              return (
                <div
                  key={card.id}
                  className={`play-card-item ${isScore ? 'score-card-wrapper' : ''}`}
                  style={{
                    position: 'absolute',
                    left: isHorizontal ? `${cardOffset}px` : '0',
                    top: isHorizontal ? '0' : `${cardOffset}px`,
                    zIndex: cardIndex + 1
                  }}
                >
                  <CardComponent card={card} size="small" />
                  {/* 分数徽章 */}
                  {isScore && (
                    <div className="card-score-badge-small-top">{score}</div>
                  )}
                </div>
              );
            })}
            
            {/* 出牌分数显示 */}
            {playRecord.score > 0 && (
              <div className="play-score-badge">+{playRecord.score}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

