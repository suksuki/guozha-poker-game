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

  // 获取玩家头像emoji（区分人类玩家和AI玩家）
  const getPlayerAvatar = (playerId: number | null | undefined): string => {
    if (playerId === null || playerId === undefined) return '🤖';
    
    // 查找玩家信息
    const player = players.find(p => p.id === playerId);
    
    // 如果是人类玩家，使用人类玩家头像
    if (player && player.isHuman) {
      return '🐱'; // 人类玩家使用小猫头像（和 PlayerInfo 一致）
    }
    
    // AI玩家使用emoji数组
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
          {/* 显示玩家头像和名称 */}
          {shouldShowAvatar && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '24px' }}>{playerAvatar}</span>
              {lastPlayPlayerName && (
                <span style={{ fontSize: '14px', color: '#666' }}>{lastPlayPlayerName}</span>
              )}
            </div>
          )}
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

