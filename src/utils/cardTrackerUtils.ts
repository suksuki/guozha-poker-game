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
  } else {
    // 轮次不存在，创建并记录所有出牌
    
    cardTracker.startRound(roundNumber, players);
    
    if (roundRecord.plays && roundRecord.plays.length > 0) {
      roundRecord.plays.forEach((play: RoundPlayRecord) => {
        cardTracker.recordPlay(roundNumber, play);
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

