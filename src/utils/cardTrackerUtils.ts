/**
 * 记牌器工具函数
 * 提供统一的记牌器操作接口
 */

import { cardTracker } from '../services/cardTrackerService';
import { RoundRecord, RoundPlayRecord, Player } from '../types/card';

/**
 * 确保记牌器中的轮次存在，如果不存在则创建并记录所有出牌
 */
export function ensureRoundInTracker(
  roundNumber: number,
  roundRecord: RoundRecord,
  players: Player[]
): void {
  const trackerRound = cardTracker.getRound(roundNumber);
  
  if (trackerRound) {
    // 轮次已存在，直接结束
    cardTracker.endRound(
      roundNumber,
      roundRecord.winnerId,
      roundRecord.winnerName,
      roundRecord.totalScore,
      players
    );
    console.warn(`[CardTracker] ⚠️ 第${roundNumber}轮已存在，已结束该轮次`, {
      roundNumber,
      winnerId: roundRecord.winnerId,
      winnerName: roundRecord.winnerName || '未知',
      totalScore: roundRecord.totalScore,
      playsCount: roundRecord.plays?.length || 0,
      allRoundsNumbers: cardTracker.getAllRounds().map(r => r.roundNumber).sort((a, b) => a - b),
      timestamp: Date.now()
    });
  } else {
    // 轮次不存在，创建并记录所有出牌
    console.warn(`[CardTracker] ⚠️ 记牌器中没有第${roundNumber}轮，尝试创建并结束`, {
      roundNumber,
      roundRecord: {
        playsCount: roundRecord.plays?.length || 0,
        totalScore: roundRecord.totalScore,
        winnerId: roundRecord.winnerId,
        winnerName: roundRecord.winnerName
      },
      allRoundsInTracker: cardTracker.getAllRounds().map(r => r.roundNumber).sort((a, b) => a - b)
    });
    
    cardTracker.startRound(roundNumber, players);
    
    if (roundRecord.plays && roundRecord.plays.length > 0) {
      roundRecord.plays.forEach((play: RoundPlayRecord) => {
        cardTracker.recordPlay(roundNumber, play);
      });
      console.warn(`[CardTracker] ⚠️ 已为第${roundNumber}轮创建记录并添加${roundRecord.plays.length}条出牌记录`, {
        roundNumber,
        playsCount: roundRecord.plays.length,
        allRoundsNumbers: cardTracker.getAllRounds().map(r => r.roundNumber).sort((a, b) => a - b),
        timestamp: Date.now()
      });
    }
    
    cardTracker.endRound(
      roundNumber,
      roundRecord.winnerId,
      roundRecord.winnerName,
      roundRecord.totalScore,
      players
    );
  }
}

