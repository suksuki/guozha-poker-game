/**
 * 出牌区域组件
 * 显示当前出牌信息
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Player } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { getCardTypeName } from '../../utils/gameUtils';

interface PlayAreaProps {
  lastPlay: Play | null;
  lastPlayPlayerName?: string;
  roundScore: number;
}

export const PlayArea: React.FC<PlayAreaProps> = ({
  lastPlay,
  lastPlayPlayerName,
  roundScore
}) => {
  const { t } = useTranslation('game');

  return (
    <div className="play-area">
      {lastPlay && (
        <div className="last-play">
          <div className="play-label" style={{ color: 'white', marginBottom: '28px' }}>
            <span className="play-icon" style={{ color: 'white' }}>🎴</span>
            <span className="play-label-text" style={{ color: 'white' }}>{t('playArea.playerPlayed', { name: lastPlayPlayerName || '' })}</span>
          </div>
          <div className="play-cards" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0', marginBottom: '20px' }}>
            {lastPlay.cards.map((card) => (
              <CardComponent key={card.id} card={card} size="medium" />
            ))}
          </div>
          <div className="play-type" style={{ color: 'white' }}>
            <span className="play-type-icon" style={{ color: 'white' }}>✨</span>
            <span className="play-type-text" style={{ color: 'white' }}>{getCardTypeName(lastPlay.type)}</span>
          </div>
          {roundScore > 0 && (
            <div className="round-score">
              <span className="score-icon">⭐</span>
              <span className="score-text">{t('playArea.roundScore', { score: roundScore })}</span>
            </div>
          )}
        </div>
      )}
      {!lastPlay && (
        <div className="no-play">
          <span className="no-play-icon">🎯</span>
          <span className="no-play-text">{t('playArea.noPlay')}</span>
        </div>
      )}
    </div>
  );
};

