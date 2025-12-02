/**
 * 累积积分服务
 * 管理多局游戏的累积积分系统
 */

import { Player } from '../types/card';
import { PlayerRanking } from '../utils/gameRules';

/**
 * 单局游戏记录
 */
export interface GameScoreRecord {
  gameNumber: number; // 局数（第几局）
  gameId: string; // 游戏ID
  startTime: number; // 开始时间
  endTime: number; // 结束时间
  playerScores: Map<number, number>; // 玩家ID -> 本局分数
  rankings: PlayerRanking[]; // 本局排名
  finishOrder: number[]; // 出完牌的顺序
  winner: number; // 获胜者ID
}

/**
 * 玩家累积积分信息
 */
export interface PlayerCumulativeScore {
  playerId: number;
  playerName: string;
  totalScore: number; // 累积总分
  gameCount: number; // 参与局数
  winCount: number; // 获胜局数
  gameScores: number[]; // 每局分数
  averageScore: number; // 平均分数
  currentRank: number; // 当前排名
}

/**
 * 累积积分服务类
 */
class CumulativeScoreService {
  private gameRecords: GameScoreRecord[] = [];
  private currentGameNumber: number = 0;

  /**
   * 开始新一局游戏
   */
  startNewGame(gameId: string): number {
    this.currentGameNumber++;
    return this.currentGameNumber;
  }

  /**
   * 记录一局游戏的分数
   */
  recordGameScore(
    gameId: string,
    startTime: number,
    endTime: number,
    players: Player[],
    rankings: PlayerRanking[],
    finishOrder: number[],
    winner: number
  ): void {
    const playerScores = new Map<number, number>();
    players.forEach(player => {
      playerScores.set(player.id, player.score || 0);
    });

    const record: GameScoreRecord = {
      gameNumber: this.currentGameNumber,
      gameId,
      startTime,
      endTime,
      playerScores,
      rankings,
      finishOrder,
      winner
    };

    this.gameRecords.push(record);
    
    // 保存到本地存储
    this.saveToLocalStorage();
  }

  /**
   * 获取所有玩家的累积积分
   */
  getCumulativeScores(players: Player[]): PlayerCumulativeScore[] {
    const playerMap = new Map<number, PlayerCumulativeScore>();

    // 初始化所有玩家
    players.forEach(player => {
      playerMap.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        totalScore: 0,
        gameCount: 0,
        winCount: 0,
        gameScores: [],
        averageScore: 0,
        currentRank: 0
      });
    });

    // 累计所有局数的分数
    this.gameRecords.forEach(record => {
      record.playerScores.forEach((score, playerId) => {
        const playerScore = playerMap.get(playerId);
        if (playerScore) {
          playerScore.totalScore += score;
          playerScore.gameCount++;
          playerScore.gameScores.push(score);
          if (record.winner === playerId) {
            playerScore.winCount++;
          }
        }
      });
    });

    // 计算平均分数
    playerMap.forEach(playerScore => {
      if (playerScore.gameCount > 0) {
        playerScore.averageScore = playerScore.totalScore / playerScore.gameCount;
      }
    });

    // 转换为数组并按总分排序
    const scores = Array.from(playerMap.values());
    scores.sort((a, b) => b.totalScore - a.totalScore);

    // 设置排名
    scores.forEach((score, index) => {
      score.currentRank = index + 1;
    });

    return scores;
  }

  /**
   * 获取所有局数记录
   */
  getAllGameRecords(): GameScoreRecord[] {
    return [...this.gameRecords];
  }

  /**
   * 获取当前局数
   */
  getCurrentGameNumber(): number {
    return this.currentGameNumber;
  }

  /**
   * 获取上一局的头游（第一个出完牌的玩家）
   */
  getLastGameWinner(): number | null {
    if (this.gameRecords.length === 0) {
      return null;
    }
    const lastRecord = this.gameRecords[this.gameRecords.length - 1];
    return lastRecord.finishOrder.length > 0 ? lastRecord.finishOrder[0] : null;
  }

  /**
   * 重置累积积分（开始新的系列游戏）
   */
  reset(): void {
    this.gameRecords = [];
    this.currentGameNumber = 0;
    this.saveToLocalStorage();
  }

  /**
   * 保存到本地存储
   */
  private saveToLocalStorage(): void {
    try {
      const data = {
        gameRecords: this.gameRecords.map(record => ({
          gameNumber: record.gameNumber,
          gameId: record.gameId,
          startTime: record.startTime,
          endTime: record.endTime,
          playerScores: Array.from(record.playerScores.entries()),
          rankings: record.rankings,
          finishOrder: record.finishOrder,
          winner: record.winner
        })),
        currentGameNumber: this.currentGameNumber
      };
      localStorage.setItem('cumulativeScores', JSON.stringify(data));
    } catch (error) {
    }
  }

  /**
   * 从本地存储加载
   */
  loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('cumulativeScores');
      if (data) {
        const parsed = JSON.parse(data);
        this.currentGameNumber = parsed.currentGameNumber || 0;
        this.gameRecords = (parsed.gameRecords || []).map((record: any) => ({
          gameNumber: record.gameNumber,
          gameId: record.gameId,
          startTime: record.startTime,
          endTime: record.endTime,
          playerScores: new Map(record.playerScores || []),
          rankings: record.rankings || [],
          finishOrder: record.finishOrder || [],
          winner: record.winner
        }));
      }
    } catch (error) {
    }
  }
}

// 单例实例
export const cumulativeScoreService = new CumulativeScoreService();

// 初始化时从本地存储加载
cumulativeScoreService.loadFromLocalStorage();

