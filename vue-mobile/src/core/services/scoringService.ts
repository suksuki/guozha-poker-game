import { Player, Card, RoundRecord, RoundPlayRecord, Rank } from '../types/card';
import { SystemApplication } from './system';
import { ValidationModule } from './system/modules/validation/ValidationModule';
import { Team, TeamConfig, TeamRanking } from '../types/team';
import { updateTeamScore, getTeam, getPlayerTeamId } from '../utils/teamManager';

// ==================== 1. 基础计分功能 (来自 cardUtils.ts) ====================

/**
 * 判断是否是分牌
 * 规则：5=5分，10=10分，K=10分
 */
export function isScoreCard(card: Card): boolean {
  return card.rank === Rank.FIVE || card.rank === Rank.TEN || card.rank === Rank.KING;
}

/**
 * 获取单张牌的分值
 */
export function getCardScore(card: Card): number {
  if (card.rank === Rank.FIVE) {
    return 5;
  } else if (card.rank === Rank.TEN || card.rank === Rank.KING) {
    return 10;
  }
  return 0;
}

/**
 * 计算一组牌的总分值
 */
export function calculateCardsScore(cards: Card[]): number {
  return cards.reduce((total, card) => total + getCardScore(card), 0);
}

/**
 * 计算墩的数量
 * 规则：7张=1墩，8张=2墩，9张=4墩，10张=8墩，11张=16墩...（翻倍）
 */
export function calculateDunCount(cardCount: number): number {
  if (cardCount < 7) {
    return 0; // 少于7张不是墩
  }

  // 7张 = 1墩 (2^0)
  // 8张 = 2墩 (2^1)
  // 9张 = 4墩 (2^2)
  // 10张 = 8墩 (2^3)
  // 11张 = 16墩 (2^4)
  // ...
  const exponent = cardCount - 7;
  return Math.pow(2, exponent);
}

/**
 * 计算墩的分数结果接口
 */
export interface DunScoreResult {
  dunPlayerScore: number;    // 出墩玩家获得的分数
  otherPlayersScore: number; // 每个其他玩家扣除的分数
}

/**
 * 计算墩的分数
 * 规则：每个墩从每个其他玩家扣除30分，出墩的玩家增加 (其他玩家数 × 30分 × 墩数)
 */
export function calculateDunScore(dunCount: number, totalPlayers: number, dunPlayerIndex: number): DunScoreResult {
  if (dunCount === 0) {
    return { dunPlayerScore: 0, otherPlayersScore: 0 };
  }

  const otherPlayersCount = totalPlayers - 1;
  const scorePerDun = 30;

  // 出墩玩家获得的分数 = 其他玩家数 × 30分 × 墩数
  const dunPlayerScore = otherPlayersCount * scorePerDun * dunCount;

  // 每个其他玩家扣除的分数 = 30分 × 墩数
  const otherPlayersScore = scorePerDun * dunCount;

  return { dunPlayerScore, otherPlayersScore };
}

// ==================== 2. 团队计分功能 (来自 teamScoring.ts) ====================

/**
 * 计算玩家手牌分数（捡到的分数）
 */
export function calculatePlayerPickedScore(player: Player): number {
  return player.score || 0;
}

/**
 * 计算玩家墩分（实时）
 * 规则：
 * - 我出了墩：从每个其他玩家得到 30分 × 我的墩数
 * - 别人出了墩：给出墩的人 30分 × 他的墩数
 * 
 * 总墩分 = (我的墩数 × 30 × 其他玩家数) - (其他所有玩家的墩数总和 × 30)
 */
export function calculatePlayerDunScore(player: Player, allPlayers: Player[]): number {
  const myDunCount = player.dunCount || 0;
  const otherPlayersCount = allPlayers.length - 1;

  // 我从别人那得到的分数：每个其他玩家给我 30分 × 我的墩数
  const myEarnings = myDunCount * 30 * otherPlayersCount;

  // 我给别人的分数：其他所有玩家的墩，我都要给他们每墩30分
  const othersTotalDunCount = allPlayers
    .filter(p => p.id !== player.id)
    .reduce((sum, p) => sum + (p.dunCount || 0), 0);
  const myLosses = othersTotalDunCount * 30;

  return myEarnings - myLosses;
}

/**
 * 计算团队总分（所有成员的实时总分之和）
 */
