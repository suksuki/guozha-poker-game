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
    <div className="player-info-compact">
      <div className="player-info-main">
        <span className="player-hand-count">{player.hand.length} 张</span>
        <span className="player-score-compact">得分: {player.score || 0}</span>
        {isPlayerTurn && <span className="your-turn-badge">你的回合</span>}
      </div>
    </div>
  );
};

