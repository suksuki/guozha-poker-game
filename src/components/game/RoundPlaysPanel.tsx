/**
 * 轮次出牌记录面板组件
 * 显示当前轮次的所有出牌记录
 * 直接放在牌桌上，4行布局，卡牌叠放排列
 */

import React, { useMemo } from 'react';
import { RoundPlayRecord } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { isScoreCard, getCardScore } from '../../utils/cardUtils';
import './RoundPlaysPanel.css';

interface RoundPlaysPanelProps {
  roundNumber: number;
  roundPlays: RoundPlayRecord[];
  roundScore: number;
}

export const RoundPlaysPanel: React.FC<RoundPlaysPanelProps> = ({
  roundNumber,
  roundPlays,
  roundScore
}) => {
  if (!roundPlays || roundPlays.length === 0) {
    return null;
  }

  // 将出牌记录分配到4行中
  // 前4个放在第1-4行，第5个放在第1行第2列，第6个放在第2行第2列，以此类推
  const playsByRow = useMemo(() => {
    const rows: (RoundPlayRecord | null)[][] = [[], [], [], []]; // 4行，每行可以有多个
    
    roundPlays.forEach((playRecord, index) => {
      if (index < 4) {
        // 前4个，每个占一行
        rows[index] = [playRecord];
      } else {
        // 第5个开始，放在对应行的第2列
        const rowIndex = index % 4;
        rows[rowIndex].push(playRecord);
      }
    });
    
    return rows;
  }, [roundPlays]);

  // 计算每列的宽度和位置
  const calculateColumnPositions = (rows: (RoundPlayRecord | null)[][]) => {
    const columnPositions: number[][] = []; // 每行的列位置数组
    
    rows.forEach((row, rowIndex) => {
      const positions: number[] = [];
      let currentX = 0; // 当前列的起始X位置
      
      row.forEach((playRecord, colIndex) => {
        if (!playRecord) {
          positions.push(currentX);
          return;
        }
        
        // 计算这一列的宽度：第一张卡40px + 后续每张卡向右偏移20px
        // 分数徽章在卡牌内部（右上角），不影响容器宽度
        const cardWidth = 40; // 小卡片宽度
        const stackOffset = (playRecord.cards.length - 1) * 20; // 最后一张卡的偏移
        const lastCardRightEdge = stackOffset + cardWidth; // 最后一张卡的右边缘位置
        
        // 容器宽度 = 最后一张卡的右边缘 + 一些padding（给徽章留出空间）
        const columnWidth = lastCardRightEdge + 10; // 加10px padding，确保徽章不超出
        
        positions.push(currentX);
        
        // 下一列的起始位置 = 当前列起始位置 + 当前列宽度 + padding
        currentX = currentX + columnWidth + 30; // 30px是列之间的padding
      });
      
      columnPositions.push(positions);
    });
    
    return columnPositions;
  };

  // 横向排列：将所有出牌记录放在一行中
  return (
    <div className="round-plays-table">
      {/* 横向排列：所有出牌记录在一行中 */}
      <div className="round-play-row" style={{ display: 'flex', flexDirection: 'row', gap: '20px', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        {roundPlays.map((playRecord, index) => {
          if (!playRecord) return null;
          
          // 计算卡牌叠放区域的宽度（分数徽章在卡牌内部，不影响宽度）
          const cardWidth = 40;
          const stackOffset = (playRecord.cards.length - 1) * 20;
          const cardsContainerWidth = stackOffset + cardWidth;
          
          return (
            <div 
              key={index} 
              className="round-play-item-inline"
              style={{ position: 'relative', left: 'auto', top: 'auto' }}
            >
              <div className="round-play-player-inline">{playRecord.playerName}:</div>
              {/* 卡牌叠放容器 - 一行横着叠放，所有卡牌纵坐标相同 */}
              <div 
                className="round-play-cards-stacked"
                style={{
                  width: `${cardsContainerWidth}px`
                }}
              >
                {playRecord.cards.map((card, cardIndex) => {
                  const isScore = isScoreCard(card);
                  const score = isScore ? getCardScore(card) : 0;
                  const cardStackOffset = cardIndex * 20; // 第一张横坐标为0，第二张为20，第三张为40...
                  return (
                    <div
                      key={card.id}
                      className={`round-play-card-stack-item ${isScore ? 'score-card-wrapper' : ''}`}
                      style={{
                        transform: `translateX(${cardStackOffset}px)`, // 只改变横坐标，纵坐标保持0
                        zIndex: cardIndex + 1
                      }}
                    >
                      <CardComponent card={card} size="small" />
                      {/* 分数徽章放在卡牌上方（顶部居中），不影响水平布局 */}
                      {isScore && (
                        <div className="card-score-badge-small-top">{score}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {playRecord.score > 0 && (
                <div className="round-play-score-inline">+{playRecord.score}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