export function calculateTeamScore(teamId: number, players: Player[], teamConfig: TeamConfig): number {
  const team = teamConfig.teams.find(t => t.id === teamId);
  if (!team) return 0;

  return team.players.reduce((sum, playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return sum;

    const pickedScore = calculatePlayerPickedScore(player);
    const dunScore = calculatePlayerDunScore(player, players);
    const totalScore = pickedScore + dunScore;

    return sum + totalScore;
  }, 0);
}

/**
 * 计算团队总墩数
 */
export function calculateTeamDunCount(teamId: number, players: Player[], teamConfig: TeamConfig): number {
  const team = teamConfig.teams.find(t => t.id === teamId);
  if (!team) return 0;

  return team.players.reduce((sum, playerId) => {
    const player = players.find(p => p.id === playerId);
    return sum + (player?.dunCount || 0);
  }, 0);
}

/**
 * 更新所有团队的分数（基于成员分数之和）
 */
export function updateAllTeamScores(players: Player[], teamConfig: TeamConfig): void {
  teamConfig.teams.forEach(team => {
    team.teamScore = calculateTeamScore(team.id, players, teamConfig);
  });
}

/**
 * 将分数分配给团队（而不是个人）
 */
export function allocateScoreToTeam(
  playerIndex: number,
  score: number,
  teamConfig: TeamConfig
): void {
  const teamId = getPlayerTeamId(playerIndex, teamConfig);
  if (teamId !== null) {
    updateTeamScore(teamId, score, teamConfig);
  }
}


/**
 * 计算团队最终排名和分数
 * 规则：
 * 1. 按团队分数排序
 * 2. 头游团队+30分（或+60分），末游团队-30分（或-60分）
 * 3. 末游团队剩余分牌转移给头游团队
 */
export function calculateTeamRankings(
  teams: Team[],
  finishOrder: number[],  // 玩家出完牌的顺序
  players: Player[],
  teamConfig: TeamConfig
): TeamRanking[] {
  // 创建团队排名数组
  // 注意：finalScore 应该基于 players 的最终分数计算（包括手牌分转移、关单/关双、扣除基础分后的手牌分 + 墩分）
  const rankings: TeamRanking[] = teams.map(team => {
    // 计算团队的最终总分（所有队员的最终手牌分 + 墩分）
    const teamTotalScore = calculateTeamScore(team.id, players, teamConfig);
    return {
      team: { ...team },
      rank: 0,
      finalScore: teamTotalScore
    };
  });

  // 确定头游和末游团队
  // 头游 = 第一个出完牌的玩家所在团队
  // 末游 = 最后一个出完牌的玩家所在团队

  const firstFinishedPlayerId = finishOrder[0];
  const lastFinishedPlayerId = finishOrder[finishOrder.length - 1];

  const firstTeamId = getPlayerTeamId(firstFinishedPlayerId, teamConfig);
  const lastTeamId = getPlayerTeamId(lastFinishedPlayerId, teamConfig);

  // 应用最终规则：头游团队+30分，末游团队-30分
  if (firstTeamId !== null) {
    rankings[firstTeamId].finalScore += 30;
  }
  if (lastTeamId !== null && lastTeamId !== firstTeamId) {
    rankings[lastTeamId].finalScore -= 30;
  }

  // 处理末游团队剩余分牌
  if (lastTeamId !== null && firstTeamId !== null && lastTeamId !== firstTeamId) {
    // 找到末游团队的所有玩家
    const lastTeam = getTeam(lastTeamId, teamConfig);
    if (lastTeam) {
      // 计算末游团队剩余分牌分数
      let remainingScore = 0;
      for (const playerId of lastTeam.players) {
        const player = players[playerId];
        if (player) {
          const scoreCards = player.hand.filter(card => isScoreCard(card));
          remainingScore += calculateCardsScore(scoreCards);
        }
      }

      if (remainingScore > 0) {
        // 从末游团队扣除
        rankings[lastTeamId].finalScore -= remainingScore;
        // 给头游团队加上
        rankings[firstTeamId].finalScore += remainingScore;
      }
    }
  }

  // 根据最终分数排序（分数高的排名靠前）
  rankings.sort((a, b) => b.finalScore - a.finalScore);

  // 重新分配排名
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });

  return rankings;
}

