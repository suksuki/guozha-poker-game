/**
 * 知识库组件
 * 显示模式、历史记录、最佳实践
 */

import React, { useState, useEffect } from 'react';
import { getInteractionService } from '../../services/ai/control/interaction/InteractionService';
import './KnowledgeBase.css';

interface KnowledgeRecord {
  id: string;
  type: string;
  category: string;
  description: string;
  data: any;
  timestamp: number;
  count?: number;
}

export const KnowledgeBase: React.FC = () => {
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<KnowledgeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const interactionService = getInteractionService();
  
  // 加载知识库历史
  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const history = await interactionService.getKnowledgeHistory('all', 100);
      setRecords(history);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadHistory();
  }, []);
  
  // 获取分类列表
  const categories = Array.from(new Set(records.map(r => r.category || 'other')));
  
  // 过滤记录
  const filteredRecords = records.filter(record => {
    const matchCategory = selectedCategory === 'all' || record.category === selectedCategory;
    const matchSearch = !searchQuery || 
      record.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });
  
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };
  
  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'performance': return '📊';
      case 'error': return '🐛';
      case 'best-practice': return '✅';
      case 'optimization': return '🔧';
      default: return '📝';
    }
  };
  
  return (
    <div className="knowledge-base">
      <div className="knowledge-header">
        <h3>知识库</h3>
        <div className="knowledge-actions">
          <input
            type="text"
            placeholder="搜索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button onClick={loadHistory} disabled={isLoading}>
            {isLoading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>
      
      <div className="knowledge-content">
        <div className="knowledge-sidebar">
          <h4>分类</h4>
          <div className="category-list">
            <button
              className={`category-item ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              全部 ({records.length})
            </button>
            {categories.map(category => {
              const count = records.filter(r => r.category === category).length;
              return (
                <button
                  key={category}
                  className={`category-item ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {getCategoryIcon(category)} {category} ({count})
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="knowledge-main">
          <div className="records-list">
            {filteredRecords.length === 0 ? (
              <div className="empty-state">
                <p>暂无记录</p>
                <p className="empty-hint">知识库会从系统运行中自动学习</p>
              </div>
            ) : (
              filteredRecords.map(record => (
                <div
                  key={record.id}
                  className={`knowledge-card ${selectedRecord?.id === record.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="card-header">
                    <span className="card-icon">{getCategoryIcon(record.category || 'other')}</span>
                    <span className="card-type">{record.type}</span>
                    {record.count && (
                      <span className="card-count">出现{record.count}次</span>
                    )}
                  </div>
                  <div className="card-description">{record.description}</div>
                  <div className="card-timestamp">{formatDate(record.timestamp)}</div>
                </div>
              ))
            )}
          </div>
          
          {selectedRecord && (
            <div className="record-detail">
              <h4>记录详情</h4>
              <div className="detail-section">
                <div className="detail-item">
                  <span className="detail-label">类型:</span>
                  <span>{selectedRecord.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">分类:</span>
                  <span>{selectedRecord.category || 'other'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">描述:</span>
                  <span>{selectedRecord.description}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">时间:</span>
                  <span>{formatDate(selectedRecord.timestamp)}</span>
                </div>
                {selectedRecord.count && (
                  <div className="detail-item">
                    <span className="detail-label">出现次数:</span>
                    <span>{selectedRecord.count}</span>
                  </div>
                )}
              </div>
              
              {selectedRecord.data && (
                <div className="detail-section">
                  <h5>数据</h5>
                  <pre className="data-preview">
                    {JSON.stringify(selectedRecord.data, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="detail-actions">
                <button onClick={() => {
                  const data = JSON.stringify(selectedRecord, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `knowledge-${selectedRecord.id}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}>导出</button>
                <button onClick={() => setSelectedRecord(null)}>关闭</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

