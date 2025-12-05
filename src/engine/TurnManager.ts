/**
 * 回合管理器
 * 
 * 职责：
 * 1. 管理回合流程
 * 2. 判断下一个玩家
 * 3. 处理Pass逻辑
 * 4. Round结束判断
 * 
 * 不负责：
 * - 具体出牌逻辑（在GameState）
 * - AI决策（在MasterAIBrain）
 * - 规则判断（在RuleEngine）
 */

import { IPlayer } from './types';

/**
 * 回合管理器类
 */
export class TurnManager {
  private passCount: number = 0;  // 连续Pass次数
  private roundStartPlayer: number = 0;  // 本轮起始玩家
  
  /**
   * 开始新回合
   * @param startPlayerId 起始玩家ID
   */
  startRound(startPlayerId: number): void {
    this.roundStartPlayer = startPlayerId;
    this.passCount = 0;
    
    console.log(`[TurnManager] 新回合开始，玩家${startPlayerId}先出`);
  }
  
  /**
   * 记录Pass
   */
  recordPass(): void {
    this.passCount++;
    console.log(`[TurnManager] Pass计数: ${this.passCount}`);
  }
  
  /**
   * 重置Pass计数（有人出牌时）
   */
  resetPassCount(): void {
    this.passCount = 0;
  }
  
  /**
   * 判断回合是否结束
   * @param playerCount 总玩家数
   * @returns 是否结束
   */
  isRoundOver(playerCount: number): boolean {
    // 其他所有玩家都Pass了
    return this.passCount >= playerCount - 1;
  }
  
  /**
   * 获取下一个玩家ID
   * @param currentId 当前玩家ID
   * @param players 所有玩家
   * @returns 下一个玩家ID
   */
  getNextPlayer(currentId: number, players: IPlayer[]): number {
    let nextId = currentId;
    
    // 找到下一个未出完牌的玩家
    do {
      nextId = (nextId + 1) % players.length;
    } while (players[nextId].finished && nextId !== currentId);
    
    // 如果绕了一圈回到当前玩家，说明只剩当前玩家了
    if (nextId === currentId && players[currentId].finished) {
      return -1;  // 游戏结束
    }
    
    return nextId;
  }
  
  /**
   * 获取回合起始玩家
   */
  getRoundStartPlayer(): number {
    return this.roundStartPlayer;
  }
  
  /**
   * 获取连续Pass次数
   */
  getPassCount(): number {
    return this.passCount;
  }
  
  /**
   * 重置
   */
  reset(): void {
    this.passCount = 0;
    this.roundStartPlayer = 0;
  }
}

