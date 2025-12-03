/**
 * 团队获胜动画组件
 * 显示团队获胜的庆祝动画
 */

import React, { useEffect, useState } from 'react';

interface TeamVictoryAnimationProps {
  winningTeamId: number;
  winningTeamName: string;
  isHumanTeam: boolean;
  onComplete?: () => void;
  duration?: number;  // 动画持续时间（毫秒）
}

export const TeamVictoryAnimation: React.FC<TeamVictoryAnimationProps> = ({
  winningTeamId,
  winningTeamName,
  isHumanTeam,
  onComplete,
  duration = 3000
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 20000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.85)',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      {/* 背景光效 */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: isHumanTeam 
          ? 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(192, 192, 192, 0.3) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'glow 2s ease-in-out infinite'
      }}></div>

      {/* 主要内容 */}
      <div style={{
        textAlign: 'center',
        animation: 'slideUp 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }}>
        {/* 奖杯图标 */}
        <div style={{
          fontSize: '120px',
          marginBottom: '20px',
          animation: 'bounce 1s ease-in-out infinite'
        }}>
          {isHumanTeam ? '🏆' : '👑'}
        </div>

        {/* 获胜文字 */}
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: isHumanTeam ? '#FFD700' : '#C0C0C0',
          textShadow: '0 0 20px rgba(255, 215, 0, 0.8)',
          marginBottom: '15px',
          animation: 'glow 2s ease-in-out infinite'
        }}>
          {isHumanTeam ? '🎉 胜利！' : '游戏结束'}
        </div>

        {/* 团队名称 */}
        <div style={{
          fontSize: '32px',
          color: 'white',
          marginBottom: '10px'
        }}>
          {winningTeamName}获胜
        </div>

        {/* 副标题 */}
        {isHumanTeam && (
          <div style={{
            fontSize: '20px',
            color: '#FFD700',
            fontStyle: 'italic'
          }}>
            太棒了！你的团队赢了！
          </div>
        )}

        {/* 装饰星星 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          marginTop: '30px',
          fontSize: '30px'
        }}>
          <span style={{ animation: 'twinkle 1s ease-in-out infinite' }}>✨</span>
          <span style={{ animation: 'twinkle 1s ease-in-out 0.3s infinite' }}>⭐</span>
          <span style={{ animation: 'twinkle 1s ease-in-out 0.6s infinite' }}>✨</span>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes glow {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.3);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

