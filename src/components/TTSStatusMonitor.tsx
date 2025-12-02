/**
 * TTS 服务状态监控组件
 * 显示 TTS 提供者状态和健康检查信息
 */

import React, { useState, useEffect } from 'react';
import { getTTSServiceManager, TTSProvider, AzureSpeechTTSClient } from '../tts';
import { setTTSProvider } from '../services/multiChannelVoiceService';
import './TTSStatusMonitor.css';

export const TTSStatusMonitor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Record<TTSProvider, { enabled: boolean; healthy: boolean }>>({} as any);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedAzureVoice, setSelectedAzureVoice] = useState<string>(() => {
    // 从 localStorage 读取保存的语音选择
    return localStorage.getItem('azure_voice_name') || 'zh-CN-XiaoxiaoNeural';
  });
  
  // 场景TTS提供者选择
  const [announcementProvider, setAnnouncementProvider] = useState<TTSProvider>(() => {
    return (localStorage.getItem('tts_provider_announcement') as TTSProvider) || 'azure';
  });
  const [chatProvider, setChatProvider] = useState<TTSProvider>(() => {
    return (localStorage.getItem('tts_provider_chat') as TTSProvider) || 'piper';
  });

  const ttsManager = getTTSServiceManager();
  const availableVoices = AzureSpeechTTSClient.getAvailableChineseVoices();

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

    // 打开时立即更新状态
    updateStatus();
    
    // 打开时立即检查健康状态
    handleCheckHealth();
    
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

  // 切换到指定的TTS提供者
  const handleSelectProvider = (provider: TTSProvider) => {
    if (!status[provider]?.healthy) {
      alert(`无法选择 ${providerNames[provider]}：服务不健康`);
      return;
    }
    
    try {
      setTTSProvider(provider);
      alert(`✅ 已切换到 ${providerNames[provider]}`);
      updateStatus();
    } catch (error) {
      alert(`切换失败: ${error instanceof Error ? error.message : String(error)}`);
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
    piper: 'Piper TTS',
    azure: 'Azure Speech Service',
  };

  const providerIcons: Record<TTSProvider, string> = {
    browser: '🌐',
    piper: '🎯',
    azure: '☁️',
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

        {/* 场景TTS提供者选择 */}
        <div className="tts-scenario-selector" style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', fontWeight: 'bold' }}>
            🎯 场景TTS配置
          </h3>
          <div style={{ marginBottom: '15px', fontSize: '12px', color: '#666', lineHeight: '1.5', padding: '8px', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
            💡 <strong>说明：</strong>
            <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
              <li><strong>报牌场景：</strong>游戏中的系统提示音（如"轮到你了"、"必须出牌"等）</li>
              <li><strong>聊天场景：</strong>AI玩家的聊天语音（如"这手牌不错"、"我赢了"等）</li>
              <li>配置会立即生效，下次播放时使用新的TTS提供者</li>
            </ul>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              📢 报牌场景：
            </label>
            <select
              value={announcementProvider}
              onChange={(e) => {
                const provider = e.target.value as TTSProvider;
                setAnnouncementProvider(provider);
                localStorage.setItem('tts_provider_announcement', provider);
                const isHealthy = status[provider]?.healthy;
                if (isHealthy) {
                  alert(`✅ 报牌场景已设置为：${providerNames[provider]}\n\n配置已保存，将在下次报牌时生效。`);
                } else {
                  alert(`⚠️ 报牌场景已设置为：${providerNames[provider]}\n\n但该服务当前不健康，将自动降级到其他可用服务。`);
                }
                updateStatus();
              }}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
              }}
            >
              <option value="azure">☁️ Azure Speech Service</option>
              <option value="piper">🎯 Piper TTS</option>
              <option value="browser">🌐 浏览器 TTS</option>
            </select>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>当前选中：</span>
              <span style={{ color: '#0066cc', fontWeight: 'bold' }}>
                ✓ {providerNames[announcementProvider]}
              </span>
              <span style={{ marginLeft: '5px' }}>
                {status[announcementProvider]?.healthy ? '✅ 健康' : '❌ 不健康'}
              </span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              💬 聊天场景：
            </label>
            <select
              value={chatProvider}
              onChange={(e) => {
                const provider = e.target.value as TTSProvider;
                setChatProvider(provider);
                localStorage.setItem('tts_provider_chat', provider);
                const isHealthy = status[provider]?.healthy;
                if (isHealthy) {
                  alert(`✅ 聊天场景已设置为：${providerNames[provider]}\n\n配置已保存，将在下次AI聊天时生效。`);
                } else {
                  alert(`⚠️ 聊天场景已设置为：${providerNames[provider]}\n\n但该服务当前不健康，将自动降级到其他可用服务。`);
                }
                updateStatus();
              }}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
              }}
            >
              <option value="piper">🎯 Piper TTS</option>
              <option value="azure">☁️ Azure Speech Service</option>
              <option value="browser">🌐 浏览器 TTS</option>
            </select>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontWeight: 'bold' }}>当前选中：</span>
              <span style={{ color: '#0066cc', fontWeight: 'bold' }}>
                ✓ {providerNames[chatProvider]}
              </span>
              <span style={{ marginLeft: '5px' }}>
                {status[chatProvider]?.healthy ? '✅ 健康' : '❌ 不健康'}
              </span>
            </div>
          </div>
        </div>

        <div className="tts-status-monitor-content">
          <div className="status-list">
            {Object.entries(status)
              .filter(([provider]) => {
                // 显示所有启用的 TTS 服务
                const mainProviders: TTSProvider[] = ['azure', 'piper', 'browser'];
                return mainProviders.includes(provider as TTSProvider);
              })
              .sort(([a], [b]) => {
                // 按优先级排序：azure, piper, browser
                const order: Record<string, number> = {
                  'azure': 0,
                  'piper': 1,
                  'browser': 2,
                };
                return (order[a] ?? 999) - (order[b] ?? 999);
              })
              .map(([provider, state]) => (
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
                  {state.healthy && state.enabled && (
                    <button
                      className="btn-select"
                      onClick={() => handleSelectProvider(provider as TTSProvider)}
                      title={`切换到 ${providerNames[provider as TTSProvider]}`}
                    >
                      ✅ 选择
                    </button>
                  )}
                  {!state.enabled && provider === 'azure' && (
                    <button
                      className="btn-enable"
                      onClick={async () => {
                        // 尝试重新启用 Azure Speech Service
                        const { initTTS } = await import('../tts/initTTS');
                        const azureKey = 
                          import.meta.env.VITE_AZURE_SPEECH_KEY ||
                          (typeof window !== 'undefined' && (window as any).AZURE_SPEECH_KEY);
                        const azureRegion = 
                          import.meta.env.VITE_AZURE_SPEECH_REGION ||
                          (typeof window !== 'undefined' && (window as any).AZURE_SPEECH_REGION) ||
                          'eastus';
                        
                        if (azureKey) {
                          await initTTS({
                            enableAzure: true,
                            azureConfig: {
                              subscriptionKey: azureKey,
                              region: azureRegion,
                            },
                          });
                          // 等待一下让服务初始化完成
                          await new Promise(resolve => setTimeout(resolve, 1000));
                          // 检查健康状态并更新
                          await handleCheckHealth();
                          alert('✅ Azure Speech Service 已重新启用！');
                        } else {
                          alert('❌ 未找到 Azure Speech Service 配置，请检查 .env 文件\n\n请设置：\nVITE_AZURE_SPEECH_KEY=你的Subscription-Key\nVITE_AZURE_SPEECH_REGION=你的区域（如eastus）');
                        }
                      }}
                      title="重新启用 Azure Speech Service"
                    >
                      🔄 启用
                    </button>
                  )}
                  {provider === 'azure' && !state.enabled && (
                    <span className="status-hint" style={{ fontSize: '12px', color: '#999', marginLeft: '10px' }}>
                      (需要 Subscription Key)
                    </span>
                  )}
                  <button
                    className="btn-test"
                    onClick={() => handleTestTTS(provider as TTSProvider)}
                    disabled={!state.enabled || !state.healthy}
                    title="测试TTS合成"
                  >
                    🧪 测试
                  </button>
                </div>
                {provider === 'azure' && state.enabled && state.healthy && (
                  <div className="azure-voice-selector" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                      🎤 选择语音：
                    </label>
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                      💡 <strong>说明：</strong>选择不同的语音会影响报牌和聊天场景的Azure语音。男声/女声将应用于所有使用Azure的场景。
                    </div>
                    <select
                      value={selectedAzureVoice}
                      onChange={(e) => {
                        const voiceName = e.target.value;
                        setSelectedAzureVoice(voiceName);
                        // 保存到 localStorage
                        localStorage.setItem('azure_voice_name', voiceName);
                        // 更新 Azure Speech Service 客户端的语音配置
                        const azureClient = ttsManager.getProvider('azure') as AzureSpeechTTSClient;
                        if (azureClient && 'updateVoiceName' in azureClient) {
                          azureClient.updateVoiceName(voiceName);
                          const voiceDisplayName = availableVoices.find(v => v.name === voiceName)?.displayName || voiceName;
                          alert(`✅ 语音已切换为：${voiceDisplayName}\n\n注意：已清除缓存，新语音将在下次合成时生效。`);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '14px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                      }}
                    >
                      {availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {selectedAzureVoice === voice.name ? '✓ ' : ''}{voice.displayName} ({voice.gender}{voice.style ? `, ${voice.style}` : ''})
                        </option>
                      ))}
                    </select>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontWeight: 'bold' }}>当前选中：</span>
                      <span style={{ color: '#0066cc', fontWeight: 'bold' }}>
                        ✓ {availableVoices.find(v => v.name === selectedAzureVoice)?.displayName || selectedAzureVoice}
                      </span>
                      <span style={{ color: '#999' }}>
                        ({availableVoices.find(v => v.name === selectedAzureVoice)?.gender || ''})
                      </span>
                    </div>
                  </div>
                )}
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

