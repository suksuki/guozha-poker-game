/**
 * 团队分数实时显示组件
 * 在游戏过程中显示两个团队的当前分数
 */

import React from 'react';
import { Player } from '../../types/card';
import { TeamConfig } from '../../types/team';
import { calculateTeamScore, calculateTeamDunCount } from '../../utils/teamScoring';

interface TeamScoreLiveDisplayProps {
  players: Player[];
  teamConfig: TeamConfig;
  compact?: boolean;  // 紧凑模式（只显示总分）
}

export const TeamScoreLiveDisplay: React.FC<TeamScoreLiveDisplayProps> = ({
  players,
  teamConfig,
  compact = false
}) => {
  const team0Score = calculateTeamScore(0, players, teamConfig);
  const team1Score = calculateTeamScore(1, players, teamConfig);
  const team0DunCount = calculateTeamDunCount(0, players, teamConfig);
  const team1DunCount = calculateTeamDunCount(1, players, teamConfig);

  const humanTeamId = teamConfig.humanPlayerTeam;

  if (compact) {
    // 紧凑模式：横向显示
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        gap: '10px',
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        backdropFilter: 'blur(10px)',
        fontSize: '14px',
        color: 'white'
      }}>
        <div style={{ 
          fontWeight: humanTeamId === 0 ? 'bold' : 'normal',
          color: humanTeamId === 0 ? '#FFD700' : 'white'
        }}>
          {teamConfig.teams[0].name}: {team0Score}分
        </div>
        <div style={{ color: '#666' }}>|</div>
        <div style={{ 
          fontWeight: humanTeamId === 1 ? 'bold' : 'normal',
          color: humanTeamId === 1 ? '#FFD700' : 'white'
        }}>
          {teamConfig.teams[1].name}: {team1Score}分
        </div>
      </div>
    );
  }

  // 详细模式：竖向显示
  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minWidth: '200px'
    }}>
      {teamConfig.teams.map((team, index) => {
        const teamScore = index === 0 ? team0Score : team1Score;
        const teamDunCount = index === 0 ? team0DunCount : team1DunCount;
        const isHumanTeam = team.id === humanTeamId;
        const teamPlayers = team.players.map(pid => players[pid]);
        const finishedCount = teamPlayers.filter(p => p.hand.length === 0).length;

        return (
          <div
            key={team.id}
            style={{
              padding: '12px 15px',
              background: isHumanTeam 
                ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.9) 0%, rgba(21, 101, 192, 0.9) 100%)'
                : 'rgba(0, 0, 0, 0.75)',
              borderRadius: '12px',
              boxShadow: isHumanTeam 
                ? '0 4px 12px rgba(33, 150, 243, 0.4)'
                : '0 2px 8px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              border: isHumanTeam ? '2px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            {/* 团队名称和标识 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {team.name}
                {isHumanTeam && (
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    padding: '2px 6px',
                    background: '#FFD700',
                    color: '#1565C0',
                    borderRadius: '4px'
                  }}>
                    你的团队
                  </span>
                )}
              </div>
            </div>

            {/* 分数显示 */}
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: teamScore >= 0 ? '#4CAF50' : '#FF5252',
              marginBottom: '8px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              {teamScore >= 0 ? '+' : ''}{teamScore} 分
            </div>

            {/* 详细信息 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              <div>已出完：{finishedCount}/{teamPlayers.length}人</div>
              {teamDunCount > 0 && (
                <div>出墩：{teamDunCount}墩</div>
              )}
            </div>

            {/* 队员手牌状态 */}
            <div style={{
              marginTop: '8px',
              display: 'flex',
              gap: '4px'
            }}>
              {teamPlayers.map(p => (
                <div
                  key={p.id}
                  style={{
                    flex: 1,
                    height: '4px',
                    background: p.hand.length === 0 
                      ? '#4CAF50' 
                      : 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '2px',
                    transition: 'background 0.3s ease'
                  }}
                  title={`${p.name}: ${p.hand.length}张牌`}
                />
              ))}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes glow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

