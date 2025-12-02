/**
 * 牌数完整性验证器
 * 从 scoringService.ts 中提取的核心验证逻辑
 */

import { Player, Card, RoundRecord, RoundPlayRecord } from '../../../../../types/card';
import { CardValidationResult } from '../types';

/**
 * 验证选项
 */
interface ValidationOptions {
  detectDuplicates?: boolean;
  logDetails?: boolean;
  errorPrefix?: string;
}

/**
 * 核心验证函数 - 统一的牌数完整性验证
 */
export function validateCardIntegrityCore(
  players: Player[],
  allRounds: RoundRecord[],
  currentRoundPlays: RoundPlayRecord[] = [],
  initialHands?: Card[][],
  options: ValidationOptions = {}
): CardValidationResult {
  const { detectDuplicates = true, logDetails = false } = options;
  
  // 计算期望的总牌数
  const totalCardsExpected = initialHands 
    ? initialHands.reduce((sum, hand) => sum + hand.length, 0)
    : 54 * players.length; // 默认每副牌54张

  // 统计所有轮次已出的牌
  let allRoundsPlayedCards: Card[] = [];
  const playedCardsByRound: Array<{ roundNumber: number; count: number }> = [];
  
  allRounds.forEach(round => {
    const roundCards: Card[] = [];
    round.plays?.forEach((play: RoundPlayRecord) => {
      if (play.cards && Array.isArray(play.cards)) {
        roundCards.push(...play.cards);
        allRoundsPlayedCards.push(...play.cards);
      }
    });
    playedCardsByRound.push({
      roundNumber: round.roundNumber,
      count: roundCards.length
    });
  });

  // 统计当前轮次已出的牌
  const currentRoundCards: Card[] = [];
  currentRoundPlays.forEach((play: RoundPlayRecord) => {
    if (play.cards && Array.isArray(play.cards)) {
      currentRoundCards.push(...play.cards);
    }
  });
  
  // 统计所有玩家手上的牌
  const playerHandsCount = players.reduce((sum, player) => sum + (player.hand?.length || 0), 0);
  const playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }> = [];
  
  players.forEach(player => {
    const handCount = player.hand?.length || 0;
    playerHandsByPlayer.push({
      playerId: player.id,
      playerName: player.name,
      count: handCount
    });
  });

  // 计算实际总数
  const totalCardsFound = allRoundsPlayedCards.length + currentRoundCards.length + playerHandsCount;
  
  // 计算缺失的牌数
  const missingCards = totalCardsExpected - totalCardsFound;

  // 检测重复牌（使用 Card.id 作为唯一标识）
  const duplicateCards: Array<{ card: Card; locations: string[] }> = [];
  if (detectDuplicates) {
    const cardMap = new Map<string, { card: Card; locations: string[] }>();
    
    const addCardWithLocation = (card: Card, location: string) => {
      const key = card.id || `${card.suit}-${card.rank}-${Date.now()}-${Math.random()}`;
      if (!cardMap.has(key)) {
        cardMap.set(key, { card, locations: [] });
      }
      const entry = cardMap.get(key)!;
      if (!entry.locations.includes(location)) {
        entry.locations.push(location);
      }
    };
    
    // 记录已出轮次中的牌
    allRounds.forEach((round) => {
      round.plays?.forEach((play: RoundPlayRecord, playIdx: number) => {
        if (play.cards && Array.isArray(play.cards)) {
          play.cards.forEach((card, cardIdx) => {
            addCardWithLocation(card, `轮次${round.roundNumber}-玩家${play.playerId}(${play.playerName || '未知'})出牌${playIdx}-第${cardIdx + 1}张`);
          });
        }
      });
    });
    
    // 记录当前轮次中的牌
    currentRoundPlays.forEach((play, playIdx) => {
      if (play.cards && Array.isArray(play.cards)) {
        play.cards.forEach((card, cardIdx) => {
          addCardWithLocation(card, `当前轮次-玩家${play.playerId}(${play.playerName || '未知'})出牌${playIdx}-第${cardIdx + 1}张`);
        });
      }
    });
    
    // 记录玩家手牌
    players.forEach((player) => {
      if (player.hand) {
        player.hand.forEach((card, cardIdx) => {
          addCardWithLocation(card, `玩家${player.id}(${player.name})手牌-第${cardIdx + 1}张`);
        });
      }
    });
    
    // 检测重复
    cardMap.forEach((entry) => {
      if (entry.locations.length > 1) {
        duplicateCards.push({
          card: entry.card,
          locations: entry.locations
        });
      }
    });
  }

  // 检查是否完整
  const isValid = missingCards === 0 || (
    !initialHands &&
    allRoundsPlayedCards.length === 0 &&
    currentRoundCards.length === 0 &&
    Math.abs(missingCards) <= 10
  );

  // 如果有重复牌，即使数量匹配，也应该标记为无效
  const finalIsValid = isValid && duplicateCards.length === 0;

  let errorMessage: string | undefined;
  if (!finalIsValid) {
    if (duplicateCards.length > 0) {
      errorMessage = `检测到 ${duplicateCards.length} 张重复牌！`;
      duplicateCards.forEach(dup => {
        errorMessage += `\n  牌 ${dup.card.suit}-${dup.card.rank} 出现在: ${dup.locations.join(', ')}`;
      });
    } else {
      errorMessage = `${options.errorPrefix || '牌数不完整'}！期望: ${totalCardsExpected}张，实际: ${totalCardsFound}张，缺失: ${Math.abs(missingCards)}张`;
    }
  }

  // 详细日志（可选）
  if (logDetails) {
    const detailedLog = {
      totalCardsExpected,
      totalCardsFound,
      missingCards,
      allRoundsCount: allRounds.length,
      allRoundsPlayedCardsCount: allRoundsPlayedCards.length,
      currentRoundPlaysCount: currentRoundPlays.length,
      currentRoundCardsCount: currentRoundCards.length,
      playerHandsCount,
      duplicateCardsCount: duplicateCards.length,
      initialHandsTotal: initialHands ? initialHands.reduce((sum, hand) => sum + hand.length, 0) : 'N/A',
      playedCardsByRound,
      playerHandsByPlayer
    };
  }

  return {
    isValid: finalIsValid,
    totalCardsExpected,
    totalCardsFound,
    missingCards,
    playedCardsCount: allRoundsPlayedCards.length + currentRoundCards.length,
    playerHandsCount,
    duplicateCards,
    errorMessage,
    details: {
      playedCardsByRound,
      playerHandsByPlayer
    }
  };
}

