/**
 * AI玩家卡片组件
 * 显示单个AI玩家的信息
 */

import React from 'react';
import { Player } from '../../types/card';
import { CardComponent } from '../CardComponent';

interface AIPlayerCardProps {
  player: Player;
  isCurrent: boolean;
  isLastPlay: boolean;
}

export const AIPlayerCard: React.FC<AIPlayerCardProps> = ({
  player,
  isCurrent,
  isLastPlay
}) => {
  return (
    <div 
      className={`player-card ${isCurrent ? 'current-player' : ''} ${isLastPlay ? 'last-play-player' : ''}`}
    >
      <div className="player-name">{player.name}</div>
      <div className="player-card-count">剩余: {player.hand.length} 张</div>
      <div className="player-score">得分: {player.score || 0} 分</div>
      {player.wonRounds && player.wonRounds.length > 0 && (
        <div className="player-won-rounds">
          <div className="won-rounds-label">赢得 {player.wonRounds.length} 轮</div>
          <div className="won-rounds-summary">
            {player.wonRounds.map((round, idx) => (
              <div key={idx} className="won-round-badge" title={`第${round.roundNumber}轮: ${round.totalScore}分`}>
                轮{round.roundNumber}: {round.totalScore}分
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="player-cards-preview">
        {Array.from({ length: Math.min(player.hand.length, 5) }).map((_, i) => (
          <CardComponent key={i} card={player.hand[0]} faceDown size="small" />
        ))}
      </div>
      {isCurrent && <div className="turn-indicator">思考中...</div>}
    </div>
  );
};

