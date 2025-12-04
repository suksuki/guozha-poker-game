/**
 * TTS 场景配置面板
 * 为不同场景配置不同的TTS服务器
 */

import React from 'react';
import { TTSServerConfig } from '../../tts/models/TTSServerConfig';
import { TTSSceneType, SCENE_DISPLAY_NAMES, SCENE_DESCRIPTIONS, SCENE_ICONS } from '../../tts/models/TTSSceneConfig';
import './TTSSceneConfigPanel.css';

interface TTSSceneConfigPanelProps {
  servers: TTSServerConfig[];
  sceneConfig: any;
  onSceneChange: (scene: TTSSceneType, serverIds: string[]) => void;
}

interface SceneServerSelectorProps {
  scene: TTSSceneType;
  servers: TTSServerConfig[];
  selectedServerIds: string[];
  onChange: (serverIds: string[]) => void;
}

const SceneServerSelector: React.FC<SceneServerSelectorProps> = ({
  scene,
  servers,
  selectedServerIds,
  onChange
}) => {
  const enabledServers = servers
    .filter(s => s.enabled) // 只要启用即可，不要求健康检查通过（可能还在检查中）
    .sort((a, b) => a.priority - b.priority);

  const handleServerSelect = (serverId: string) => {
    // 单选模式：只选择一个服务器
    onChange([serverId]);
  };

  const selectedServerId = selectedServerIds[0] || '';

  return (
    <div className="scene-server-selector">
      <div className="scene-header">
        <span className="scene-icon">{SCENE_ICONS[scene]}</span>
        <div className="scene-info">
          <h4>{SCENE_DISPLAY_NAMES[scene]}</h4>
          <p>{SCENE_DESCRIPTIONS[scene]}</p>
        </div>
      </div>

      <div className="server-options">
        {/* 自动选择选项 */}
        <label className="server-option">
          <input
            type="radio"
            name={`scene-${scene}`}
            value=""
            checked={selectedServerId === ''}
            onChange={() => onChange([])}
          />
          <span className="option-content">
            <span className="option-name">🔄 自动选择</span>
            <span className="option-desc">按全局优先级自动选择</span>
          </span>
        </label>

        {/* 服务器选项 */}
        {enabledServers.map(server => (
          <label key={server.id} className="server-option">
            <input
              type="radio"
              name={`scene-${scene}`}
              value={server.id}
              checked={selectedServerId === server.id}
              onChange={() => handleServerSelect(server.id)}
            />
            <span className="option-content">
              <span className="option-name">
                {server.status?.health === 'available' ? '✅' : '❓'} {server.name}
              </span>
              <span className="option-desc">
                {server.connection.host}:{server.connection.port}
                {server.status?.latency && ` · ${server.status.latency}ms`}
              </span>
            </span>
          </label>
        ))}

        {enabledServers.length === 0 && (
          <div className="no-servers-hint">
            ⚠️ 没有可用的TTS服务器，请先添加并启用服务器
          </div>
        )}
      </div>
    </div>
  );
};

export const TTSSceneConfigPanel: React.FC<TTSSceneConfigPanelProps> = ({
  servers,
  sceneConfig,
  onSceneChange
}) => {
  if (!sceneConfig) {
    return null;
  }

  const scenes: TTSSceneType[] = ['system', 'chat', 'announcement', 'dialogue'];

  return (
    <div className="tts-scene-config-panel">
      <div className="panel-description">
        <p>💡 为不同场景配置不同的TTS服务器，提供更灵活的语音控制</p>
        <ul>
          <li><strong>系统音效</strong>：过、要不起等提示音</li>
          <li><strong>聊天语音</strong>：AI玩家的对话（最重要）</li>
          <li><strong>报牌语音</strong>：大小王、同花顺等播报</li>
          <li><strong>AI对话音</strong>：想法生成、策略分析</li>
        </ul>
      </div>

      <div className="scenes-grid">
        {scenes.map(scene => {
          const sceneKey = `${scene}Sound` as keyof typeof sceneConfig;
          const serverIds = sceneConfig[sceneKey]?.serverIds || [];

          return (
            <SceneServerSelector
              key={scene}
              scene={scene}
              servers={servers}
              selectedServerIds={serverIds}
              onChange={(ids) => onSceneChange(scene, ids)}
            />
          );
        })}
      </div>
    </div>
  );
};

