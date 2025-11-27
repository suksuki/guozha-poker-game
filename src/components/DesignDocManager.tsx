/**
 * 设计文档管理器
 * 管理所有设计文档（MD 文件），支持状态跟踪、优先级管理、任务提取等
 */

import React, { useState, useEffect, useMemo } from 'react';
import { getDesignDocService, DesignDoc, DesignTask, DesignDocStats } from '../services/designDocService';
import './DesignDocManager.css';

const STATUS_ICONS = {
  draft: '📝',
  planning: '📋',
  in_progress: '🚧',
  completed: '✅',
  deprecated: '🗑️',
};

const STATUS_LABELS = {
  draft: '草稿',
  planning: '计划中',
  in_progress: '进行中',
  completed: '已完成',
  deprecated: '已废弃',
};

const CATEGORY_ICONS = {
  architecture: '🏗️',
  feature: '🎮',
  development: '💻',
  testing: '🧪',
  fix: '🔧',
  setup: '⚙️',
  other: '📦',
};

const CATEGORY_LABELS = {
  architecture: '架构',
  feature: '功能',
  development: '开发',
  testing: '测试',
  fix: '修复',
  setup: '设置',
  other: '其他',
};

const PRIORITY_ICONS = {
  high: '🔥',
  medium: '⭐',
  low: '📌',
};

