/**
 * 累积积分榜组件
 * 显示每局分数、总分和排名
 */

import React, { useState, useEffect } from 'react';
import { Player } from '../../types/card';
import { cumulativeScoreService, PlayerCumulativeScore, GameScoreRecord } from '../../services/cumulativeScoreService';
import './CumulativeScoreBoard.css';

interface CumulativeScoreBoardProps {
  players: Player[];
  isVisible: boolean;
  onClose: () => void;
}

export const CumulativeScoreBoard: React.FC<CumulativeScoreBoardProps> = ({
  players,
  isVisible,
  onClose
}) => {
  const [cumulativeScores, setCumulativeScores] = useState<PlayerCumulativeScore[]>([]);
  const [gameRecords, setGameRecords] = useState<GameScoreRecord[]>([]);
  const [currentGameNumber, setCurrentGameNumber] = useState(0);

  useEffect(() => {
    if (isVisible) {
      updateScores();
    }
  }, [isVisible, players]);

  const updateScores = () => {
    const scores = cumulativeScoreService.getCumulativeScores(players);
    const records = cumulativeScoreService.getAllGameRecords();
    const gameNumber = cumulativeScoreService.getCurrentGameNumber();
    
    setCumulativeScores(scores);
    setGameRecords(records);
    setCurrentGameNumber(gameNumber);
  };

  const handleReset = () => {
    if (window.confirm('确定要重置累积积分吗？这将清空所有历史记录。')) {
      cumulativeScoreService.reset();
      updateScores();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="cumulative-score-board-overlay" onClick={onClose}>
      <div className="cumulative-score-board" onClick={(e) => e.stopPropagation()}>
        <div className="cumulative-score-board-header">
          <h2>累积积分榜</h2>
          <div className="cumulative-score-board-actions">
            <button className="btn-reset" onClick={handleReset}>
              重置积分
            </button>
            <button className="btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="cumulative-score-board-content">
          {/* 当前局数 */}
          <div className="current-game-info">
            <span>当前局数: 第 {currentGameNumber} 局</span>
          </div>

          {/* 累积积分排名 */}
          <div className="cumulative-rankings">
            <h3>累积积分排名</h3>
            <table className="score-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>玩家</th>
                  <th>总分</th>
                  <th>局数</th>
                  <th>胜局</th>
                  <th>平均分</th>
                </tr>
              </thead>
              <tbody>
                {cumulativeScores.map((score, index) => (
                  <tr key={score.playerId} className={index < 3 ? `rank-${index + 1}` : ''}>
                    <td className="rank-cell">
                      {score.currentRank === 1 && '🥇'}
                      {score.currentRank === 2 && '🥈'}
                      {score.currentRank === 3 && '🥉'}
                      {score.currentRank > 3 && score.currentRank}
                    </td>
                    <td className="player-name">{score.playerName}</td>
                    <td className="total-score">{score.totalScore}</td>
                    <td>{score.gameCount}</td>
                    <td>{score.winCount}</td>
                    <td>{score.averageScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 每局分数详情 */}
          {gameRecords.length > 0 && (
            <div className="game-records">
              <h3>每局分数详情</h3>
              <div className="game-records-list">
                {gameRecords.map((record, index) => (
                  <div key={record.gameId} className="game-record-item">
                    <div className="game-record-header">
                      <span className="game-number">第 {record.gameNumber} 局</span>
                      <span className="game-time">
                        {new Date(record.startTime).toLocaleTimeString()} - {new Date(record.endTime).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="game-record-scores">
                      {Array.from(record.playerScores.entries()).map(([playerId, score]) => {
                        const player = players.find(p => p.id === playerId);
                        const isWinner = record.winner === playerId;
                        return (
                          <div 
                            key={playerId} 
                            className={`player-score ${isWinner ? 'winner' : ''}`}
                          >
                            <span className="player-name">{player?.name || `玩家${playerId}`}</span>
                            <span className="score">{score > 0 ? '+' : ''}{score}</span>
                            {isWinner && <span className="winner-badge">🏆</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameRecords.length === 0 && (
            <div className="no-records">
              <p>暂无游戏记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

