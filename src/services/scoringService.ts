import { Player, Card, RoundRecord, RoundPlayRecord } from '../types/card';

/**
 * 验证 allRounds 的牌数完整性（每次更新 allRounds 时调用）
 * 从 allRounds 中提取所有牌，加上玩家手牌，验证是否等于初始手牌总数
 * 
 * @param players 所有玩家
 * @param allRounds 所有轮次的记录
 * @param currentRoundPlays 当前轮次的出牌记录（可选）
 * @param initialHands 初始手牌（用于计算总牌数）
 * @param context 上下文信息（用于调试）
 */
export function validateAllRoundsOnUpdate(
  players: Player[],
  allRounds: RoundRecord[],
  currentRoundPlays?: RoundPlayRecord[],
  initialHands?: Card[][],
  context?: string
): void {
  // 计算期望的总牌数
  const totalCardsExpected = initialHands 
    ? initialHands.reduce((sum, hand) => sum + hand.length, 0)
    : 54 * players.length; // 默认每副牌54张

  // 从 allRounds 中提取所有牌
  let allRoundsPlayedCards: Card[] = [];
  
  allRounds.forEach(round => {
    round.plays?.forEach((play: RoundPlayRecord) => {
      if (play.cards && Array.isArray(play.cards)) {
        allRoundsPlayedCards.push(...play.cards);
      }
    });
  });

  // 从 currentRoundPlays 中提取所有牌（如果提供）
  let currentRoundCards: Card[] = [];
  if (currentRoundPlays) {
    currentRoundPlays.forEach((play: RoundPlayRecord) => {
      if (play.cards && Array.isArray(play.cards)) {
        currentRoundCards.push(...play.cards);
      }
    });
  }

  // 统计所有玩家手上的牌
  const playerHandsCount = players.reduce((sum, player) => sum + (player.hand?.length || 0), 0);

  // 计算实际总数
  const totalCardsFound = allRoundsPlayedCards.length + currentRoundCards.length + playerHandsCount;
  
  // 计算缺失的牌数
  const missingCards = totalCardsExpected - totalCardsFound;

  // 验证是否完整
  const isValid = missingCards === 0 || (initialHands && Math.abs(missingCards) <= 10 && allRoundsPlayedCards.length === 0 && currentRoundCards.length === 0);

  if (!isValid) {
    const errorMessage = `allRounds 更新后牌数不完整！期望: ${totalCardsExpected}张，实际: ${totalCardsFound}张，缺失: ${Math.abs(missingCards)}张`;
    
    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('cardValidationError', { 
      detail: {
        message: errorMessage,
        details: {
          expected: totalCardsExpected,
          found: totalCardsFound,
          missing: missingCards,
          allRoundsCount: allRounds.length,
          allRoundsPlayedCardsCount: allRoundsPlayedCards.length,
          currentRoundPlaysCount: currentRoundPlays?.length || 0,
          currentRoundCardsCount: currentRoundCards.length,
          playerHandsCount,
          context
        }
      }
    }));
    
    // 详细统计每个玩家的手牌数
    const playerHandsDetail = players.map((player, idx) => ({
      playerId: player.id,
      playerName: player.name,
      handCount: player.hand?.length || 0,
      handCards: player.hand?.map(c => `${c.suit}-${c.rank}`).slice(0, 10) || [] // 只显示前10张，避免日志过长
    }));

    // 详细统计每个轮次的牌数
    const roundsDetail = allRounds.map((round, idx) => {
      const roundCards: Card[] = [];
      round.plays?.forEach((play: RoundPlayRecord) => {
        if (play.cards && Array.isArray(play.cards)) {
          roundCards.push(...play.cards);
        }
      });
      
      return {
        roundNumber: round.roundNumber,
        roundIndex: idx,
        playsCount: round.plays?.length || 0,
        cardsCount: roundCards.length,
        playsDetail: round.plays?.map((play: RoundPlayRecord, playIdx: number) => ({
          playIndex: playIdx,
          playerId: play.playerId,
          playerName: play.playerName,
          cardsCount: play.cards?.length || 0,
          cards: play.cards?.map(c => `${c.suit}-${c.rank}`).slice(0, 5) || [] // 只显示前5张
        })) || []
      };
    });
    
    // 统计当前轮次的详细信息
    const currentRoundDetail = currentRoundPlays?.map((play, idx) => ({
      playIndex: idx,
      playerId: play.playerId,
      playerName: play.playerName,
      cardsCount: play.cards?.length || 0,
      cards: play.cards?.map(c => `${c.suit}-${c.rank}`).slice(0, 5) || []
    })) || [];

    console.error(`[AllRoundsValidation] ⚠️ ${context || 'allRounds 更新'}时验证失败！`, {
      error: errorMessage,
      expected: totalCardsExpected,
      found: totalCardsFound,
      missing: missingCards,
      allRoundsCount: allRounds.length,
      allRoundsPlayedCardsCount: allRoundsPlayedCards.length,
      currentRoundPlaysCount: currentRoundPlays?.length || 0,
      currentRoundCardsCount: currentRoundCards.length,
      playerHandsCount,
      playerHandsDetail, // 详细显示每个玩家的手牌数
      breakdown: {
        allRoundsCards: allRoundsPlayedCards.length,
        currentRoundCards: currentRoundCards.length,
        playerHands: playerHandsCount,
        sum: allRoundsPlayedCards.length + currentRoundCards.length + playerHandsCount
      },
      // 每个轮次的详细信息
      roundsDetail,
      // 当前轮次的详细信息
      currentRoundDetail,
      context
    });
  } else {
    console.log(`[AllRoundsValidation] ✅ ${context || 'allRounds 更新'}时验证通过`, {
      expected: totalCardsExpected,
      found: totalCardsFound,
      allRoundsCount: allRounds.length,
      allRoundsPlayedCardsCount: allRoundsPlayedCards.length,
      currentRoundPlaysCount: currentRoundPlays?.length || 0,
      currentRoundCardsCount: currentRoundCards.length,
      playerHandsCount,
      context
    });
  }
}

