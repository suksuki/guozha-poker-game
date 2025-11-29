/**
 * 催促出牌Hook
 * 检测对方一直不出牌的情况，触发催促反应
 */

import { useEffect, useRef } from 'react';
import { GameStatus, Player, PlayerType } from '../types/card';
import { triggerUrgePlayReaction } from '../services/chatService';
import { Game } from '../utils/Game';

interface UseUrgePlayOptions {
  game: Game;
  urgeDelay?: number; // 催促延迟时间（毫秒），默认5秒
  checkInterval?: number; // 检查间隔（毫秒），默认1秒
}

/**
 * 催促出牌Hook
 * 当人类玩家等待时间过长时，AI玩家会催促
 */
export function useUrgePlay({ 
  game, 
  urgeDelay = 5000, // 默认5秒
  checkInterval = 1000 // 默认1秒检查一次
}: UseUrgePlayOptions): void {
  const lastPlayerIndexRef = useRef<number | null>(null);
  const lastActionTimeRef = useRef<number>(Date.now());
  const urgeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 只在游戏进行中时启用
    if (game.status !== GameStatus.PLAYING) {
      if (urgeTimerRef.current) {
        clearTimeout(urgeTimerRef.current);
        urgeTimerRef.current = null;
      }
      return;
    }

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer) return;

    // 如果当前玩家是人类玩家
    if (currentPlayer.type === PlayerType.HUMAN) {
      // 如果玩家切换了，重置计时器
      if (lastPlayerIndexRef.current !== game.currentPlayerIndex) {
        lastPlayerIndexRef.current = game.currentPlayerIndex;
        lastActionTimeRef.current = Date.now();
        
        // 清除之前的定时器
        if (urgeTimerRef.current) {
          clearTimeout(urgeTimerRef.current);
        }
        
        // 设置新的催促定时器
        urgeTimerRef.current = setTimeout(() => {
          // 检查是否还是同一个玩家在等待
          if (game.currentPlayerIndex === lastPlayerIndexRef.current) {
            // 找到其他AI玩家，让他们催促
            game.players.forEach((player, idx) => {
              if (idx !== game.currentPlayerIndex && player.type === PlayerType.AI) {
                // 随机选择一些AI玩家催促（避免所有人同时催促）
                if (Math.random() < 0.4) {
                  triggerUrgePlayReaction(player, currentPlayer).catch(console.error);
                }
              }
            });
          }
        }, urgeDelay);
      }
    } else {
      // 当前玩家是AI，清除催促定时器
      if (urgeTimerRef.current) {
        clearTimeout(urgeTimerRef.current);
        urgeTimerRef.current = null;
      }
      lastPlayerIndexRef.current = null;
    }

    // 清理函数
    return () => {
      if (urgeTimerRef.current) {
        clearTimeout(urgeTimerRef.current);
        urgeTimerRef.current = null;
      }
    };
  }, [game.status, game.currentPlayerIndex, game.players, urgeDelay]);
}

