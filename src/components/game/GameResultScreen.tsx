/**
 * 游戏结果屏幕组件
 * 显示游戏结束后的结果和排名
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Player } from '../../types/card';

interface Ranking {
  player: Player;
  finalScore: number;
  rank: number;
}

interface GameRecord {
  gameId: string;
}

interface GameResultScreenProps {
  winner: Player;
  rankings: Ranking[];
  gameRecord?: GameRecord;
  onReset: () => void;
  onBackToGame?: () => void; // 返回查看牌面
}

export const GameResultScreen: React.FC<GameResultScreenProps> = ({
  winner,
  rankings,
  gameRecord,
  onReset,
  onBackToGame
}) => {
  const { t } = useTranslation(['game']);

  const handleDownload = () => {
    if (!gameRecord) return;
    const dataStr = JSON.stringify(gameRecord, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guozha-game-${gameRecord.gameId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="game-container">
      <div className="result-screen">
        <h1>{winner?.isHuman ? t('game:result.youWon') : t('game:result.playerWon', { name: winner?.name })}</h1>
        
        {/* 显示排名 */}
        {rankings.length > 0 && (
          <div className="rankings-container" style={{ marginTop: '20px', marginBottom: '20px' }}>
            <h2>{t('game:result.finalRankings')}</h2>
            <div className="rankings-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
              {rankings
                .sort((a, b) => b.finalScore - a.finalScore)
                .map((ranking, index) => (
                  <div 
                    key={ranking.player.id} 
                    className="ranking-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 15px',
                      backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f0f0f0',
                      borderRadius: '8px',
                      border: index === 0 ? '2px solid #ff6b6b' : '1px solid #ddd'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        {ranking.player.name}
                      </span>
                      {ranking.player.isHuman && <span style={{ fontSize: '12px', color: '#666' }}>{t('game:result.you')}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: index === 0 ? '#ff6b6b' : '#333' }}>
                        {t('game:result.score', { score: ranking.finalScore })}
                      </span>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {t('game:result.ranking', { rank: ranking.rank })}
                      </span>
                    </div>
                  </div>
                ))}
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
          {gameRecord && (
            <button className="btn-action" onClick={handleDownload}>
              {t('game:result.downloadRecord')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

