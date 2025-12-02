/**
 * 优化中心组件
 * 显示和管理优化方案
 */

import React, { useState, useEffect } from 'react';
import { getInteractionService } from '../../services/ai/control/interaction/InteractionService';
import { AnalysisResult, OptimizationSuggestion } from '../../services/ai/control/types';
import './OptimizationCenter.css';

export const OptimizationCenter: React.FC = () => {
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<OptimizationSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const interactionService = getInteractionService();
  
  // 加载优化建议
  const loadSuggestions = async () => {
    try {
      // 从分析结果生成建议
      const results = interactionService.getAnalysisResults({ limit: 20 });
      const newSuggestions: OptimizationSuggestion[] = [];
      
      for (const result of results) {
        if (result.type === 'optimization' || result.type === 'issue') {
          try {
            const suggestion = await interactionService.generateOptimization(result.id);
            newSuggestions.push(suggestion);
          } catch (error) {
          }
        }
      }
      
      setSuggestions(newSuggestions);
    } catch (error) {
    }
  };
  
  // 生成优化方案
  const handleGenerateOptimization = async (analysisId: string) => {
    setIsGenerating(true);
    try {
      const suggestion = await interactionService.generateOptimization(analysisId);
      setSuggestions(prev => [suggestion, ...prev]);
      setSelectedSuggestion(suggestion);
    } catch (error) {
      alert('生成优化方案失败');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // 执行优化
  const handleExecuteOptimization = async (analysisId: string) => {
    if (!confirm('确定要执行此优化吗？')) {
      return;
    }
    
    setIsExecuting(true);
    try {
      await interactionService.executeOptimization(analysisId);
      alert('优化已执行');
      loadSuggestions();
    } catch (error) {
      alert('执行优化失败');
    } finally {
      setIsExecuting(false);
    }
  };
  
  useEffect(() => {
    loadSuggestions();
  }, []);
  
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return '#28a745';
      case 'medium': return '#ffc107';
      case 'low': return '#17a2b8';
      default: return '#6c757d';
    }
  };
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#28a745';
      case 'medium': return '#ffc107';
      case 'high': return '#dc3545';
      default: return '#6c757d';
    }
  };
  
  return (
    <div className="optimization-center">
      <div className="optimization-header">
        <h3>优化中心</h3>
        <div className="optimization-actions">
          <button onClick={loadSuggestions}>刷新</button>
          <button onClick={() => {
            const results = interactionService.getAnalysisResults({ limit: 10 });
            if (results.length > 0) {
              handleGenerateOptimization(results[0].id);
            }
          }} disabled={isGenerating}>
            {isGenerating ? '生成中...' : '批量生成'}
          </button>
        </div>
      </div>
      
      <div className="optimization-content">
        <div className="suggestions-list">
          {suggestions.length === 0 ? (
            <div className="empty-state">
              <p>暂无优化方案</p>
              <p className="empty-hint">点击"批量生成"从分析结果生成优化方案</p>
            </div>
          ) : (
            suggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className={`suggestion-card ${selectedSuggestion?.id === suggestion.id ? 'selected' : ''}`}
                onClick={() => setSelectedSuggestion(suggestion)}
              >
                <div className="suggestion-header">
                  <span className="suggestion-type">{suggestion.type}</span>
                  <div className="suggestion-badges">
                    <span
                      className="impact-badge"
                      style={{ backgroundColor: getImpactColor(suggestion.estimatedImpact) }}
                    >
                      影响: {suggestion.estimatedImpact}
                    </span>
                    <span
                      className="risk-badge"
                      style={{ backgroundColor: getRiskColor(suggestion.risk) }}
                    >
                      风险: {suggestion.risk}
                    </span>
                  </div>
                </div>
                <div className="suggestion-description">{suggestion.description}</div>
                {suggestion.component && (
                  <div className="suggestion-component">组件: {suggestion.component}</div>
                )}
                <div className="suggestion-actions">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSuggestion(suggestion);
                  }}>查看详情</button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    // 执行优化（需要analysisId）
                  }}>执行</button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {selectedSuggestion && (
          <div className="suggestion-detail">
            <h4>优化方案详情</h4>
            <div className="detail-section">
              <div className="detail-item">
                <span className="detail-label">类型:</span>
                <span>{selectedSuggestion.type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">描述:</span>
                <span>{selectedSuggestion.description}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">预期影响:</span>
                <span style={{ color: getImpactColor(selectedSuggestion.estimatedImpact) }}>
                  {selectedSuggestion.estimatedImpact}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">风险等级:</span>
                <span style={{ color: getRiskColor(selectedSuggestion.risk) }}>
                  {selectedSuggestion.risk}
                </span>
              </div>
              {selectedSuggestion.component && (
                <div className="detail-item">
                  <span className="detail-label">组件:</span>
                  <span>{selectedSuggestion.component}</span>
                </div>
              )}
            </div>
            
            {selectedSuggestion.code && (
              <div className="code-preview">
                <h5>优化后的代码:</h5>
                <pre><code>{selectedSuggestion.code}</code></pre>
              </div>
            )}
            
            {selectedSuggestion.params && (
              <div className="params-preview">
                <h5>优化参数:</h5>
                <pre>{JSON.stringify(selectedSuggestion.params, null, 2)}</pre>
              </div>
            )}
            
            <div className="detail-actions">
              <button
                onClick={() => {
                  // 执行优化
                }}
                disabled={isExecuting}
                className="btn-execute"
              >
                {isExecuting ? '执行中...' : '执行优化'}
              </button>
              <button
                onClick={() => {
                  // 保存为草稿
                }}
                className="btn-save"
              >
                保存为草稿
              </button>
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="btn-cancel"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

