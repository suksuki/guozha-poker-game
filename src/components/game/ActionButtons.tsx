/**
 * 操作按钮组件
 * 显示游戏操作按钮（AI建议、出牌、要不起）
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface ActionButtonsProps {
  isPlayerTurn: boolean;
  canPass: boolean;
  selectedCardsCount: number;
  isSuggesting: boolean;
  lastPlay: any;
  isAutoPlay?: boolean;
  onSuggest: () => void;
  onPlay: () => void;
  onPass: () => void;
  onToggleAutoPlay?: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isPlayerTurn,
  canPass,
  selectedCardsCount,
  isSuggesting,
  lastPlay,
  isAutoPlay = false,
  onSuggest,
  onPlay,
  onPass,
  onToggleAutoPlay
}) => {
  const { t } = useTranslation(['game']);

  // 如果托管中，只显示托管按钮
  if (isAutoPlay && onToggleAutoPlay) {
    return (
      <div className="action-buttons-wrapper">
        <div className="action-buttons-compact">
          <button
            className={`btn-action-compact btn-auto-play active`}
            onClick={onToggleAutoPlay}
            title="取消托管"
          >
            <span className="btn-icon">🤖</span>
            <span className="btn-text">托管中</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="action-buttons-wrapper">
      {/* 提示信息放在按钮上面 */}
      {!canPass && isPlayerTurn && lastPlay && (
        <div className="must-play-hint-compact">
          ⚠️ {t('game:hints.mustPlay')}
        </div>
      )}
      {/* 按钮区域 - 调整顺序：AI建议、出牌、要不起、托管 */}
      <div className="action-buttons-compact">
        {/* 1. AI建议按钮（最左边） */}
        <button
          className="btn-action-compact btn-suggest"
          onClick={onSuggest}
          disabled={!isPlayerTurn || isSuggesting}
          title={t('game:actions.aiSuggest')}
        >
          <span className="btn-icon">{isSuggesting ? '🤔' : '💡'}</span>
          <span className="btn-text">{isSuggesting ? '思考中' : 'AI建议'}</span>
        </button>
        {/* 2. 出牌按钮（第二） */}
        <button
          className="btn-action-compact btn-play"
          onClick={onPlay}
          disabled={selectedCardsCount === 0 || !isPlayerTurn}
        >
          <span className="btn-icon">🎴</span>
          <span className="btn-text">{selectedCardsCount > 0 ? `出牌 (${selectedCardsCount})` : '出牌'}</span>
        </button>
        {/* 3. 要不起按钮（第三） */}
        <button
          className="btn-action-compact btn-pass"
          onClick={onPass}
          disabled={!isPlayerTurn || !lastPlay || !canPass}
          title={!canPass && isPlayerTurn && lastPlay ? t('game:hints.mustPlayTitle') : t('game:actions.pass')}
        >
          <span className="btn-icon">❌</span>
          <span className="btn-text">{!canPass && isPlayerTurn && lastPlay ? '必须出' : '要不起'}</span>
        </button>
        {/* 4. 托管按钮（第四） */}
        {onToggleAutoPlay && (
          <button
            className={`btn-action-compact btn-auto-play ${isAutoPlay ? 'active' : ''}`}
            onClick={onToggleAutoPlay}
            title={isAutoPlay ? '关闭托管' : '开启托管'}
          >
            <span className="btn-icon">{isAutoPlay ? '🤖' : '⏸️'}</span>
            <span className="btn-text">{isAutoPlay ? '托管中' : '托管'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

