/**
 * TTS 配置面板
 * 统一管理TTS服务器配置和场景配置
 */

import React, { useState } from 'react';
import { useTTSConfig } from '../../hooks/useTTSConfig';
import { TTSServerConfig, TTSServerType } from '../../tts/models/TTSServerConfig';
import { TTSSceneConfigPanel } from './TTSSceneConfigPanel';
import { TTSSceneType } from '../../tts/models/TTSSceneConfig';
import './TTSConfigPanel.css';

interface TTSServerItemProps {
  server: TTSServerConfig;
  onToggle: (id: string) => void;
  onTest: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdatePriority?: (id: string, priority: number) => void;
}

const TTSServerItem: React.FC<TTSServerItemProps> = ({ server, onToggle, onTest, onRemove, onUpdatePriority }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [priorityValue, setPriorityValue] = useState(server.priority);

  const handleTest = async () => {
    setIsTesting(true);
    await onTest(server.id);
    setIsTesting(false);
  };

  const handlePriorityChange = () => {
    if (onUpdatePriority && priorityValue !== server.priority) {
      onUpdatePriority(server.id, priorityValue);
    }
    setEditingPriority(false);
  };

  const getStatusIcon = () => {
    if (!server.enabled) return '⚪';
    if (server.status?.health === 'checking' || isTesting) return '🔄';
    if (server.status?.health === 'available') return '✅';
    if (server.status?.health === 'unavailable') return '❌';
    return '❓';
  };

  const getTypeLabel = () => {
    switch (server.type) {
      case 'melo': return 'MeLo';
      case 'piper': return 'Piper';
      case 'azure': return 'Azure';
      case 'browser': return '浏览器';
      default: return server.type;
    }
  };

  return (
    <div className={`tts-server-item ${server.enabled ? 'enabled' : 'disabled'}`}>
      <div className="server-info">
        <span className="server-status">{getStatusIcon()}</span>
        <div className="server-details">
          <div className="server-name-row">
            <span className="server-name">{server.name}</span>
            <span className="server-type-badge">{getTypeLabel()}</span>
            {editingPriority ? (
              <input
                type="number"
                className="priority-input"
                value={priorityValue}
                onChange={(e) => setPriorityValue(parseInt(e.target.value) || 1)}
                onBlur={handlePriorityChange}
                onKeyPress={(e) => e.key === 'Enter' && handlePriorityChange()}
                autoFocus
                min="1"
                max="100"
                style={{ width: '50px', marginLeft: '8px' }}
              />
            ) : (
              <span 
                className="server-priority" 
                onClick={() => setEditingPriority(true)}
                title="点击编辑优先级（数字越小优先级越高）"
                style={{ 
                  cursor: 'pointer', 
                  fontSize: '12px', 
                  color: '#666',
                  marginLeft: '8px',
                  padding: '2px 6px',
                  background: '#f0f0f0',
                  borderRadius: '4px'
                }}
              >
                优先级: {server.priority}
              </span>
            )}
          </div>
          <span className="server-url">
            {server.connection.protocol}://{server.connection.host}:{server.connection.port}
          </span>
          {server.status?.latency && (
            <span className="server-latency">{server.status.latency}ms</span>
          )}
        </div>
      </div>
      
      <div className="server-actions">
        <button 
          onClick={handleTest} 
          disabled={isTesting}
          title="测试连接"
          className="btn-icon"
        >
          {isTesting ? '🔄' : '🔍'}
        </button>
        <label className="switch">
          <input 
            type="checkbox" 
            checked={server.enabled} 
            onChange={() => onToggle(server.id)}
          />
          <span className="slider"></span>
        </label>
        <button 
          onClick={() => onRemove(server.id)}
          title="删除"
          className="btn-icon btn-danger"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

interface AddServerFormProps {
  onAdd: (config: Partial<TTSServerConfig>) => void;
  onCancel: () => void;
}

const AddServerForm: React.FC<AddServerFormProps> = ({ onAdd, onCancel }) => {
  const [type, setType] = useState<TTSServerType>('melo');
  const [name, setName] = useState('');
  const [inputMode, setInputMode] = useState<'local' | 'lan' | 'custom'>('local');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('7860');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalHost = '';
    let finalPort = 5000;

    if (inputMode === 'local') {
      finalHost = 'localhost';
      if (type === 'melo') {
        finalPort = 7860;
      } else if (type === 'piper') {
        finalPort = 5000;
      } else if (type === 'azure') {
        finalPort = 443;
      } else {
        finalPort = 7860;  // 默认 MeLo TTS 端口
      }
    } else if (inputMode === 'lan') {
      // 自动补全 192.168.
      const hostValue = host.trim();
      finalHost = hostValue.includes('.') && hostValue.split('.').length === 4
        ? hostValue
        : `192.168.${hostValue}`;
      finalPort = parseInt(port) || (type === 'melo' ? 7860 : type === 'piper' ? 5000 : 7860);
    } else {
      finalHost = host.trim();
      finalPort = parseInt(port) || 5000;
    }

    if (!finalHost) {
      alert('请输入服务器地址');
      return;
    }

    const config: Partial<TTSServerConfig> = {
      name: name.trim() || `${type} TTS - ${finalHost}`,
      type,
      enabled: true,
      priority: 10,
      connection: {
        host: finalHost,
        port: finalPort,
        protocol: 'http'
      },
      providerConfig: {
        [type]: type === 'piper' ? { model: 'zh_CN-huayan-medium' } : {}
      } as any,
      metadata: {
        createdAt: Date.now(),
        isFavorite: false
      }
    };

    onAdd(config);
  };

  return (
    <form className="add-server-form" onSubmit={handleSubmit}>
      <h3>添加 TTS 服务器</h3>
      
      <div className="form-group">
        <label>服务器类型</label>
        <select value={type} onChange={(e) => setType(e.target.value as TTSServerType)}>
          <option value="melo">🎤 MeLo TTS</option>
          <option value="piper">Piper TTS</option>
          <option value="azure">Azure Speech</option>
          <option value="browser">浏览器 TTS</option>
        </select>
      </div>

      <div className="form-group">
        <label>名称（可选）</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如：办公室 Piper 服务器"
        />
      </div>

      {type !== 'browser' && (
        <>
          <div className="form-group">
            <label>连接方式</label>
            <div className="input-mode-tabs">
              <button
                type="button"
                className={inputMode === 'local' ? 'active' : ''}
                onClick={() => setInputMode('local')}
              >
                本地
              </button>
              <button
                type="button"
                className={inputMode === 'lan' ? 'active' : ''}
                onClick={() => setInputMode('lan')}
              >
                局域网
              </button>
              <button
                type="button"
                className={inputMode === 'custom' ? 'active' : ''}
                onClick={() => setInputMode('custom')}
              >
                自定义
              </button>
            </div>
          </div>

          {inputMode === 'lan' && (
            <div className="form-group">
              <label>IP 地址</label>
              <div className="lan-input">
                <span className="prefix">192.168.</span>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="0.13"
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          {inputMode === 'lan' && (
            <div className="form-group">
              <label>端口</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="5000"
              />
            </div>
          )}

          {inputMode === 'custom' && (
            <>
              <div className="form-group">
                <label>主机地址</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="IP 或域名"
                />
              </div>
              <div className="form-group">
                <label>端口</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="5000"
                />
              </div>
            </>
          )}
        </>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-primary">添加</button>
        <button type="button" onClick={onCancel} className="btn-secondary">取消</button>
      </div>
    </form>
  );
};

export const TTSConfigPanel: React.FC = () => {
  const {
    servers,
    sceneConfig,
    isLoading,
    addServer,
    updateServer,
    removeServer,
    toggleServer,
    testConnection,
    testSynthesis,
    updateScene,
  } = useTTSConfig();

  const [showAddForm, setShowAddForm] = useState(false);
  const [testingServerId, setTestingServerId] = useState<string | null>(null);

  const handleAddServer = (config: Partial<TTSServerConfig>) => {
    addServer(config);
    setShowAddForm(false);
  };

  const handleUpdatePriority = (id: string, priority: number) => {
    updateServer(id, { priority });
  };

  const handleTestServer = async (id: string) => {
    setTestingServerId(id);
    try {
      const connectionOk = await testConnection(id);
      if (connectionOk) {
        // 如果连接成功，进一步测试语音合成
        await testSynthesis(id);
      }
    } finally {
      setTestingServerId(null);
    }
  };

  if (isLoading) {
    return <div className="tts-config-panel loading">加载中...</div>;
  }

  return (
    <div className="tts-config-panel">
      <div className="panel-header">
        <h2>🔊 TTS 语音配置</h2>
        <p className="panel-description">
          配置多个TTS服务器，支持自动回退和场景化配置
        </p>
      </div>

      <div className="servers-section">
        <div className="section-header">
          <h3>TTS 服务器</h3>
          <button 
            className="btn-add" 
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? '取消' : '➕ 添加服务器'}
          </button>
        </div>

        {showAddForm && (
          <AddServerForm
            onAdd={handleAddServer}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        <div className="servers-list">
          {servers.length === 0 ? (
            <div className="empty-state">
              <p>还没有配置TTS服务器</p>
              <p className="hint">点击"添加服务器"开始配置</p>
            </div>
          ) : (
            servers
              .sort((a, b) => a.priority - b.priority) // 按优先级排序显示
              .map(server => (
                <TTSServerItem
                  key={server.id}
                  server={server}
                  onToggle={toggleServer}
                  onTest={handleTestServer}
                  onRemove={removeServer}
                  onUpdatePriority={handleUpdatePriority}
                />
              ))
          )}
        </div>
      </div>

      {sceneConfig && (
        <div className="scene-section">
          <div className="section-header">
            <h3>🎯 场景配置</h3>
          </div>
          <TTSSceneConfigPanel
            servers={servers}
            sceneConfig={sceneConfig}
            onSceneChange={updateScene}
          />
        </div>
      )}

      <div className="stats-section">
        <div className="stat-item">
          <span className="stat-label">总计</span>
          <span className="stat-value">{servers.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">已启用</span>
          <span className="stat-value">{servers.filter(s => s.enabled).length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">可用</span>
          <span className="stat-value">
            {servers.filter(s => s.enabled && s.status?.health === 'available').length}
          </span>
        </div>
      </div>
    </div>
  );
};

