/**
 * 游戏配置面板组件
 * 显示游戏开始前的配置界面
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { GameStartConfig, GameMode } from '../../hooks/useGameConfig';

export type { GameMode };

interface GameConfigPanelProps {
  mode?: GameMode;
  onModeChange?: (mode: GameMode) => void;
  playerCount: number;
  humanPlayerIndex: number;
  strategy: 'aggressive' | 'conservative' | 'balanced';
  algorithm: 'simple' | 'mcts';
  dealingAlgorithm?: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered';
  skipDealingAnimation?: boolean;
  dealingSpeed?: number;
  sortOrder?: 'asc' | 'desc' | 'grouped';
  onPlayerCountChange: (count: number) => void;
  onHumanPlayerIndexChange: (index: number) => void;
  onStrategyChange: (strategy: 'aggressive' | 'conservative' | 'balanced') => void;
  onAlgorithmChange: (algorithm: 'simple' | 'mcts') => void;
  onDealingAlgorithmChange?: (algorithm: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered') => void;
  onSkipDealingAnimationChange?: (skip: boolean) => void;
  onDealingSpeedChange?: (speed: number) => void;
  onSortOrderChange?: (order: 'asc' | 'desc' | 'grouped') => void;
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
  dealingAlgorithm = 'random',
  skipDealingAnimation = false,
  dealingSpeed = 150,
  sortOrder = 'grouped',
  onPlayerCountChange,
  onHumanPlayerIndexChange,
  onStrategyChange,
  onAlgorithmChange,
  onDealingAlgorithmChange,
  onSkipDealingAnimationChange,
  onDealingSpeedChange,
  onSortOrderChange,
  onStartGame,
  onStartTraining
}) => {
  const { t } = useTranslation(['game', 'ui']);

  return (
    <div className="game-container">
      <div className="start-screen">
        <h1>{t('game:title')}</h1>
        
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
              {t('game:modes.game')}
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
              {t('game:modes.training')}
            </button>
          </div>
        )}

        <div className="config-panel">
          {mode === 'game' ? (
            <>
              {/* 游戏模式配置 */}
          <div className="config-item">
            <label>{t('ui:config.playerCount')}</label>
            <input
              type="number"
              min="4"
              max="8"
              value={playerCount}
              onChange={(e) => onPlayerCountChange(parseInt(e.target.value) || 4)}
            />
          </div>
          <div className="config-item">
            <label>{t('ui:config.yourPosition')}</label>
            <select 
              value={humanPlayerIndex} 
              onChange={(e) => onHumanPlayerIndexChange(parseInt(e.target.value))}
            >
              {Array.from({ length: playerCount }, (_, i) => (
                <option key={i} value={i}>{t('ui:config.player', { index: i + 1 })}</option>
              ))}
            </select>
          </div>
          <div className="config-item">
            <label>{t('ui:config.aiAlgorithm')}</label>
            <select value={algorithm} onChange={(e) => onAlgorithmChange(e.target.value as any)}>
              <option value="mcts">{t('ui:algorithms.mcts')}</option>
              <option value="simple">{t('ui:algorithms.simple')}</option>
            </select>
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              {t('ui:algorithmHints.mcts')}
            </small>
          </div>
          <div className="config-item">
            <label>{t('ui:config.aiStrategy')}</label>
            <select value={strategy} onChange={(e) => onStrategyChange(e.target.value as any)}>
              <option value="balanced">{t('ui:strategies.balanced')}</option>
              <option value="aggressive">{t('ui:strategies.aggressive')}</option>
              <option value="conservative">{t('ui:strategies.conservative')}</option>
            </select>
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              {t('ui:algorithmHints.simple')}
            </small>
          </div>
          {onDealingAlgorithmChange && (
            <div className="config-item">
              <label>{t('ui:config.dealingAlgorithm')}</label>
              <select 
                value={dealingAlgorithm} 
                onChange={(e) => onDealingAlgorithmChange(e.target.value as any)}
              >
                <option value="random">{t('ui:dealingAlgorithms.random')}</option>
                <option value="fair">{t('ui:dealingAlgorithms.fair')}</option>
                <option value="favor-human">{t('ui:dealingAlgorithms.favorHuman')}</option>
                <option value="favor-ai">{t('ui:dealingAlgorithms.favorAi')}</option>
                <option value="balanced-score">{t('ui:dealingAlgorithms.balancedScore')}</option>
                <option value="clustered">{t('ui:dealingAlgorithms.clustered')}</option>
              </select>
              <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
                {t('ui:dealingAlgorithmHint')}
              </small>
            </div>
          )}
          {onSkipDealingAnimationChange && (
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={skipDealingAnimation}
                  onChange={(e) => onSkipDealingAnimationChange(e.target.checked)}
                />
                {t('ui:config.skipDealingAnimation')}
              </label>
              <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
                {t('ui:skipDealingAnimationHint')}
              </small>
            </div>
          )}
          {onDealingSpeedChange && (
            <div className="config-item">
              <label>{t('ui:config.dealingSpeed')}</label>
              <select 
                value={dealingSpeed} 
                onChange={(e) => onDealingSpeedChange(parseInt(e.target.value))}
              >
                <option value={50}>{t('ui:dealingSpeeds.fast')}</option>
                <option value={150}>{t('ui:dealingSpeeds.normal')}</option>
                <option value={300}>{t('ui:dealingSpeeds.slow')}</option>
                <option value={500}>{t('ui:dealingSpeeds.verySlow')}</option>
              </select>
              <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
                {t('ui:dealingSpeedHint')}
              </small>
            </div>
          )}
          {onSortOrderChange && (
            <div className="config-item">
              <label>{t('ui:config.sortOrder')}</label>
              <select 
                value={sortOrder} 
                onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc' | 'grouped')}
              >
                <option value="grouped">{t('ui:sortOrders.grouped')}</option>
                <option value="asc">{t('ui:sortOrders.asc')}</option>
                <option value="desc">{t('ui:sortOrders.desc')}</option>
              </select>
              <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
                {t('ui:sortOrderHint')}
              </small>
            </div>
          )}
              <button className="btn-primary" onClick={onStartGame}>
                {t('game:actions.startGame')}
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
                <strong>{t('ui:training.title')}</strong>
                <p style={{ margin: '10px 0 0 0' }}>
                  {t('ui:training.description')}
                </p>
              </div>
              {onStartTraining && (
                <button className="btn-primary" onClick={onStartTraining}>
                  {t('ui:training.enterConfig')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

