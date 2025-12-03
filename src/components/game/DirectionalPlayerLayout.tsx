/**
 * 方向性玩家布局组件
 * 4人模式下，玩家分别位于东南西北四个方向
 */

import React, { useMemo, useEffect } from 'react';
import { Player, RoundPlayRecord } from '../../types/card';
import { TeamConfig } from '../../types/team';
import { AIPlayerAvatar } from './AIPlayerAvatar';
import { PlayerPlaysArea } from './PlayerPlaysArea';
import { updateAllTeamScores } from '../../utils/teamScoring';
import './DirectionalPlayerLayout.css';

interface DirectionalPlayerLayoutProps {
  players: Player[];
  currentPlayerIndex: number;
  lastPlayPlayerIndex: number | null;
  humanPlayerIndex: number;
  teamConfig?: TeamConfig | null;
  roundPlays?: RoundPlayRecord[]; // 当前轮次的所有出牌记录
}

// 方向定义
type Direction = 'north' | 'south' | 'east' | 'west';

// 玩家位置配置
interface PlayerPosition {
  player: Player;
  direction: Direction;
  label: string; // 方向标签（北、南、东、西）
}

/**
 * 根据玩家索引和打牌顺序（顺时针），智能计算每个玩家的方向
 * 人类玩家固定在南边，其他玩家根据打牌顺序分配到对应方向：
 * - 下家（顺时针下一个）→ 西
 * - 对家（对面）→ 北
 * - 上家（顺时针上一个）→ 东
 */
function calculatePlayerPositions(
  players: Player[],
  humanPlayerIndex: number
): PlayerPosition[] {
  const positions: PlayerPosition[] = [];
  const playerCount = players.length;
  
  // 根据打牌顺序（顺时针）计算每个玩家的方向
  // 顺时针顺序：humanIndex → (humanIndex+1) → (humanIndex+2) → (humanIndex+3) → humanIndex
  
  // 计算相对于人类玩家的位置关系
  const nextPlayerIndex = (humanPlayerIndex + 1) % playerCount;      // 下家
  const oppositePlayerIndex = (humanPlayerIndex + 2) % playerCount;  // 对家
  const prevPlayerIndex = (humanPlayerIndex + playerCount - 1) % playerCount; // 上家
  
  // 为每个玩家分配方向，按players数组顺序
  players.forEach((player, index) => {
    if (index === humanPlayerIndex) {
      // 人类玩家固定在南边
      positions.push({
        player,
        direction: 'south',
        label: '南'
      });
    } else if (index === nextPlayerIndex) {
      // 下家（顺时针下一个）→ 西
      positions.push({
        player,
        direction: 'west',
        label: '西'
      });
    } else if (index === oppositePlayerIndex) {
      // 对家（对面）→ 北
      positions.push({
        player,
        direction: 'north',
        label: '北'
      });
    } else if (index === prevPlayerIndex) {
      // 上家（顺时针上一个）→ 东
      positions.push({
        player,
        direction: 'east',
        label: '东'
      });
    }
  });
  
  return positions;
}

export const DirectionalPlayerLayout: React.FC<DirectionalPlayerLayoutProps> = ({
  players,
  currentPlayerIndex,
  lastPlayPlayerIndex,
  humanPlayerIndex,
  teamConfig,
  roundPlays = []
}) => {
  const playerPositions = calculatePlayerPositions(players, humanPlayerIndex);
  
  // 判断游戏是否结束
  const isGameFinished = players.some(p => p.finishedRank !== null && p.finishedRank !== undefined && p.finishedRank > 0);
  
  // 更新团队分数（基于成员分数之和）- 仅在游戏进行中
  useEffect(() => {
    if (teamConfig && !isGameFinished) {
      updateAllTeamScores(players, teamConfig);
    }
  }, [players, teamConfig, isGameFinished]);
  
  // 按玩家ID分组出牌记录
  const playsByPlayer = useMemo(() => {
    const grouped: Map<number, RoundPlayRecord[]> = new Map();
    
    roundPlays.forEach((play) => {
      if (!grouped.has(play.playerId)) {
        grouped.set(play.playerId, []);
      }
      grouped.get(play.playerId)!.push(play);
    });
    
    return grouped;
  }, [roundPlays]);
  
  return (
    <div className="directional-player-layout">
      {playerPositions.map(({ player, direction, label }) => {
        const isCurrent = currentPlayerIndex === player.id;
        const isLastPlay = lastPlayPlayerIndex === player.id;
        const isHuman = player.isHuman;
        
        // 跳过人类玩家的显示（人类玩家的头像和信息已经在手牌左边显示）
        // 无论人类玩家在哪个方向，都不在方向性布局中显示
        if (isHuman) {
          return null;
        }
        
        // 获取该玩家的出牌记录
        const playerPlays = playsByPlayer.get(player.id) || [];
        
        return (
          <div
            key={player.id}
            className={`player-position player-${direction}`}
            data-direction={direction}
          >
            {/* 方向标签 */}
            <div className="direction-label">{label}</div>
            
            {/* 玩家头像 */}
            <AIPlayerAvatar
              player={player}
              isCurrent={isCurrent}
              isLastPlay={isLastPlay}
              showPosition={false}
              playerCount={players.length}
              teamConfig={teamConfig}
              allPlayers={players}
            />
            
            {/* 出牌区域 */}
            <PlayerPlaysArea
              playerId={player.id}
              plays={playerPlays}
              direction={direction}
              isLastPlay={isLastPlay}
            />
          </div>
        );
      })}
      
      {/* 中心区域（用于显示出牌区域等） */}
      <div className="center-area">
        {/* 这里可以放置出牌区域、轮次信息等 */}
      </div>
    </div>
  );
};

