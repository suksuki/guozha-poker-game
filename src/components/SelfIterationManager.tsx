/**
 * 自我迭代管理器
 * 可视化展示自我分析结果和改进计划
 */

import React, { useState, useEffect } from 'react';
import { getSelfIterationService, SelfIterationReport, ImprovementPlan } from '../services/selfIterationService';
import { getCursorPromptService, CursorPrompt } from '../services/cursorPromptService';
import { getIdeaGenerationService, DesignDocument } from '../services/ideaGenerationService';
import './SelfIterationManager.css';

const PLAN_TYPE_LABELS = {
  refactor: '重构',
  optimize: '优化',
  test: '测试',
  design: '设计',
  cleanup: '清理',
};

const PRIORITY_COLORS = {
  high: '#dc3545',
  medium: '#ffc107',
  low: '#17a2b8',
};

type TabType = 'plans' | 'prompts' | 'history' | 'designs';

export const SelfIterationManager: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [report, setReport] = useState<SelfIterationReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ImprovementPlan | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [promptSearchQuery, setPromptSearchQuery] = useState('');
  const [promptHistory, setPromptHistory] = useState<CursorPrompt[]>([]);

  const service = getSelfIterationService();
  const promptService = getCursorPromptService();
  const ideaService = getIdeaGenerationService();
  const [designQueue, setDesignQueue] = useState<DesignDocument[]>([]);

  // 执行自我分析
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const analysisReport = await service.analyzeSelf();
      setReport(analysisReport);
      // 加载提示词历史
      loadPromptHistory();
    } catch (error) {
      alert('自我分析失败，请检查控制台');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 加载提示词历史
  const loadPromptHistory = () => {
    const history = promptService.getPromptHistory(50);
    setPromptHistory(history);
  };

  // 加载设计队列
  const loadDesignQueue = () => {
    const queue = ideaService.getDesignQueue();
    setDesignQueue(queue);
  };

  useEffect(() => {
    if (isOpen) {
      loadPromptHistory();
      loadDesignQueue();
      
      // 如果开启了自动运行且还没有报告，自动开始分析
      const autoRun = localStorage.getItem('self-iteration-auto-run') === 'true';
      if (autoRun && !report && !isAnalyzing) {
        handleAnalyze();
      }
    }
  }, [isOpen]);

  // 执行改进计划
  const handleExecutePlan = async (plan: ImprovementPlan) => {
    if (!confirm(`确定要执行改进计划 "${plan.title}" 吗？`)) {
      return;
    }

    try {
      const history = await service.executeImprovement(plan);
      alert(`改进计划已${history.status === 'completed' ? '完成' : '提交'}！`);
      
      // 重新分析以更新报告
      await handleAnalyze();
    } catch (error) {
      alert('执行改进失败，请检查控制台');
    }
  };

  // 复制 Cursor 提示词
  const handleCopyPrompt = async (plan: ImprovementPlan) => {
    const promptText = plan.cursorPromptObj?.content || plan.cursorPrompt;
    await copyToClipboard(promptText, '✅ 已复制 Cursor 提示词！现在可以在 Cursor 中粘贴使用了。');
    
    // 标记为已使用
    if (plan.cursorPromptObj) {
      promptService.markAsUsed(plan.cursorPromptObj.id);
      loadPromptHistory();
    }
  };

  // 复制提示词对象
  const handleCopyPromptObj = async (prompt: CursorPrompt) => {
    await copyToClipboard(prompt.content, '✅ 已复制 Cursor 提示词！');
    promptService.markAsUsed(prompt.id);
    loadPromptHistory();
  };

  // 通用复制函数
  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
    } catch (error) {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert(successMessage);
      } catch (err) {
        alert('❌ 复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  // 批量合并改进计划
  const handleMergePlans = () => {
    if (selectedPlans.size === 0) {
      alert('请先选择要合并的改进计划');
      return;
    }

    if (!report) {
      alert('没有可用的改进计划');
      return;
    }

    const plansToMerge = report.improvementPlans.filter(p => selectedPlans.has(p.id));
    if (plansToMerge.length === 0) {
      alert('未找到选中的改进计划');
      return;
    }

    if (plansToMerge.length < 2) {
      alert('至少需要选择 2 个改进计划才能合并');
      return;
    }

    try {
      const mergedPlan = service.mergeImprovementPlans(plansToMerge);
      
      // 复制合并后的提示词
      const promptText = mergedPlan.cursorPromptObj?.content || mergedPlan.cursorPrompt;
      copyToClipboard(
        promptText,
        `✅ 已合并 ${plansToMerge.length} 个改进计划并复制提示词！`
      );

      // 保存合并后的提示词到历史
      if (mergedPlan.cursorPromptObj) {
        promptService.markAsUsed(mergedPlan.cursorPromptObj.id);
        loadPromptHistory();
      }

      // 从报告中移除已合并的计划，添加合并后的计划
      const remainingPlans = report.improvementPlans.filter(p => !selectedPlans.has(p.id));
      const updatedReport = {
        ...report,
        improvementPlans: [...remainingPlans, mergedPlan],
      };
      setReport(updatedReport);
      setSelectedPlans(new Set());

      alert(`✅ 已成功合并 ${plansToMerge.length} 个改进计划！`);
    } catch (error) {
      alert('合并改进计划失败，请检查控制台');
    }
  };

  // 切换改进计划选择
  const togglePlanSelection = (planId: string) => {
    const newSelection = new Set(selectedPlans);
    if (newSelection.has(planId)) {
      newSelection.delete(planId);
    } else {
      newSelection.add(planId);
    }
    setSelectedPlans(newSelection);
  };

  // 批量合并提示词
  const handleMergePrompts = () => {
    if (selectedPrompts.size === 0) {
      alert('请先选择要合并的提示词');
      return;
    }

    const promptsToMerge = promptHistory.filter(p => selectedPrompts.has(p.id));
    if (promptsToMerge.length === 0) {
      alert('未找到选中的提示词');
      return;
    }

    const merged = promptService.mergePrompts(promptsToMerge);
    copyToClipboard(merged.content, `✅ 已合并 ${promptsToMerge.length} 个提示词并复制！`);
    setSelectedPrompts(new Set());
    loadPromptHistory();
  };

  // 优化提示词
  const handleOptimizePrompt = (prompt: CursorPrompt) => {
    const optimized = promptService.optimizePrompt(prompt);
    copyToClipboard(optimized.content, '✅ 已优化并复制提示词！');
  };

  // 切换提示词选择
  const togglePromptSelection = (promptId: string) => {
    const newSelection = new Set(selectedPrompts);
    if (newSelection.has(promptId)) {
      newSelection.delete(promptId);
    } else {
      newSelection.add(promptId);
    }
    setSelectedPrompts(newSelection);
  };

  // 搜索提示词
  const filteredPrompts = promptSearchQuery
    ? promptService.searchPrompts(promptSearchQuery)
    : promptHistory;

  if (!isOpen) {
    return (
      <button
        className="self-iteration-manager-toggle"
        onClick={() => setIsOpen(true)}
        title="打开自我迭代管理器"
      >
        🤖
      </button>
    );
  }

  return (
    <div className="self-iteration-manager-overlay" onClick={() => setIsOpen(false)}>
      <div className="self-iteration-manager-container" onClick={(e) => e.stopPropagation()}>
        <div className="self-iteration-manager-header">
          <h2>🤖 自我迭代管理器</h2>
          <div className="header-actions">
            <label className="auto-run-toggle">
              <input
                type="checkbox"
                checked={localStorage.getItem('self-iteration-auto-run') === 'true'}
                onChange={(e) => {
                  localStorage.setItem('self-iteration-auto-run', e.target.checked ? 'true' : 'false');
                  if (e.target.checked && !report && !isAnalyzing) {
                    handleAnalyze();
                  }
                }}
              />
              <span>🚀 自动运行</span>
            </label>
            <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>
        </div>

        <div className="self-iteration-manager-actions">
          <button
            className="btn-primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '分析中...' : '🔄 开始自我分析'}
          </button>
          {selectedPlans.size > 0 && (
            <button
              className="btn-merge"
              onClick={handleMergePlans}
            >
              🔗 合并改进计划 ({selectedPlans.size})
            </button>
          )}
          {selectedPrompts.size > 0 && (
            <button
              className="btn-merge"
              onClick={handleMergePrompts}
            >
              🔗 合并提示词 ({selectedPrompts.size})
            </button>
          )}
        </div>

        {/* 标签页切换 */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            💡 改进计划
          </button>
          <button
            className={`tab-btn ${activeTab === 'prompts' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompts')}
          >
            📋 提示词工作区 ({promptHistory.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 改进历史
          </button>
          <button
            className={`tab-btn ${activeTab === 'designs' ? 'active' : ''}`}
            onClick={() => setActiveTab('designs')}
          >
            📝 设计队列 ({designQueue.length})
          </button>
        </div>

        {report && activeTab === 'plans' && (
          <>
            {/* 总结信息 */}
            <div className="self-iteration-stats">
              <div className="stat-item">
                <span className="stat-label">代码问题</span>
                <span className="stat-value">{report.summary.totalIssues}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">测试数量</span>
                <span className="stat-value">{report.summary.totalTests}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">测试覆盖率</span>
                <span className="stat-value">{report.summary.testCoverage.toFixed(0)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">改进机会</span>
                <span className="stat-value">{report.summary.improvementOpportunities}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">已完成</span>
                <span className="stat-value success">{report.summary.completedImprovements}</span>
              </div>
            </div>

            {/* 改进计划列表 */}
            <div className="improvement-plans-section">
              <div className="plans-section-header">
                <h3>💡 改进计划</h3>
                {report.improvementPlans.length > 0 && (
                  <div className="plans-header-actions">
                    <label className="select-all-toggle">
                      <input
                        type="checkbox"
                        checked={selectedPlans.size === report.improvementPlans.length && report.improvementPlans.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // 全选
                            setSelectedPlans(new Set(report.improvementPlans.map(p => p.id)));
                          } else {
                            // 取消全选
                            setSelectedPlans(new Set());
                          }
                        }}
                        title={selectedPlans.size === report.improvementPlans.length ? "取消全选" : "全选"}
                        aria-label={selectedPlans.size === report.improvementPlans.length ? "取消全选所有改进计划" : `全选所有改进计划 (当前已选择 ${selectedPlans.size} 个)`}
                      />
                      <span>
                        {selectedPlans.size === report.improvementPlans.length && report.improvementPlans.length > 0
                          ? "取消全选"
                          : `全选 (${selectedPlans.size}/${report.improvementPlans.length})`}
                      </span>
                    </label>
                  </div>
                )}
              </div>
              <div className="improvement-plans-list" role="list" aria-label="改进计划列表">
                {report.improvementPlans.length === 0 ? (
                  <div className="empty-state">
                    <p>✅ 没有发现需要改进的地方！</p>
                  </div>
                ) : (
                  report.improvementPlans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className={`improvement-plan-card ${selectedPlans.has(plan.id) ? 'selected' : ''}`}
                      role="article"
                      aria-label={`改进计划: ${plan.title}`}
                      tabIndex={0}
                      onClick={(e) => {
                        // 如果点击的是按钮或复选框，不触发卡片选择
                        if ((e.target as HTMLElement).closest('button, input[type="checkbox"]')) {
                          return;
                        }
                        togglePlanSelection(plan.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          togglePlanSelection(plan.id);
                        }
                      }}
                    >
                      <div className="plan-header">
                        <div className="plan-title-section">
                          <input
                            type="checkbox"
                            checked={selectedPlans.has(plan.id)}
                            onChange={() => togglePlanSelection(plan.id)}
                            className="plan-checkbox"
                            title="选择此计划进行合并"
                            aria-label={`选择改进计划: ${plan.title}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span
                            className="plan-type-badge"
                            style={{ backgroundColor: PRIORITY_COLORS[plan.priority] }}
                            role="status"
                            aria-label={`类型: ${PLAN_TYPE_LABELS[plan.type]}`}
                          >
                            {PLAN_TYPE_LABELS[plan.type]}
                          </span>
                          <span
                            className="plan-priority-badge"
                            style={{ 
                              backgroundColor: plan.priority === 'high' ? '#dc3545' : 
                                             plan.priority === 'medium' ? '#ffc107' : '#17a2b8' 
                            }}
                            role="status"
                            aria-label={`优先级: ${plan.priority === 'high' ? '高' : plan.priority === 'medium' ? '中' : '低'}`}
                          >
                            {plan.priority === 'high' ? '高' : plan.priority === 'medium' ? '中' : '低'}
                          </span>
                          <h4 id={`plan-title-${plan.id}`}>{plan.title}</h4>
                        </div>
                        <div className="plan-actions">
                          <button
                            className="btn-copy-prompt"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyPrompt(plan);
                            }}
                            title="复制 Cursor 提示词"
                            aria-label={`复制改进计划 "${plan.title}" 的提示词`}
                          >
                            📋 复制提示词
                          </button>
                          {plan.canAutoApply ? (
                            <button
                              className="btn-execute"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExecutePlan(plan);
                              }}
                              title="自动执行改进"
                              aria-label={`自动执行改进计划 "${plan.title}"`}
                            >
                              ⚡ 自动执行
                            </button>
                          ) : (
                            <button
                              className="btn-execute"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlan(plan);
                              }}
                              title="查看详情"
                              aria-label={`查看改进计划 "${plan.title}" 的详情`}
                            >
                              👁️ 查看详情
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="plan-description">
                        <p aria-describedby={`plan-title-${plan.id}`}>{plan.description}</p>
                      </div>
                      <div className="plan-meta" role="group" aria-label="计划元信息">
                        <span className="meta-item" aria-label={`涉及 ${plan.targetFiles.length} 个文件`}>
                          📁 {plan.targetFiles.length} 个文件
                        </span>
                        <span className="meta-item" aria-label={`预估工作量: ${plan.estimatedEffort}`}>
                          💪 {plan.estimatedEffort}
                        </span>
                        <span className="meta-item" aria-label={`预期影响: ${plan.estimatedImpact}`}>
                          📊 {plan.estimatedImpact}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </>
        )}

        {/* 提示词工作区 */}
        {activeTab === 'prompts' && (
          <div className="prompts-workspace">
            <div className="prompts-header">
              <input
                type="text"
                className="prompt-search"
                placeholder="🔍 搜索提示词..."
                value={promptSearchQuery}
                onChange={(e) => setPromptSearchQuery(e.target.value)}
              />
              <button
                className="btn-clear-selection"
                onClick={() => setSelectedPrompts(new Set())}
                disabled={selectedPrompts.size === 0}
              >
                清除选择
              </button>
            </div>
            <div className="prompts-list">
              {filteredPrompts.length === 0 ? (
                <div className="empty-state">
                  <p>暂无提示词历史</p>
                </div>
              ) : (
                filteredPrompts.map((prompt) => (
                  <div key={prompt.id} className="prompt-card">
                    <div className="prompt-card-header">
                      <input
                        type="checkbox"
                        checked={selectedPrompts.has(prompt.id)}
                        onChange={() => togglePromptSelection(prompt.id)}
                        className="prompt-checkbox"
                      />
                      <div className="prompt-title-section">
                        <h4>{prompt.title}</h4>
                        <div className="prompt-meta">
                          <span className="prompt-category">{prompt.category}</span>
                          <span className="prompt-priority">{prompt.priority}</span>
                          <span className="prompt-usage">使用 {prompt.usageCount} 次</span>
                          {prompt.usedAt && (
                            <span className="prompt-time">
                              {prompt.usedAt.toLocaleString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="prompt-actions">
                        <button
                          className="btn-copy-prompt-small"
                          onClick={() => handleCopyPromptObj(prompt)}
                          title="复制提示词"
                        >
                          📋
                        </button>
                        <button
                          className="btn-optimize-prompt"
                          onClick={() => handleOptimizePrompt(prompt)}
                          title="优化提示词"
                        >
                          ✨
                        </button>
                      </div>
                    </div>
                    <div className="prompt-content-preview">
                      <pre>{prompt.content.substring(0, 200)}...</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 设计队列 */}
        {activeTab === 'designs' && (
          <div className="design-queue-section">
            <div className="design-queue-header">
              <h3>📝 设计队列</h3>
              <button
                className="btn-refresh"
                onClick={loadDesignQueue}
              >
                🔄 刷新
              </button>
            </div>
            <div className="design-queue-list">
              {designQueue.length === 0 ? (
                <div className="empty-state">
                  <p>暂无设计文档</p>
                </div>
              ) : (
                designQueue.map((doc) => (
                  <div key={doc.id} className="design-doc-card">
                    <div className="design-doc-header">
                      <div className="design-doc-title-section">
                        <h4>{doc.title}</h4>
                        <div className="design-doc-meta">
                          <span className={`design-status ${doc.status}`}>
                            {doc.status === 'draft' ? '📝 草稿' :
                             doc.status === 'approved' ? '✅ 已批准' :
                             doc.status === 'in_progress' ? '🚧 进行中' :
                             doc.status === 'completed' ? '✨ 已完成' : '📦 已归档'}
                          </span>
                          <span className="design-priority">{doc.priority}</span>
                          <span className="design-time">
                            {doc.createdAt.toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      <div className="design-doc-actions">
                        <select
                          className="status-select"
                          value={doc.status}
                          onChange={(e) => {
                            ideaService.updateDesignStatus(doc.id, e.target.value as DesignDocument['status']);
                            loadDesignQueue();
                          }}
                        >
                          <option value="draft">草稿</option>
                          <option value="approved">已批准</option>
                          <option value="in_progress">进行中</option>
                          <option value="completed">已完成</option>
                          <option value="archived">已归档</option>
                        </select>
                        <button
                          className="btn-export"
                          onClick={() => ideaService.exportDesignDocument(doc)}
                          title="导出为MD文件"
                        >
                          💾 导出
                        </button>
                      </div>
                    </div>
                    <div className="design-doc-preview">
                      <pre>{doc.content.substring(0, 300)}...</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 改进历史 */}
        {activeTab === 'history' && report && (
          <div className="iteration-history-section">
            <h3>📜 改进历史</h3>
            <div className="history-list">
              {report.history.length === 0 ? (
                <div className="empty-state">
                  <p>暂无改进历史</p>
                </div>
              ) : (
                report.history.slice(0, 20).map((history) => (
                  <div key={history.id} className="history-item">
                    <div className="history-header">
                      <span className="history-title">{history.plan.title}</span>
                      <span className={`history-status ${history.status}`}>
                        {history.status === 'completed' ? '✅ 完成' :
                         history.status === 'in_progress' ? '🚧 进行中' :
                         history.status === 'failed' ? '❌ 失败' :
                         history.status === 'skipped' ? '⏭️ 跳过' : '⏳ 待处理'}
                      </span>
                    </div>
                    <div className="history-time">
                      {history.timestamp.toLocaleString('zh-CN')}
                    </div>
                    {history.result && (
                      <div className="history-result">
                        {history.result.success ? (
                          <span className="result-success">✅ 成功: {history.result.changes.length} 个文件已修改</span>
                        ) : (
                          <span className="result-failure">❌ 失败: {history.result.notes}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {!report && !isAnalyzing && (
          <div className="empty-state">
            <p>点击"开始自我分析"来启动自我迭代系统</p>
          </div>
        )}

        {/* 改进计划详情弹窗 */}
        {selectedPlan && (
          <div className="plan-detail-modal" onClick={() => setSelectedPlan(null)}>
            <div className="plan-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="plan-detail-header">
                <h3>{selectedPlan.title}</h3>
                <button className="close-btn" onClick={() => setSelectedPlan(null)}>×</button>
              </div>
              <div className="plan-detail-body">
                <div className="detail-section">
                  <h4>描述</h4>
                  <p>{selectedPlan.description}</p>
                </div>
                <div className="detail-section">
                  <h4>目标文件</h4>
                  <ul>
                    {selectedPlan.targetFiles.map((file, index) => (
                      <li key={index}>{file}</li>
                    ))}
                  </ul>
                </div>
                <div className="detail-section">
                  <h4>预期影响</h4>
                  <p>{selectedPlan.estimatedImpact}</p>
                </div>
                <div className="detail-section">
                  <h4>预估工作量</h4>
                  <p>{selectedPlan.estimatedEffort}</p>
                </div>
                <div className="detail-section">
                  <h4>Cursor 提示词</h4>
                  <pre className="cursor-prompt-preview">{selectedPlan.cursorPrompt}</pre>
                  <button
                    className="btn-copy-prompt-full"
                    onClick={() => handleCopyPrompt(selectedPlan)}
                  >
                    📋 复制提示词
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

