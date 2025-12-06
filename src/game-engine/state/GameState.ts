/**
 * GameState - 游戏状态（纯数据容器）
 * 
 * 设计原则：
 * - 单一数据源：整个游戏只有一个GameState实例
 * - 不可变更新：所有更新返回新对象
 * - 只读访问：外部只能读取，不能直接修改
 * - 无业务逻辑：只存储数据，不包含游戏逻辑
 * 
 * @example
 * ```typescript
 * const state = new GameState(config);
 * 
 * // 更新玩家（不可变）
 * const newState = state.updatePlayer(0, { score: 100 });
 * 
 * // 原状态不变
 * console.log(state.players[0].score); // 0
 * console.log(newState.players[0].score); // 100
 * ```
 */

import { GameStatus, Player, Card } from '../../types/card';
import { TeamConfig } from '../../types/team';

/**
 * 轮次数据（简化版，后续会完善）
 */
export interface RoundData {
  readonly roundNumber: number;
  readonly startTime: number;
  readonly isFinished: boolean;
}

/**
 * 游戏配置
 */
export interface GameConfig {
  readonly playerCount: number;
  readonly humanPlayerIndex: number;
  readonly teamMode: boolean;
  // Game.ts中的额外配置
  readonly dealingAlgorithm?: string;
  readonly skipDealingAnimation?: boolean;
  readonly cardTrackerEnabled?: boolean;
}

/**
 * 状态快照（用于序列化）
 */
export interface GameStateSnapshot {
  status: GameStatus;
  players: Player[];
  rounds: RoundData[];
  currentPlayerIndex: number;
  currentRoundIndex: number;
  finishOrder: number[];
  timestamp: number;
  // Game.ts中的额外状态
  winner: number | null;
  finalRankings?: any[];
  teamRankings?: any[];
  winningTeamId?: number | null;
  initialHands?: any[][];
  gameStartTime: number;
  gameId: string;
}

/**
 * 事件监听器类型
 */
type StateEventListener = (event: StateChangeEvent) => void;

/**
 * 状态变化事件
 */
export interface StateChangeEvent {
  type: 'playerUpdated' | 'statusChanged' | 'roundAdded' | 'currentPlayerChanged' | 'playerFinished';
  oldState?: any;
  newState?: any;
  data?: any;
}

/**
 * GameState - 游戏状态类
 */
export class GameState {
  // ========== 配置（只读）==========
  readonly config: Readonly<GameConfig>;
  
  // ========== 核心状态（私有）==========
  private _status: GameStatus;
  private _players: readonly Player[];
  private _rounds: readonly RoundData[];
  private _currentPlayerIndex: number;
  private _currentRoundIndex: number;
  private _finishOrder: readonly number[];
  private _teamConfig: TeamConfig | null;
  
  // ========== Game.ts迁移的状态 ==========
  private _winner: number | null;
  private _finalRankings: any[] | null;
  private _teamRankings: any[] | null;
  private _winningTeamId: number | null;
  private _initialHands: readonly Card[][] | null;
  private _gameStartTime: number;
  private _gameId: string;
  
  // ========== 事件监听器 ==========
  private eventListeners: Map<string, StateEventListener[]> = new Map();
  
  constructor(config: GameConfig) {
    this.config = Object.freeze({ ...config });
    
    // 初始化状态
    this._status = GameStatus.WAITING;
    this._players = Object.freeze([]);
    this._rounds = Object.freeze([]);
    this._currentPlayerIndex = 0;
    this._currentRoundIndex = -1;
    this._finishOrder = Object.freeze([]);
    this._teamConfig = null;
    
    // 初始化新增字段
    this._winner = null;
    this._finalRankings = null;
    this._teamRankings = null;
    this._winningTeamId = null;
    this._initialHands = null;
    this._gameStartTime = 0;
    this._gameId = '';
  }
  
  // ========== Getters（只读访问）==========
  
  get status(): GameStatus {
    return this._status;
  }
  
  get players(): readonly Player[] {
    return this._players;
  }
  
  get rounds(): readonly RoundData[] {
    return this._rounds;
  }
  
  get currentPlayerIndex(): number {
    return this._currentPlayerIndex;
  }
  
  get currentRoundIndex(): number {
    return this._currentRoundIndex;
  }
  
