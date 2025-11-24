/**
 * AI玩家卡片组件
 * 显示单个AI玩家的信息
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['ui']);

  return (
    <div 
      className={`player-card ${isCurrent ? 'current-player' : ''} ${isLastPlay ? 'last-play-player' : ''}`}
    >
      <div className="player-name">{player.name}</div>
      <div className="player-card-count">{t('ui:aiPlayer.remaining', { count: player.hand.length })}</div>
      <div className="player-score">{t('ui:aiPlayer.score', { score: player.score || 0 })}</div>
      {player.wonRounds && player.wonRounds.length > 0 && (
        <div className="player-won-rounds">
          <div className="won-rounds-label">{t('ui:aiPlayer.wonRounds', { count: player.wonRounds.length })}</div>
          <div className="won-rounds-summary">
            {player.wonRounds.map((round, idx) => (
              <div 
                key={idx} 
                className="won-round-badge" 
                title={t('ui:aiPlayer.roundTitle', { round: round.roundNumber, score: round.totalScore })}
              >
                {t('ui:aiPlayer.roundBadge', { round: round.roundNumber, score: round.totalScore })}
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
      {isCurrent && <div className="turn-indicator">{t('ui:aiPlayer.thinking')}</div>}
    </div>
  );
};

