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
  const { t } = useTranslation(['game']);

  return (
    <div className="action-buttons-wrapper">
      {/* 提示信息放在按钮上面 */}
      {!canPass && isPlayerTurn && lastPlay && (
        <div className="must-play-hint-compact">
          ⚠️ {t('game:hints.mustPlay')}
        </div>
      )}
      {/* 按钮区域 */}
      <div className="action-buttons-compact">
        <button
          className="btn-action-compact btn-play"
          onClick={onPlay}
          disabled={selectedCardsCount === 0 || !isPlayerTurn}
        >
          <span className="btn-icon">🎴</span>
          <span className="btn-text">{selectedCardsCount > 0 ? `出牌 (${selectedCardsCount})` : '出牌'}</span>
        </button>
        <button
          className="btn-action-compact btn-pass"
          onClick={onPass}
          disabled={!isPlayerTurn || !lastPlay || !canPass}
          title={!canPass && isPlayerTurn && lastPlay ? t('game:hints.mustPlayTitle') : t('game:actions.pass')}
        >
          <span className="btn-icon">❌</span>
          <span className="btn-text">{!canPass && isPlayerTurn && lastPlay ? '必须出' : '要不起'}</span>
        </button>
        <button
          className="btn-action-compact btn-suggest"
          onClick={onSuggest}
          disabled={!isPlayerTurn || isSuggesting}
          title={t('game:actions.aiSuggest')}
        >
          <span className="btn-icon">{isSuggesting ? '🤔' : '💡'}</span>
          <span className="btn-text">{isSuggesting ? '思考中' : 'AI建议'}</span>
        </button>
      </div>
    </div>
  );
};

