/**
 * 出牌管理工具函数
 * 处理出牌相关的逻辑，包括墩的计分、出牌记录等
 */

import { Card, Play, Player } from '../types/card';
import { isScoreCard, calculateDunCount, calculateDunScore } from './cardUtils';
import { triggerBigDunReaction, triggerGoodPlayReaction, triggerDunPlayedReaction } from '../services/chatService';
import { animationService } from '../services/animationService';
import { getDunAnimationConfig } from '../config/animationConfig';

/**
 * 处理墩的计分逻辑
 * 返回更新后的玩家数组和墩的分数
 * @param animationPosition 动画位置（可选，如果提供则触发动画）
 */
export function handleDunScoring(
  players: Player[],
  playerIndex: number,
  cards: Card[],
  playerCount: number,
  play: Play,
  animationPosition?: { x: number; y: number }
): { updatedPlayers: Player[]; dunScore: number } {
  const newPlayers = [...players];
  let dunScore = 0;
  
  const isDun = play.type === 'dun';
  if (isDun) {
    const dunCount = calculateDunCount(cards.length);
    const dunScoreResult = calculateDunScore(dunCount, playerCount, playerIndex);
    dunScore = dunScoreResult.dunPlayerScore;
    
    // 更新出墩玩家的墩数统计
    if (newPlayers[playerIndex]) {
      const currentPlayer = newPlayers[playerIndex];
      newPlayers[playerIndex] = {
        ...currentPlayer,
        dunCount: ((currentPlayer as any).dunCount || 0) + dunCount
      } as Player;
    }
    
    // 注释掉扣分逻辑：player.score 应该只记录捡到的分牌，墩分通过 dunCount 单独计算
    // 从每个其他玩家扣除分数
    // newPlayers.forEach((p, idx) => {
    //   if (idx !== playerIndex) {
    //     p.score = (p.score || 0) - dunScoreResult.otherPlayersScore;
    //   }
    // });
    
    // 触发出墩爆炸动画（如果提供了位置）
    if (animationPosition) {
      const config = getDunAnimationConfig(cards.length);
      animationService.triggerDunExplosion({
        playerId: playerIndex,
        playerName: newPlayers[playerIndex]?.name || `玩家${playerIndex}`,
        dunSize: cards.length,
        intensity: config.intensity,
        position: animationPosition
      });
    }
    
    // 触发大墩反应（其他玩家的惊呼，异步，不阻塞）
    triggerBigDunReaction(newPlayers, playerIndex, cards.length).catch(() => {});
    
    // 触发出墩时的得意话（出牌玩家的得意话，异步，不阻塞）
    const dunPlayer = newPlayers[playerIndex];
    if (dunPlayer) {
      triggerDunPlayedReaction(dunPlayer).catch(() => {});
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
  
  const result = {
    ...player,
    hand: newHand,
    // 不要把墩分加到 player.score！player.score 只记录捡到的分牌（5、10、K）
    // 墩分已经通过 dunCount 记录在 handleDunScoring 中了
    score: player.score || 0
    // 注意：dunCount 已经在 handleDunScoring 中更新了，这里不需要再次更新
  };
  
  return result;
}

/**
 * 触发好牌反应（炸弹、墩、有分牌）
 * 异步函数，不阻塞调用
 */
export function triggerGoodPlayReactions(
  player: Player,
  play: Play,
  scoreCards: Card[],
  fullGameState?: any
): void {
  if (play.type === 'bomb' || play.type === 'dun' || scoreCards.length > 0) {
    // 异步触发，不阻塞
    const context = {
      eventData: {
        cardType: play.type,
        playValue: play.value,
        scoreCards: scoreCards.length
      }
    };
    triggerGoodPlayReaction(player, context, fullGameState).catch(() => {});
  }
}

