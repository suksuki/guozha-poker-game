/**
 * AI中控系统主控制面板
 * 提供完整的AI中控系统交互界面
 */

import React, { useState, useEffect } from 'react';
import { getInteractionService, SystemStatus } from '../../services/ai/control/interaction/InteractionService';
import { AIControlCenter } from '../../services/ai/control/AIControlCenter';
import { AnalysisResult } from '../../services/ai/control/types';
import { OptimizationCenter } from './OptimizationCenter';
import { DataCenter } from './DataCenter';
import { KnowledgeBase } from './KnowledgeBase';
import { SettingsCenter } from './SettingsCenter';
import { InitDiagnostic } from './InitDiagnostic';
import './check-init'; // 导入检查工具
import './AIControlDashboard.css';

type TabType = 'dashboard' | 'monitoring' | 'analysis' | 'optimization' | 'data' | 'knowledge' | 'settings';

export const AIControlDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const interactionService = getInteractionService();
  const aiControl = AIControlCenter.getInstance();
  
  // 加载系统状态
  const loadSystemStatus = () => {
    try {
      const systemStatus = interactionService.getSystemStatus();
      setStatus(systemStatus);
    } catch (error) {
      console.error('[AIControlDashboard] 加载系统状态失败:', error);
    }
  };
  
  // 加载分析结果
  const loadAnalysisResults = () => {
    try {
      const results = interactionService.getAnalysisResults({ limit: 10 });
      setAnalysisResults(results);
    } catch (error) {
      console.error('[AIControlDashboard] 加载分析结果失败:', error);
    }
  };
  
  // 启动监控
  const handleStartMonitoring = async () => {
    try {
      // 检查系统是否已初始化
      let status = interactionService.getSystemStatus();
      
      if (!status.initialized) {
        // 尝试等待初始化（最多等待5秒）
        console.log('[AIControlDashboard] 系统未初始化，等待初始化...');
        let waitCount = 0;
        const maxWait = 10; // 最多等待10次，每次500ms
        
        while (!status.initialized && waitCount < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 500));
          status = interactionService.getSystemStatus();
          waitCount++;
        }
        
        if (!status.initialized) {
          alert('AI中控系统初始化超时。请检查：\n1. SystemApplication是否正确启动\n2. AIControlModule是否正确注册\n3. 查看控制台错误信息');
          console.error('[AIControlDashboard] 系统初始化超时');
          return;
        }
        
        console.log('[AIControlDashboard] 系统已初始化');
      }
      
      interactionService.startMonitoring();
      
      // 延迟刷新状态，确保监控已启动
      setTimeout(() => {
        loadSystemStatus();
      }, 100);
      
      console.log('[AIControlDashboard] 监控启动请求已发送');
    } catch (error: any) {
      console.error('[AIControlDashboard] 启动监控失败:', error);
      alert(`启动监控失败: ${error.message || '未知错误'}\n\n请检查控制台获取详细信息。`);
    }
  };
  
  // 停止监控
  const handleStopMonitoring = () => {
    try {
      interactionService.stopMonitoring();
      
      // 延迟刷新状态
      setTimeout(() => {
        loadSystemStatus();
      }, 100);
      
      console.log('[AIControlDashboard] 监控停止请求已发送');
    } catch (error: any) {
      console.error('[AIControlDashboard] 停止监控失败:', error);
      alert(`停止监控失败: ${error.message || '未知错误'}`);
    }
  };
  
  // 刷新数据
  const handleRefresh = () => {
    loadSystemStatus();
    loadAnalysisResults();
  };
  
  // 等待初始化并订阅事件
  useEffect(() => {
    if (!isOpen) return;
    
    let initializationCheckInterval: NodeJS.Timeout | null = null;
    let statusRefreshInterval: NodeJS.Timeout | null = null;
    
    // 检查初始化状态
    const checkInitialization = () => {
      const currentStatus = interactionService.getSystemStatus();
      if (currentStatus.initialized) {
        console.log('[AIControlDashboard] 系统已初始化');
        loadSystemStatus();
        loadAnalysisResults();
        
        // 清除初始化检查，开始正常刷新
        if (initializationCheckInterval) {
          clearInterval(initializationCheckInterval);
          initializationCheckInterval = null;
        }
        
        // 开始定时刷新
        statusRefreshInterval = setInterval(() => {
          loadSystemStatus();
        }, 5000);
      } else {
        console.log('[AIControlDashboard] 等待系统初始化...');
        // 更新状态显示
        setStatus(currentStatus);
      }
    };
    
    // 立即检查一次
    checkInitialization();
    
    // 如果未初始化，每500ms检查一次（最多等待10秒）
    const currentStatus = interactionService.getSystemStatus();
    if (!currentStatus.initialized) {
      let checkCount = 0;
      const maxChecks = 20; // 最多检查20次（10秒）
      
      initializationCheckInterval = setInterval(() => {
        checkCount++;
        checkInitialization();
        
        // 如果超过最大检查次数，停止检查并显示错误
        if (checkCount >= maxChecks) {
          if (initializationCheckInterval) {
            clearInterval(initializationCheckInterval);
            initializationCheckInterval = null;
          }
          
          const finalStatus = interactionService.getSystemStatus();
          if (!finalStatus.initialized) {
            console.error('[AIControlDashboard] 初始化超时，请检查：');
            console.error('1. SystemApplication是否正确启动');
            console.error('2. AIControlModule是否正确注册');
            console.error('3. 查看控制台是否有初始化错误');
            
            // 更新状态显示错误
            setStatus({
              ...finalStatus,
              initialized: false
            });
          }
        }
      }, 500);
    } else {
      // 已初始化，开始正常刷新
      statusRefreshInterval = setInterval(() => {
        loadSystemStatus();
      }, 5000);
    }
    
    // 订阅分析完成事件
    const handleAnalysisComplete = (results: AnalysisResult[]) => {
      setAnalysisResults(prev => [...results, ...prev].slice(0, 10));
    };
    
    // 订阅监控状态变化事件
    const handleMonitoringStarted = () => {
      console.log('[AIControlDashboard] 收到监控启动事件');
      setTimeout(() => loadSystemStatus(), 200);
    };
    
    const handleMonitoringStopped = () => {
      console.log('[AIControlDashboard] 收到监控停止事件');
      setTimeout(() => loadSystemStatus(), 200);
    };
    
    interactionService.on('analysis:complete', handleAnalysisComplete);
    interactionService.on('monitoring:started', handleMonitoringStarted);
    interactionService.on('monitoring:stopped', handleMonitoringStopped);
    
    return () => {
      if (initializationCheckInterval) {
        clearInterval(initializationCheckInterval);
      }
      if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval);
      }
      interactionService.off('analysis:complete', handleAnalysisComplete);
      interactionService.off('monitoring:started', handleMonitoringStarted);
      interactionService.off('monitoring:stopped', handleMonitoringStopped);
    };
  }, [isOpen]);
  
  if (!isOpen) {
    return (
      <button
        className="ai-control-toggle-button"
        onClick={() => setIsOpen(true)}
        title="打开AI中控系统"
      >
        🧠 AI中控
      </button>
    );
  }
  
  return (
    <div className="ai-control-dashboard">
      <InitDiagnostic />
      <div className="ai-control-header">
        <h2>🧠 AI中控系统</h2>
        <div className="ai-control-actions">
          <button onClick={handleRefresh} title="刷新">🔄</button>
          <button onClick={() => setIsOpen(false)} title="关闭">✕</button>
        </div>
      </div>
      
      <div className="ai-control-tabs">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          🏠 仪表盘
        </button>
        <button
          className={activeTab === 'monitoring' ? 'active' : ''}
          onClick={() => setActiveTab('monitoring')}
        >
          📊 监控中心
        </button>
        <button
          className={activeTab === 'analysis' ? 'active' : ''}
          onClick={() => setActiveTab('analysis')}
        >
          🔍 分析中心
        </button>
        <button
          className={activeTab === 'optimization' ? 'active' : ''}
          onClick={() => setActiveTab('optimization')}
        >
          ⚙️ 优化中心
        </button>
        <button
          className={activeTab === 'data' ? 'active' : ''}
          onClick={() => setActiveTab('data')}
        >
          📚 数据中心
        </button>
        <button
          className={activeTab === 'knowledge' ? 'active' : ''}
          onClick={() => setActiveTab('knowledge')}
        >
          🧠 知识库
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ 设置
        </button>
      </div>
      
      <div className="ai-control-content">
        {activeTab === 'dashboard' && (
          <DashboardTab
            status={status}
            analysisResults={analysisResults}
            onStartMonitoring={handleStartMonitoring}
            onStopMonitoring={handleStopMonitoring}
          />
        )}
        
        {activeTab === 'monitoring' && (
          <MonitoringTab status={status} />
        )}
        
        {activeTab === 'analysis' && (
          <AnalysisTab
            results={analysisResults}
            onRefresh={loadAnalysisResults}
          />
        )}
        
        {activeTab === 'optimization' && (
          <OptimizationCenter />
        )}
        
        {activeTab === 'data' && (
          <DataCenter />
        )}
        
        {activeTab === 'knowledge' && (
          <KnowledgeBase />
        )}
        
        {activeTab === 'settings' && (
          <SettingsCenter />
        )}
      </div>
    </div>
  );
};

