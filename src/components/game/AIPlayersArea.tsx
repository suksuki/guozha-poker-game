/**
 * AI玩家区域组件
 * 显示所有AI玩家的区域
 */

import React from 'react';
import { Player } from '../../types/card';
import { AIPlayerCard } from './AIPlayerCard';

interface AIPlayersAreaProps {
  players: Player[];
  currentPlayerIndex: number;
  lastPlayPlayerIndex: number | null;
}

export const AIPlayersArea: React.FC<AIPlayersAreaProps> = ({
  players,
  currentPlayerIndex,
  lastPlayPlayerIndex
}) => {
  const aiPlayers = players.filter(player => !player.isHuman);

  return (
    <div className="other-players-area">
      {aiPlayers.map((player) => {
        const isCurrent = currentPlayerIndex === player.id;
        const isLastPlay = lastPlayPlayerIndex === player.id;
        
        return (
          <AIPlayerCard
            key={player.id}
            player={player}
            isCurrent={isCurrent}
            isLastPlay={isLastPlay}
          />
        );
      })}
    </div>
  );
};