  get finishOrder(): readonly number[] {
    return this._finishOrder;
  }
  
  get teamConfig(): TeamConfig | null {
    return this._teamConfig;
  }
  
  get currentRound(): RoundData | undefined {
    if (this._currentRoundIndex < 0 || this._currentRoundIndex >= this._rounds.length) {
      return undefined;
    }
    return this._rounds[this._currentRoundIndex];
  }
  
  get currentPlayer(): Player | undefined {
    if (this._currentPlayerIndex < 0 || this._currentPlayerIndex >= this._players.length) {
      return undefined;
    }
    return this._players[this._currentPlayerIndex];
  }
  
  get winner(): number | null {
    return this._winner;
  }
  
  get finalRankings(): any[] | null {
    return this._finalRankings;
  }
  
  get teamRankings(): any[] | null {
    return this._teamRankings;
  }
  
  get winningTeamId(): number | null {
    return this._winningTeamId;
  }
  
  get initialHands(): readonly Card[][] | null {
    return this._initialHands;
  }
  
  get gameStartTime(): number {
    return this._gameStartTime;
  }
  
  get gameId(): string {
    return this._gameId;
  }
  
  // ========== 不可变更新方法 ==========
  
  /**
   * 初始化玩家
   */
  initializePlayers(players: Player[]): GameState {
    const newState = this.clone();
    newState._players = Object.freeze([...players]);
    
    this.emit({
      type: 'playerUpdated',
      newState: newState._players
    });
    
    return newState;
  }
  
  /**
   * 更新玩家（不可变）
   */
  updatePlayer(index: number, updates: Partial<Player>): GameState {
    if (index < 0 || index >= this._players.length) {
      throw new Error(`Invalid player index: ${index}`);
    }
    
    const oldPlayer = this._players[index];
    const newPlayers = [
      ...this._players.slice(0, index),
      { ...oldPlayer, ...updates },
      ...this._players.slice(index + 1)
    ];
    
    const newState = this.clone();
    newState._players = Object.freeze(newPlayers);
    
    this.emit({
      type: 'playerUpdated',
      data: { index, updates, oldPlayer, newPlayer: newPlayers[index] }
    });
    
    return newState;
  }
  
  /**
   * 更新状态
   */
  updateStatus(status: GameStatus): GameState {
    if (this._status === status) {
      return this; // 相同状态，不更新
    }
    
    const newState = this.clone();
    newState._status = status;
    
    this.emit({
      type: 'statusChanged',
      oldState: this._status,
      newState: status
    });
    
    return newState;
  }
  
  /**
   * 添加轮次
   */
  addRound(round: RoundData): GameState {
    const newState = this.clone();
    newState._rounds = Object.freeze([...this._rounds, round]);
    newState._currentRoundIndex = newState._rounds.length - 1;
    
    this.emit({
      type: 'roundAdded',
      data: { round, roundIndex: newState._currentRoundIndex }
    });
    
    return newState;
  }
  
  /**
   * 更新指定轮次
   */
  updateRound(index: number, updatedRound: RoundData): GameState {
    if (index < 0 || index >= this._rounds.length) {
      throw new Error(`Invalid round index: ${index}`);
    }
    
    const newState = this.clone();
    const newRounds = [...this._rounds];
    newRounds[index] = updatedRound;
    newState._rounds = Object.freeze(newRounds);
    
    this.emit({
      type: 'roundUpdated',
      data: { round: updatedRound, roundIndex: index }
    });
    
    return newState;
  }
  
  /**
   * 更新当前玩家索引
   */
  updateCurrentPlayer(index: number): GameState {
    if (index < 0 || index >= this._players.length) {
      throw new Error(`Invalid player index: ${index}`);
    }
    
    if (this._currentPlayerIndex === index) {
      return this; // 相同，不更新
    }
    
    const newState = this.clone();
    newState._currentPlayerIndex = index;
    
    this.emit({
      type: 'currentPlayerChanged',
      oldState: this._currentPlayerIndex,
      newState: index
    });
    
    return newState;
  }
  
