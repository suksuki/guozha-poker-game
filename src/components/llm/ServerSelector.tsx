/**
 * Ollama 服务器选择组件
 * 支持选择、添加、删除服务器
 */

import React, { useState } from 'react';
import { OllamaServerConfig } from '../../services/llm/OllamaServerManager';
import './ServerSelector.css';

export interface ServerSelectorProps {
  currentServer: OllamaServerConfig;
  allServers: OllamaServerConfig[];
  recentServers: OllamaServerConfig[];
  onServerChange: (serverId: string) => void;
  onAddServer: (config: Partial<OllamaServerConfig>) => void;
  onRemoveServer: (serverId: string) => void;
  onToggleFavorite: (serverId: string) => void;
  onCheckServer: (server: OllamaServerConfig) => Promise<boolean>;
}

type InputMode = 'local' | 'lan' | 'custom';

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  currentServer,
  allServers,
  recentServers,
  onServerChange,
  onAddServer,
  onRemoveServer,
  onToggleFavorite,
  onCheckServer
}) => {
  const [inputMode, setInputMode] = useState<InputMode>('local');
  const [customHost, setCustomHost] = useState('');
  const [customPort, setCustomPort] = useState('11434');
  const [customName, setCustomName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // 处理添加服务器
  const handleAddServer = async () => {
    let host = '';
    let port = 11434;

    if (inputMode === 'local') {
      host = 'localhost';
    } else if (inputMode === 'lan') {
      host = customHost.trim();
      // 如果只输入了最后两段（如 0.13），自动补全
      if (host.split('.').length === 2) {
        host = `192.168.${host}`;
      }
      port = parseInt(customPort) || 11434;
    } else {
      // 自定义模式
      host = customHost.trim();
      port = parseInt(customPort) || 11434;
    }

    if (!host) {
      alert('请输入服务器地址');
      return;
    }

    setIsAdding(true);
    setIsChecking(true);

    const newServerConfig: Partial<OllamaServerConfig> = {
      name: customName.trim() || `${host}:${port}`,
      host,
      port,
      protocol: 'http'
    };

    // 先添加服务器
    onAddServer(newServerConfig);

    // 检测可用性
    const tempServer: OllamaServerConfig = {
      id: 'temp',
      name: newServerConfig.name!,
      host: newServerConfig.host!,
      port: newServerConfig.port!,
      protocol: newServerConfig.protocol!,
      isFavorite: false
    };

    const isAvailable = await onCheckServer(tempServer);

    setIsChecking(false);
    setIsAdding(false);

    if (isAvailable) {
      // 清空输入
      setCustomHost('');
      setCustomPort('11434');
      setCustomName('');
      alert('服务器添加成功！');
    } else {
      alert('服务器不可用，但已添加到列表。请检查地址或稍后重试。');
    }
  };

  // 渲染服务器状态图标
  const renderStatusIcon = (server: OllamaServerConfig) => {
    if (server.lastCheckStatus === 'available') {
      return <span className="status-icon available" title={`延迟: ${server.latency}ms`}>🟢</span>;
    } else if (server.lastCheckStatus === 'unavailable') {
      return <span className="status-icon unavailable" title="不可用">🔴</span>;
    } else if (server.lastCheckStatus === 'checking') {
      return <span className="status-icon checking" title="检测中">🟡</span>;
    }
    return <span className="status-icon unknown" title="未检测">⚪</span>;
  };

  // 渲染服务器卡片
  const renderServerCard = (server: OllamaServerConfig) => {
    const isActive = server.id === currentServer.id;
    const serverUrl = `${server.host}:${server.port}`;

    return (
      <div
        key={server.id}
        className={`server-card ${isActive ? 'active' : ''}`}
      >
        <div className="server-info">
          <div className="server-status">
            {renderStatusIcon(server)}
            <span className="server-name">{server.name}</span>
          </div>
          <div className="server-url">{serverUrl}</div>
          {server.latency && (
            <div className="server-latency">延迟: {server.latency}ms</div>
          )}
        </div>
        <div className="server-actions">
          {!isActive && (
            <button
              className="btn-use"
              onClick={() => onServerChange(server.id)}
              title="使用此服务器"
            >
              使用
            </button>
          )}
          {isActive && (
            <span className="active-label">当前使用</span>
          )}
          <button
            className={`btn-favorite ${server.isFavorite ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(server.id)}
            title={server.isFavorite ? '取消收藏' : '收藏'}
          >
            {server.isFavorite ? '★' : '☆'}
          </button>
          {server.id !== 'local' && (
            <button
              className="btn-remove"
              onClick={() => {
                if (confirm(`确定删除服务器 "${server.name}" 吗？`)) {
                  onRemoveServer(server.id);
                }
              }}
              title="删除"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="server-selector">
      <div className="server-input-section">
        <h4>添加服务器</h4>
        
        <div className="input-mode-selector">
          <label>
            <input
              type="radio"
              value="local"
              checked={inputMode === 'local'}
              onChange={() => setInputMode('local')}
            />
            <span>本地服务器 (localhost)</span>
          </label>
          <label>
            <input
              type="radio"
              value="lan"
              checked={inputMode === 'lan'}
              onChange={() => setInputMode('lan')}
            />
            <span>局域网服务器 (192.168.x.x)</span>
          </label>
          <label>
            <input
              type="radio"
              value="custom"
              checked={inputMode === 'custom'}
              onChange={() => setInputMode('custom')}
            />
            <span>自定义</span>
          </label>
        </div>

        {inputMode !== 'local' && (
          <div className="server-input-fields">
            {inputMode === 'lan' && (
              <div className="input-group">
                <label>IP 地址:</label>
                <div className="lan-input">
                  <span className="prefix">192.168.</span>
                  <input
                    type="text"
                    placeholder="0.13"
                    value={customHost}
                    onChange={(e) => setCustomHost(e.target.value)}
                  />
                </div>
              </div>
            )}
            {inputMode === 'custom' && (
              <div className="input-group">
                <label>主机:</label>
                <input
                  type="text"
                  placeholder="IP 或域名"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                />
              </div>
            )}
            <div className="input-group">
              <label>端口:</label>
              <input
                type="text"
                placeholder="11434"
                value={customPort}
                onChange={(e) => setCustomPort(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>名称 (可选):</label>
              <input
                type="text"
                placeholder="如: 办公室服务器"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          className="btn-add-server"
          onClick={handleAddServer}
          disabled={isAdding || isChecking}
        >
          {isChecking ? '检测中...' : isAdding ? '添加中...' : '➕ 添加服务器'}
        </button>
      </div>

      {recentServers.length > 0 && (
        <div className="server-list-section">
          <h4>最近使用</h4>
          <div className="server-list">
            {recentServers.map(server => renderServerCard(server))}
          </div>
        </div>
      )}

      <div className="server-list-section">
        <h4>所有服务器</h4>
        <div className="server-list">
          {allServers.map(server => renderServerCard(server))}
        </div>
      </div>
    </div>
  );
};

