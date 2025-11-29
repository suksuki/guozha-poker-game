import { Player, Card, RoundRecord, RoundPlayRecord, Rank } from '../types/card';
import { SystemApplication } from './system';
import { ValidationModule } from './system/modules/validation/ValidationModule';

/**
 * 验证 allRounds 的牌数完整性（每次更新 allRounds 时调用）
 * 从 allRounds 中提取所有牌，加上玩家手牌，验证是否等于初始手牌总数
 * 
 * 向后兼容包装：优先使用新的验证模块，如果不可用则使用旧的验证逻辑
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
  // 尝试使用新的验证模块
  try {
    const systemApp = SystemApplication.getInstance();
    const validationModule = systemApp.getModule<ValidationModule>('validation');
    
    if (validationModule && validationModule.isEnabled()) {
      // 使用新的验证模块
      const validationContext = {
        players,
        allRounds,
        currentRoundPlays: currentRoundPlays || [],
        initialHands,
        trigger: 'roundEnd' as const,
        context: context || 'allRounds 更新',
        timestamp: Date.now()
      };
      
      validationModule.validateCardIntegrity(validationContext);
      return; // 使用新模块后直接返回
    }
  } catch (error) {
    // 新模块不可用，降级到旧方法
    console.warn('[validateAllRoundsOnUpdate] 新验证模块不可用，使用旧方法', error);
  }
  
  // 降级：使用旧的验证逻辑
  const result = validateCardIntegrityCore(
    players,
    allRounds,
    currentRoundPlays || [],
    initialHands,
    {
      detectDuplicates: true,
      logDetails: false, // 自己处理详细日志
      errorPrefix: 'allRounds 更新后牌数不完整'
    }
  );

  if (!result.isValid) {
    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('cardValidationError', { 
      detail: {
        message: result.errorMessage || '验证失败',
        details: {
          expected: result.totalCardsExpected,
          found: result.totalCardsFound,
          missing: result.missingCards,
          allRoundsCount: allRounds.length,
          playedCardsCount: result.playedCardsCount,
          playerHandsCount: result.playerHandsCount,
          duplicateCardsCount: result.duplicateCards.length,
          context
        }
      }
    }));
    
    // 详细统计每个玩家的手牌数
    const playerHandsDetail = players.map((player) => ({
      playerId: player.id,
      playerName: player.name,
      handCount: player.hand?.length || 0,
      handCards: player.hand?.map(c => `${c.suit}-${c.rank}`).slice(0, 10) || [] // 只显示前10张，避免日志过长
    }));

    // 详细统计每个轮次的牌数
    const roundsDetail = allRounds.map((round) => {
      const roundCards: Card[] = [];
      round.plays?.forEach((play: RoundPlayRecord) => {
        if (play.cards && Array.isArray(play.cards)) {
          roundCards.push(...play.cards);
        }
      });
      
      return {
        roundNumber: round.roundNumber,
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
      error: result.errorMessage,
      expected: result.totalCardsExpected,
      found: result.totalCardsFound,
      missing: result.missingCards,
      allRoundsCount: allRounds.length,
      playedCardsCount: result.playedCardsCount,
      currentRoundPlaysCount: currentRoundPlays?.length || 0,
      playerHandsCount: result.playerHandsCount,
      duplicateCardsCount: result.duplicateCards.length,
      duplicateCards: result.duplicateCards.length > 0 ? result.duplicateCards.slice(0, 5) : [], // 只显示前5张重复牌
      playerHandsDetail,
      breakdown: {
        allRoundsCards: result.details.playedCardsByRound.reduce((sum, r) => sum + r.count, 0),
        currentRoundCards: currentRoundPlays?.reduce((sum, p) => sum + (p.cards?.length || 0), 0) || 0,
        playerHands: result.playerHandsCount,
        sum: result.totalCardsFound
      },
      roundsDetail,
      currentRoundDetail,
      // 基于 suit-rank 的近似分析：哪些牌型多了/少了（用于快速定位问题牌型）
      extraCardsApprox: extraCardsSummary,
      missingCardsApprox: missingCardsSummary,
      context
    });
  } else {
    console.log(`[AllRoundsValidation] ✅ ${context || 'allRounds 更新'}时卡牌验证通过`, {
      expected: result.totalCardsExpected,
      found: result.totalCardsFound,
      allRoundsCount: allRounds.length,
      playedCardsCount: result.playedCardsCount,
      currentRoundPlaysCount: currentRoundPlays?.length || 0,
      playerHandsCount: result.playerHandsCount,
      duplicateCardsCount: result.duplicateCards.length,
      context
    });
  }

  // 注意：分数验证已移出此函数
  // 分数验证应该在游戏结束时单独调用 validateScoreIntegrity
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
  const detailedLog = {
    expectedTotal,
    actualTotal,
    missingCards,
    playedCardsCount,
    playerHandsCount,
    initialHandsTotal: initialHands ? initialHands.reduce((sum, hand) => sum + hand.length, 0) : 'N/A',
    initialHandsByPlayer: initialHands ? initialHands.map((hand, i) => ({ player: i, count: hand.length })) : 'N/A',
    playerHandsByPlayer,
    allRoundsCount: allRounds?.length || 0,
    currentRoundPlaysCount: currentRoundPlays?.length || 0,
    allRoundsDetails: allRounds?.map((round, idx) => ({
      roundNumber: round.roundNumber,
      playsCount: round.plays?.length || 0,
      cardsInRound: round.plays?.reduce((sum: number, p: any) => sum + (p.cards?.length || 0), 0) || 0
    })) || [],
    currentRoundPlaysDetails: currentRoundPlays?.map((play, idx) => ({
      index: idx,
      playerId: play.playerId,
      playerName: play.playerName,
      cardsCount: play.cards?.length || 0
    })) || []
  };
  
  console.log('[CardValidation] 📊 详细验证信息:', detailedLog);
  
  // 检查是否完整
  // 如果提供了 initialHands，严格要求牌数必须完全匹配
  // 如果没有 initialHands 且游戏刚开始（没有出牌），允许小的差异（<=10张）作为容错
  const isValid = missingCards === 0 || (
    !initialHands && // 没有初始手牌时才允许容错
    playedCardsCount === 0 && // 游戏刚开始，没有出牌
    Math.abs(missingCards) <= 10 // 允许小的差异（可能是发牌算法的正常差异）
  );
  
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
 * 完整的牌数完整性验证结果
 */
