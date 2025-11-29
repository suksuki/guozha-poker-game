/**
 * AI玩家卡片组件
 * 显示单个AI玩家的信息
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { Player } from '../../types/card';
import { CardComponent } from '../CardComponent';

interface AIPlayerCardProps {
  player: Player;
  isCurrent: boolean;
  isLastPlay: boolean;
  playerCount?: number; // 玩家总数（用于判断最后一名）
}

export const AIPlayerCard: React.FC<AIPlayerCardProps> = ({
  player,
  isCurrent,
  isLastPlay,
  playerCount
}) => {
  const { t } = useTranslation(['ui']);
  const playerRank = player.finishedRank ?? null;
  const isLastPlace = playerRank !== null && playerCount && playerRank === playerCount;
  
  // 奖杯图标：第一名金色🏆，第二名银色🥈，最后一名灰色🏆
  const getTrophyIcon = () => {
    if (playerRank === 1) return '🏆'; // 第一名金色奖杯
    if (playerRank === 2) return '🥈'; // 第二名银色奖杯
    if (isLastPlace) return '🏆'; // 最后一名灰色奖杯（通过CSS样式控制颜色）
    return null;
  };
  
  const trophyIcon = getTrophyIcon();

  return (
    <div 
      className={`player-card ${isCurrent ? 'current-player' : ''} ${isLastPlay ? 'last-play-player' : ''}`}
    >
      <div className="player-name">{player.name}</div>
      <div className="player-card-count">{t('ui:aiPlayer.remaining', { count: player.hand.length })}</div>
      <div className="player-score">{t('ui:aiPlayer.score', { score: player.score || 0 })}</div>
      {playerRank !== null && (
        <div className={`player-rank-badge rank-${playerRank} ${isLastPlace ? 'last-place' : ''}`}>
          {trophyIcon && (
            <span className={`trophy-icon ${isLastPlace ? 'trophy-gray' : playerRank === 1 ? 'trophy-gold' : playerRank === 2 ? 'trophy-silver' : ''}`}>
              {trophyIcon}
            </span>
          )}
          {(() => {
            // 根据语言格式化名次显示
            const lang = i18n.language || 'zh-CN';
            if (lang.startsWith('en')) {
              // 英文：1st, 2nd, 3rd, 4th...
              const suffix = playerRank === 1 ? 'st' : playerRank === 2 ? 'nd' : playerRank === 3 ? 'rd' : 'th';
              return `${playerRank}${suffix}`;
            }
            // 其他语言使用翻译
            return t('ui:aiPlayer.rankBadge', { rank: playerRank });
          })()}
        </div>
      )}
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

