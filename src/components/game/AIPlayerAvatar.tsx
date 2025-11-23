/**
 * AI玩家头像组件
 * 可复用的AI玩家显示组件，支持发牌和打牌时使用
 */

import React from 'react';
import { Player } from '../../types/card';

export interface AIPlayerAvatarProps {
  player: Player | Omit<Player, 'hand'>;
  handCount?: number; // 手牌数量（如果player没有hand属性）
  position?: { x: number; y: number; angle: number }; // 位置信息（发牌时使用）
  isCurrent?: boolean; // 是否是当前玩家（打牌时使用）
  isLastPlay?: boolean; // 是否是最后出牌的玩家（打牌时使用）
  showPosition?: boolean; // 是否显示位置信息（发牌时true，打牌时false）
}

export const AIPlayerAvatar = React.forwardRef<HTMLDivElement, AIPlayerAvatarProps>(({
  player,
  handCount,
  position,
  isCurrent = false,
  isLastPlay = false,
  showPosition = false
}, ref) => {
  const actualHandCount = handCount !== undefined ? handCount : (player.hand?.length || 0);
  const playerScore = player.score || 0;
  const playerRank = player.finishedRank ?? null;
  const dunCount = player.wonRounds?.length || 0; // 墩数 = 赢得的轮次数
  
  // 根据玩家ID选择emoji
  const emojis = ['🤖', '👾', '🤖', '👽', '🤖', '👻', '🤖', '🦾'];
  const avatarEmoji = emojis[player.id % 8];
  
  // 奖杯图标：第一名金色🏆，第二名银色🥈
  const getTrophyIcon = () => {
    if (playerRank === 1) return '🏆'; // 第一名金色奖杯
    if (playerRank === 2) return '🥈'; // 第二名银色奖杯
    return null;
  };
  
  const trophyIcon = getTrophyIcon();
  
  // 计算样式
  const containerStyle: React.CSSProperties = showPosition && position
    ? {
        position: 'absolute',
        left: `${position.x}%`,
        top: '10px', // 从顶部往下10px的距离
        transform: 'translateX(-50%)', // 只水平居中
        zIndex: 150 // 提高z-index，确保在顶部且不被遮挡
      }
    : {
        position: 'relative',
        zIndex: 150 // 提高z-index，确保在顶部且不被遮挡
      };
  
  return (
    <div
      ref={ref}
      className={`ai-player-avatar-container ${isCurrent ? 'current-player' : ''} ${isLastPlay ? 'last-play-player' : ''}`}
      style={containerStyle}
    >
      {/* 状态信息面板 */}
      <div className="ai-player-status-panel">
        <div className="status-item">
          <span className="status-label">分数:</span>
          <span className="status-value">{playerScore}</span>
        </div>
        <div className="status-item">
          <span className="status-label">墩数:</span>
          <span className="status-value">{dunCount}</span>
        </div>
        {playerRank !== null && (
          <div className="status-item rank-item">
            <span className="status-label">名次:</span>
            <span className={`status-value rank-badge rank-${playerRank}`}>
              {trophyIcon && <span className="trophy-icon">{trophyIcon}</span>}
              第{playerRank}名
            </span>
          </div>
        )}
        <div className="status-item">
          <span className="status-label">手牌:</span>
          <span className="status-value">{actualHandCount} 张</span>
        </div>
        {isCurrent && (
          <div className="status-item current-indicator">
            <span className="status-value">思考中...</span>
          </div>
        )}
      </div>
      
      {/* 卡通大头像 */}
      <div className="ai-player-avatar">
        <div className="avatar-emoji">
          {avatarEmoji}
        </div>
        <div className="avatar-name">{player.name}</div>
      </div>
    </div>
  );
});

