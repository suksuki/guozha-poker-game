/**
 * 训练配置面板组件
 * 显示训练模式下的配置界面
 */

import React, { useState } from 'react';

export interface TrainingConfig {
  gameCount: number;
  playerCount: number;
  mctIterations: number;
  mctsDepth: number;
  showProgress: boolean;
  autoTune?: boolean; // 训练完成后是否自动微调参数
  tuneGamesPerConfig?: number; // 微调时每个配置运行的游戏数
}

interface TrainingConfigPanelProps {
  config: TrainingConfig;
  onConfigChange: (config: TrainingConfig) => void;
  onStartTraining: () => void;
  onBack: () => void;
}

export const TrainingConfigPanel: React.FC<TrainingConfigPanelProps> = ({
  config,
  onConfigChange,
  onStartTraining,
  onBack
}) => {
  const [localConfig, setLocalConfig] = useState<TrainingConfig>(config);

  const updateConfig = (updates: Partial<TrainingConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="game-container">
      <div className="start-screen">
        <h1>🏋️ MCTS训练模式</h1>
        <div className="config-panel">
          <button className="btn-back" onClick={onBack} style={{ marginBottom: '20px' }}>
            ← 返回游戏模式
          </button>
          
          <div className="config-item">
            <label>模拟牌局数量:</label>
            <input
              type="number"
              min="10"
              max="10000"
              step="10"
              value={localConfig.gameCount}
              onChange={(e) => updateConfig({ gameCount: parseInt(e.target.value) || 1000 })}
            />
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              建议：100-1000局（测试），1000-10000局（正式训练）
            </small>
          </div>

          <div className="config-item">
            <label>玩家数量:</label>
            <input
              type="number"
              min="4"
              max="8"
              value={localConfig.playerCount}
              onChange={(e) => updateConfig({ playerCount: parseInt(e.target.value) || 4 })}
            />
          </div>

          <div className="config-item">
            <label>训练时MCTS迭代次数:</label>
            <input
              type="number"
              min="50"
              max="1000"
              step="50"
              value={localConfig.mctIterations}
              onChange={(e) => updateConfig({ mctIterations: parseInt(e.target.value) || 200 })}
            />
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              训练时使用更多迭代以获得更准确的结果（默认200，游戏时50）
            </small>
          </div>

          <div className="config-item">
            <label>训练时MCTS模拟深度:</label>
            <input
              type="number"
              min="20"
              max="100"
              step="10"
              value={localConfig.mctsDepth}
              onChange={(e) => updateConfig({ mctsDepth: parseInt(e.target.value) || 50 })}
            />
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              训练时使用更深的模拟以获得更准确的结果（默认50，游戏时20）
            </small>
          </div>

          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={localConfig.showProgress}
                onChange={(e) => updateConfig({ showProgress: e.target.checked })}
              />
              显示详细进度
            </label>
          </div>

          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={localConfig.autoTune || false}
                onChange={(e) => updateConfig({ autoTune: e.target.checked })}
              />
              训练完成后自动微调参数
            </label>
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              自动测试多个参数组合，找到最佳配置（会增加训练时间）
            </small>
          </div>

          {localConfig.autoTune && (
            <div className="config-item">
              <label>微调时每个配置的游戏数:</label>
              <input
                type="number"
                min="10"
                max="200"
                step="10"
                value={localConfig.tuneGamesPerConfig || 50}
                onChange={(e) => updateConfig({ tuneGamesPerConfig: parseInt(e.target.value) || 50 })}
              />
              <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
                每个参数配置运行的游戏数，越多越准确但越慢（建议：50-100）
              </small>
            </div>
          )}

          <div className="info-box" style={{
            padding: '15px',
            backgroundColor: '#f0f0f0',
            borderRadius: '5px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#666'
          }}>
            <strong>训练说明：</strong>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                  <li>训练将使用全信息模式（知道所有玩家手牌）</li>
                  <li>训练过程中会记录不同场景的最优决策</li>
                  <li>训练完成后会生成优化建议</li>
                  <li>训练进度会实时显示，可随时暂停或停止</li>
                  {localConfig.autoTune && (
                    <li style={{ color: '#2196F3', fontWeight: 'bold' }}>
                      训练完成后将自动微调参数，测试多个配置找到最佳参数
                    </li>
                  )}
                </ul>
          </div>

          <button 
            className="btn-primary" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('TrainingConfigPanel: 开始训练按钮被点击');
              onStartTraining();
            }}
            style={{ width: '100%', fontSize: '16px', padding: '12px', cursor: 'pointer' }}
            type="button"
          >
            🚀 开始训练
          </button>
        </div>
      </div>
    </div>
  );
};

