/**
 * TTS 服务状态监控组件
 * 显示 TTS 提供者状态和健康检查信息
 */

import React, { useState, useEffect } from 'react';
import { getTTSServiceManager, TTSProvider } from '../tts';
import './TTSStatusMonitor.css';

export const TTSStatusMonitor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Record<TTSProvider, { enabled: boolean; healthy: boolean }>>({} as any);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const ttsManager = getTTSServiceManager();

  // 更新状态
  const updateStatus = () => {
    const currentStatus = ttsManager.getProviderStatus();
    setStatus(currentStatus);
    setLastUpdate(new Date());
  };

  // 定期更新状态
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateStatus();
    const interval = setInterval(updateStatus, 5000);  // 每5秒更新一次

    return () => clearInterval(interval);
  }, [isOpen]);

  // 手动检查健康状态
  const handleCheckHealth = async () => {
    await ttsManager.checkAllProvidersHealth();
    updateStatus();
  };

  // 测试 TTS
  const handleTestTTS = async (provider: TTSProvider) => {
    try {
      const result = await ttsManager.synthesizeWithProvider(
        provider,
        '测试语音合成',
        { lang: 'zh', useCache: false }
      );
      alert(`TTS 测试成功！音频时长: ${result.duration.toFixed(2)}秒`);
      updateStatus();
    } catch (error) {
      alert(`TTS 测试失败: ${error instanceof Error ? error.message : String(error)}`);
      updateStatus();
    }
  };

  if (!isOpen) {
    return (
      <button
        className="tts-status-monitor-toggle"
        onClick={() => setIsOpen(true)}
        title="打开 TTS 状态监控"
      >
        🔊
      </button>
    );
  }

  const providerNames: Record<TTSProvider, string> = {
    browser: '浏览器 TTS',
    local: '本地 TTS API',
    edge: 'Edge TTS',
    gpt_sovits: 'GPT-SoVITS',
    coqui: 'Coqui TTS',
  };

  const providerIcons: Record<TTSProvider, string> = {
    browser: '🌐',
    local: '💻',
    edge: '🌍',
    gpt_sovits: '🤖',
    coqui: '🎙️',
  };

  return (
    <div className="tts-status-monitor-overlay" onClick={() => setIsOpen(false)}>
      <div className="tts-status-monitor-container" onClick={(e) => e.stopPropagation()}>
        <div className="tts-status-monitor-header">
          <h2>🔊 TTS 服务状态监控</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="tts-status-monitor-actions">
          <button className="btn-primary" onClick={handleCheckHealth}>
            🔄 检查健康状态
          </button>
          <button className="btn-secondary" onClick={updateStatus}>
            📊 刷新状态
          </button>
        </div>

        <div className="tts-status-monitor-content">
          <div className="status-list">
            {Object.entries(status).map(([provider, state]) => (
              <div key={provider} className="status-item">
                <div className="status-item-header">
                  <span className="status-icon">
                    {providerIcons[provider as TTSProvider]}
                  </span>
                  <span className="status-name">
                    {providerNames[provider as TTSProvider]}
                  </span>
                  <span className={`status-badge ${state.healthy ? 'healthy' : 'unhealthy'} ${!state.enabled ? 'disabled' : ''}`}>
                    {state.enabled
                      ? state.healthy
                        ? '✅ 健康'
                        : '❌ 不健康'
                      : '🚫 已禁用'}
                  </span>
                </div>
                <div className="status-item-actions">
                  <button
                    className="btn-test"
                    onClick={() => handleTestTTS(provider as TTSProvider)}
                    disabled={!state.enabled}
                  >
                    🧪 测试
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="status-footer">
            <p>最后更新: {lastUpdate.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