/**
 * 在游戏结束时应用团队最终规则
 * 
 * 清算顺序（只操作玩家）：
 * 1. 手牌分转移：最后一名的手牌分给第一名（如果关双，倒数第一、倒数第二的手牌分都给第一名）
 * 2. 关双惩罚：如果关双，倒数第一、倒数第二的手牌分再扣15（变成-15），第一名再加30
 * 3. 未出分牌转移：所有未出完牌的玩家手上的分牌，都给第二名
 * 4. 计算每个玩家总分：总分 = 手牌分 + 墩分
 * 5. 扣除基础分100：从总分里硬减100
 * 6. 计算团队总分：团队总分 = 所有队员的总分相加
 */
export function applyTeamFinalRules(
  teams: Team[],
  finishOrder: number[],
  players: Player[],
  teamConfig: TeamConfig
): { teams: Team[]; rankings: TeamRanking[]; finalPlayers: Player[] } {
  // 创建玩家副本，避免修改原数组
  const finalPlayers = players.map(p => ({ ...p, hand: [...(p.hand || [])] }));

  // 为每个玩家创建一个临时的手牌分累积器（用于转移计算，不修改player.score）
  const handScoreAdjustments = new Map<number, number>();
  finalPlayers.forEach(p => {
    handScoreAdjustments.set(p.id, p.score || 0); // 初始为原始手牌分
  });

  // 判断是否关双/关三（未出完人数）- 直接检查手牌数量
  const unfinishedPlayerIds = finalPlayers.filter(p => p.hand && p.hand.length > 0).map(p => p.id);
  const unfinishedCount = unfinishedPlayerIds.length;
  const isGuanSan = unfinishedCount === 3; // 3v3 模式下的关三
  const isGuanShuang = unfinishedCount === 2;
  const isGuanDan = unfinishedCount === 1;

  // 1. 手牌分转移 & 关牌惩罚
  // 分两种情况：有关牌（Unfinished） 和 无关牌（Normal）

  const firstPlayerId = finishOrder[0];

  if (unfinishedCount > 0) {
    // 这种情况是“关牌”（Guan）：有玩家未出完
    // 在团队模式下，未出完的肯定是对手（因为如果是队友，游戏早在全部队友出完前就结束了？）
    // 这里的规则：所有未出完玩家的手牌分都给第一名，且应用关牌惩罚

    // 1.1 手牌分转移
    unfinishedPlayerIds.forEach(playerId => {
      const handScore = handScoreAdjustments.get(playerId) || 0;
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + handScore);
      handScoreAdjustments.set(playerId, 0);
    });

    // 1.2 关单/关双/关三惩罚和奖励
    if (isGuanSan) {
      // 关三：未出完的3个玩家各扣10，第一名加30
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + 30);
      unfinishedPlayerIds.forEach(playerId => {
        handScoreAdjustments.set(playerId, (handScoreAdjustments.get(playerId) || 0) - 10);
      });
    } else if (isGuanShuang) {
      // 关双：未出完的2个玩家各扣15，第一名加30
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + 30);
      unfinishedPlayerIds.forEach(playerId => {
        handScoreAdjustments.set(playerId, (handScoreAdjustments.get(playerId) || 0) - 15);
      });
    } else if (isGuanDan) {
      // 关单：未出完的1个玩家扣30，第一名加30
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + 30);
      const unfinishedPlayerId = unfinishedPlayerIds[0];
      handScoreAdjustments.set(unfinishedPlayerId, (handScoreAdjustments.get(unfinishedPlayerId) || 0) - 30);
    }
  } else if (finishOrder.length >= 2) {
    // 这种情况是“正常完赛”（所有人都出完了）
    // 规则：最后一名的手牌分给第一名（除非是队友）

    // 检查第一名和最后一名是否是队友
    const lastPlayerId = finishOrder[finishOrder.length - 1];
    const firstPlayerTeamId = getPlayerTeamId(firstPlayerId, teamConfig);
    const lastPlayerTeamId = getPlayerTeamId(lastPlayerId, teamConfig);
    const isTeammate = firstPlayerTeamId !== null && firstPlayerTeamId === lastPlayerTeamId;

    if (!isTeammate) {
      const handScore = handScoreAdjustments.get(lastPlayerId) || 0;
      handScoreAdjustments.set(firstPlayerId, (handScoreAdjustments.get(firstPlayerId) || 0) + handScore);
      handScoreAdjustments.set(lastPlayerId, 0);
    }
  }


  // 3. 未出分牌转移：所有还有手牌的玩家，手上的分牌都给特定玩家
  // 规则：
  // - 如果是关牌（Guan），给第一名
  // - 如果是正常完赛，给第二名
  const targetPlayerId = unfinishedCount > 0 ? finishOrder[0] : (finishOrder.length >= 2 ? finishOrder[1] : null);

  if (targetPlayerId !== null && targetPlayerId !== undefined) {
    let totalRemainingScore = 0;

    // 遍历所有玩家，检查手上是否还有牌
    finalPlayers.forEach(player => {
      // 排除接收者自己（虽然接收者通常出完牌了，但也防止万一）
      if (player.id === targetPlayerId) return;

      if (player.hand && player.hand.length > 0) {
        const scoreCards = player.hand.filter(card => isScoreCard(card));
        const remainingScore = calculateCardsScore(scoreCards);
        if (remainingScore > 0) {
          totalRemainingScore += remainingScore;
          // 从持有者扣除（虽然通常持有者是输家，分数可能已经是负的了，但逻辑上要扣）
          // 注意：如果是关牌，持有者的picked score已经在Step 1被清零了。这里扣的是remaining score。
          // 如果我们要体现"没收"，那么持有者应该减去这个分？
          // 或者说，持有者这部分分本来就没加到 score 里（score只记picked），所以不用减？
          // 不，score只记录picked。remaining cards never added to score.
          // So we don't need to subtract from holder's score (because they never got it).
          // We just ADD to target's score.
        }
      }
    });

    if (totalRemainingScore > 0) {
      handScoreAdjustments.set(targetPlayerId, (handScoreAdjustments.get(targetPlayerId) || 0) + totalRemainingScore);
    }
  }

  // 4. 计算每个玩家总分 = (转移后的手牌分 + 墩分) - 100，保存到finalScore字段
  finalPlayers.forEach(player => {
    const adjustedHandScore = handScoreAdjustments.get(player.id) || 0; // 转移后的手牌分
    const dunScore = calculatePlayerDunScore(player, finalPlayers); // 墩分
    const totalScore = adjustedHandScore + dunScore; // 总分
    const finalScore = totalScore - 100; // 最终分数（扣除基础分100）

    // 保存到finalScore字段（用于显示和排名）
    (player as any).finalScore = finalScore;
    (player as any).adjustedHandScore = adjustedHandScore; // 转移后的手牌分
    // player.score 保持原始手牌分不变
  });

  // 5. 计算团队总分（所有队员的finalScore相加）
  const updatedTeams = teams.map(team => {
    const teamTotalScore = team.players.reduce((sum, playerId) => {
      const player = finalPlayers[playerId];
      return sum + ((player as any).finalScore || 0);
    }, 0);

    return {
      ...team,
      teamScore: teamTotalScore
    };
  });

  // 6. 计算团队排名（按团队总分排序）
  const rankings: TeamRanking[] = updatedTeams.map(team => ({
    team: { ...team },
    rank: 0,
    finalScore: team.teamScore
  }));

  rankings.sort((a, b) => b.finalScore - a.finalScore);
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });

  return { teams: updatedTeams, rankings, finalPlayers };
}

