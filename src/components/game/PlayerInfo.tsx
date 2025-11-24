/**
 * 玩家信息组件
 * 显示玩家信息（手牌数量、得分、赢得轮次等）
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Player } from '../../types/card';

interface PlayerInfoProps {
  player: Player;
  isPlayerTurn: boolean;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isPlayerTurn }) => {
  const { t } = useTranslation(['game', 'ui']);

  return (
    <div className="player-info">
      <h3>{t('ui:playerInfo.yourHand', { count: player.hand.length })}</h3>
      <div className="player-score-display">{t('ui:playerInfo.score', { score: player.score || 0 })}</div>
      {player.wonRounds && player.wonRounds.length > 0 && (
        <div className="player-won-rounds">
          <div className="won-rounds-label">{t('ui:playerInfo.wonRounds', { count: player.wonRounds.length })}</div>
          <div className="won-rounds-summary">
            {player.wonRounds.map((round, idx) => (
              <div key={idx} className="won-round-badge" title={t('ui:playerInfo.roundTitle', { round: round.roundNumber, score: round.totalScore })}>
                {t('ui:playerInfo.roundBadge', { round: round.roundNumber, score: round.totalScore })}
              </div>
            ))}
          </div>
        </div>
      )}
      {isPlayerTurn && <div className="your-turn">{t('game:status.yourTurn')}</div>}
    </div>
  );
};

