/**
 * 训练配置面板组件
 * 显示训练模式下的配置界面
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['ui']);
  const [localConfig, setLocalConfig] = useState<TrainingConfig>(config);

  const updateConfig = (updates: Partial<TrainingConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <div className="game-container">
      <div className="start-screen">
        <h1>{t('ui:training.mctsTraining')}</h1>
        <div className="config-panel">
          <button className="btn-back" onClick={onBack} style={{ marginBottom: '20px' }}>
            {t('ui:training.backToGame')}
          </button>
          
          <div className="config-item">
            <label>{t('ui:training.simulationCount')}</label>
            <input
              type="number"
              min="10"
              max="10000"
              step="10"
              value={localConfig.gameCount}
              onChange={(e) => updateConfig({ gameCount: parseInt(e.target.value) || 1000 })}
            />
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              {t('ui:training.simulationCountHint')}
            </small>
          </div>

          <div className="config-item">
            <label>{t('ui:config.playerCount')}</label>
            <input
              type="number"
              min="4"
              max="8"
              value={localConfig.playerCount}
              onChange={(e) => updateConfig({ playerCount: parseInt(e.target.value) || 4 })}
            />
          </div>

          <div className="config-item">
            <label>{t('ui:training.mctsIterations')}</label>
            <input
              type="number"
              min="50"
              max="1000"
              step="50"
              value={localConfig.mctIterations}
              onChange={(e) => updateConfig({ mctIterations: parseInt(e.target.value) || 200 })}
            />
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              {t('ui:training.mctsIterationsHint')}
            </small>
          </div>

          <div className="config-item">
            <label>{t('ui:training.mctsDepth')}</label>
            <input
              type="number"
              min="20"
              max="100"
              step="10"
              value={localConfig.mctsDepth}
              onChange={(e) => updateConfig({ mctsDepth: parseInt(e.target.value) || 50 })}
            />
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              {t('ui:training.mctsDepthHint')}
            </small>
          </div>

          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={localConfig.showProgress}
                onChange={(e) => updateConfig({ showProgress: e.target.checked })}
              />
              {t('ui:training.showProgress')}
            </label>
          </div>

          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={localConfig.autoTune || false}
                onChange={(e) => updateConfig({ autoTune: e.target.checked })}
              />
              {t('ui:training.autoTune')}
            </label>
            <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
              {t('ui:training.autoTuneHint')}
            </small>
          </div>

          {localConfig.autoTune && (
            <div className="config-item">
              <label>{t('ui:training.tuneGamesPerConfig')}</label>
              <input
                type="number"
                min="10"
                max="200"
                step="10"
                value={localConfig.tuneGamesPerConfig || 50}
                onChange={(e) => updateConfig({ tuneGamesPerConfig: parseInt(e.target.value) || 50 })}
              />
              <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
                {t('ui:training.tuneGamesPerConfigHint')}
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
            <strong>{t('ui:training.instructions.title')}</strong>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                  <li>{t('ui:training.instructions.item1')}</li>
                  <li>{t('ui:training.instructions.item2')}</li>
                  <li>{t('ui:training.instructions.item3')}</li>
                  <li>{t('ui:training.instructions.item4')}</li>
                  {localConfig.autoTune && (
                    <li style={{ color: '#2196F3', fontWeight: 'bold' }}>
                      {t('ui:training.instructions.item5')}
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
            {t('ui:training.startTraining')}
          </button>
        </div>
      </div>
    </div>
  );
};

