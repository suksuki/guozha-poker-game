/**
 * 数据中心组件
 * 显示和管理游戏会话、训练数据
 */

import React, { useState, useEffect } from 'react';
import { getInteractionService } from '../../services/ai/control/interaction/InteractionService';
import { GameSession } from '../../services/ai/control/data/PlayerActionTracker';
import './DataCenter.css';

export const DataCenter: React.FC = () => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const interactionService = getInteractionService();
  
  // 加载游戏会话
  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const gameSessions = await interactionService.getGameSessions({ limit: 50 });
      setSessions(gameSessions);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };
  
  // 生成训练数据
  const handleGenerateTrainingData = async (sessionIds: string[], format: 'json' | 'csv' | 'jsonl') => {
    setIsGenerating(true);
    try {
      const data = await interactionService.generateTrainingData(sessionIds, format);
      
      // 创建下载链接
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-data-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert('训练数据已生成并下载');
    } catch (error) {
      alert('生成训练数据失败');
    } finally {
      setIsGenerating(false);
    }
  };
  
  useEffect(() => {
    loadSessions();
  }, []);
  
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };
  
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };
  
  return (
    <div className="data-center">
      <div className="data-header">
        <h3>数据中心</h3>
        <div className="data-actions">
          <button onClick={loadSessions} disabled={isLoading}>
            {isLoading ? '加载中...' : '刷新'}
          </button>
          <button
            onClick={() => {
              if (sessions.length > 0) {
                handleGenerateTrainingData(sessions.map(s => s.id), 'json');
              }
            }}
            disabled={isGenerating || sessions.length === 0}
          >
            {isGenerating ? '生成中...' : '生成训练数据'}
          </button>
        </div>
      </div>
      
      <div className="data-stats">
        <div className="stat-card">
          <div className="stat-label">总游戏会话</div>
          <div className="stat-value">{sessions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">总操作数</div>
          <div className="stat-value">
            {sessions.reduce((sum, s) => sum + s.actions.length, 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">总回合数</div>
          <div className="stat-value">
            {sessions.reduce((sum, s) => sum + s.rounds.length, 0)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">教学价值会话</div>
          <div className="stat-value">
            {sessions.filter(s => s.tutorialValue && s.tutorialValue.score >= 60).length}
          </div>
        </div>
      </div>
      
      <div className="data-content">
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <p>暂无游戏会话</p>
              <p className="empty-hint">开始游戏后，会话数据将自动收集</p>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`session-card ${selectedSession?.id === session.id ? 'selected' : ''}`}
                onClick={() => setSelectedSession(session)}
              >
                <div className="session-header">
                  <span className="session-id">游戏 #{session.id.slice(-8)}</span>
                  {session.tutorialValue && (
                    <span className="tutorial-badge">
                      ⭐ {session.tutorialValue.score}分
                    </span>
                  )}
                </div>
                <div className="session-info">
                  <div className="info-item">
                    <span className="info-label">时间:</span>
                    <span>{formatDate(session.startTime)} - {formatDate(session.endTime)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">时长:</span>
                    <span>{formatDuration(session.duration)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">玩家:</span>
                    <span>{session.config.playerCount}人 ({session.players.filter(p => p.type === 'human').length}人类 + {session.players.filter(p => p.type === 'ai').length}AI)</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">操作数:</span>
                    <span>{session.actions.length}次</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">回合数:</span>
                    <span>{session.rounds.length}轮</span>
                  </div>
                  {session.result && (
                    <div className="info-item">
                      <span className="info-label">获胜者:</span>
                      <span>{session.result.winnerName}</span>
                    </div>
                  )}
                </div>
                {session.tutorialValue && session.tutorialValue.tags.length > 0 && (
                  <div className="session-tags">
                    {session.tutorialValue.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="session-actions">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSession(session);
                  }}>查看详情</button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    handleGenerateTrainingData([session.id], 'json');
                  }}>生成训练数据</button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    // 导出会话
                    const data = JSON.stringify(session, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `session-${session.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>导出</button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {selectedSession && (
          <div className="session-detail">
            <h4>会话详情</h4>
            <div className="detail-section">
              <h5>基本信息</h5>
              <div className="detail-item">
                <span className="detail-label">游戏ID:</span>
                <span>{selectedSession.id}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">开始时间:</span>
                <span>{formatDate(selectedSession.startTime)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">结束时间:</span>
                <span>{formatDate(selectedSession.endTime)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">持续时间:</span>
                <span>{formatDuration(selectedSession.duration)}</span>
              </div>
            </div>
            
            <div className="detail-section">
              <h5>玩家信息</h5>
              {selectedSession.players.map(player => (
                <div key={player.id} className="player-info">
                  <span>{player.name}</span>
                  <span className="player-type">{player.type === 'human' ? '人类' : 'AI'}</span>
                  <span>得分: {player.score}</span>
                  <span>排名: {player.rank}</span>
                </div>
              ))}
            </div>
            
            {selectedSession.result && (
              <div className="detail-section">
                <h5>游戏结果</h5>
                <div className="detail-item">
                  <span className="detail-label">获胜者:</span>
                  <span>{selectedSession.result.winnerName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">最终得分:</span>
                  <div className="scores-list">
                    {selectedSession.result.finalRankings.map(ranking => (
                      <div key={ranking.playerId} className="score-item">
                        {ranking.playerName}: {ranking.score}分 (第{ranking.rank}名)
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {selectedSession.tutorialValue && (
              <div className="detail-section">
                <h5>教学价值</h5>
                <div className="detail-item">
                  <span className="detail-label">评分:</span>
                  <span>⭐ {selectedSession.tutorialValue.score}分</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">原因:</span>
                  <ul>
                    {selectedSession.tutorialValue.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
                <div className="detail-item">
                  <span className="detail-label">标签:</span>
                  <div className="tags-list">
                    {selectedSession.tutorialValue.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="detail-actions">
              <button
                onClick={() => handleGenerateTrainingData([selectedSession.id], 'json')}
                disabled={isGenerating}
              >
                {isGenerating ? '生成中...' : '生成训练数据 (JSON)'}
              </button>
              <button
                onClick={() => handleGenerateTrainingData([selectedSession.id], 'csv')}
                disabled={isGenerating}
              >
                {isGenerating ? '生成中...' : '生成训练数据 (CSV)'}
              </button>
              <button
                onClick={() => handleGenerateTrainingData([selectedSession.id], 'jsonl')}
                disabled={isGenerating}
              >
                {isGenerating ? '生成中...' : '生成训练数据 (JSONL)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

