/**
 * 玩家信息组件
 * 显示玩家信息（手牌数量、得分、赢得轮次等）
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { Player } from '../../types/card';

interface PlayerInfoProps {
  player: Player;
  isPlayerTurn: boolean;
  playerCount?: number; // 玩家总数（用于判断最后一名）
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isPlayerTurn, playerCount }) => {
  const { t } = useTranslation(['game', 'ui']);
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
    <div className="player-info-compact">
      <div className="player-info-main">
        <span className="player-hand-count">{player.hand.length} 张</span>
        <span className="player-score-compact">得分: {player.score || 0}</span>
        {playerRank !== null && (
          <span className={`player-rank-badge rank-${playerRank} ${isLastPlace ? 'last-place' : ''}`}>
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
              // 中文：第1名、第2名等
              return `第${playerRank}名`;
            })()}
          </span>
        )}
        {isPlayerTurn && <span className="your-turn-badge">你的回合</span>}
      </div>
    </div>
  );
};

