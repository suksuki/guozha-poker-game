/**
 * 记牌器服务
 * 用于记录和查询游戏中的所有牌局信息
 * 包括：所有轮次详细信息、玩家手牌变化、出牌历史等
 */

import { Card, Player, RoundRecord, RoundPlayRecord, Rank, Suit } from '../types/card';
import { isScoreCard, getCardScore, calculateDunCount } from '../utils/cardUtils';

// 玩家手牌快照
export interface PlayerHandSnapshot {
  playerId: number;
  playerName: string;
  hand: Card[];
  handCount: number;
  timestamp: number; // 时间戳
  context: string; // 上下文（如：游戏开始、出牌后、轮次结束等）
}

// 轮次详细信息（扩展版）
export interface DetailedRoundRecord extends RoundRecord {
  startTime: number; // 轮次开始时间
  endTime?: number; // 轮次结束时间
  playerHandsAtStart?: PlayerHandSnapshot[]; // 轮次开始时各玩家手牌
  playerHandsAtEnd?: PlayerHandSnapshot[]; // 轮次结束时各玩家手牌
  totalCardsPlayed: number; // 本轮出牌总数
  scoreCardsPlayed: number; // 本轮分牌总数
  dunCount: number; // 本轮墩数
}

// 游戏统计信息
export interface GameStatistics {
  totalRounds: number; // 总轮数
  totalCardsPlayed: number; // 总出牌数
  totalScoreCardsPlayed: number; // 总分牌数
  totalDunCount: number; // 总墩数
  playerStatistics: PlayerStatistics[]; // 各玩家统计
  cardDistribution: CardDistribution; // 牌分布统计
}

// 玩家统计信息
export interface PlayerStatistics {
  playerId: number;
  playerName: string;
  roundsWon: number; // 赢得的轮数
  totalScoreEarned: number; // 获得的总分
  totalCardsPlayed: number; // 出牌总数
  scoreCardsPlayed: number; // 分牌总数
  dunCount: number; // 墩数
  averageCardsPerRound: number; // 平均每轮出牌数
}

// 牌分布统计
export interface CardDistribution {
  byRank: Record<number, number>; // 按点数统计
  bySuit: Record<Suit, number>; // 按花色统计
  scoreCards: {
    five: number; // 5的数量
    ten: number; // 10的数量
    king: number; // K的数量
  };
  totalCards: number; // 总牌数
}

// 记牌器类
class CardTracker {
  private rounds: DetailedRoundRecord[] = [];
  private playerHandSnapshots: PlayerHandSnapshot[] = [];
  private currentRoundStartTime: number = 0;
  private gameStartTime: number = 0;
  private initialHands: Card[][] = [];

  /**
   * 获取初始牌数
   */
  getInitialCardsCount(): number {
    if (this.initialHands.length === 0) return 0;
    return this.initialHands.reduce((sum, hand) => sum + hand.length, 0);
  }

  /**
   * 初始化记牌器
   */
  initialize(initialHands: Card[][], gameStartTime: number = Date.now()): void {
    this.rounds = [];
    this.playerHandSnapshots = [];
    this.initialHands = initialHands;
    this.gameStartTime = gameStartTime;
    this.currentRoundStartTime = gameStartTime;

    // 记录初始手牌
    initialHands.forEach((hand, playerId) => {
      this.recordPlayerHandSnapshot({
        playerId,
        playerName: `玩家${playerId + 1}`,
        hand: [...hand],
        handCount: hand.length,
        timestamp: gameStartTime,
        context: '游戏开始'
      });
    });
  }

  /**
   * 记录玩家手牌快照
   */
  recordPlayerHandSnapshot(snapshot: PlayerHandSnapshot): void {
    this.playerHandSnapshots.push({
      ...snapshot,
      timestamp: snapshot.timestamp || Date.now()
    });
  }

