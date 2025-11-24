/**
 * 出牌管理工具函数
 * 处理出牌相关的逻辑，包括墩的计分、出牌记录等
 */

import { Card, Play, Player } from '../types/card';
import { calculateCardsScore, isScoreCard, calculateDunCount, calculateDunScore } from './cardUtils';
import { triggerBigDunReaction, triggerGoodPlayReaction, triggerDunPlayedReaction } from '../services/chatService';
import { animationService } from '../services/animationService';
import { getDunAnimationConfig } from '../config/animationConfig';

/**
 * 处理墩的计分逻辑
 * 返回更新后的玩家数组和墩的分数
 */
export function handleDunScoring(
  players: Player[],
  playerIndex: number,
  cards: Card[],
  playerCount: number,
  play: Play
): { updatedPlayers: Player[]; dunScore: number } {
  const newPlayers = [...players];
  let dunScore = 0;
  
  const isDun = play.type === 'dun';
  if (isDun) {
    const dunCount = calculateDunCount(cards.length);
    const dunScoreResult = calculateDunScore(dunCount, playerCount, playerIndex);
    dunScore = dunScoreResult.dunPlayerScore;
    
    // 从每个其他玩家扣除分数
    newPlayers.forEach((p, idx) => {
      if (idx !== playerIndex) {
        p.score = (p.score || 0) - dunScoreResult.otherPlayersScore;
      }
    });
    
    // 触发大墩反应（其他玩家的惊呼，异步，不阻塞）
    triggerBigDunReaction(newPlayers, playerIndex, cards.length).catch(console.error);
    
    // 触发出墩时的得意话（出牌玩家的得意话，异步，不阻塞）
    const dunPlayer = newPlayers[playerIndex];
    if (dunPlayer) {
      triggerDunPlayedReaction(dunPlayer).catch(console.error);
    }
  }
  
  return { updatedPlayers: newPlayers, dunScore };
}

/**
 * 创建出牌记录
 */
export function createPlayRecord(
  playerIndex: number,
  playerName: string,
  cards: Card[],
  playScore: number
): any {
  const scoreCards = cards.filter(card => isScoreCard(card));
  return {
    playerId: playerIndex,
    playerName: playerName,
    cards: cards,
    scoreCards: scoreCards,
    score: playScore
  };
}

/**
 * 处理出牌后的玩家更新（包括手牌、分数等）
 */
export function updatePlayerAfterPlay(
  player: Player,
  cards: Card[],
  dunScore: number
): Player {
  const newHand = player.hand.filter(
    card => !cards.some(c => c.id === card.id)
  );
  
  return {
    ...player,
    hand: newHand,
    score: (player.score || 0) + dunScore // 如果是墩，立即加上墩的分数
  };
}

/**
 * 触发好牌反应（炸弹、墩、有分牌）
 * 异步函数，不阻塞调用
 */
export function triggerGoodPlayReactions(
  player: Player,
  play: Play,
  scoreCards: Card[]
): void {
  if (play.type === 'bomb' || play.type === 'dun' || scoreCards.length > 0) {
    // 异步触发，不阻塞
    triggerGoodPlayReaction(player).catch(console.error);
  }
}

