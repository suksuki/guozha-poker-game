/**
 * 操作按钮组件
 * 显示游戏操作按钮（AI建议、出牌、要不起）
 */

import React from 'react';

interface ActionButtonsProps {
  isPlayerTurn: boolean;
  canPass: boolean;
  selectedCardsCount: number;
  isSuggesting: boolean;
  lastPlay: any;
  onSuggest: () => void;
  onPlay: () => void;
  onPass: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isPlayerTurn,
  canPass,
  selectedCardsCount,
  isSuggesting,
  lastPlay,
  onSuggest,
  onPlay,
  onPass
}) => {
  return (
    <div className="action-buttons-top">
      <button
        className="btn-action btn-suggest"
        onClick={onSuggest}
        disabled={!isPlayerTurn || isSuggesting}
      >
        {isSuggesting ? 'AI思考中...' : '🤖 AI建议'}
      </button>
      <button
        className="btn-action"
        onClick={onPlay}
        disabled={selectedCardsCount === 0 || !isPlayerTurn}
      >
        出牌 ({selectedCardsCount})
      </button>
      <button
        className="btn-action btn-pass"
        onClick={onPass}
        disabled={!isPlayerTurn || !lastPlay || !canPass}
        title={!canPass && isPlayerTurn && lastPlay ? "你有能打过的牌，必须出牌！" : "要不起"}
      >
        {!canPass && isPlayerTurn && lastPlay ? "必须出牌" : "要不起"}
      </button>
      {!canPass && isPlayerTurn && lastPlay && (
        <div className="must-play-hint">
          ⚠️ 你有能打过的牌，必须出牌！
        </div>
      )}
    </div>
  );
};

