/**
 * 训练数据导出工具
 * 用于导出和管理LLM训练数据
 */

import React, { useState } from 'react';
import { useMasterAIBrain } from '../../hooks/useMasterAIBrain';
import './TrainingDataExporter.css';

export const TrainingDataExporter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // 导出训练数据
  const handleExport = () => {
    // 从Master AI Brain导出
    // 这里需要通过Context或props获取api
    console.log('导出训练数据...');
  };
  
  if (!isOpen) {
    return (
      <button 
        className="training-data-btn"
        onClick={() => setIsOpen(true)}
        title="训练数据导出"
      >
        📊 训练数据
      </button>
    );
  }
  
  return (
    <div className="training-data-exporter">
      <div className="exporter-header">
        <h3>🎓 LLM训练数据</h3>
        <button onClick={() => setIsOpen(false)}>×</button>
      </div>
      
      <div className="exporter-content">
        <div className="stats-section">
          <h4>数据统计</h4>
          <div className="stat-item">
            <span>总数据点:</span>
            <span>0</span>
          </div>
          <div className="stat-item">
            <span>优秀样本:</span>
            <span>0</span>
          </div>
          <div className="stat-item">
            <span>良好样本:</span>
            <span>0</span>
          </div>
        </div>
        
        <div className="export-section">
          <h4>导出选项</h4>
          
          <label>
            <input type="checkbox" defaultChecked />
            只导出高质量样本
          </label>
          
          <label>
            格式:
            <select>
              <option value="jsonl">JSONL (推荐)</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          
          <button className="export-btn" onClick={handleExport}>
            📥 导出数据
          </button>
        </div>
        
        <div className="info-section">
          <p>💡 提示：收集100+局游戏数据后再导出效果更好</p>
          <p>📊 JSONL格式可直接用于LLM微调训练</p>
        </div>
      </div>
    </div>
  );
};