// 仪表盘标签页
const DashboardTab: React.FC<{
  status: SystemStatus | null;
  analysisResults: AnalysisResult[];
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
}> = ({ status, analysisResults, onStartMonitoring, onStopMonitoring }) => {
  return (
    <div className="dashboard-tab">
      <div className="status-cards">
        <div className="status-card">
          <div className="status-card-title">系统状态</div>
          <div className="status-card-content">
            <div className={`status-indicator ${status?.monitoring ? 'running' : 'stopped'}`}>
              {status?.monitoring ? '✅ 运行中' : '⏸️ 已停止'}
            </div>
            <div className="status-info">
              {status?.initialized ? '📊 已初始化' : '⏳ 未初始化'}
            </div>
            {!status?.initialized && (
              <div className="status-warning" style={{ color: '#ffc107', marginTop: '10px', fontSize: '12px' }}>
                ⚠️ 系统正在初始化，请稍候...
              </div>
            )}
          </div>
          <div className="status-card-actions">
            {!status?.initialized ? (
              <button disabled className="btn-disabled">等待初始化...</button>
            ) : status?.monitoring ? (
              <button onClick={onStopMonitoring} className="btn-stop">停止监控</button>
            ) : (
              <button onClick={onStartMonitoring} className="btn-start">启动监控</button>
            )}
          </div>
        </div>
        
        <div className="status-card">
          <div className="status-card-title">资源使用</div>
          <div className="status-card-content">
            {status?.resourceStatus ? (
              <>
                <div className="resource-item">
                  <span>CPU:</span>
                  <span>{(status.resourceStatus.cpu.usage * 100).toFixed(1)}%</span>
                </div>
                <div className="resource-item">
                  <span>内存:</span>
                  <span>{(status.resourceStatus.memory.used / 1024 / 1024).toFixed(1)}MB</span>
                </div>
              </>
            ) : (
              <div>加载中...</div>
            )}
          </div>
        </div>
        
        <div className="status-card">
          <div className="status-card-title">分析结果</div>
          <div className="status-card-content">
            <div className="result-count">{analysisResults.length} 个结果</div>
            <div className="result-severity">
              {analysisResults.filter(r => r.severity === 'high' || r.severity === 'critical').length} 个高优先级
            </div>
          </div>
        </div>
      </div>
      
      <div className="recent-results">
        <h3>最近分析结果</h3>
        {analysisResults.length === 0 ? (
          <div className="empty-state">暂无分析结果</div>
        ) : (
          <div className="results-list">
            {analysisResults.slice(0, 5).map(result => (
              <div key={result.id} className={`result-item severity-${result.severity}`}>
                <div className="result-header">
                  <span className="result-type">{result.type}</span>
                  <span className={`result-severity severity-${result.severity}`}>
                    {result.severity}
                  </span>
                </div>
                <div className="result-description">{result.description}</div>
                <div className="result-recommendation">{result.recommendation}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 监控中心标签页
const MonitoringTab: React.FC<{ status: SystemStatus | null }> = ({ status }) => {
  return (
    <div className="monitoring-tab">
      <h3>监控中心</h3>
      <div className="monitoring-controls">
        <button>启动监控</button>
        <button>停止监控</button>
        <button>导出数据</button>
        <button>清空数据</button>
      </div>
      
      {status?.resourceStatus && (
        <div className="monitoring-metrics">
          <div className="metric-card">
            <div className="metric-title">CPU使用率</div>
            <div className="metric-value">
              {(status.resourceStatus.cpu.usage * 100).toFixed(1)}%
            </div>
            <div className="metric-bar">
              <div
                className="metric-bar-fill"
                style={{ width: `${status.resourceStatus.cpu.usage * 100}%` }}
              />
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-title">内存使用</div>
            <div className="metric-value">
              {(status.resourceStatus.memory.used / 1024 / 1024).toFixed(1)}MB / 
              {(status.resourceStatus.memory.limit / 1024 / 1024).toFixed(1)}MB
            </div>
            <div className="metric-bar">
              <div
                className="metric-bar-fill"
                style={{ width: `${status.resourceStatus.memory.usage * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="monitoring-info">
        <p>监控功能正在开发中...</p>
      </div>
    </div>
  );
};

// 分析中心标签页
const AnalysisTab: React.FC<{
  results: AnalysisResult[];
  onRefresh: () => void;
}> = ({ results, onRefresh }) => {
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#17a2b8';
      default: return '#6c757d';
    }
  };
  
  return (
    <div className="analysis-tab">
      <div className="analysis-header">
        <h3>分析中心</h3>
        <div className="analysis-actions">
          <button onClick={onRefresh}>刷新</button>
          <select>
            <option>全部</option>
            <option>问题</option>
            <option>优化</option>
            <option>建议</option>
          </select>
          <select>
            <option>严重性</option>
            <option>时间</option>
          </select>
        </div>
      </div>
      
      <div className="analysis-content">
        <div className="results-list-panel">
          {results.length === 0 ? (
            <div className="empty-state">暂无分析结果</div>
          ) : (
            results.map(result => (
              <div
                key={result.id}
                className={`result-card ${selectedResult?.id === result.id ? 'selected' : ''}`}
                onClick={() => setSelectedResult(result)}
                style={{ borderLeftColor: getSeverityColor(result.severity) }}
              >
                <div className="result-card-header">
                  <span className={`severity-badge severity-${result.severity}`}>
                    {result.severity}
                  </span>
                  <span className="result-type-badge">{result.type}</span>
                </div>
                <div className="result-card-description">{result.description}</div>
                <div className="result-card-recommendation">{result.recommendation}</div>
                <div className="result-card-actions">
                  <button>查看详情</button>
                  <button>生成优化方案</button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {selectedResult && (
          <div className="result-detail-panel">
            <h4>分析详情</h4>
            <div className="detail-section">
              <div className="detail-item">
                <span className="detail-label">类型:</span>
                <span>{selectedResult.type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">严重性:</span>
                <span className={`severity-${selectedResult.severity}`}>
                  {selectedResult.severity}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">描述:</span>
                <span>{selectedResult.description}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">建议:</span>
                <span>{selectedResult.recommendation}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">可自动修复:</span>
                <span>{selectedResult.autoFixable ? '是' : '否'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">风险等级:</span>
                <span>{selectedResult.risk}</span>
              </div>
            </div>
            <div className="detail-actions">
              <button>生成优化方案</button>
              <button>执行优化</button>
              <button>忽略</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



