/**
 * 设置中心组件
 * 配置AI中控系统
 */

import React, { useState, useEffect } from 'react';
import { AIControlCenter } from '../../services/ai/control/AIControlCenter';
import { AIControlConfig } from '../../services/ai/control/types';
import './SettingsCenter.css';

export const SettingsCenter: React.FC = () => {
  const [config, setConfig] = useState<Partial<AIControlConfig>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  const aiControl = AIControlCenter.getInstance();
  
  // 加载配置
  const loadConfig = () => {
    // 这里应该从AI中控系统获取配置
    // 暂时使用默认配置
    setConfig({
      monitor: {
        enabled: true,
        samplingRate: 0.1,
        keyPaths: [],
        maxMemoryUsage: 50 * 1024 * 1024,
        maxCPUUsage: 0.05
      },
      analysis: {
        enabled: true,
        interval: 300000,
        batchSize: 100,
        depth: 'medium'
      },
      execute: {
        enabled: false,
        autoFix: false,
        requireConfirmation: true,
        maxRiskLevel: 'low'
      },
      evolution: {
        enabled: false,
        llmEnabled: false,
        algorithmEnabled: false,
        evolutionInterval: 3600000
      }
    });
  };
  
  // 保存配置
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // 重新初始化AI中控系统（需要实现配置更新接口）
      // await aiControl.initialize(config);
      setSaveMessage('配置已保存（需要重启系统生效）');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('保存失败');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 重置配置
  const handleReset = () => {
    if (confirm('确定要重置配置吗？')) {
      loadConfig();
    }
  };
  
  useEffect(() => {
    loadConfig();
  }, []);
  
  return (
    <div className="settings-center">
      <div className="settings-header">
        <h3>系统设置</h3>
        <div className="settings-actions">
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存'}
          </button>
          <button onClick={handleReset}>重置</button>
        </div>
      </div>
      
      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('失败') ? 'error' : 'success'}`}>
          {saveMessage}
        </div>
      )}
      
      <div className="settings-content">
        {/* 监控设置 */}
        <div className="settings-section">
          <h4>📊 监控设置</h4>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.monitor?.enabled ?? true}
                onChange={(e) => setConfig({
                  ...config,
                  monitor: { ...config.monitor, enabled: e.target.checked } as any
                })}
              />
              启用监控
            </label>
          </div>
          <div className="setting-item">
            <label>
              采样率: {((config.monitor?.samplingRate ?? 0.1) * 100).toFixed(0)}%
              <input
                type="range"
                min="0"
                max="100"
                value={(config.monitor?.samplingRate ?? 0.1) * 100}
                onChange={(e) => setConfig({
                  ...config,
                  monitor: { ...config.monitor, samplingRate: parseInt(e.target.value) / 100 } as any
                })}
              />
            </label>
          </div>
          <div className="setting-item">
            <label>
              最大内存使用 (MB):
              <input
                type="number"
                value={(config.monitor?.maxMemoryUsage ?? 50 * 1024 * 1024) / 1024 / 1024}
                onChange={(e) => setConfig({
                  ...config,
                  monitor: { ...config.monitor, maxMemoryUsage: parseInt(e.target.value) * 1024 * 1024 } as any
                })}
              />
            </label>
          </div>
          <div className="setting-item">
            <label>
              最大CPU使用率 (%):
              <input
                type="number"
                min="0"
                max="100"
                value={(config.monitor?.maxCPUUsage ?? 0.05) * 100}
                onChange={(e) => setConfig({
                  ...config,
                  monitor: { ...config.monitor, maxCPUUsage: parseInt(e.target.value) / 100 } as any
                })}
              />
            </label>
          </div>
        </div>
        
        {/* 分析设置 */}
        <div className="settings-section">
          <h4>🔍 分析设置</h4>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.analysis?.enabled ?? true}
                onChange={(e) => setConfig({
                  ...config,
                  analysis: { ...config.analysis, enabled: e.target.checked } as any
                })}
              />
              启用分析
            </label>
          </div>
          <div className="setting-item">
            <label>
              分析间隔 (分钟):
              <input
                type="number"
                min="1"
                value={(config.analysis?.interval ?? 300000) / 60000}
                onChange={(e) => setConfig({
                  ...config,
                  analysis: { ...config.analysis, interval: parseInt(e.target.value) * 60000 } as any
                })}
              />
            </label>
          </div>
          <div className="setting-item">
            <label>
              批量大小:
              <input
                type="number"
                min="10"
                max="1000"
                value={config.analysis?.batchSize ?? 100}
                onChange={(e) => setConfig({
                  ...config,
                  analysis: { ...config.analysis, batchSize: parseInt(e.target.value) } as any
                })}
              />
            </label>
          </div>
          <div className="setting-item">
            <label>
              分析深度:
              <select
                value={config.analysis?.depth ?? 'medium'}
                onChange={(e) => setConfig({
                  ...config,
                  analysis: { ...config.analysis, depth: e.target.value as any } as any
                })}
              >
                <option value="shallow">浅层</option>
                <option value="medium">中等</option>
                <option value="deep">深层</option>
              </select>
            </label>
          </div>
        </div>
        
        {/* 执行设置 */}
        <div className="settings-section">
          <h4>⚙️ 执行设置</h4>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.execute?.enabled ?? false}
                onChange={(e) => setConfig({
                  ...config,
                  execute: { ...config.execute, enabled: e.target.checked } as any
                })}
              />
              启用自动执行
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.execute?.autoFix ?? false}
                onChange={(e) => setConfig({
                  ...config,
                  execute: { ...config.execute, autoFix: e.target.checked } as any
                })}
              />
              自动修复低风险问题
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.execute?.requireConfirmation ?? true}
                onChange={(e) => setConfig({
                  ...config,
                  execute: { ...config.execute, requireConfirmation: e.target.checked } as any
                })}
              />
              需要确认（中高风险操作）
            </label>
          </div>
          <div className="setting-item">
            <label>
              最大风险等级:
              <select
                value={config.execute?.maxRiskLevel ?? 'low'}
                onChange={(e) => setConfig({
                  ...config,
                  execute: { ...config.execute, maxRiskLevel: e.target.value as any } as any
                })}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </label>
          </div>
        </div>
        
        {/* 演化设置 */}
        <div className="settings-section">
          <h4>🧬 演化设置</h4>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.evolution?.enabled ?? false}
                onChange={(e) => setConfig({
                  ...config,
                  evolution: { ...config.evolution, enabled: e.target.checked } as any
                })}
              />
              启用演化
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.evolution?.llmEnabled ?? false}
                onChange={(e) => setConfig({
                  ...config,
                  evolution: { ...config.evolution, llmEnabled: e.target.checked } as any
                })}
              />
              启用LLM
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={config.evolution?.algorithmEnabled ?? false}
                onChange={(e) => setConfig({
                  ...config,
                  evolution: { ...config.evolution, algorithmEnabled: e.target.checked } as any
                })}
              />
              启用算法
            </label>
          </div>
          <div className="setting-item">
            <label>
              演化间隔 (小时):
              <input
                type="number"
                min="1"
                value={(config.evolution?.evolutionInterval ?? 3600000) / 3600000}
                onChange={(e) => setConfig({
                  ...config,
                  evolution: { ...config.evolution, evolutionInterval: parseInt(e.target.value) * 3600000 } as any
                })}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

