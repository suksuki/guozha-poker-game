/**
 * 游戏配置面板组件
 * 显示游戏开始前的配置界面
 * 重构版本：配置项分组，支持大模型选择
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameStartConfig, GameMode } from '../../hooks/useGameConfig';
import { getAvailableOllamaModels, checkOllamaService, filterChatModels } from '../../utils/llmModelService';
import { LLMChatStrategy } from '../../chat/strategy/LLMChatStrategy';
import { LLMChatConfig } from '../../config/chatConfig';
import './GameConfigPanel.css';

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
  llmModel?: string;
  llmApiUrl?: string;
  onPlayerCountChange: (count: number) => void;
  onHumanPlayerIndexChange: (index: number) => void;
  onStrategyChange: (strategy: 'aggressive' | 'conservative' | 'balanced') => void;
  onAlgorithmChange: (algorithm: 'simple' | 'mcts') => void;
  onDealingAlgorithmChange?: (algorithm: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered') => void;
  onSkipDealingAnimationChange?: (skip: boolean) => void;
  onDealingSpeedChange?: (speed: number) => void;
  onSortOrderChange?: (order: 'asc' | 'desc' | 'grouped') => void;
  onLlmModelChange?: (model: string) => void;
  onLlmApiUrlChange?: (url: string) => void;
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
  llmModel = 'qwen2:0.5b',
  llmApiUrl = 'http://localhost:11434/api/chat',
  onPlayerCountChange,
  onHumanPlayerIndexChange,
  onStrategyChange,
  onAlgorithmChange,
  onDealingAlgorithmChange,
  onSkipDealingAnimationChange,
  onDealingSpeedChange,
  onSortOrderChange,
  onLlmModelChange,
  onLlmApiUrlChange,
  onStartGame,
  onStartTraining
}) => {
  const { t } = useTranslation(['game', 'ui']);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  
  // 测试窗口状态
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // 加载可用模型列表
  useEffect(() => {
    const loadModels = async () => {
      setIsLoadingModels(true);
      const isAvailable = await checkOllamaService();
      setOllamaAvailable(isAvailable);
      
      if (isAvailable) {
        const models = await getAvailableOllamaModels();
        setAvailableModels(models);
        console.log('[GameConfigPanel] 可用模型:', models);
      }
      setIsLoadingModels(false);
    };
    
    loadModels();
  }, []);

  // 测试大模型
  const handleTestLLM = async () => {
    if (!testMessage.trim() || isTesting) return;
    
    setIsTesting(true);
    setTestError(null);
    setTestResponse(null);
    
    try {
      // 创建测试用的 LLM 配置
      const testConfig: LLMChatConfig = {
        provider: 'custom',
        apiUrl: llmApiUrl,
        model: llmModel,
        temperature: 0.8,
        maxTokens: 100,
        enableContext: false,
        enableHistory: false,
        timeout: 20000,
        systemPrompt: '你是一个友好的AI助手，简洁自然地回答问题。'
      };
      
      // 创建 LLM 策略实例
      const strategy = new LLMChatStrategy(testConfig);
      
      // 构建测试 prompt
      const prompt = `用户说：${testMessage.trim()}\n\n请简洁自然地回应（不超过20个字）：`;
      
      // 调用 LLM API（使用私有方法，需要类型断言）
      // @ts-ignore - 访问私有方法用于测试
      const response = await strategy.callLLMAPI(prompt, 1);
      
      if (response && response.trim()) {
        setTestResponse(response.trim());
      } else {
        setTestError('模型返回空响应，请检查模型是否正常工作');
      }
    } catch (error: any) {
      console.error('[GameConfigPanel] 测试LLM失败:', error);
      setTestError(error.message || '测试失败，请检查模型配置和网络连接');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="game-container">
      <div className="start-screen">
        <h1>{t('game:title')}</h1>
        
        {/* 模式选择器 */}
        {onModeChange && (
          <div className="mode-selector">
            <button
              className={`mode-button ${mode === 'game' ? 'active' : ''}`}
              onClick={() => onModeChange('game')}
            >
              {t('game:modes.game')}
            </button>
            <button
              className={`mode-button ${mode === 'training' ? 'active' : ''}`}
              onClick={() => onModeChange('training')}
            >
              {t('game:modes.training')}
            </button>
          </div>
        )}

        <div className="config-panel">
          {mode === 'game' ? (
            <>
              {/* 基础配置组 */}
              <div className="config-group">
                <h2 className="config-group-title">{t('ui:configGroups.basic')}</h2>
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
              </div>

              {/* AI配置组 */}
              <div className="config-group">
                <h2 className="config-group-title">{t('ui:configGroups.ai')}</h2>
                <div className="config-item">
                  <label>{t('ui:config.aiAlgorithm')}</label>
                  <select value={algorithm} onChange={(e) => onAlgorithmChange(e.target.value as any)}>
                    <option value="mcts">{t('ui:algorithms.mcts')}</option>
                    <option value="simple">{t('ui:algorithms.simple')}</option>
                  </select>
                  <small>{t('ui:algorithmHints.mcts')}</small>
                </div>
                <div className="config-item">
                  <label>{t('ui:config.aiStrategy')}</label>
                  <select value={strategy} onChange={(e) => onStrategyChange(e.target.value as any)}>
                    <option value="balanced">{t('ui:strategies.balanced')}</option>
                    <option value="aggressive">{t('ui:strategies.aggressive')}</option>
                    <option value="conservative">{t('ui:strategies.conservative')}</option>
                  </select>
                  <small>{t('ui:algorithmHints.simple')}</small>
                </div>
              </div>

              {/* 聊天配置组 */}
              <div className="config-group">
                <h2 className="config-group-title">{t('ui:configGroups.chat')}</h2>
                <div className="config-item">
                  <label>
                    {t('ui:llm.service')}
                    <button
                      type="button"
                      className="refresh-models-btn"
                      onClick={async () => {
                        setIsLoadingModels(true);
                        const isAvailable = await checkOllamaService();
                        setOllamaAvailable(isAvailable);
                        if (isAvailable) {
                          const models = await getAvailableOllamaModels();
                          setAvailableModels(models);
                          console.log('[GameConfigPanel] 刷新模型列表:', models);
                        }
                        setIsLoadingModels(false);
                      }}
                      disabled={isLoadingModels}
                      title={t('ui:llm.refreshModels')}
                    >
                      🔄
                    </button>
                  </label>
                  <div className="llm-status">
                    {isLoadingModels ? (
                      <span className="status-loading">{t('ui:llm.checking')}</span>
                    ) : ollamaAvailable ? (
                      <span className="status-available">{t('ui:llm.connected')}</span>
                    ) : (
                      <span className="status-unavailable">{t('ui:llm.disconnected')}</span>
                    )}
                  </div>
                </div>
                {onLlmModelChange && (
                  <div className="config-item">
                    <label>{t('ui:llm.model')}</label>
                    {isLoadingModels ? (
                      <select disabled>
                        <option>{t('ui:llm.loading')}</option>
                      </select>
                    ) : availableModels.length > 0 ? (
                      <>
                        <select 
                          value={llmModel} 
                          onChange={(e) => onLlmModelChange(e.target.value)}
                        >
                          {availableModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                          ))}
                        </select>
                        <small>
                          <strong>{t('ui:llm.currentSelection')}</strong> {llmModel} | 
                          {t('ui:llm.availableModels', { count: availableModels.length })}
                          {filterChatModels(availableModels).length > 0 && (
                            <span className="chat-models-hint">
                              {t('ui:llm.recommendedModels', { models: filterChatModels(availableModels).join(', ') })}
                            </span>
                          )}
                        </small>
                        <div className="available-models-list">
                          <strong>{t('ui:llm.allAvailableModels')}</strong>
                          <div className="models-tags">
                            {availableModels.map(model => (
                              <span
                                key={model}
                                className={`model-tag ${model === llmModel ? 'selected' : ''}`}
                                onClick={() => onLlmModelChange(model)}
                                title={t('ui:llm.clickToSelect')}
                              >
                                {model}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={llmModel}
                          onChange={(e) => onLlmModelChange(e.target.value)}
                          placeholder={t('ui:llm.enterModelName')}
                        />
                        <small>{t('ui:llm.cannotGetModels', { model: llmModel })}</small>
                      </>
                    )}
                  </div>
                )}
                {onLlmApiUrlChange && (
                  <div className="config-item">
                    <label>{t('ui:llm.apiUrl')}</label>
                    <input
                      type="text"
                      value={llmApiUrl}
                      onChange={(e) => onLlmApiUrlChange(e.target.value)}
                      placeholder="http://localhost:11434/api/chat"
                    />
                    <small>{t('ui:llm.apiUrlHint')}</small>
                  </div>
                )}
                
                {/* 测试窗口 */}
                <div className="llm-test-window">
                  <h3 className="test-window-title">{t('ui:llm.test.title')}</h3>
                  <div className="test-input-group">
                    <input
                      type="text"
                      className="test-input"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !isTesting && testMessage.trim()) {
                          handleTestLLM();
                        }
                      }}
                      placeholder={t('ui:llm.test.inputPlaceholder')}
                      disabled={isTesting}
                    />
                    <button
                      className="test-send-btn"
                      onClick={handleTestLLM}
                      disabled={isTesting || !testMessage.trim() || !ollamaAvailable}
                      title={!ollamaAvailable ? t('ui:llm.test.connectFirst') : t('ui:llm.test.sendMessage')}
                    >
                      {isTesting ? t('ui:llm.test.testing') : t('ui:llm.test.send')}
                    </button>
                  </div>
                  {testError && (
                    <div className="test-error">
                      {t('ui:llm.test.error')} {testError}
                    </div>
                  )}
                  {testResponse && (
                    <div className="test-response">
                      <strong>{t('ui:llm.test.response')}</strong>
                      <div className="test-response-content">{testResponse}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* 发牌配置组 */}
              <div className="config-group">
                <h2 className="config-group-title">{t('ui:configGroups.dealing')}</h2>
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
                    <small>{t('ui:dealingAlgorithmHint')}</small>
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
                    <small>{t('ui:skipDealingAnimationHint')}</small>
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
                    <small>{t('ui:dealingSpeedHint')}</small>
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
                    <small>{t('ui:sortOrderHint')}</small>
                  </div>
                )}
              </div>

              <button className="btn-primary" onClick={onStartGame}>
                {t('game:actions.startGame')}
              </button>
            </>
          ) : (
            <>
              {/* 训练模式提示 */}
              <div className="info-box">
                <strong>{t('ui:training.title')}</strong>
                <p>{t('ui:training.description')}</p>
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