  /**
   * 添加到完成顺序
   */
  addToFinishOrder(playerIndex: number): GameState {
    if (this._finishOrder.includes(playerIndex)) {
      return this; // 已经在列表中，不重复添加
    }
    
    const newState = this.clone();
    newState._finishOrder = Object.freeze([...this._finishOrder, playerIndex]);
    
    this.emit({
      type: 'playerFinished',
      data: { playerIndex, rank: newState._finishOrder.length }
    });
    
    return newState;
  }
  
  /**
   * 更新团队配置
   */
  updateTeamConfig(teamConfig: TeamConfig | null): GameState {
    const newState = this.clone();
    newState._teamConfig = teamConfig;
    return newState;
  }
  
  /**
   * 设置获胜者
   */
  setWinner(winnerId: number): GameState {
    const newState = this.clone();
    newState._winner = winnerId;
    return newState;
  }
  
  /**
   * 设置最终排名
   */
  setFinalRankings(rankings: any[]): GameState {
    const newState = this.clone();
    newState._finalRankings = rankings;
    return newState;
  }
  
  /**
   * 设置团队排名
   */
  setTeamRankings(rankings: any[]): GameState {
    const newState = this.clone();
    newState._teamRankings = rankings;
    return newState;
  }
  
  /**
   * 设置获胜团队
   */
  setWinningTeam(teamId: number): GameState {
    const newState = this.clone();
    newState._winningTeamId = teamId;
    return newState;
  }
  
  /**
   * 设置初始手牌
   */
  setInitialHands(hands: Card[][]): GameState {
    const newState = this.clone();
    newState._initialHands = Object.freeze(hands.map(h => Object.freeze([...h])));
    return newState;
  }
  
  /**
   * 初始化游戏会话
   */
  initializeGame(gameId: string, startTime?: number): GameState {
    const newState = this.clone();
    newState._gameId = gameId;
    newState._gameStartTime = startTime || Date.now();
    return newState;
  }
  
  // ========== 克隆和快照 ==========
  
  /**
   * 克隆状态（浅拷贝）
   */
  private clone(): GameState {
    const newState = new GameState(this.config);
    newState._status = this._status;
    newState._players = this._players;
    newState._rounds = this._rounds;
    newState._currentPlayerIndex = this._currentPlayerIndex;
    newState._currentRoundIndex = this._currentRoundIndex;
    newState._finishOrder = this._finishOrder;
    newState._teamConfig = this._teamConfig;
    // 不复制eventListeners - 事件监听器不应该克隆
    return newState;
  }
  
  /**
   * 导出快照（用于调试、持久化、网络传输）
   */
  toSnapshot(): GameStateSnapshot {
    return {
      status: this._status,
      players: this._players.map(p => ({ ...p })),
      rounds: this._rounds.map(r => ({ ...r })),
      currentPlayerIndex: this._currentPlayerIndex,
      currentRoundIndex: this._currentRoundIndex,
      finishOrder: [...this._finishOrder],
      timestamp: Date.now(),
      // 新增字段
      winner: this._winner,
      finalRankings: this._finalRankings ? [...this._finalRankings] : undefined,
      teamRankings: this._teamRankings ? [...this._teamRankings] : undefined,
      winningTeamId: this._winningTeamId,
      initialHands: this._initialHands ? this._initialHands.map(h => [...h]) : undefined,
      gameStartTime: this._gameStartTime,
      gameId: this._gameId
    };
  }
  
  /**
   * 从快照恢复
   */
  static fromSnapshot(snapshot: GameStateSnapshot, config: GameConfig): GameState {
    const state = new GameState(config);
    state._status = snapshot.status;
    state._players = Object.freeze(snapshot.players);
    state._rounds = Object.freeze(snapshot.rounds);
    state._currentPlayerIndex = snapshot.currentPlayerIndex;
    state._currentRoundIndex = snapshot.currentRoundIndex;
    state._finishOrder = Object.freeze(snapshot.finishOrder);
    return state;
  }
  
  // ========== 事件系统 ==========
  
  /**
   * 监听事件
   */
  on(eventType: string, listener: StateEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }
  
  /**
   * 取消监听
   */
  off(eventType: string, listener: StateEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (!listeners) return;
    
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * 发出事件
   */
  private emit(event: StateChangeEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (!listeners || listeners.length === 0) return;
    
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[GameState] Event listener error:', error);
      }
    });
  }
}

