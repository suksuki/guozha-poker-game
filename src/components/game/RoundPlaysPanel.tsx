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
        const cardWidth = 40; // 小卡片宽度
        const stackOffset = (playRecord.cards.length - 1) * 20; // 最后一张卡的偏移
        const columnWidth = cardWidth + stackOffset; // 这一列的总宽度
        
        positions.push(currentX);
        
        // 下一列的起始位置 = 当前列起始位置 + 当前列宽度 + padding
        currentX = currentX + columnWidth + 30; // 30px是列之间的padding
      });
      
      columnPositions.push(positions);
    });
    
    return columnPositions;
  };

  const columnPositions = useMemo(() => calculateColumnPositions(playsByRow), [playsByRow]);

  return (
    <div className="round-plays-table">
      {playsByRow.map((row, rowIndex) => (
        <div key={rowIndex} className="round-play-row">
          {row.map((playRecord, colIndex) => {
            if (!playRecord) return null;
            const leftPosition = columnPositions[rowIndex][colIndex];
            
            return (
              <div 
                key={`${rowIndex}-${colIndex}`} 
                className="round-play-item-inline"
                style={{ left: `${leftPosition}px` }}
              >
                <div className="round-play-player-inline">{playRecord.playerName}:</div>
                <div 
                  className="round-play-cards-stacked"
                  style={{
                    width: `${40 + (playRecord.cards.length - 1) * 20}px` // 动态计算宽度：第一张40px + 后续每张20px
                  }}
                >
                  {playRecord.cards.map((card, cardIndex) => {
                    const isScore = isScoreCard(card);
                    const score = isScore ? getCardScore(card) : 0;
                    const stackOffset = cardIndex * 20; // 第一张横坐标为0，第二张为20，第三张为40...
                    return (
                      <div
                        key={card.id}
                        className={`round-play-card-stack-item ${isScore ? 'score-card-wrapper' : ''}`}
                        style={{
                          transform: `translateX(${stackOffset}px)`,
                          zIndex: cardIndex + 1
                        }}
                      >
                        <CardComponent card={card} size="small" />
                        {isScore && (
                          <div className="card-score-badge-small">{score}</div>
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
      ))}
    </div>
  );
};