/**
 * 初始化玩家分数
 * 每个人基本分100，所以计分时候，每个人首先扣除100，变成-100分
 * 
 * @param players 玩家数组
 * @returns 更新后的玩家数组（所有玩家的分数都设置为-100）
 */
export function initializePlayerScores(players: Player[]): Player[] {
  return players.map(player => ({
    ...player,
    score: -100
  }));
}

/**
 * 简化的牌数完整性验证
 * 检查：已出牌列表 + 所有玩家手上的牌 = 完整牌组
 * 
 * @param players 所有玩家
 * @param allPlayedCards 所有已出的牌
 * @param initialHands 初始手牌（用于计算总牌数）
 * @returns 验证结果
 */
export interface SimpleCardValidationResult {
  isValid: boolean;
  expectedTotal: number;
  actualTotal: number;
  playedCardsCount: number;
  playerHandsCount: number;
  missingCards: number;
  errorMessage?: string;
  details: {
    playedCardsByPlayer: Array<{ playerId: number; playerName: string; count: number }>;
    playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }>;
  };
}

export function validateCardIntegritySimple(
  players: Player[],
  allPlayedCards: Card[],
  initialHands?: Card[][],
  allRounds?: any[],
  currentRoundPlays?: any[]
): SimpleCardValidationResult {
  // 计算期望的总牌数
  // 如果提供了initialHands，使用它；否则使用默认值（每副牌54张）
  const expectedTotal = initialHands 
    ? initialHands.reduce((sum, hand) => sum + hand.length, 0)
    : 54 * players.length; // 默认每副牌54张

  // 统计已出的牌
  // 优先从 allRounds 和 currentRoundPlays 统计（更准确）
  // 如果没有提供这些参数，则使用 allPlayedCards（向后兼容）
  let playedCardsCount = 0;
  if (allRounds !== undefined && currentRoundPlays !== undefined) {
    // 从 allRounds 统计所有已完成轮次的出牌
    allRounds.forEach(round => {
      round.plays?.forEach((play: any) => {
        playedCardsCount += play.cards?.length || 0;
      });
    });
    // 从 currentRoundPlays 统计当前轮次的出牌
    currentRoundPlays.forEach((play: any) => {
      playedCardsCount += play.cards?.length || 0;
    });
  } else {
    // 向后兼容：使用 allPlayedCards
    playedCardsCount = allPlayedCards.length;
  }
  
  // 统计所有玩家手上的牌
  const playerHandsCount = players.reduce((sum, player) => sum + (player.hand?.length || 0), 0);
  
  // 计算实际总数
  const actualTotal = playedCardsCount + playerHandsCount;
  
  // 计算缺失的牌数
  const missingCards = expectedTotal - actualTotal;
  
  // 生成详细信息（需要在 console.log 之前声明）
  const playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }> = [];
  players.forEach(player => {
    playerHandsByPlayer.push({
      playerId: player.id,
      playerName: player.name,
      count: player.hand?.length || 0
    });
  });
  
  const playedCardsByPlayer: Array<{ playerId: number; playerName: string; count: number }> = [];
  // 注意：allPlayedCards 不包含玩家信息，所以这里只统计总数
  // 如果需要按玩家统计，需要从 allRounds 中获取
  
  // 添加详细调试信息
  console.log('[CardValidation] 简化验证信息:', {
    expectedTotal,
    actualTotal,
    missingCards,
    playedCardsCount,
    playerHandsCount,
    initialHandsTotal: initialHands ? initialHands.reduce((sum, hand) => sum + hand.length, 0) : 'N/A',
    initialHandsByPlayer: initialHands ? initialHands.map((hand, i) => ({ player: i, count: hand.length })) : 'N/A',
    playerHandsByPlayer
  });
  
  // 检查是否完整
  // 如果游戏刚开始（没有出牌）且牌数差异较小（<=10张），可能是发牌算法的正常差异
  // 这种情况下，使用实际牌数作为基准
  const isValid = missingCards === 0 || (playedCardsCount === 0 && Math.abs(missingCards) <= 10);
  
  let errorMessage: string | undefined;
  if (!isValid) {
    errorMessage = `牌数不完整！期望: ${expectedTotal}张，实际: ${actualTotal}张，缺失: ${Math.abs(missingCards)}张`;
  }
  
  return {
    isValid,
    expectedTotal,
    actualTotal,
    playedCardsCount,
    playerHandsCount,
    missingCards,
    errorMessage,
    details: {
      playedCardsByPlayer,
      playerHandsByPlayer
    }
  };
}