export interface CardValidationResult {
  isValid: boolean;
  totalCardsExpected: number;
  totalCardsFound: number;
  missingCards: number;
  playedCardsCount: number;
  playerHandsCount: number;
  duplicateCards: Array<{ card: Card; locations: string[] }>;
  errorMessage?: string;
  details: {
    playedCardsByRound: Array<{ roundNumber: number; count: number }>;
    playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }>;
  };
}

/**
 * 验证选项
 */
interface ValidationOptions {
  /** 是否检测重复牌 */
  detectDuplicates?: boolean;
  /** 是否记录详细日志 */
  logDetails?: boolean;
  /** 错误消息前缀 */
  errorPrefix?: string;
}

/**
 * 核心验证函数 - 统一的牌数完整性验证
 * 检查：所有轮次已出牌 + 当前轮次出牌 + 所有玩家手上的牌 = 完整牌组
 * 并检测重复牌
 * 
 * @param players 所有玩家
 * @param allRounds 所有已完成的轮次记录
 * @param currentRoundPlays 当前轮次的出牌记录（可选）
 * @param initialHands 初始手牌（用于计算总牌数）
 * @param options 验证选项
 * @returns 验证结果
 */
function validateCardIntegrityCore(
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
  const allPlayerHandCards: Card[] = [];
  
  players.forEach(player => {
    const handCount = player.hand?.length || 0;
    playerHandsByPlayer.push({
      playerId: player.id,
      playerName: player.name,
      count: handCount
    });
    if (player.hand) {
      allPlayerHandCards.push(...player.hand);
    }
  });

  // 计算实际总数
  const totalCardsFound = allRoundsPlayedCards.length + currentRoundCards.length + playerHandsCount;
  
  // 计算缺失的牌数（>0 表示少牌，<0 表示多牌）
  const missingCards = totalCardsExpected - totalCardsFound;

  // 检测重复牌（使用 Card.id 而不是 suit-rank，因为多副牌游戏中相同 suit-rank 的牌可以有多个）
  const duplicateCards: Array<{ card: Card; locations: string[] }> = [];
  if (detectDuplicates) {
    // 收集所有牌，并记录位置（使用 Card.id 作为唯一标识）
    const cardMap = new Map<string, { card: Card; locations: string[] }>();
    
    // 函数：添加牌并记录位置
    const addCardWithLocation = (card: Card, location: string) => {
      // 使用 Card.id 作为唯一标识，而不是 suit-rank
      // 因为多副牌游戏中，相同的 suit-rank 组合可以有多张（每副牌一张）
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
    
    // 检测重复：标准扑克牌每张牌只应该出现一次（不考虑多副牌的情况）
    // 对于一副标准扑克牌，每张牌最多出现一次
    // 如果同一张牌在多个位置出现，说明有重复
    // 但是需要排除初始手牌可能的重复（如果发牌算法允许的话）
    // 这里我们简单处理：如果同一张牌出现在2个或更多位置，就认为是重复
    cardMap.forEach((entry, key) => {
      if (entry.locations.length > 1) {
        duplicateCards.push({
          card: entry.card,
          locations: entry.locations
        });
      }
    });
  }

  // ==================== 额外：根据初始手牌推断“多出的牌 / 缺失的牌” ====================
  // 说明：
  // - 这里不改变原有 missingCards 逻辑，只在需要详细日志时，给出一个“近似”的排查线索
  // - 我们使用 suit-rank 组合来做 key（假设当前游戏只使用一副牌），
  //   这样可以和 initialHands 对齐，帮助定位哪几张牌数量对不上
  const extraCardsSummary: Array<{ key: string; diff: number }> = [];
  const missingCardsSummary: Array<{ key: string; diff: number }> = [];
  
  if (initialHands && options.logDetails && missingCards !== 0) {
    const getKey = (card: Card) => `${card.suit}-${card.rank}`;
    
    const initialCountMap = new Map<string, number>();
    const foundCountMap = new Map<string, number>();
    
    // 初始手牌计数
    initialHands.forEach(hand => {
      hand.forEach(card => {
        const key = getKey(card);
        initialCountMap.set(key, (initialCountMap.get(key) || 0) + 1);
      });
    });
    
    // 已出牌 + 当前轮次 + 玩家手牌计数
    const allFoundCards: Card[] = [
      ...allRoundsPlayedCards,
      ...currentRoundCards,
      ...allPlayerHandCards
    ];
    
    allFoundCards.forEach(card => {
      const key = getKey(card);
      foundCountMap.set(key, (foundCountMap.get(key) || 0) + 1);
    });
    
    // 对比差异：found > initial → 多出的牌；initial > found → 缺失的牌
    const allKeys = new Set<string>([
      ...Array.from(initialCountMap.keys()),
      ...Array.from(foundCountMap.keys())
    ]);
    
    allKeys.forEach(key => {
      const initialCount = initialCountMap.get(key) || 0;
      const foundCount = foundCountMap.get(key) || 0;
      const diff = foundCount - initialCount;
      
      if (diff > 0) {
        extraCardsSummary.push({ key, diff });
      } else if (diff < 0) {
        missingCardsSummary.push({ key, diff: -diff });
      }
    });
  }

  // 检查是否完整
  // 如果提供了 initialHands，严格要求牌数必须完全匹配
  // 如果没有 initialHands 且游戏刚开始（没有出牌），允许小的差异（<=10张）作为容错
  const isValid = missingCards === 0 || (
    !initialHands && // 没有初始手牌时才允许容错
    allRoundsPlayedCards.length === 0 && // 游戏刚开始，没有出牌
    currentRoundCards.length === 0 && // 当前轮次也没有出牌
    Math.abs(missingCards) <= 10 // 允许小的差异（可能是发牌算法的正常差异）
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
      errorMessage = `牌数不完整！期望: ${totalCardsExpected}张，实际: ${totalCardsFound}张，缺失: ${Math.abs(missingCards)}张`;
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
    console.log('[CardValidation] 📊 详细验证信息:', detailedLog);
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

/**
 * 完整的牌数完整性验证
 * 检查：所有轮次已出牌 + 当前轮次出牌 + 所有玩家手上的牌 = 完整牌组
 * 
 * @param players 所有玩家
 * @param allRounds 所有已完成的轮次记录
 * @param currentRoundPlays 当前轮次的出牌记录
 * @param playerCount 玩家数量（未使用，保留以保持API兼容性）
 * @param initialHands 初始手牌（用于计算总牌数）
 * @returns 验证结果
 */
export function validateCardIntegrity(
  players: Player[],
  allRounds: RoundRecord[],
  currentRoundPlays: RoundPlayRecord[],
  playerCount: number,
  initialHands?: Card[][]
): CardValidationResult {
  return validateCardIntegrityCore(
    players,
    allRounds,
    currentRoundPlays,
    initialHands,
    {
      detectDuplicates: true,
      logDetails: true,
      errorPrefix: '牌数不完整'
    }
  );
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
  return validateCardIntegrityCore(
    players,
    allRounds,
    currentRoundPlays || [],
    initialHands,
    {
      detectDuplicates: true,
      logDetails: true,
      errorPrefix: 'allRounds 牌数不完整'
    }
  );
}

/**
 * 验证分数完整性（仅在游戏结束时调用）
 * 所有玩家的分数总和应该为0（初始-100*玩家数，分牌总分+对应分数，最终规则调整总和为0）
 * 
 * 向后兼容包装：优先使用新的验证模块，如果不可用则使用旧的验证逻辑
 * 
 * @param players 所有玩家
 * @param initialHands 初始手牌（用于计算分牌总分）
 * @param context 上下文信息（用于调试）
 */
export function validateScoreIntegrity(
  players: Player[],
  initialHands?: Card[][],
  context?: string
): void {
  // 尝试使用新的验证模块
  try {
    const systemApp = SystemApplication.getInstance();
    const validationModule = systemApp.getModule<ValidationModule>('validation');
    
    if (validationModule && validationModule.isEnabled()) {
      // 使用新的验证模块
      const validationContext = {
        players,
        allRounds: [],
        initialHands,
        trigger: 'gameEnd' as const,
        context: context || '分数校验',
        timestamp: Date.now()
      };
      
      validationModule.validateScoreIntegrity(validationContext);
      return; // 使用新模块后直接返回
    }
  } catch (error) {
    // 新模块不可用，降级到旧方法
    console.warn('[validateScoreIntegrity] 新验证模块不可用，使用旧方法', error);
  }
  
  // 降级：使用旧的验证逻辑
  // 所有玩家的分数总和应该为0（初始-100*玩家数，分牌总分+对应分数，最终规则调整总和为0）
  const totalScore = players.reduce((sum, player) => sum + (player.score || 0), 0);
  
  // 计算初始分数总和（每个玩家-100）
  const initialTotalScore = -100 * players.length;
  
  // 计算分牌总分（从初始手牌中计算）
  let totalScoreCards = 0;
  if (initialHands) {
    initialHands.forEach(hand => {
      hand.forEach(card => {
        if (card.rank === Rank.FIVE) {
          totalScoreCards += 5;
        } else if (card.rank === Rank.TEN || card.rank === Rank.KING) {
          totalScoreCards += 10;
        }
      });
    });
  }
  
  // 验证分数总和是否为0（允许小的浮点数误差）
  if (Math.abs(totalScore) > 0.01) {
    const errorMessage = `分数总和不为0！当前总和=${totalScore}，期望=0`;
    
    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('scoreValidationError', { 
      detail: {
        message: errorMessage,
        details: {
          totalScore,
          expectedTotal: 0,
          playerCount: players.length,
          initialTotalScore,
          totalScoreCards,
          playerScores: players.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score || 0
          })),
          context
        }
      }
    }));
    
    console.error(`[ScoreValidation] ⚠️ ${context || '分数校验'}失败！${errorMessage}`, {
      totalScore,
      expectedTotal: 0,
      playerCount: players.length,
      initialTotalScore,
      totalScoreCards,
      playerScores: players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score || 0
      })),
      context
    });
  } else {
    console.log(`[ScoreValidation] ✅ ${context || '分数校验'}通过：分数总和=${totalScore}`, {
      totalScore,
      playerCount: players.length,
      initialTotalScore,
      totalScoreCards,
      playerScores: players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score || 0
      })),
      context
    });
  }
}