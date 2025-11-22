/**
 * 出牌区域组件
 * 显示当前出牌信息
 */

import React from 'react';
import { Play, Player } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { getCardTypeName } from '../../utils/gameUtils';

interface PlayAreaProps {
  lastPlay: Play | null;
  lastPlayPlayerName?: string;
  roundScore: number;
}

export const PlayArea: React.FC<PlayAreaProps> = ({
  lastPlay,
  lastPlayPlayerName,
  roundScore
}) => {
  return (
    <div className="play-area">
      {lastPlay && (
        <div className="last-play">
          <div className="play-label">
            {lastPlayPlayerName} 出牌:
          </div>
          <div className="play-cards">
            {lastPlay.cards.map((card) => (
              <CardComponent key={card.id} card={card} size="medium" />
            ))}
          </div>
          <div className="play-type">{getCardTypeName(lastPlay.type)}</div>
          {roundScore > 0 && (
            <div className="round-score">本轮分数: {roundScore} 分</div>
          )}
        </div>
      )}
      {!lastPlay && (
        <div className="no-play">可以出任意合法牌型</div>
      )}
    </div>
  );
};

