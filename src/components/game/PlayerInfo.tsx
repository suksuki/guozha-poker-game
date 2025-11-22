/**
 * 玩家信息组件
 * 显示玩家信息（手牌数量、得分、赢得轮次等）
 */

import React from 'react';
import { Player } from '../../types/card';

interface PlayerInfoProps {
  player: Player;
  isPlayerTurn: boolean;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isPlayerTurn }) => {
  return (
    <div className="player-info">
      <h3>你的手牌 ({player.hand.length} 张)</h3>
      <div className="player-score-display">得分: {player.score || 0} 分</div>
      {player.wonRounds && player.wonRounds.length > 0 && (
        <div className="player-won-rounds">
          <div className="won-rounds-label">你赢得了 {player.wonRounds.length} 轮</div>
          <div className="won-rounds-summary">
            {player.wonRounds.map((round, idx) => (
              <div key={idx} className="won-round-badge" title={`第${round.roundNumber}轮: ${round.totalScore}分`}>
                轮{round.roundNumber}: {round.totalScore}分
              </div>
            ))}
          </div>
        </div>
      )}
      {isPlayerTurn && <div className="your-turn">轮到你出牌</div>}
    </div>
  );
};

