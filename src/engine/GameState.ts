/**
 * 游戏状态管理类
 * 
 * 职责：
 * 1. 存储所有游戏数据（玩家、手牌、分数等）
 * 2. 提供状态访问接口
 * 3. 状态更新（不可变模式，每次返回新状态）
 * 4. 状态验证
 * 
 * 不负责：
 * - 游戏逻辑判断（在RuleEngine）
 * - AI决策（在MasterAIBrain）
 * - UI渲染（在Renderer）
 */

import { Card, Play } from '../types/card';
import { IPlayer, IGameState, GamePhase, RoundPhase } from './types';

/**
 * 游戏状态类
 */
export class GameState implements IGameState {
  // ==================== 核心数据 ====================
  
  /** 游戏阶段 */
  phase: GamePhase = 'not_started';
  
  /** 所有玩家 */
  players: IPlayer[] = [];
  
  /** 当前玩家ID */
  currentPlayerId: number = 0;
  
  /** 回合号（从1开始） */
  roundNumber: number = 0;
  
  /** 回合阶段 */
  roundPhase: RoundPhase = 'waiting';
  
  /** 上一次出牌 */
  lastPlay: Play | null = null;
  
  /** 上一次出牌的玩家ID */
  lastPlayerId: number | null = null;
  
  /** 本轮分数 */
  currentRoundScore: number = 0;
  
  /** 游戏获胜者ID */
  winnerId: number | null = null;
  
  // ==================== 构造函数 ====================
  
  /**
   * 创建游戏状态
   * @param playerCount 玩家数量
   * @param playerNames 玩家名称列表
   * @param aiPlayerIds AI玩家ID列表
   * @param personalities AI性格列表
   */
  constructor(
    playerCount: number,
    playerNames: string[],
    aiPlayerIds: number[],
    personalities: string[]
  ) {
    // 创建玩家
    for (let i = 0; i < playerCount; i++) {
      const isAI = aiPlayerIds.includes(i);
      
      this.players.push({
        id: i,
        name: playerNames[i] || `玩家${i}`,
        type: isAI ? 'ai' : 'human',
        personality: isAI ? personalities[aiPlayerIds.indexOf(i)] as any : undefined,
        hand: [],
        score: 0,
        finished: false
      });
    }
    
    console.log(`[GameState] 创建游戏状态，${playerCount}个玩家`);
  }
  
  // ==================== 状态访问 ====================
  
  /**
   * 获取当前玩家
   */
  getCurrentPlayer(): IPlayer {
    return this.players[this.currentPlayerId];
  }
  
  /**
   * 获取指定玩家
   * @param playerId 玩家ID
   */
  getPlayer(playerId: number): IPlayer {
    return this.players[playerId];
  }
  
  /**
   * 获取所有AI玩家
   */
  getAIPlayers(): IPlayer[] {
    return this.players.filter(p => p.type === 'ai');
  }
  
  /**
   * 获取所有人类玩家
   */
  getHumanPlayers(): IPlayer[] {
    return this.players.filter(p => p.type === 'human');
  }
  
  /**
   * 判断游戏是否结束
   */
  isGameOver(): boolean {
    return this.winnerId !== null;
  }
  
  /**
   * 判断回合是否结束
   * 回合结束条件：所有其他玩家都Pass了
   */
  isRoundOver(): boolean {
    // TODO: 实现回合结束判断逻辑
    return false;
  }
  
  // ==================== 状态更新 ====================
  
  /**
   * 开始游戏
   */
  startGame(): void {
    this.phase = 'playing';
    this.roundNumber = 1;
    this.roundPhase = 'playing';
    
    console.log('[GameState] 游戏开始');
  }
  
  /**
   * 出牌
   * @param playerId 玩家ID
   * @param cards 出的牌
   * @param play 牌型
   */
  playCards(playerId: number, cards: Card[], play: Play): void {
    const player = this.players[playerId];
    
    // 从手牌中移除
    player.hand = player.hand.filter(card => 
      !cards.some(c => c.id === card.id)
    );
    
    // 更新上次出牌
    this.lastPlay = play;
    this.lastPlayerId = playerId;
    
    // 检查是否出完牌
    if (player.hand.length === 0) {
      player.finished = true;
      
      // 检查是否有赢家
      if (!this.winnerId) {
        this.winnerId = playerId;
        this.phase = 'finished';
        console.log(`[GameState] 游戏结束，玩家${playerId}获胜！`);
      }
    }
    
    console.log(`[GameState] 玩家${playerId}出牌：${cards.length}张`);
  }
  
  /**
   * Pass（要不起）
   * @param playerId 玩家ID
   */
  pass(playerId: number): void {
    console.log(`[GameState] 玩家${playerId} Pass`);
    // Pass不改变游戏状态，只是跳过
  }
  
  /**
   * 切换到下一个玩家
   */
  nextPlayer(): void {
    do {
      this.currentPlayerId = (this.currentPlayerId + 1) % this.players.length;
    } while (this.players[this.currentPlayerId].finished);
    
    console.log(`[GameState] 切换到玩家${this.currentPlayerId}`);
  }
  
  /**
   * 开始新回合
   */
  startNewRound(): void {
    this.roundNumber++;
    this.roundPhase = 'playing';
    this.lastPlay = null;
    this.lastPlayerId = null;
    this.currentRoundScore = 0;
    
    console.log(`[GameState] 开始第${this.roundNumber}回合`);
  }
  
  /**
   * 发牌
   * @param playerHands 每个玩家的手牌
   */
  dealCards(playerHands: Card[][]): void {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].hand = playerHands[i];
    }
    
    console.log('[GameState] 发牌完成');
  }
  
  // ==================== 导出和克隆 ====================
  
  /**
   * 导出状态（用于传递给AI或渲染器）
   * 返回不可变的副本
   */
  export(): IGameState {
    return {
      phase: this.phase,
      players: this.players.map(p => ({ ...p, hand: [...p.hand] })),
      currentPlayerId: this.currentPlayerId,
      roundNumber: this.roundNumber,
      roundPhase: this.roundPhase,
      lastPlay: this.lastPlay,
      lastPlayerId: this.lastPlayerId,
      currentRoundScore: this.currentRoundScore,
      winnerId: this.winnerId
    };
  }
  
  /**
   * 克隆状态（用于AI模拟）
   */
  clone(): GameState {
    const cloned = Object.create(GameState.prototype);
    Object.assign(cloned, {
      phase: this.phase,
      players: this.players.map(p => ({ ...p, hand: [...p.hand] })),
      currentPlayerId: this.currentPlayerId,
      roundNumber: this.roundNumber,
      roundPhase: this.roundPhase,
      lastPlay: this.lastPlay,
      lastPlayerId: this.lastPlayerId,
      currentRoundScore: this.currentRoundScore,
      winnerId: this.winnerId
    });
    return cloned;
  }
  
  /**
   * 重置游戏
   */
  reset(): void {
    this.phase = 'not_started';
    this.roundNumber = 0;
    this.roundPhase = 'waiting';
    this.lastPlay = null;
    this.lastPlayerId = null;
    this.currentRoundScore = 0;
    this.winnerId = null;
    
    // 重置所有玩家
    for (const player of this.players) {
      player.hand = [];
      player.score = 0;
      player.finished = false;
    }
    
    console.log('[GameState] 游戏已重置');
  }
}