export const DesignDocManager: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [docs, setDocs] = useState<DesignDoc[]>([]);
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [stats, setStats] = useState<DesignDocStats | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DesignDoc | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'docs' | 'tasks'>('docs');

  const service = getDesignDocService();

  // 加载文档
  useEffect(() => {
    if (isOpen) {
      loadDocs();
    }
  }, [isOpen]);

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      const loadedDocs = await service.scanDocs();
      setDocs(loadedDocs);
      
      // 提取所有任务
      const allTasks = loadedDocs.flatMap(doc => doc.tasks || []);
      setTasks(allTasks);
      
      // 更新统计
      setStats(service.getStats());
    } catch (error) {
      console.error('[DesignDocManager] 加载文档失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 过滤文档
  const filteredDocs = useMemo(() => {
    let filtered = docs;

    // 搜索过滤
    if (searchQuery) {
      filtered = service.searchDocs(searchQuery);
    }

    // 分类过滤
    if (filterCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === filterCategory);
    }

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(doc => doc.status === filterStatus);
    }

    // 优先级过滤
    if (filterPriority !== 'all') {
      filtered = filtered.filter(doc => doc.priority === filterPriority);
    }

    return filtered;
  }, [docs, searchQuery, filterCategory, filterStatus, filterPriority]);

  // 过滤任务
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // 状态过滤
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // 优先级过滤
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // 搜索过滤
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.text.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered.sort((a, b) => {
      // 按优先级和状态排序
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const statusOrder = { todo: 3, in_progress: 2, completed: 1, cancelled: 0 };
      
      if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      return statusOrder[b.status] - statusOrder[a.status];
    });
  }, [tasks, searchQuery, filterStatus, filterPriority]);

  // 更新文档状态
  const handleUpdateDocStatus = (docId: string, status: DesignDoc['status']) => {
    const doc = docs.find(d => d.id === docId);
    if (doc) {
      service.updateDocMetadata(doc.path, { status });
      doc.status = status;
      setDocs([...docs]);
      setStats(service.getStats());
    }
  };

  // 更新文档优先级
  const handleUpdateDocPriority = (docId: string, priority: DesignDoc['priority']) => {
    const doc = docs.find(d => d.id === docId);
    if (doc) {
      service.updateDocMetadata(doc.path, { priority });
      doc.priority = priority;
      setDocs([...docs]);
      setStats(service.getStats());
    }
  };

  // 更新任务状态
  const handleUpdateTaskStatus = (taskId: string, status: DesignTask['status']) => {
    service.updateTaskStatus(taskId, status);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      setTasks([...tasks]);
    }
  };

  // 合并文档
  const handleMergeDocs = (docIds: string[]) => {
    const merged = service.mergeDocs(docIds);
    if (merged) {
      setDocs([...docs, merged]);
      alert(`已合并 ${docIds.length} 个文档`);
    }
  };

  if (!isOpen) {
    return (
      <button 
        className="design-doc-manager-toggle"
        onClick={() => setIsOpen(true)}
        title="打开设计文档管理器"
      >
        📚
      </button>
    );
  }

  return (
    <div className="design-doc-manager-overlay" onClick={() => setIsOpen(false)}>
      <div className="design-doc-manager-container" onClick={(e) => e.stopPropagation()}>
        <div className="design-doc-manager-header">
          <h2>📚 设计文档管理器</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="design-doc-manager-stats">
            <div className="stat-item">
              <span className="stat-label">总文档数</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">总任务数</span>
              <span className="stat-value">{stats.totalTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">已完成任务</span>
              <span className="stat-value">{stats.completedTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">进行中</span>
              <span className="stat-value">{stats.byStatus.in_progress || 0}</span>
            </div>
          </div>
        )}

        {/* 工具栏 */}
        <div className="design-doc-manager-toolbar">
          <div className="toolbar-left">
            <button
              className={`view-mode-btn ${viewMode === 'docs' ? 'active' : ''}`}
              onClick={() => setViewMode('docs')}
            >
              📄 文档
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'tasks' ? 'active' : ''}`}
              onClick={() => setViewMode('tasks')}
            >
              ✅ 任务
            </button>
          </div>
          <div className="toolbar-right">
            <button className="btn-secondary" onClick={loadDocs} disabled={isLoading}>
              {isLoading ? '加载中...' : '🔄 刷新'}
            </button>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="design-doc-manager-filters">
          <input
            type="text"
            className="search-input"
            placeholder="搜索文档或任务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className="filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">所有分类</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS]} {label}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">所有状态</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{STATUS_ICONS[key as keyof typeof STATUS_ICONS]} {label}</option>
            ))}
          </select>
          <select
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">所有优先级</option>
            <option value="high">🔥 高</option>
            <option value="medium">⭐ 中</option>
            <option value="low">📌 低</option>
          </select>
        </div>

        {/* 内容区域 */}
        <div className="design-doc-manager-content">
          {viewMode === 'docs' ? (
            <div className="docs-list">
              {filteredDocs.length === 0 ? (
                <div className="empty-state">
                  <p>📭 没有找到文档</p>
                </div>
              ) : (
                filteredDocs.map(doc => (
                  <div key={doc.id} className="doc-card">
                    <div className="doc-card-header">
                      <div className="doc-card-title">
                        <span className="doc-status-icon">{STATUS_ICONS[doc.status]}</span>
                        <h3>{doc.title}</h3>
                        <span className="doc-category-badge">
                          {CATEGORY_ICONS[doc.category]} {CATEGORY_LABELS[doc.category]}
                        </span>
                      </div>
                      <div className="doc-card-actions">
                        <select
                          className="status-select"
                          value={doc.status}
                          onChange={(e) => handleUpdateDocStatus(doc.id, e.target.value as DesignDoc['status'])}
                        >
                          {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{STATUS_ICONS[key as keyof typeof STATUS_ICONS]} {label}</option>
                          ))}
                        </select>
                        <select
                          className="priority-select"
                          value={doc.priority}
                          onChange={(e) => handleUpdateDocPriority(doc.id, e.target.value as DesignDoc['priority'])}
                        >
                          <option value="high">🔥 高</option>
                          <option value="medium">⭐ 中</option>
                          <option value="low">📌 低</option>
                        </select>
                        <button
                          className="btn-icon"
                          onClick={() => setSelectedDoc(doc)}
                          title="查看详情"
                        >
                          👁️
                        </button>
                      </div>
                    </div>
                    <div className="doc-card-meta">
                      <span className="doc-meta-item">📁 {doc.path}</span>
                      <span className="doc-meta-item">📊 {doc.tasks?.length || 0} 个任务</span>
                      {doc.tags && doc.tags.length > 0 && (
                        <span className="doc-meta-item">
                          🏷️ {doc.tags.join(', ')}
                        </span>
                      )}
                    </div>
                    {doc.tasks && doc.tasks.length > 0 && (
                      <div className="doc-card-tasks">
                        {doc.tasks.slice(0, 3).map(task => (
                          <div key={task.id} className="task-item">
                            <input
                              type="checkbox"
                              checked={task.status === 'completed'}
                              onChange={(e) => handleUpdateTaskStatus(
                                task.id,
                                e.target.checked ? 'completed' : 'todo'
                              )}
                            />
                            <span className={`task-text ${task.status === 'completed' ? 'completed' : ''}`}>
                              {task.text}
                            </span>
                            <span className="task-priority">{PRIORITY_ICONS[task.priority]}</span>
                          </div>
                        ))}
                        {doc.tasks.length > 3 && (
                          <div className="task-more">还有 {doc.tasks.length - 3} 个任务...</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="tasks-list">
              {filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <p>📭 没有找到任务</p>
                </div>
              ) : (
                filteredTasks.map(task => {
                  const doc = docs.find(d => d.id === task.docId);
                  return (
                    <div key={task.id} className="task-card">
                      <div className="task-card-header">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={(e) => handleUpdateTaskStatus(
                            task.id,
                            e.target.checked ? 'completed' : 'todo'
                          )}
                        />
                        <span className={`task-text ${task.status === 'completed' ? 'completed' : ''}`}>
                          {task.text}
                        </span>
                        <span className="task-priority">{PRIORITY_ICONS[task.priority]}</span>
                      </div>
                      <div className="task-card-meta">
                        {doc && (
                          <span className="task-meta-item">📄 {doc.title}</span>
                        )}
                        {task.assignee && (
                          <span className="task-meta-item">👤 {task.assignee}</span>
                        )}
                        {task.dueDate && (
                          <span className="task-meta-item">📅 {task.dueDate}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* 文档详情弹窗 */}
        {selectedDoc && (
          <div className="doc-detail-modal" onClick={() => setSelectedDoc(null)}>
            <div className="doc-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="doc-detail-header">
                <h3>{selectedDoc.title}</h3>
                <button className="close-btn" onClick={() => setSelectedDoc(null)}>×</button>
              </div>
              <div className="doc-detail-body">
                <div className="doc-detail-info">
                  <p><strong>路径：</strong>{selectedDoc.path}</p>
                  <p><strong>分类：</strong>{CATEGORY_ICONS[selectedDoc.category]} {CATEGORY_LABELS[selectedDoc.category]}</p>
                  <p><strong>状态：</strong>{STATUS_ICONS[selectedDoc.status]} {STATUS_LABELS[selectedDoc.status]}</p>
                  <p><strong>优先级：</strong>{PRIORITY_ICONS[selectedDoc.priority]}</p>
                  {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                    <p><strong>标签：</strong>{selectedDoc.tags.join(', ')}</p>
                  )}
                </div>
                {selectedDoc.tasks && selectedDoc.tasks.length > 0 && (
                  <div className="doc-detail-tasks">
                    <h4>任务列表 ({selectedDoc.tasks.length})</h4>
                    {selectedDoc.tasks.map(task => (
                      <div key={task.id} className="task-item">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={(e) => handleUpdateTaskStatus(
                            task.id,
                            e.target.checked ? 'completed' : 'todo'
                          )}
                        />
                        <span className={`task-text ${task.status === 'completed' ? 'completed' : ''}`}>
                          {task.text}
                        </span>
                        <span className="task-priority">{PRIORITY_ICONS[task.priority]}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedDoc.content && (
                  <div className="doc-detail-content-preview">
                    <h4>内容预览</h4>
                    <pre className="content-preview">{selectedDoc.content.substring(0, 1000)}...</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