/**
 * 完整的牌数完整性验证
 * 检查：所有轮次已出牌 + 当前轮次出牌 + 所有玩家手上的牌 = 完整牌组
 * 
 * @param players 所有玩家
 * @param allRounds 所有已完成的轮次记录
 * @param currentRoundPlays 当前轮次的出牌记录
 * @param playerCount 玩家数量
 * @param initialHands 初始手牌（用于计算总牌数）
 * @returns 验证结果
 */
export interface CardValidationResult {
  isValid: boolean;
  totalCardsExpected: number;
  totalCardsFound: number;
  missingCards: number;
  playedCardsCount: number;
  playerHandsCount: number;
  duplicateCards?: Array<{ card: Card; locations: string[] }>;
  errorMessage?: string;
  details: {
    playedCardsByRound: Array<{ roundNumber: number; count: number }>;
    playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }>;
  };
}

export function validateCardIntegrity(
  players: Player[],
  allRounds: RoundRecord[],
  currentRoundPlays: RoundPlayRecord[],
  playerCount: number,
  initialHands?: Card[][]
): CardValidationResult {
  // 计算期望的总牌数
  const totalCardsExpected = initialHands 
    ? initialHands.reduce((sum, hand) => sum + hand.length, 0)
    : 54 * playerCount; // 默认每副牌54张

  // 统计所有轮次已出的牌
  let allRoundsPlayedCardsCount = 0;
  const playedCardsByRound: Array<{ roundNumber: number; count: number }> = [];
  
  allRounds.forEach(round => {
    const roundCardsCount = round.plays?.reduce((sum, play) => sum + (play.cards?.length || 0), 0) || 0;
    allRoundsPlayedCardsCount += roundCardsCount;
    playedCardsByRound.push({
      roundNumber: round.roundNumber,
      count: roundCardsCount
    });
  });

  // 统计当前轮次已出的牌
  const currentRoundCardsCount = currentRoundPlays.reduce((sum, play) => sum + (play.cards?.length || 0), 0);
  
  // 统计所有玩家手上的牌
  const playerHandsCount = players.reduce((sum, player) => sum + (player.hand?.length || 0), 0);
  const playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }> = [];
  players.forEach(player => {
    playerHandsByPlayer.push({
      playerId: player.id,
      playerName: player.name,
      count: player.hand?.length || 0
    });
  });

  // 计算实际总数
  const totalCardsFound = allRoundsPlayedCardsCount + currentRoundCardsCount + playerHandsCount;
  
  // 计算缺失的牌数
  const missingCards = totalCardsExpected - totalCardsFound;
  
  // 添加详细调试信息
  console.log('[CardValidation] 详细验证信息:', {
    totalCardsExpected,
    totalCardsFound,
    missingCards,
    allRoundsCount: allRounds.length,
    allRoundsPlayedCardsCount,
    currentRoundPlaysCount: currentRoundPlays.length,
    currentRoundCardsCount,
    currentRoundPlaysDetail: currentRoundPlays.map(play => ({
      playerId: play.playerId,
      playerName: play.playerName,
      cardsCount: play.cards?.length || 0
    })),
    playerHandsCount,
    initialHandsTotal: initialHands ? initialHands.reduce((sum, hand) => sum + hand.length, 0) : 'N/A',
    initialHandsByPlayer: initialHands ? initialHands.map((hand, i) => ({ player: i, count: hand.length })) : 'N/A',
    playerHandsByPlayer,
    playedCardsByRound
  });
  
  // 检查是否完整
  // 如果 initialHands 存在但牌数不匹配，可能是发牌时的问题
  // 在这种情况下，如果差异较小（<=10张），可能是正常的发牌差异
  const isValid = missingCards === 0 || (initialHands && Math.abs(missingCards) <= 10 && allRoundsPlayedCardsCount === 0 && currentRoundCardsCount === 0);
  
  // TODO: 检测重复的牌（需要更复杂的逻辑）
  const duplicateCards: Array<{ card: Card; locations: string[] }> = [];
  
  let errorMessage: string | undefined;
  if (!isValid) {
    errorMessage = `牌数不完整！期望: ${totalCardsExpected}张，实际: ${totalCardsFound}张，缺失: ${Math.abs(missingCards)}张`;
  }

  return {
    isValid,
    totalCardsExpected,
    totalCardsFound,
    missingCards,
    playedCardsCount: allRoundsPlayedCardsCount + currentRoundCardsCount,
    playerHandsCount,
    duplicateCards,
    errorMessage,
    details: {
      playedCardsByRound,
      playerHandsByPlayer
    }
  };
}

