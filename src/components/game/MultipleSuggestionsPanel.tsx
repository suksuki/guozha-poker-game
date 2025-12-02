/**
 * 多方案建议面板组件
 */

import React, { useState } from 'react';
import { MultipleSuggestionsResult, PlaySuggestion } from '../../services/cardPlaying/types';
import { SuggestionCard } from './SuggestionCard';
import './MultipleSuggestionsPanel.css';

interface MultipleSuggestionsPanelProps {
  suggestionsResult: MultipleSuggestionsResult;
  onSelect?: (suggestion: PlaySuggestion) => void;
  onClose?: () => void;
}

export const MultipleSuggestionsPanel: React.FC<MultipleSuggestionsPanelProps> = ({
  suggestionsResult,
  onSelect,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (suggestion: PlaySuggestion, index: number) => {
    setSelectedIndex(index);
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  return (
    <div className="multiple-suggestions-panel-overlay" onClick={onClose}>
      <div
        className="multiple-suggestions-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <h2>AI出牌建议</h2>
          <p className="panel-subtitle">
            为您提供了 {suggestionsResult.total} 个出牌方案，请选择一个
          </p>
          {onClose && (
            <button className="close-button" onClick={onClose}>
              ×
            </button>
          )}
        </div>

        <div className="suggestions-list">
          {suggestionsResult.suggestions.map((suggestion, index) => (
            <SuggestionCard
              key={index}
              suggestion={suggestion}
              index={index}
              isSelected={selectedIndex === index}
              onSelect={(s) => handleSelect(s, index)}
            />
          ))}
        </div>

        <div className="panel-footer">
          <div className="best-suggestion-info">
            {suggestionsResult.best && (
              <>
                <span className="best-label">推荐方案：</span>
                <span className="best-description">
                  {suggestionsResult.best.mainReason}
                </span>
              </>
            )}
          </div>
          {onClose && (
            <button className="cancel-button" onClick={onClose}>
              取消
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

