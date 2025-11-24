/**
 * 错误屏幕组件
 * 显示游戏状态错误信息
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorScreenProps {
  onReset: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ onReset }) => {
  const { t } = useTranslation(['game']);

  return (
    <div className="game-container">
      <div className="error-screen">
        <h2>{t('game:error.title')}</h2>
        <p>{t('game:error.message')}</p>
        <button className="btn-primary" onClick={onReset}>
          {t('game:error.backToStart')}
        </button>
      </div>
    </div>
  );
};

