/**
 * 团队分数面板组件
 * 显示游戏进行中各团队的实时分数
 */

import React from 'react';
import { TeamConfig } from '../../types/team';
import { Player } from '../../types/card';
import { getTeam, getPlayerTeamId } from '../../utils/teamManager';

interface TeamScorePanelProps {
  teamConfig: TeamConfig;
  players: Player[];
}

export const TeamScorePanel: React.FC<TeamScorePanelProps> = ({
  teamConfig,
  players
}) => {
  // 获取团队中的所有玩家名称
  const getTeamPlayersNames = (teamId: number): string[] => {
    const team = getTeam(teamId, teamConfig);
    if (!team) return [];
    return team.players.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return player ? player.name : `玩家${playerId + 1}`;
    });
  };

  // 检查玩家是否是人类玩家
  const isHumanPlayer = (playerId: number): boolean => {
    const player = players.find(p => p.id === playerId);
    return player?.isHuman || false;
  };

  // 检查是否是人类的团队
  const isHumanTeam = (teamId: number): boolean => {
    return teamId === teamConfig.humanPlayerTeam;
  };

  return (
    <div 
      className="team-score-panel"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#ffffff',
        border: '2px solid #667eea',
        borderRadius: '12px',
        padding: '15px 20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        minWidth: '280px',
        maxWidth: '350px'
      }}
    >
      <div style={{ 
        fontSize: '18px', 
        fontWeight: 'bold', 
        marginBottom: '12px',
        color: '#667eea',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '8px'
      }}>
        👥 团队分数
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {teamConfig.teams.map((team) => {
          const teamPlayers = getTeamPlayersNames(team.id);
          const isHuman = isHumanTeam(team.id);
          
          return (
            <div
              key={team.id}
              style={{
                padding: '12px',
                backgroundColor: isHuman ? '#E3F2FD' : '#F5F5F5',
                borderRadius: '8px',
                border: isHuman ? '2px solid #2196F3' : '1px solid #ddd',
              }}
            >
              {/* 团队头部 */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: 'bold',
                    color: isHuman ? '#2196F3' : '#333'
                  }}>
                    {team.name}
                  </span>
                  {isHuman && (
                    <span style={{
                      fontSize: '11px',
                      color: '#2196F3',
                      backgroundColor: '#BBDEFB',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      你的团队
                    </span>
                  )}
                </div>
                <span style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold',
                  color: isHuman ? '#2196F3' : '#333'
                }}>
                  {team.teamScore} 分
                </span>
              </div>
              
              {/* 团队成员 */}
              <div style={{ 
                fontSize: '12px',
                color: '#666',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px'
              }}>
                {teamPlayers.map((playerName, index) => {
                  const player = players.find(p => p.name === playerName);
                  const isHumanPlayer = player?.isHuman || false;
                  
                  return (
                    <span
                      key={index}
                      style={{
                        padding: '3px 6px',
                        backgroundColor: isHumanPlayer ? '#BBDEFB' : '#E0E0E0',
                        borderRadius: '4px',
                        color: isHumanPlayer ? '#1976D2' : '#666'
                      }}
                    >
                      {playerName}{isHumanPlayer ? ' (你)' : ''}
                    </span>
                  );
                })}
              </div>
              
              {/* 团队统计信息 */}
              <div style={{ 
                marginTop: '8px',
                fontSize: '11px',
                color: '#999',
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(0,0,0,0.1)',
                paddingTop: '6px'
              }}>
                <span>轮次得分: {team.roundScore}</span>
                <span>获胜轮次: {team.roundsWon}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

