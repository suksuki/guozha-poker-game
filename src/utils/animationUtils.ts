/**
 * 动画工具函数
 * 计算动画位置等辅助功能
 */

import { Player } from '../types/card';

/**
 * 计算玩家出牌时的动画位置
 * @param playerId 玩家ID
 * @param players 玩家数组
 * @param humanPlayerIndex 人类玩家索引
 * @param playerCount 玩家总数
 * @returns 动画位置（屏幕坐标）
 */
export function calculatePlayAnimationPosition(
  playerId: number,
  players: Player[],
  humanPlayerIndex: number,
  playerCount: number
): { x: number; y: number } {
  // 默认位置：屏幕中心
  const defaultPosition = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };

  // 如果是人类玩家，使用底部中心位置
  if (playerId === humanPlayerIndex) {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight - 150 // 底部向上150px
    };
  }

  // AI玩家：根据玩家索引计算位置
  // 假设AI玩家在顶部水平排列
  const aiPlayers = players.filter((_, idx) => idx !== humanPlayerIndex);
  const aiIndex = aiPlayers.findIndex(p => p.id === playerId);
  
  if (aiIndex === -1) {
    return defaultPosition;
  }

  const totalAIPlayers = aiPlayers.length;
  const spacing = window.innerWidth / (totalAIPlayers + 1);
  const x = spacing * (aiIndex + 1);
  const y = 150; // 顶部向下150px

  return { x, y };
}

/**
 * 计算出牌区域的中心位置
 * @returns 出牌区域中心位置
 */
export function getPlayAreaCenter(): { x: number; y: number } {
  // 出牌区域通常在屏幕中上部
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.4 // 屏幕高度的40%处
  };
}

