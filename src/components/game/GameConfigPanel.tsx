/**
 * 游戏配置面板组件
 * 显示游戏开始前的配置界面
 * 重构版本：配置项分组，支持大模型选择
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GameMode } from '../../hooks/useGameConfig';
import { getAvailableOllamaModels, checkOllamaService, filterChatModels } from '../../utils/llmModelService';
import { LLMChatStrategy } from '../../chat/strategy/LLMChatStrategy';
import { LLMChatConfig } from '../../config/chatConfig';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import { ConfigGroupModal } from './ConfigGroupModal';
import { ServerSelector } from '../llm/ServerSelector';
import { OllamaServerConfig } from '../../services/llm/OllamaServerManager';
import { LLMAvailability } from '../../services/llm/LLMAvailabilityManager';
import './GameConfigPanel.css';

export type { GameMode };

interface GameConfigPanelProps {
  mode?: GameMode;
  onModeChange?: (mode: GameMode) => void;
  playerCount: number;
  humanPlayerIndex: number;
  strategy: 'aggressive' | 'conservative' | 'balanced';
  algorithm: 'simple' | 'mcts';
  dealingAlgorithm?: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered' | 'bomb-friendly' | 'monte-carlo';
  skipDealingAnimation?: boolean;
  dealingSpeed?: number;
  sortOrder?: 'asc' | 'desc' | 'grouped';
  llmModel?: string;
  llmApiUrl?: string;
  llmEnabled?: boolean;
  llmAvailability?: LLMAvailability;
  currentServer?: OllamaServerConfig;
  allServers?: OllamaServerConfig[];
  recentServers?: OllamaServerConfig[];
  ideaGenerationEnabled?: boolean;
  cardTrackerEnabled?: boolean;
  cardTrackerPanelVisible?: boolean;
  playTimeout?: number;
  announcementDelay?: number;
  teamMode?: boolean;
  onTeamModeChange?: (enabled: boolean) => void;
  onPlayerCountChange: (count: number) => void;
  onHumanPlayerIndexChange: (index: number) => void;
  onStrategyChange: (strategy: 'aggressive' | 'conservative' | 'balanced') => void;
  onAlgorithmChange: (algorithm: 'simple' | 'mcts') => void;
  onDealingAlgorithmChange?: (algorithm: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered' | 'bomb-friendly' | 'monte-carlo') => void;
  onSkipDealingAnimationChange?: (skip: boolean) => void;
  onDealingSpeedChange?: (speed: number) => void;
  onSortOrderChange?: (order: 'asc' | 'desc' | 'grouped') => void;
  onLlmModelChange?: (model: string) => void;
  onLlmApiUrlChange?: (url: string) => void;
  onLlmEnabledChange?: (enabled: boolean) => void;
  onServerChange?: (serverId: string) => void;
  onAddServer?: (config: Partial<OllamaServerConfig>) => void;
  onRemoveServer?: (serverId: string) => void;
  onToggleServerFavorite?: (serverId: string) => void;
  onCheckServer?: (server: OllamaServerConfig) => Promise<boolean>;
  onRefreshModels?: () => Promise<void>;
  onIdeaGenerationEnabledChange?: (enabled: boolean) => void;
  onCardTrackerEnabledChange?: (enabled: boolean) => void;
  onCardTrackerPanelVisibleChange?: (visible: boolean) => void;
  onPlayTimeoutChange?: (timeout: number) => void;
  onAnnouncementDelayChange?: (delay: number) => void;
  onStartGame: () => void;
  onStartTraining?: () => void;
}

// 系统配置部分组件 - 卡片
const SystemConfigSectionCard: React.FC<{ onOpenModal: (e: React.MouseEvent) => void }> = ({ onOpenModal }) => {
  const {
    validationEnabled,
    validateOnRoundEnd,
    validateOnGameEnd,
    detectDuplicates,
    isReady,
    isLoading,
  } = useSystemConfig();

  if (isLoading || !isReady) {
    return null;
  }

  const enabledCount = [
    validationEnabled,
    validateOnRoundEnd,
    validateOnGameEnd,
    detectDuplicates
  ].filter(Boolean).length;

  return (
    <div 
      className="config-group clickable"
      onClick={onOpenModal}
    >
      <h2 className="config-group-title">系统设置</h2>
      <div className="config-group-summary">
        <div className="config-group-summary-item">
          <span className="config-group-summary-icon">⚙️</span>
          <span className="config-group-summary-text">验证模块: {validationEnabled ? '已启用' : '未启用'}</span>
        </div>
        <div className="config-group-summary-item">
          <span className="config-group-summary-icon">✓</span>
          <span className="config-group-summary-text">已启用 {enabledCount} 项配置</span>
        </div>
      </div>
      <div className="config-group-hint">点击查看详细设置</div>
    </div>
  );
};

// 系统配置部分组件 - 详细内容
const SystemConfigSection: React.FC = () => {
  const {
    validationEnabled,
    validateOnRoundEnd,
    validateOnGameEnd,
    detectDuplicates,
    setValidationEnabled,
    setValidateOnRoundEnd,
    setValidateOnGameEnd,
    setDetectDuplicates,
    isReady,
    isLoading,
  } = useSystemConfig();

  if (isLoading || !isReady) {
    return null;
  }

  return (
    <div className="config-group">
      <h2 className="config-group-title">系统设置</h2>
      <div className="config-item">
        <label>
          <input
            type="checkbox"
            checked={validationEnabled}
            onChange={(e) => setValidationEnabled(e.target.checked)}
          />
          启用验证模块
        </label>
        <small>自动检测牌数完整性和分数完整性（推荐开启）</small>
      </div>
      {validationEnabled && (
        <>
          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={validateOnRoundEnd}
                onChange={(e) => setValidateOnRoundEnd(e.target.checked)}
              />
              轮次结束时验证
            </label>
            <small>每轮结束后自动验证牌数完整性</small>
          </div>
          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={validateOnGameEnd}
                onChange={(e) => setValidateOnGameEnd(e.target.checked)}
              />
              游戏结束时验证
            </label>
            <small>游戏结束后自动验证牌数和分数完整性</small>
          </div>
          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={detectDuplicates}
                onChange={(e) => setDetectDuplicates(e.target.checked)}
              />
              检测重复牌
            </label>
            <small>检测是否有重复的牌（多副牌模式下）</small>
          </div>
        </>
      )}
    </div>
  );
};

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
  llmEnabled = true,
  llmAvailability = 'unknown',
  currentServer,
  allServers = [],
  recentServers = [],
  ideaGenerationEnabled = true,
  cardTrackerEnabled = false,
  cardTrackerPanelVisible = false,
  playTimeout = 30000,
  announcementDelay = 1000,
  teamMode = false,
  onTeamModeChange,
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
  onLlmEnabledChange,
  onServerChange,
  onAddServer,
  onRemoveServer,
  onToggleServerFavorite,
  onCheckServer,
  onRefreshModels,
  onIdeaGenerationEnabledChange,
  onCardTrackerEnabledChange,
  onCardTrackerPanelVisibleChange,
  onPlayTimeoutChange,
  onAnnouncementDelayChange,
  onStartGame,
  onStartTraining
}) => {
  const { t } = useTranslation(['game', 'ui']);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // 测试窗口状态
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // 模态面板状态
  const [openModal, setOpenModal] = useState<string | null>(null);

  // 关闭模态面板
  const closeModal = () => setOpenModal(null);

  // 打开模态面板
  const openModalFor = (groupKey: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenModal(groupKey);
  };

  // 阻止事件冒泡
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 加载可用模型列表（从当前服务器）
  useEffect(() => {
    const loadModels = async () => {
      if (!currentServer || !llmEnabled || llmAvailability !== 'available') {
        setAvailableModels([]);
        return;
      }
      
      setIsLoadingModels(true);
      const serverUrl = `${currentServer.protocol}://${currentServer.host}:${currentServer.port}`;
      const models = await getAvailableOllamaModels(serverUrl);
      setAvailableModels(models);
      setIsLoadingModels(false);
    };
    
    loadModels();
  }, [currentServer, llmEnabled, llmAvailability]);
  
  // 刷新模型列表
  const handleRefreshModels = async () => {
    if (onRefreshModels) {
      await onRefreshModels();
    }
  };

  // 测试大模型
  const handleTestLLM = async () => {
    if (!testMessage.trim() || isTesting) return;
    
    setIsTesting(true);
    setTestError(null);
    setTestResponse(null);
    
    try {
      // 直接调用 Ollama API 进行测试（绕过策略层）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const messages = [
        { role: 'system', content: '你是一个友好的AI助手，简洁自然地回答问题。' },
        { role: 'user', content: testMessage.trim() }
      ];
      
      const requestBody = {
        model: llmModel,
        messages: messages,
        stream: false
      };
      
      const startTime = Date.now();
      const response = await fetch(llmApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      // 解析响应（支持 Ollama 原生格式和 OpenAI 兼容格式）
      const content = data.message?.content || 
                     data.choices?.[0]?.message?.content ||
                     data.content || 
                     data.text || 
                     data.response ||
                     '';
      
      if (content && content.trim()) {
        setTestResponse(`${content.trim()} (耗时: ${latency}ms)`);
      } else {
        setTestError('模型返回空响应，请检查模型是否正常工作');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setTestError('请求超时，请检查服务器连接');
      } else if (error.message.includes('Failed to fetch')) {
        setTestError(`无法连接到服务器: ${llmApiUrl}`);
      } else {
        setTestError(error.message || '测试失败，请检查模型配置和网络连接');
      }
      console.error('LLM test error:', error);
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
              {/* 基础配置组 - 卡片 */}
              <div 
                className="config-group clickable"
                onClick={openModalFor('basic')}
              >
                <h2 className="config-group-title">{t('ui:configGroups.basic')}</h2>
                <div className="config-group-summary">
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">👥</span>
                    <span className="config-group-summary-text">{t('ui:config.playerCount')}: {playerCount}</span>
                  </div>
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">📍</span>
                    <span className="config-group-summary-text">{t('ui:config.yourPosition')}: {t('ui:config.player', { index: humanPlayerIndex + 1 })}</span>
                  </div>
                </div>
                <div className="config-group-hint">点击查看详细设置</div>
              </div>

              {/* AI配置组 - 卡片 */}
              <div 
                className="config-group clickable"
                onClick={openModalFor('ai')}
              >
                <h2 className="config-group-title">{t('ui:configGroups.ai')}</h2>
                <div className="config-group-summary">
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">🤖</span>
                    <span className="config-group-summary-text">{t('ui:config.aiAlgorithm')}: {algorithm === 'mcts' ? t('ui:algorithms.mcts') : t('ui:algorithms.simple')}</span>
                  </div>
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">🎯</span>
                    <span className="config-group-summary-text">{t('ui:config.aiStrategy')}: {t(`ui:strategies.${strategy}`)}</span>
                  </div>
                </div>
                <div className="config-group-hint">点击查看详细设置</div>
              </div>

              {/* 聊天配置组 - 卡片 */}
              <div 
                className="config-group clickable"
                onClick={openModalFor('chat')}
              >
                <h2 className="config-group-title">{t('ui:configGroups.chat')}</h2>
                <div className="config-group-summary">
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">💬</span>
                    <span className="config-group-summary-text">{t('ui:llm.model')}: {llmModel}</span>
                  </div>
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">
                      {llmAvailability === 'checking' ? '⏳' : llmAvailability === 'available' ? '✅' : '❌'}
                    </span>
                    <span className="config-group-summary-text">
                      {llmAvailability === 'checking' ? t('ui:llm.checking') : llmAvailability === 'available' ? t('ui:llm.connected') : t('ui:llm.disconnected')}
                    </span>
                  </div>
                </div>
                <div className="config-group-hint">点击查看详细设置</div>
              </div>

              {/* 系统设置组 - 卡片 */}
              <SystemConfigSectionCard onOpenModal={openModalFor('system')} />

              {/* 其他设置组 - 卡片 */}
              <div 
                className="config-group clickable"
                onClick={openModalFor('other')}
              >
                <h2 className="config-group-title">{t('ui:configGroups.other') || '其他设置'}</h2>
                <div className="config-group-summary">
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">⏱️</span>
                    <span className="config-group-summary-text">超时: {Math.floor(playTimeout / 1000)}秒</span>
                  </div>
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">💡</span>
                    <span className="config-group-summary-text">想法建议: {ideaGenerationEnabled ? '已启用' : '已禁用'}</span>
                  </div>
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">📊</span>
                    <span className="config-group-summary-text">计分器: {cardTrackerEnabled ? '已启用' : '已禁用'}</span>
                  </div>
                </div>
                <div className="config-group-hint">点击查看详细设置</div>
              </div>

              {/* 发牌配置组 - 卡片 */}
              <div 
                className="config-group clickable"
                onClick={openModalFor('dealing')}
              >
                <h2 className="config-group-title">{t('ui:configGroups.dealing')}</h2>
                <div className="config-group-summary">
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">🎲</span>
                    <span className="config-group-summary-text">{t('ui:config.dealingAlgorithm')}: {t(`ui:dealingAlgorithms.${dealingAlgorithm}`)}</span>
                  </div>
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">⚡</span>
                    <span className="config-group-summary-text">{t('ui:config.dealingSpeed')}: {dealingSpeed === 50 ? t('ui:dealingSpeeds.fast') : dealingSpeed === 150 ? t('ui:dealingSpeeds.normal') : dealingSpeed === 300 ? t('ui:dealingSpeeds.slow') : t('ui:dealingSpeeds.verySlow')}</span>
                  </div>
                  <div className="config-group-summary-item">
                    <span className="config-group-summary-icon">📋</span>
                    <span className="config-group-summary-text">{t('ui:config.sortOrder')}: {t(`ui:sortOrders.${sortOrder}`)}</span>
                  </div>
                </div>
                <div className="config-group-hint">点击查看详细设置</div>
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

      {/* 模态面板 */}
      <ConfigGroupModal 
        isOpen={openModal === 'basic'}
        title={t('ui:configGroups.basic')}
        onClose={closeModal}
      >
        <div className="config-group">
          <div className="config-item">
            <label>{t('ui:config.playerCount')}</label>
            <input
              type="number"
              min="4"
              max="100"
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
          {onTeamModeChange && (playerCount === 4 || playerCount === 6) && (
            <div className="config-item">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={teamMode || false}
                  onChange={(e) => onTeamModeChange(e.target.checked)}
                />
                <span>团队模式 (合作模式)</span>
              </label>
              <small style={{ display: 'block', color: '#999', marginTop: '5px' }}>
                {playerCount === 4 
                  ? '2v2 团队对战模式，分数按团队计算' 
                  : '3v3 团队对战模式，分数按团队计算'}
              </small>
            </div>
          )}
        </div>
      </ConfigGroupModal>

      <ConfigGroupModal 
        isOpen={openModal === 'ai'}
        title={t('ui:configGroups.ai')}
        onClose={closeModal}
      >
        <div className="config-group">
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
      </ConfigGroupModal>

      <ConfigGroupModal 
        isOpen={openModal === 'chat'}
        title={t('ui:configGroups.chat')}
        onClose={closeModal}
      >
        <div className="config-group">
          {/* LLM 功能开关 */}
          {onLlmEnabledChange && (
            <div className="config-item full-width">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={llmEnabled}
                  onChange={(e) => onLlmEnabledChange(e.target.checked)}
                />
                <span>☐ 启用 LLM 功能</span>
              </label>
              <small>使用大模型生成智能聊天和分析（关闭后使用预设聊天模板）</small>
            </div>
          )}
          
          {/* LLM 状态指示器 */}
          <div className="config-item full-width">
            <label>LLM 服务状态</label>
            <div className="llm-status-detailed">
              {llmAvailability === 'checking' && (
                <span className="status-checking">🟡 检测中...</span>
              )}
              {llmAvailability === 'available' && (
                <div className="status-available-box">
                  <span className="status-icon">🟢 LLM 可用 - 使用智能聊天</span>
                  {currentServer && (
                    <div className="server-info-mini">
                      <div>服务器: {currentServer.host}:{currentServer.port}</div>
                      {currentServer.latency && <div>延迟: {currentServer.latency}ms</div>}
                    </div>
                  )}
                </div>
              )}
              {llmAvailability === 'unavailable' && (
                <span className="status-unavailable">🔴 LLM 不可用 - 使用预设聊天</span>
              )}
              {llmAvailability === 'unknown' && (
                <span className="status-unknown">⚪ LLM 未检测</span>
              )}
              {!llmEnabled && (
                <span className="status-disabled">⚪ LLM 已禁用 - 使用预设聊天</span>
              )}
            </div>
          </div>

          {/* 服务器选择器 */}
          {llmEnabled && onServerChange && onAddServer && onRemoveServer && onToggleServerFavorite && onCheckServer && currentServer && (
            <div className="config-item full-width">
              <ServerSelector
                currentServer={currentServer}
                allServers={allServers}
                recentServers={recentServers}
                onServerChange={onServerChange}
                onAddServer={onAddServer}
                onRemoveServer={onRemoveServer}
                onToggleFavorite={onToggleServerFavorite}
                onCheckServer={onCheckServer}
              />
            </div>
          )}

          {/* 模型选择 */}
          {llmEnabled && llmAvailability === 'available' && onLlmModelChange && (
            <div className="config-item full-width">
              <label>
                {t('ui:llm.model')}
                <button
                  type="button"
                  className="refresh-models-btn"
                  onClick={handleRefreshModels}
                  disabled={isLoadingModels}
                  title="刷新模型列表"
                >
                  🔄
                </button>
              </label>
              {isLoadingModels ? (
                <select disabled>
                  <option>加载中...</option>
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
                    <strong>当前选择:</strong> {llmModel} | 
                    可用模型: {availableModels.length} 个
                  </small>
                  <div className="available-models-list">
                    <strong>所有可用模型</strong>
                    <div className="models-tags">
                      {availableModels.map(model => (
                        <span
                          key={model}
                          className={`model-tag ${model === llmModel ? 'selected' : ''}`}
                          onClick={() => onLlmModelChange(model)}
                          title="点击选择"
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
                    placeholder="输入模型名称"
                  />
                  <small>无法获取模型列表，当前使用: {llmModel}</small>
                </>
              )}
            </div>
          )}
          
          {/* API URL 显示（只读） */}
          {llmEnabled && llmAvailability === 'available' && (
            <div className="config-item full-width">
              <label>API 地址 (自动生成)</label>
              <input
                type="text"
                value={llmApiUrl}
                disabled
                style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small>根据服务器地址自动生成，无需手动修改</small>
            </div>
          )}
          
          {/* 测试窗口 */}
          {llmEnabled && llmAvailability === 'available' && (
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
                  disabled={isTesting || !testMessage.trim()}
                  title={t('ui:llm.test.sendMessage')}
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
          )}
          
          {/* 配置保存提示 */}
          <div className="config-save-notice">
            <div className="notice-icon">💾</div>
            <div className="notice-text">
              <strong>配置自动保存</strong>
              <p>你的服务器选择和模型配置会自动保存，刷新页面后自动恢复。</p>
            </div>
          </div>
        </div>
      </ConfigGroupModal>

      <ConfigGroupModal 
        isOpen={openModal === 'system'}
        title="系统设置"
        onClose={closeModal}
      >
        <SystemConfigSection />
      </ConfigGroupModal>

      <ConfigGroupModal 
        isOpen={openModal === 'other'}
        title={t('ui:configGroups.other') || '其他设置'}
        onClose={closeModal}
      >
        <div className="config-group">
          {onPlayTimeoutChange && (
            <div className="config-item">
              <label>{t('ui:config.playTimeout') || '出牌超时时间（秒）'}</label>
              <input
                type="number"
                min="5"
                max="300"
                step="5"
                value={Math.floor(playTimeout / 1000)}
                onChange={(e) => {
                  const seconds = parseInt(e.target.value) || 30;
                  onPlayTimeoutChange(Math.max(5000, seconds * 1000));
                }}
              />
              <small>{t('ui:playTimeoutHint') || '玩家出牌超时时间，超过此时间未出牌将自动要不起（默认30秒）'}</small>
            </div>
          )}
          {onAnnouncementDelayChange && (
            <div className="config-item">
              <label>{t('ui:config.announcementDelay') || '报牌后延迟时间（毫秒）'}</label>
              <input
                type="number"
                min="0"
                max="5000"
                step="100"
                value={announcementDelay}
                onChange={(e) => {
                  const delay = parseInt(e.target.value) || 1000;
                  onAnnouncementDelayChange(Math.max(0, delay));
                }}
              />
              <small>{t('ui:announcementDelayHint') || '玩家出牌并报牌完成后，等待此时间再继续游戏（默认1000毫秒）'}</small>
            </div>
          )}
          {onIdeaGenerationEnabledChange && (
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={ideaGenerationEnabled}
                  onChange={(e) => onIdeaGenerationEnabledChange(e.target.checked)}
                />
                {t('ui:config.ideaGenerationEnabled') || '启用想法建议'}
              </label>
              <small>{t('ui:ideaGenerationEnabledHint') || '游戏过程中自动生成优化建议，可能会影响游戏体验'}</small>
            </div>
          )}
          {onCardTrackerEnabledChange && (
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={cardTrackerEnabled}
                  onChange={(e) => onCardTrackerEnabledChange(e.target.checked)}
                />
                {t('ui:config.cardTrackerEnabled') || '启用计分器'}
              </label>
              <small>{t('ui:cardTrackerEnabledHint') || '记录每轮出牌详情和分数统计，默认关闭'}</small>
            </div>
          )}
          {onCardTrackerPanelVisibleChange && (
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={cardTrackerPanelVisible}
                  onChange={(e) => onCardTrackerPanelVisibleChange(e.target.checked)}
                />
                {t('ui:config.cardTrackerPanelVisible') || '显示记牌器面板'}
              </label>
              <small>{t('ui:cardTrackerPanelVisibleHint') || '在游戏界面显示记牌器面板，默认关闭'}</small>
            </div>
          )}
        </div>
      </ConfigGroupModal>

      <ConfigGroupModal 
        isOpen={openModal === 'dealing'}
        title={t('ui:configGroups.dealing')}
        onClose={closeModal}
      >
        <div className="config-group">
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
                <option value="bomb-friendly">{t('ui:dealingAlgorithms.bombFriendly')}</option>
                <option value="monte-carlo">{t('ui:dealingAlgorithms.monteCarlo')}</option>
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
      </ConfigGroupModal>
    </div>
  );
};