  /**
   * 开始新轮次
   */
  startRound(roundNumber: number, players: Player[]): void {
    this.currentRoundStartTime = Date.now();

    // 记录轮次开始时各玩家手牌
    const handsAtStart: PlayerHandSnapshot[] = players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      hand: [...player.hand],
      handCount: player.hand.length,
      timestamp: this.currentRoundStartTime,
      context: `第${roundNumber}轮开始`
    }));

    // 记录所有玩家手牌中的分牌信息（用于问题分析）
    const allScoreCardsInHands: Array<{ playerId: number; playerName: string; scoreCards: Array<{ rank: Rank; suit: Suit; id: string; score: number }> }> = [];
    players.forEach(player => {
      const scoreCards = player.hand.filter(card => isScoreCard(card));
      if (scoreCards.length > 0) {
        allScoreCardsInHands.push({
          playerId: player.id,
          playerName: player.name,
          scoreCards: scoreCards.map(card => ({
            rank: card.rank,
            suit: card.suit,
            id: card.id,
            score: getCardScore(card)
          }))
        });
      }
    });
    
    if (allScoreCardsInHands.length > 0) {
      console.log(`[CardTracker] 第${roundNumber}轮开始 - 所有玩家手牌中的分牌:`, {
        roundNumber,
        scoreCardsInHands: allScoreCardsInHands,
        totalScoreCards: allScoreCardsInHands.reduce((sum, p) => sum + p.scoreCards.length, 0)
      });
    }

    // 创建轮次记录
    const roundRecord: DetailedRoundRecord = {
      roundNumber,
      plays: [],
      totalScore: 0,
      winnerId: 0,
      winnerName: '',
      startTime: this.currentRoundStartTime,
      playerHandsAtStart: handsAtStart,
      totalCardsPlayed: 0,
      scoreCardsPlayed: 0,
      dunCount: 0
    };

    this.rounds.push(roundRecord);
    console.log(`[CardTracker] 第${roundNumber}轮开始，当前总轮数: ${this.rounds.length}`);
  }

  /**
   * 记录出牌
   */
  recordPlay(roundNumber: number, playRecord: RoundPlayRecord): void {
    const round = this.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) {
      console.warn(`[CardTracker] 找不到第${roundNumber}轮的记录`);
      return;
    }

    round.plays.push(playRecord);
    round.totalCardsPlayed += playRecord.cards.length;
    round.scoreCardsPlayed += playRecord.scoreCards?.length || 0;

    // 计算墩数（7张及以上）
    round.dunCount += calculateDunCount(playRecord.cards.length);

    // 记录所有分牌信息到日志（用于问题分析）
    if (playRecord.scoreCards && playRecord.scoreCards.length > 0) {
      const scoreCardInfo = playRecord.scoreCards.map(card => ({
        rank: card.rank,
        suit: card.suit,
        id: card.id,
        score: getCardScore(card)
      }));
      console.log(`[CardTracker] 第${roundNumber}轮 - 玩家${playRecord.playerId}(${playRecord.playerName})出分牌:`, {
        roundNumber,
        playerId: playRecord.playerId,
        playerName: playRecord.playerName,
        scoreCards: scoreCardInfo,
        totalScore: playRecord.score,
        allCards: playRecord.cards.map(c => ({ rank: c.rank, suit: c.suit, id: c.id }))
      });
    }
  }

  /**
   * 结束轮次
   */
  endRound(
    roundNumber: number,
    winnerId: number,
    winnerName: string,
    totalScore: number,
    players: Player[]
  ): void {
    const round = this.rounds.find(r => r.roundNumber === roundNumber);
    if (!round) {
      console.warn(`[CardTracker] 找不到第${roundNumber}轮的记录`);
      return;
    }

    round.endTime = Date.now();
    round.winnerId = winnerId;
    round.winnerName = winnerName;
    round.totalScore = totalScore;

    // 记录轮次结束时各玩家手牌
    const handsAtEnd: PlayerHandSnapshot[] = players.map(player => ({
      playerId: player.id,
      playerName: player.name,
      hand: [...player.hand],
      handCount: player.hand.length,
      timestamp: round.endTime!,
      context: `第${roundNumber}轮结束`
    }));

    round.playerHandsAtEnd = handsAtEnd;

    // 记录手牌快照
    handsAtEnd.forEach(hand => {
      this.recordPlayerHandSnapshot(hand);
    });

    // 记录本轮所有分牌信息（用于问题分析）
    const allScoreCardsInRound: Array<{ playerId: number; playerName: string; scoreCards: Array<{ rank: Rank; suit: Suit; id: string; score: number }> }> = [];
    round.plays.forEach(play => {
      if (play.scoreCards && play.scoreCards.length > 0) {
        allScoreCardsInRound.push({
          playerId: play.playerId,
          playerName: play.playerName,
          scoreCards: play.scoreCards.map(card => ({
            rank: card.rank,
            suit: card.suit,
            id: card.id,
            score: getCardScore(card)
          }))
        });
      }
    });

    // 记录所有玩家手牌中的分牌信息（轮次结束时）
    const allScoreCardsInHands: Array<{ playerId: number; playerName: string; scoreCards: Array<{ rank: Rank; suit: Suit; id: string; score: number }> }> = [];
    players.forEach(player => {
      const scoreCards = player.hand.filter(card => isScoreCard(card));
      if (scoreCards.length > 0) {
        allScoreCardsInHands.push({
          playerId: player.id,
          playerName: player.name,
          scoreCards: scoreCards.map(card => ({
            rank: card.rank,
            suit: card.suit,
            id: card.id,
            score: getCardScore(card)
          }))
        });
      }
    });

    console.log(`[CardTracker] 第${roundNumber}轮结束 - 分牌统计:`, {
      roundNumber,
      winnerId,
      winnerName,
      totalScore,
      playsCount: round.plays.length,
      totalCardsPlayed: round.totalCardsPlayed,
      scoreCardsInRound: allScoreCardsInRound,
      scoreCardsInHands: allScoreCardsInHands,
      totalScoreCardsInRound: allScoreCardsInRound.reduce((sum, p) => sum + p.scoreCards.length, 0),
      totalScoreCardsInHands: allScoreCardsInHands.reduce((sum, p) => sum + p.scoreCards.length, 0),
      allRoundsCount: this.rounds.length,
      allRoundsNumbers: this.rounds.map(r => r.roundNumber).sort((a, b) => a - b)
    });
  }

  /**
   * 获取所有轮次记录（包括当前未结束的轮次）
   */
  getAllRounds(): DetailedRoundRecord[] {
    return [...this.rounds];
  }

  /**
   * 获取当前轮次记录（如果存在）
   */
  getCurrentRound(): DetailedRoundRecord | undefined {
    // 返回最后一个轮次（如果它还没有结束）
    const lastRound = this.rounds[this.rounds.length - 1];
    if (lastRound && !lastRound.endTime) {
      return lastRound;
    }
    return undefined;
  }

  /**
   * 获取指定轮次记录
   */
  getRound(roundNumber: number): DetailedRoundRecord | undefined {
    return this.rounds.find(r => r.roundNumber === roundNumber);
  }

  /**
   * 获取玩家手牌快照历史
   */
  getPlayerHandHistory(playerId: number): PlayerHandSnapshot[] {
    return this.playerHandSnapshots.filter(s => s.playerId === playerId);
  }

  /**
   * 获取玩家当前手牌（最新的快照）
   */
  getPlayerCurrentHand(playerId: number): Card[] | null {
    const snapshots = this.getPlayerHandHistory(playerId);
    if (snapshots.length === 0) return null;
    return snapshots[snapshots.length - 1].hand;
  }

  /**
   * 获取已出的牌（只包括已结束的轮次）
   */
  getPlayedCards(): Card[] {
    const allCards: Card[] = [];
    this.rounds.forEach(round => {
      // 只统计已结束的轮次
      if (round.endTime) {
        round.plays.forEach(play => {
          allCards.push(...play.cards);
        });
      }
    });
    return allCards;
  }

  /**
   * 获取所有已出的牌（包括当前进行中的轮次）
   */
  getAllPlayedCards(): Card[] {
    const allCards: Card[] = [];
    this.rounds.forEach(round => {
      round.plays.forEach(play => {
        allCards.push(...play.cards);
      });
    });
    return allCards;
  }

  /**
   * 获取未出的牌（基于初始手牌和已出的牌，包括当前轮次）
   * @param players 当前玩家列表（用于获取当前手牌）
   * @param currentRoundPlays 当前轮次的实时出牌（可选，用于更准确的统计）
   */
  getRemainingCards(players: Player[], currentRoundPlays?: RoundPlayRecord[]): Card[] {
    const initialCards: Card[] = [];
    this.initialHands.forEach(hand => {
      initialCards.push(...hand);
    });

    // 获取已结束轮次的出牌
    const trackerPlayedCards = this.getAllPlayedCards();
    
    // 合并当前轮次的实时出牌（如果提供）
    const allPlayedCards: Card[] = [...trackerPlayedCards];
    if (currentRoundPlays) {
      currentRoundPlays.forEach(play => {
        if (play.cards && Array.isArray(play.cards)) {
          allPlayedCards.push(...play.cards);
        }
      });
    }
    
    // 去重
    const playedCardIds = new Set(allPlayedCards.map(c => c.id));

    // 当前玩家手牌
    const currentHands: Card[] = [];
    players.forEach(player => {
      currentHands.push(...player.hand);
    });

    // 未出的牌 = 初始牌 - 已出的牌 - 当前手牌
    const remainingCards: Card[] = [];
    const usedCardIds = new Set([
      ...playedCardIds,
      ...currentHands.map(c => c.id)
    ]);

    initialCards.forEach(card => {
      if (!usedCardIds.has(card.id)) {
        remainingCards.push(card);
      }
    });

    return remainingCards;
  }

  /**
   * 获取游戏统计信息
   */
  getGameStatistics(players: Player[]): GameStatistics {
    const playerStatistics: PlayerStatistics[] = players.map(player => {
      const roundsWon = this.rounds.filter(r => r.winnerId === player.id).length;
      let totalScoreEarned = 0;
      let totalCardsPlayed = 0;
      let scoreCardsPlayed = 0;
      let dunCount = 0;

      this.rounds.forEach(round => {
        round.plays.forEach(play => {
          if (play.playerId === player.id) {
            totalCardsPlayed += play.cards.length;
            scoreCardsPlayed += play.scoreCards?.length || 0;
            dunCount += calculateDunCount(play.cards.length);
          }
        });
        if (round.winnerId === player.id) {
          totalScoreEarned += round.totalScore;
        }
      });

      return {
        playerId: player.id,
        playerName: player.name,
        roundsWon,
        totalScoreEarned,
        totalCardsPlayed,
        scoreCardsPlayed,
        dunCount,
        averageCardsPerRound: this.rounds.length > 0 
          ? totalCardsPlayed / this.rounds.length 
          : 0
      };
    });

    // 统计牌分布
    const allPlayedCards = this.getPlayedCards();
    const cardDistribution = this.calculateCardDistribution(allPlayedCards);

    return {
      totalRounds: this.rounds.length,
      totalCardsPlayed: allPlayedCards.length,
      totalScoreCardsPlayed: cardDistribution.scoreCards.five + 
                            cardDistribution.scoreCards.ten + 
                            cardDistribution.scoreCards.king,
      totalDunCount: this.rounds.reduce((sum, r) => sum + r.dunCount, 0),
      playerStatistics,
      cardDistribution
    };
  }

  /**
   * 计算牌分布统计
   */
  private calculateCardDistribution(cards: Card[]): CardDistribution {
    const byRank: Record<number, number> = {};
    const bySuit: Record<Suit, number> = {};
    const scoreCards = { five: 0, ten: 0, king: 0 };

    cards.forEach(card => {
      // 按点数统计
      byRank[card.rank] = (byRank[card.rank] || 0) + 1;
      
      // 按花色统计
      bySuit[card.suit] = (bySuit[card.suit] || 0) + 1;
      
      // 分牌统计
      if (isScoreCard(card)) {
        if (card.rank === Rank.FIVE) {
          scoreCards.five++;
        } else if (card.rank === Rank.TEN) {
          scoreCards.ten++;
        } else if (card.rank === Rank.KING) {
          scoreCards.king++;
        }
      }
    });

    return {
      byRank,
      bySuit,
      scoreCards,
      totalCards: cards.length
    };
  }

  /**
   * 获取指定玩家在指定轮次的手牌
   */
  getPlayerHandAtRound(playerId: number, roundNumber: number): Card[] | null {
    const round = this.getRound(roundNumber);
    if (!round || !round.playerHandsAtStart) return null;
    
    const hand = round.playerHandsAtStart.find(h => h.playerId === playerId);
    return hand ? hand.hand : null;
  }

  /**
   * 获取指定点数已出的牌数
   */
  getPlayedCardCountByRank(rank: Rank): number {
    const playedCards = this.getPlayedCards();
    return playedCards.filter(c => c.rank === rank).length;
  }

  /**
   * 获取指定点数剩余的牌数（基于初始手牌）
   * @param rank 点数
   * @param players 当前玩家列表
   * @param currentRoundPlays 当前轮次的实时出牌（可选，用于更准确的统计）
   */
  getRemainingCardCountByRank(rank: Rank, players: Player[], currentRoundPlays?: RoundPlayRecord[]): number {
    // 从初始手牌统计该点数的总数
    const initialCount = this.initialHands.reduce((sum, hand) => {
      return sum + hand.filter(c => c.rank === rank).length;
    }, 0);

    // 已出的牌数（包括所有历史轮次和当前轮次）
    const allPlayedCards = this.getAllPlayedCards();
    
    // 合并当前轮次的实时出牌（如果提供）
    const allPlayedCardsWithCurrent: Card[] = [...allPlayedCards];
    if (currentRoundPlays) {
      currentRoundPlays.forEach(play => {
        if (play.cards && Array.isArray(play.cards)) {
          allPlayedCardsWithCurrent.push(...play.cards);
        }
      });
    }
    
    // 去重
    const playedCardIds = new Set(allPlayedCardsWithCurrent.map(c => c.id));
    const uniquePlayedCards = allPlayedCardsWithCurrent.filter((card, index, self) => 
      self.findIndex(c => c.id === card.id) === index
    );
    
    const playedCount = uniquePlayedCards.filter(c => c.rank === rank).length;
    
    // 当前手牌中的数量
    const currentHandsCount = players.reduce((sum, player) => {
      return sum + player.hand.filter(c => c.rank === rank).length;
    }, 0);

    const remaining = initialCount - playedCount - currentHandsCount;
    
    console.log(`[getRemainingCardCountByRank] 点数${rank}: 初始=${initialCount}, 已出=${playedCount}, 手牌=${currentHandsCount}, 剩余=${remaining}`);
    
    return remaining;
  }

  /**
   * 清空记录
   */
  clear(): void {
    this.rounds = [];
    this.playerHandSnapshots = [];
    this.initialHands = [];
    this.gameStartTime = 0;
    this.currentRoundStartTime = 0;
  }

  /**
   * 导出数据（用于保存）
   */
  export(): {
    rounds: DetailedRoundRecord[];
    playerHandSnapshots: PlayerHandSnapshot[];
    initialHands: Card[][];
    gameStartTime: number;
  } {
    return {
      rounds: [...this.rounds],
      playerHandSnapshots: [...this.playerHandSnapshots],
      initialHands: this.initialHands.map(hand => [...hand]),
      gameStartTime: this.gameStartTime
    };
  }

  /**
   * 导入数据（用于恢复）
   */
  import(data: {
    rounds: DetailedRoundRecord[];
    playerHandSnapshots: PlayerHandSnapshot[];
    initialHands: Card[][];
    gameStartTime: number;
  }): void {
    this.rounds = data.rounds.map(r => ({ ...r }));
    this.playerHandSnapshots = data.playerHandSnapshots.map(s => ({ ...s }));
    this.initialHands = data.initialHands.map(hand => hand.map(c => ({ ...c })));
    this.gameStartTime = data.gameStartTime;
  }
}

// 创建单例实例
export const cardTracker = new CardTracker();

