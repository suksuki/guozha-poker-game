/**
 * 团队模式游戏结果屏幕组件
 * 显示游戏结束后的团队排名和结果
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TeamRanking, TeamConfig } from '../../types/team';
import { Player } from '../../types/card';
import { getPlayerTeamId, getTeam } from '../../utils/teamManager';

interface TeamResultScreenProps {
  teamRankings: TeamRanking[];
  teamConfig: TeamConfig;
  players: Player[];
  onReset: () => void;
  onBackToGame?: () => void;
}

export const TeamResultScreen: React.FC<TeamResultScreenProps> = ({
  teamRankings,
  teamConfig,
  players,
  onReset,
  onBackToGame
}) => {
  const { t } = useTranslation(['game']);

  // 找到获胜的团队
  const winnerTeam = teamRankings.length > 0 ? teamRankings[0] : null;
  const humanPlayerTeamId = teamConfig.humanPlayerTeam;
  const isHumanTeamWinner = winnerTeam && winnerTeam.team.id === humanPlayerTeamId;

  // 获取团队中的所有玩家名称
  const getTeamPlayersNames = (teamId: number): string[] => {
    const team = getTeam(teamId, teamConfig);
    if (!team) return [];
    return team.players.map(playerId => {
      const player = players.find(p => p.id === playerId);
      return player ? player.name : `玩家${playerId + 1}`;
    });
  };

  return (
    <div className="game-container">
      <div className="result-screen">
        <h1>
          {isHumanTeamWinner 
            ? '🎉 你的团队获胜！' 
            : winnerTeam 
              ? `😢 ${winnerTeam.team.name}获胜`
              : '游戏结束'
          }
        </h1>
        
        {/* 显示团队排名 */}
        {teamRankings.length > 0 && (
          <div className="rankings-container" style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h2>团队最终排名</h2>
            <div className="rankings-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              {teamRankings.map((ranking, index) => {
                const isHumanTeam = ranking.team.id === humanPlayerTeamId;
                const teamPlayers = getTeamPlayersNames(ranking.team.id);
                
                return (
                  <div 
                    key={ranking.team.id} 
                    className="ranking-item"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '15px 20px',
                      backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#f0f0f0',
                      borderRadius: '12px',
                      border: index === 0 ? '3px solid #ff6b6b' : '2px solid #ddd',
                      boxShadow: index === 0 ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* 团队头部信息 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </span>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                          {ranking.team.name}
                        </span>
                        {isHumanTeam && (
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#2196F3',
                            fontWeight: 'bold',
                            padding: '2px 8px',
                            backgroundColor: '#E3F2FD',
                            borderRadius: '4px'
                          }}>
                            (你的团队)
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ 
                          fontSize: '20px', 
                          fontWeight: 'bold', 
                          color: index === 0 ? '#ff6b6b' : '#333' 
                        }}>
                          {ranking.finalScore} 分
                        </span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          排名: {ranking.rank}
                        </span>
                      </div>
                    </div>
                    
                    {/* 团队成员列表 */}
                    <div style={{ 
                      marginTop: '10px', 
                      paddingTop: '10px', 
                      borderTop: '1px solid rgba(0,0,0,0.1)',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>团队成员：</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {teamPlayers.map((playerName, playerIndex) => {
                          const player = players.find(p => p.name === playerName);
                          const isHuman = player?.isHuman || false;
                          return (
                            <span 
                              key={playerIndex}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: isHuman ? '#E3F2FD' : '#F5F5F5',
                                borderRadius: '4px',
                                color: isHuman ? '#2196F3' : '#666'
                              }}
                            >
                              {playerName}{isHuman ? ' (你)' : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {onBackToGame && (
            <button className="btn-action" onClick={onBackToGame} style={{ background: '#2196F3' }}>
              {t('game:result.backToGame')}
            </button>
          )}
          <button className="btn-primary" onClick={onReset}>
            {t('game:result.playAgain')}
          </button>
        </div>
      </div>
    </div>
  );
};

