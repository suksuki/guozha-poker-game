/**
 * 游戏配置面板组件
 * 显示游戏开始前的配置界面
 */

import React from 'react';
import { GameStartConfig, GameMode } from '../../hooks/useGameConfig';

export type { GameMode };

interface GameConfigPanelProps {
  mode?: GameMode;
  onModeChange?: (mode: GameMode) => void;
  playerCount: number;
  humanPlayerIndex: number;
  strategy: 'aggressive' | 'conservative' | 'balanced';
  algorithm: 'simple' | 'mcts';
  onPlayerCountChange: (count: number) => void;
  onHumanPlayerIndexChange: (index: number) => void;
  onStrategyChange: (strategy: 'aggressive' | 'conservative' | 'balanced') => void;
  onAlgorithmChange: (algorithm: 'simple' | 'mcts') => void;
  onStartGame: () => void;
  onStartTraining?: () => void;
}

export const GameConfigPanel: React.FC<GameConfigPanelProps> = ({
  mode = 'game',
  onModeChange,
  playerCount,
  humanPlayerIndex,
  strategy,
  algorithm,
  onPlayerCountChange,
  onHumanPlayerIndexChange,
  onStrategyChange,
  onAlgorithmChange,
  onStartGame,
  onStartTraining
}) => {

  return (
    <div className="game-container">
      <div className="start-screen">
        <h1>过炸扑克游戏（多人版）</h1>
        
        {/* 模式选择器 */}
        {onModeChange && (
          <div className="mode-selector" style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            justifyContent: 'center'
          }}>
            <button
              className={`mode-button ${mode === 'game' ? 'active' : ''}`}
              onClick={() => onModeChange('game')}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                border: '2px solid #4CAF50',
                borderRadius: '5px',
                backgroundColor: mode === 'game' ? '#4CAF50' : 'transparent',
                color: mode === 'game' ? 'white' : '#4CAF50',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              🎮 游戏模式
            </button>
            <button
              className={`mode-button ${mode === 'training' ? 'active' : ''}`}
              onClick={() => onModeChange('training')}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                border: '2px solid #2196F3',
                borderRadius: '5px',
                backgroundColor: mode === 'training' ? '#2196F3' : 'transparent',
                color: mode === 'training' ? 'white' : '#2196F3',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              🏋️ 训练模式
            </button>
          </div>
        )}

        <div className="config-panel">
          {mode === 'game' ? (
            <>
              {/* 游戏模式配置 */}
          <div className="config-item">
            <label>玩家数量 (4-8人):</label>
            <input
              type="number"
              min="4"
              max="8"
              value={playerCount}
              onChange={(e) => onPlayerCountChange(parseInt(e.target.value) || 4)}
            />
          </div>
          <div className="config-item">
            <label>你的位置:</label>
            <select 
              value={humanPlayerIndex} 
              onChange={(e) => onHumanPlayerIndexChange(parseInt(e.target.value))}
            >
              {Array.from({ length: playerCount }, (_, i) => (
                <option key={i} value={i}>玩家{i + 1}</option>
              ))}
            </select>
          </div>
          <div className="config-item">
            <label>AI算法:</label>
            <select value={algorithm} onChange={(e) => onAlgorithmChange(e.target.value as any)}>
              <option value="mcts">MCTS蒙特卡洛树搜索（推荐）</option>
              <option value="simple">智能策略算法</option>
            </select>
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              MCTS更智能但较慢，如果觉得慢请选择"智能策略算法"（快速模式）
            </small>
          </div>
          <div className="config-item">
            <label>AI策略:</label>
            <select value={strategy} onChange={(e) => onStrategyChange(e.target.value as any)}>
              <option value="balanced">平衡</option>
              <option value="aggressive">激进</option>
              <option value="conservative">保守</option>
            </select>
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              策略仅影响简单算法，MCTS会自动学习最优策略
            </small>
          </div>
              <button className="btn-primary" onClick={onStartGame}>
                开始游戏
              </button>
            </>
          ) : (
            <>
              {/* 训练模式提示 */}
              <div className="info-box" style={{
                padding: '15px',
                backgroundColor: '#e3f2fd',
                borderRadius: '5px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#1976d2'
              }}>
                <strong>训练模式</strong>
                <p style={{ margin: '10px 0 0 0' }}>
                  点击下方按钮进入训练配置面板，设置训练参数并开始训练。
                </p>
              </div>
              {onStartTraining && (
                <button className="btn-primary" onClick={onStartTraining}>
                  🚀 进入训练配置
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