/**
 * 验证团队分数总和
 * 所有团队的分数总和应该为0（初始-100*人数，分牌总分+100*人数，最终规则+30-30=0）
 */
export function validateTeamScores(
  teams: Team[],
  playerCount: number
): boolean {
  const totalScore = teams.reduce((sum, team) => sum + team.teamScore, 0);
  const expectedTotal = 0;

  if (Math.abs(totalScore - expectedTotal) > 0.01) {
    return false;
  }

  return true;
}

// ==================== 3. 验证功能 (现有功能) ====================

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
  } else {
  }

  // 注意：分数验证已移出此函数
  // 分数验证应该在游戏结束时单独调用 validateScoreIntegrity
}

/**
 * 初始化玩家分数
 * 初始分数为0（实时显示手牌分，游戏结束时才扣除基础分100）
 * 
 * @param players 玩家数组
 * @returns 更新后的玩家数组（所有玩家的分数都设置为0）
 */
export function initializePlayerScores(players: Player[]): Player[] {
  return players.map(player => ({
    ...player,
    score: 0
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

  // 生成详细信息
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
  }
}

// ==================== 4. 个人计分功能 (来自 gameRules.ts) ====================

// 玩家排名信息
export interface PlayerRanking {
  player: Player;
  rank: number; // 排名（1表示第一名）
  finalScore: number; // 最终分数
}

/**
 * 计算个人模式游戏结束时的最终排名和分数
 * 规则：
 * 1. 首先按手牌数量排序确定排名（手牌少的在前，手牌数相同时先出完的在前）
 * 2. 基于排名：第一名+30分，最后一名-30分
 * 3. 如果最后一名手上有未出的分牌，要给第二名
 * 4. 最终排名以分数为准（分数高的排名靠前）
 */
export function calculateIndividualRankings(
  players: Player[],
  finishOrder: number[] // 玩家出完牌的顺序
): PlayerRanking[] {
  // 创建排名数组
  const rankings: PlayerRanking[] = players.map((player, index) => ({
    player: { ...player },
    rank: 0,
    finalScore: player.score || 0
  }));

  // 第一步：按手牌数量排序（手牌少的在前）
  rankings.sort((a, b) => {
    const aHandCount = a.player.hand.length;
    const bHandCount = b.player.hand.length;

    if (aHandCount !== bHandCount) {
      return aHandCount - bHandCount;
    }

    // 如果手牌数量相同，按出牌顺序排序
    const aFinishIndex = finishOrder.indexOf(a.player.id);
    const bFinishIndex = finishOrder.indexOf(b.player.id);

    if (aFinishIndex === -1 && bFinishIndex === -1) {
      return 0; // 都没出完，保持原顺序
    }
    if (aFinishIndex === -1) return 1; // a没出完，排后面
    if (bFinishIndex === -1) return -1; // b没出完，排前面

    return aFinishIndex - bFinishIndex; // 出完的早的排前面
  });

  // 第二步：分配排名
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });

  // 保存应用最终规则前的分数（用于日志记录）
  const scoreBeforeFinalRules = new Map<number, number>();
  rankings.forEach(r => {
    scoreBeforeFinalRules.set(r.player.id, r.finalScore);
  });

  // 第三步：基于出牌排名，第一名+30分，最后一名-30分
  if (rankings.length >= 2) {
    const firstPlace = rankings[0];
    const lastPlace = rankings[rankings.length - 1];
    const secondPlace = rankings[1];

    // 第一名 +30
    firstPlace.finalScore += 30;
    // 最后一名 -30
    lastPlace.finalScore -= 30;

    // 处理最后一名手上的分牌：给第二名
    const scoreCards = lastPlace.player.hand.filter(card => isScoreCard(card));
    const remainingScore = calculateCardsScore(scoreCards);
    if (remainingScore > 0) {
      lastPlace.finalScore -= remainingScore;
      secondPlace.finalScore += remainingScore;
    }
  }

  return rankings;
}

