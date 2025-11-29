/**
 * AI玩家区域组件
 * 显示所有AI玩家的区域
 * 使用统一的AI玩家头像组件
 */

import React from 'react';
import { Player } from '../../types/card';
import { AIPlayerAvatar } from './AIPlayerAvatar';

interface AIPlayersAreaProps {
  players: Player[];
  currentPlayerIndex: number;
  lastPlayPlayerIndex: number | null;
  playerCount?: number; // 玩家总数（用于判断最后一名）
}

export const AIPlayersArea: React.FC<AIPlayersAreaProps> = ({
  players,
  currentPlayerIndex,
  lastPlayPlayerIndex,
  playerCount
}) => {
  const aiPlayers = players.filter(player => !player.isHuman);

  return (
    <div className="other-players-area ai-players-avatar-area">
      {aiPlayers.map((player) => {
        const isCurrent = currentPlayerIndex === player.id;
        const isLastPlay = lastPlayPlayerIndex === player.id;
        
        return (
          <AIPlayerAvatar
            key={player.id}
            player={player}
            isCurrent={isCurrent}
            isLastPlay={isLastPlay}
            showPosition={false}
            playerCount={playerCount}
          />
        );
      })}
    </div>
  );
};

