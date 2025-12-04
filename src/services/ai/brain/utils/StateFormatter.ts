/**
 * 状态格式化工具
 * 用于将游戏状态转换为各种格式
 */

import { GameState, GameAction } from '../core/types';
import { Card, Play } from '../../../../types/card';

/**
 * 将游戏状态转换为文本描述（用于LLM）
 */
export function formatStateForLLM(state: GameState): string {
  const parts: string[] = [];
  
  // 基础信息
  parts.push(`=== 当前局面 ===`);
  parts.push(`回合: ${state.roundNumber}`);
  parts.push(`阶段: ${getPhaseText(state.phase)}`);
  parts.push(`我的位置: 玩家${state.myPosition}`);
  
  // 手牌
  parts.push(`\n我的手牌 (${state.myHand.length}张):`);
  parts.push(formatCards(state.myHand));
  
  // 上家出牌
  if (state.lastPlay) {
    parts.push(`\n上家出牌:`);
    parts.push(formatPlay(state.lastPlay));
  } else {
    parts.push(`\n轮到我先出牌`);
  }
  
  // 对手信息
  parts.push(`\n对手手牌数量:`);
  state.opponentHandSizes.forEach((size, idx) => {
    parts.push(`  玩家${idx + 1}: ${size}张`);
  });
  
  // 团队模式
  if (state.teamMode && state.teamConfig) {
    parts.push(`\n团队模式: 开启`);
    parts.push(`我的队伍: 队伍${state.myTeamId}`);
  }
  
  // 得分
  if (state.currentRoundScore > 0) {
    parts.push(`\n当前轮分数: ${state.currentRoundScore}`);
  }
  
  return parts.join('\n');
}

/**
 * 将游戏状态转换为JSON格式
 */
export function formatStateAsJSON(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * 将动作转换为文本描述
 */
export function formatAction(action: GameAction): string {
  if (action.type === 'pass') {
    return 'Pass (要不起)';
  }
  
  return `出牌: ${formatCards(action.cards)}`;
}

/**
 * 格式化卡牌列表
 */
export function formatCards(cards: Card[]): string {
  if (cards.length === 0) return '无';
  
  return cards
    .map(card => formatCard(card))
    .join(', ');
}

/**
 * 格式化单张卡牌
 */
export function formatCard(card: Card): string {
  const rankMap: Record<number, string> = {
    1: 'A',
    11: 'J',
    12: 'Q',
    13: 'K',
    14: '小王',
    15: '大王'
  };
  
  const suitMap: Record<string, string> = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
  };
  
  const rank = rankMap[card.rank] || card.rank.toString();
  const suit = suitMap[card.suit] || '';
  
  return `${suit}${rank}`;
}

/**
 * 格式化出牌
 */
export function formatPlay(play: Play): string {
  // TODO: 根据实际的Play类型定义实现
  return formatCards(play.cards);
}

/**
 * 获取阶段文本
 */
function getPhaseText(phase: string): string {
  const phaseMap: Record<string, string> = {
    'early': '开局',
    'middle': '中局',
    'late': '残局',
    'critical': '关键时刻'
  };
  
  return phaseMap[phase] || phase;
}

/**
 * 将卡牌转换为简短表示
 */
export function cardsToShortString(cards: Card[]): string {
  return cards
    .map(c => {
      if (c.rank === 14) return 'sj';  // 小王
      if (c.rank === 15) return 'bj';  // 大王
      return c.rank.toString();
    })
    .join(',');
}

/**
 * 从简短表示解析卡牌
 */
export function shortStringToCards(str: string): Card[] {
  // TODO: 实现解析逻辑
  return [];
}