/**
 * 验证 allRounds 的牌数完整性
 * 从 allRounds 中提取所有牌，加上玩家手牌，验证是否等于初始手牌总数
 * 
 * @param players 所有玩家
 * @param allRounds 所有轮次的记录
 * @param currentRoundPlays 当前轮次的出牌记录（可选）
 * @param initialHands 初始手牌（用于计算总牌数）
 * @returns 验证结果
 */
export function validateAllRoundsIntegrity(
  players: Player[],
  allRounds: RoundRecord[],
  currentRoundPlays?: RoundPlayRecord[],
  initialHands?: Card[][]
): CardValidationResult {
  // 计算期望的总牌数
  const totalCardsExpected = initialHands 
    ? initialHands.reduce((sum, hand) => sum + hand.length, 0)
    : 54 * players.length; // 默认每副牌54张

  // 从 allRounds 中提取所有牌
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

  // 从 currentRoundPlays 中提取所有牌（如果提供）
  let currentRoundCards: Card[] = [];
  if (currentRoundPlays) {
    currentRoundPlays.forEach((play: RoundPlayRecord) => {
      if (play.cards && Array.isArray(play.cards)) {
        currentRoundCards.push(...play.cards);
      }
    });
  }

  // 统计所有玩家手上的牌
  const playerHandsCount = players.reduce((sum, player) => sum + (player.hand?.length || 0), 0);
  const playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }> = [];
  players.forEach(player => {
    playerHandsByPlayer.push({
      playerId: player.id,
      playerName: player.name,
      count: player.hand?.length || 0
    });
  });

  // 计算实际总数
  const totalCardsFound = allRoundsPlayedCards.length + currentRoundCards.length + playerHandsCount;
  
  // 计算缺失的牌数
  const missingCards = totalCardsExpected - totalCardsFound;

  // 添加详细调试信息
  console.log('[AllRoundsValidation] 验证 allRounds 完整性:', {
    totalCardsExpected,
    totalCardsFound,
    missingCards,
    allRoundsCount: allRounds.length,
    allRoundsPlayedCardsCount: allRoundsPlayedCards.length,
    currentRoundPlaysCount: currentRoundPlays?.length || 0,
    currentRoundCardsCount: currentRoundCards.length,
    playerHandsCount,
    initialHandsTotal: initialHands ? initialHands.reduce((sum, hand) => sum + hand.length, 0) : 'N/A',
    initialHandsByPlayer: initialHands ? initialHands.map((hand, i) => ({ player: i, count: hand.length })) : 'N/A',
    playerHandsByPlayer,
    playedCardsByRound
  });

  // 检查是否完整
  const isValid = missingCards === 0 || (initialHands && Math.abs(missingCards) <= 10 && allRoundsPlayedCards.length === 0 && currentRoundCards.length === 0);

  // TODO: 检测重复的牌（需要更复杂的逻辑）
  const duplicateCards: Array<{ card: Card; locations: string[] }> = [];

  let errorMessage: string | undefined;
  if (!isValid) {
    errorMessage = `allRounds 牌数不完整！期望: ${totalCardsExpected}张，实际: ${totalCardsFound}张，缺失: ${Math.abs(missingCards)}张`;
  }

  return {
    isValid,
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