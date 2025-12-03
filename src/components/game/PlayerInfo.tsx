/**
 * 玩家信息组件
 * 显示玩家头像和状态信息（类似AI玩家）
 */

import React from 'react';
import { Player } from '../../types/card';
import { TeamConfig } from '../../types/team';
import { calculatePlayerPickedScore, calculatePlayerDunScore, calculateTeamScore, calculateTeamDunCount } from '../../utils/teamScoring';
import { getPlayerTeamId } from '../../utils/teamManager';

interface PlayerInfoProps {
  player: Player;
  isPlayerTurn: boolean;
  playerCount?: number; // 玩家总数（用于判断最后一名）
  teamConfig?: TeamConfig | null;
  allPlayers?: Player[];
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({ player, isPlayerTurn, teamConfig, allPlayers }) => {
  // 获取玩家头像emoji（人类玩家使用特殊的可爱头像）
  const getPlayerAvatar = (playerId: number): string => {
    // 人类玩家使用特殊的可爱头像
    return '🐱'; // 可爱的小猫头像
  };

  const avatarEmoji = getPlayerAvatar(player.id);
  
  // 计算实时分数
  const pickedScore = calculatePlayerPickedScore(player);
  const dunScore = allPlayers ? calculatePlayerDunScore(player, allPlayers) : 0;
  const totalScore = pickedScore + dunScore;
  const dunCount = player.dunCount || 0;
  
  // 计算团队分数
  const teamId = teamConfig ? getPlayerTeamId(player.id, teamConfig) : null;
  const teamScore = teamId !== null && teamConfig && allPlayers ? calculateTeamScore(teamId, allPlayers, teamConfig) : 0;
  const teamDunCount = teamId !== null && teamConfig && allPlayers ? calculateTeamDunCount(teamId, allPlayers, teamConfig) : 0;

  // 获取玩家名次
  const playerRank = player.finishedRank ?? null;

  return (
    <div className="ai-player-avatar-container human-player-avatar-container">
      {/* 卡通大头像 */}
      <div className="ai-player-avatar">
        {/* 名次信息 - 绝对定位在头像上方 */}
        {playerRank !== null && (
          <div className="avatar-rank-badge">
            <span className={`rank-badge rank-${playerRank}`}>
              {playerRank === 1 ? '🏆' : playerRank === 2 ? '🥈' : ''}
              第{playerRank}名
            </span>
          </div>
        )}
        <div className="avatar-emoji">
          {avatarEmoji}
        </div>
        <div className="avatar-name">{player.name}</div>
      </div>
      
      {/* 状态信息面板 */}
      <div className="ai-player-status-panel human-player-status-panel">
        {/* 个人分数 */}
        <div className="status-item status-item-compact" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          marginBottom: '8px'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>个人</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
            手牌: {pickedScore} | 墩: {dunScore} | 总: {totalScore}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
            墩数: {dunCount}
          </div>
        </div>
        
        {/* 团队分数 */}
        {teamConfig && teamId !== null && (
          <div className="status-item status-item-compact" style={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '8px',
            borderRadius: '8px',
            marginBottom: '8px'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>团队</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
              总分: {teamScore} | 总墩: {teamDunCount}
            </div>
          </div>
        )}
        
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

