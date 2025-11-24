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
    <div className="action-buttons-top">
      <button
        className="btn-action btn-suggest"
        onClick={onSuggest}
        disabled={!isPlayerTurn || isSuggesting}
      >
        {isSuggesting ? t('game:actions.aiThinking') : t('game:actions.aiSuggest')}
      </button>
      <button
        className="btn-action"
        onClick={onPlay}
        disabled={selectedCardsCount === 0 || !isPlayerTurn}
      >
        {t('game:actions.playWithCount', { count: selectedCardsCount })}
      </button>
      <button
        className="btn-action btn-pass"
        onClick={onPass}
        disabled={!isPlayerTurn || !lastPlay || !canPass}
        title={!canPass && isPlayerTurn && lastPlay ? t('game:hints.mustPlayTitle') : t('game:actions.pass')}
      >
        {!canPass && isPlayerTurn && lastPlay ? t('game:actions.mustPlay') : t('game:actions.pass')}
      </button>
      {!canPass && isPlayerTurn && lastPlay && (
        <div className="must-play-hint">
          ⚠️ {t('game:hints.mustPlay')}
        </div>
      )}
    </div>
  );
};

