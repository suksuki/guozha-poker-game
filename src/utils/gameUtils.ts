/**
 * 游戏工具函数
 * 包含游戏中常用的工具函数
 */

import { CardType, Player } from '../types/card';
import React from 'react';

// 获取牌型名称
export function getCardTypeName(type: CardType): string {
  const names: { [key: string]: string } = {
    'single': '单张',
    'pair': '对子',
    'triple': '三张',
    'bomb': '炸弹',
    'dun': '墩'
  };
  return names[type] || '';
}

// 获取当前玩家
export function getCurrentPlayer(players: Player[], currentPlayerIndex: number): Player | undefined {
  return players[currentPlayerIndex];
}

// 获取点数显示
export function getRankDisplay(rank: number): string {
  const rankMap: { [key: number]: string } = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
    16: '小王', 17: '大王'
  };
  return rankMap[rank] || '';
}

