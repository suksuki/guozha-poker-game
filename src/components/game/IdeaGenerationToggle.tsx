/**
 * 想法生成开关组件
 * 在游戏过程中可以随时开启/关闭想法建议功能
 */

import React from 'react';
import './IdeaGenerationToggle.css';

interface IdeaGenerationToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const IdeaGenerationToggle: React.FC<IdeaGenerationToggleProps> = ({
  enabled,
  onChange
}) => {
  return (
    <div className="idea-generation-toggle">
      <button
        className={`idea-toggle-btn ${enabled ? 'enabled' : 'disabled'}`}
        onClick={() => onChange(!enabled)}
        title={enabled ? '点击关闭想法建议' : '点击开启想法建议'}
      >
        <span className="idea-toggle-icon">{enabled ? '💡' : '💡'}</span>
        <span className="idea-toggle-text">
          {enabled ? '想法建议: 开启' : '想法建议: 关闭'}
        </span>
      </button>
    </div>
  );
};

