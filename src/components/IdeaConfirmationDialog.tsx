/**
 * 想法确认对话框
 * 在游戏过程中弹出，让用户选择是否采纳想法
 */

import React, { useState } from 'react';
import { GameIdea } from '../services/ideaGenerationService';
import { useGameConfigContext } from '../contexts/GameConfigContext';
import './IdeaConfirmationDialog.css';

interface IdeaConfirmationDialogProps {
  idea: GameIdea;
  onAdopt: (idea: GameIdea, documentTitle?: string) => void;
  onReject: (idea: GameIdea) => void;
  onClose: () => void;
}

export const IdeaConfirmationDialog: React.FC<IdeaConfirmationDialogProps> = ({
  idea,
  onAdopt,
  onReject,
  onClose,
}) => {
  const [documentTitle, setDocumentTitle] = useState(idea.title);
  const [showDetails, setShowDetails] = useState(false);
  const gameConfig = useGameConfigContext();

  const handleAdopt = () => {
    onAdopt(idea, documentTitle);
    onClose();
  };

  const handleReject = () => {
    onReject(idea);
    onClose();
  };

  const handleDisableIdeaGeneration = () => {
    gameConfig.setIdeaGenerationEnabled(false);
    onClose();
  };

  const categoryLabels = {
    optimization: '优化',
    feature: '功能',
    ux: '用户体验',
    performance: '性能',
    refactor: '重构',
    design: '设计',
  };

  const priorityColors = {
    high: '#dc3545',
    medium: '#ffc107',
    low: '#17a2b8',
  };

  return (
    <div className="idea-dialog-overlay" onClick={onClose}>
      <div className="idea-dialog-container" onClick={(e) => e.stopPropagation()}>
        <div className="idea-dialog-header">
          <div className="idea-dialog-title-section">
            <h2>💡 新想法建议</h2>
            <div className="idea-badges">
              <span
                className="idea-category-badge"
                style={{ backgroundColor: priorityColors[idea.priority] }}
              >
                {categoryLabels[idea.category]}
              </span>
              <span
                className="idea-priority-badge"
                style={{ backgroundColor: priorityColors[idea.priority] }}
              >
                {idea.priority === 'high' ? '高' : idea.priority === 'medium' ? '中' : '低'}
              </span>
            </div>
          </div>
          <button className="idea-dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="idea-dialog-body">
          <div className="idea-title-input">
            <label>设计文档标题：</label>
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="输入设计文档标题"
            />
          </div>

          <div className="idea-description">
            <h3>{idea.title}</h3>
            <p>{idea.description}</p>
          </div>

          <div className="idea-impact">
            <div className="impact-item">
              <span className="impact-label">预期影响：</span>
              <span className="impact-value">{idea.impact.estimated}</span>
            </div>
            <div className="impact-item">
              <span className="impact-label">预期收益：</span>
              <span className="impact-value">{idea.impact.benefit}</span>
            </div>
            <div className="impact-item">
              <span className="impact-label">预估工作量：</span>
              <span className="impact-value">
                {idea.impact.effort === 'high' ? '高' : idea.impact.effort === 'medium' ? '中' : '低'}
              </span>
            </div>
          </div>

          {idea.suggestions.length > 0 && (
            <div className="idea-suggestions">
              <h4>具体建议：</h4>
              <ul>
                {idea.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            className="idea-toggle-details"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '隐藏' : '显示'}详细信息
          </button>

          {showDetails && (
            <div className="idea-details">
              <div className="detail-section">
                <h4>触发原因：</h4>
                <p>{idea.context.trigger}</p>
              </div>
              {idea.cursorPrompt && (
                <div className="detail-section">
                  <h4>Cursor 提示词：</h4>
                  <pre className="cursor-prompt">{idea.cursorPrompt}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="idea-dialog-actions">
          <button 
            className="btn-disable-idea" 
            onClick={handleDisableIdeaGeneration}
            title="关闭想法建议功能，不再弹出此类窗口"
          >
            🔕 关闭想法建议
          </button>
          <button className="btn-reject" onClick={handleReject}>
            放弃
          </button>
          <button className="btn-adopt" onClick={handleAdopt}>
            ✅ 采纳并加入设计队列
          </button>
        </div>
      </div>
    </div>
  );
};