/**
 * 在个人模式游戏结束时应用最终规则并更新玩家分数
 * @returns 返回更新后的玩家数组和排名信息
 */
export function applyIndividualFinalRules(
  players: Player[],
  finishOrder: number[]
): { players: Player[]; rankings: PlayerRanking[] } {
  // 计算最终排名和分数（只计算一次，避免重复处理最后一名未出的分牌）
  const rankings = calculateIndividualRankings(players, finishOrder);

  // 更新玩家数组，包括 finishedRank（争上游名次）和 scoreRank（分数名次）
  // finishedRank：出完牌的顺序（第一个出完的是第1名），在玩家出完牌时立即设置
  // scoreRank：按最终分数排序的名次（分数高的排名靠前），在游戏结束时设置
  const updatedPlayers = players.map(player => {
    const ranking = rankings.find(r => r.player.id === player.id);
    if (ranking) {
      return {
        ...player,
        score: ranking.finalScore,
        // finishedRank 保持不变（已经在玩家出完牌时设置）
        scoreRank: ranking.rank // 分数名次（按最终分数排序）
      } as Player & { finishedRank?: number; scoreRank?: number };
    }
    return player;
  });

  return { players: updatedPlayers, rankings };
}

/**
 * 获取玩家的个人排名信息（用于显示）
 */
export function getIndividualPlayerRanking(
  playerId: number,
  rankings: PlayerRanking[]
): PlayerRanking | undefined {
  return rankings.find(r => r.player.id === playerId);
}