/**
 * 轮次出牌记录面板组件
 * 显示当前轮次的所有出牌记录
 */

import React from 'react';
import { RoundPlayRecord } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { DraggablePanel } from '../DraggablePanel';
import { isScoreCard, getCardScore } from '../../utils/cardUtils';

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

  return (
    <DraggablePanel
      title={`第 ${roundNumber || 1} 轮出牌记录`}
      storageKey="round-plays-panel-position"
      defaultPosition={{ x: window.innerWidth - 350, y: 50 }}
      minWidth={280}
      minHeight={200}
      maxWidth={500}
      maxHeight={600}
    >
      <div className="round-plays-panel-content">
        {roundPlays.map((playRecord, index) => (
          <div key={index} className="round-play-item">
            <div className="round-play-player">{playRecord.playerName}:</div>
            <div className="round-play-cards">
              {playRecord.cards.map((card) => {
                const isScore = isScoreCard(card);
                const score = isScore ? getCardScore(card) : 0;
                return (
                  <div key={card.id} className={isScore ? 'score-card-wrapper' : ''}>
                    <CardComponent card={card} size="small" />
                    {isScore && (
                      <div className="card-score-badge-small">{score}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {playRecord.score > 0 && (
              <div className="round-play-score">+{playRecord.score} 分</div>
            )}
          </div>
        ))}
        {roundScore > 0 && (
          <div className="round-total-score">
            本轮累计: {roundScore} 分
          </div>
        )}
      </div>
    </DraggablePanel>
  );
};

