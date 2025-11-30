/**
 * 出牌区域组件
 * 显示当前出牌信息
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Player } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { getCardTypeName } from '../../utils/gameUtils';

interface PlayAreaProps {
  lastPlay: Play | null;
  lastPlayPlayerName?: string;
  lastPlayPlayerIndex?: number | null;
  players?: Player[];
  roundScore: number;
}

export const PlayArea: React.FC<PlayAreaProps> = ({
  lastPlay,
  lastPlayPlayerName,
  lastPlayPlayerIndex,
  players = [],
  roundScore
}) => {
  const { t } = useTranslation('game');

  // 获取玩家头像emoji（和AIPlayerAvatar中的逻辑一致）
  const getPlayerAvatar = (playerId: number | null | undefined): string => {
    if (playerId === null || playerId === undefined) return '🤖';
    const emojis = ['🤖', '👾', '🤖', '👽', '🤖', '👻', '🤖', '🦾'];
    return emojis[playerId % 8];
  };

  // 如果有玩家索引，就显示头像；否则显示默认头像
  const shouldShowAvatar = lastPlayPlayerIndex !== null && lastPlayPlayerIndex !== undefined;
  const playerAvatar = shouldShowAvatar ? getPlayerAvatar(lastPlayPlayerIndex) : '🤖';

  return (
    <div className="play-area">
      {lastPlay && (
        <div className="last-play">
          <div className="play-cards" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '5px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0', marginBottom: '20px' }}>
            {lastPlay.cards.map((card) => (
              <CardComponent key={card.id} card={card} size="medium" />
            ))}
          </div>
        </div>
      )}
      {!lastPlay && (
        <div className="no-play">
          <span className="no-play-icon">🎯</span>
          <span className="no-play-text">{t('playArea.noPlay')}</span>
        </div>
      )}
    </div>
  );
};

