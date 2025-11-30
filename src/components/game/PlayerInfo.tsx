/**
 * 玩家信息组件
 * 显示玩家头像和状态信息（类似AI玩家）
 */

import React from 'react';
import { Player } from '../../types/card';

interface PlayerInfoProps {
  player: Player;
  isPlayerTurn: boolean;
  playerCount?: number; // 玩家总数（用于判断最后一名）
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isPlayerTurn }) => {
  // 获取玩家头像emoji（人类玩家使用特殊的可爱头像）
  const getPlayerAvatar = (playerId: number): string => {
    // 人类玩家使用特殊的可爱头像
    return '🐱'; // 可爱的小猫头像
  };

  const avatarEmoji = getPlayerAvatar(player.id);
  const playerScore = player.score || 0;
  const dunCount = player.dunCount || 0;

  return (
    <div className="ai-player-avatar-container human-player-avatar-container">
      {/* 卡通大头像 */}
      <div className="ai-player-avatar">
        <div className="avatar-emoji">
          {avatarEmoji}
        </div>
        <div className="avatar-name">{player.name}</div>
      </div>
      
      {/* 状态信息面板 */}
      <div className="ai-player-status-panel human-player-status-panel">
        <div className="status-item status-item-compact">
          <span className="status-value">{playerScore}分，{dunCount}墩</span>
        </div>
        <div className="status-item">
          <span className="status-label">手牌</span>
          <span className="status-value">{player.hand.length} 张</span>
        </div>
        {/* 你的回合提示 - 放在信息面板下面 */}
        <div className={`avatar-thinking ${isPlayerTurn ? 'visible' : 'hidden'}`}>
          你的回合
        </div>
      </div>
    </div>
  );
};

